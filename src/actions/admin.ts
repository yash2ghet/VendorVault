"use server";

import { connectDB } from "@/lib/mongodb";
import HardwareRequest from "@/models/HardwareRequest";
import mongoose from "mongoose";
import { createSystemAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { actionSession } from "@/lib/action-guard";
import { UserRole } from "@/types";

import { Product } from "@/models/Product";
import { Vendor } from "@/models/Vendor";

export async function getMasterProcurementQueue() {
  try {
    if (!(await actionSession(UserRole.ADMIN))) return { success: false, data: [] };
    await connectDB();
    const queue = await HardwareRequest.find({ status: "APPROVED_BY_MANAGER" }).sort({ updatedAt: 1 }).lean();
    return { success: true, data: JSON.parse(JSON.stringify(queue)) };
  } catch (error) {
    console.error("Failed to fetch procurement queue:", error);
    return { success: false, data: [] };
  }
}

export async function getAllVendorsAndProducts() {
  try {
    if (!(await actionSession(UserRole.ADMIN))) return { success: false, vendors: [], products: [] };
    await connectDB();
    const [vendors, products] = await Promise.all([
      Vendor.find({}, "name companyName _id").lean(),
      Product.find({}, "name quantity _id").lean(),
    ]);
    return {
      success: true,
      vendors: JSON.parse(JSON.stringify(vendors)),
      // the page shows "{stock} left"; the real inventory field on Product is `quantity`
      products: JSON.parse(
        JSON.stringify(products.map((p: any) => ({ _id: p._id, name: p.name, stock: p.quantity ?? 0 })))
      ),
    };
  } catch (error) {
    console.error("Failed to load options:", error);
    return { success: false, vendors: [], products: [] };
  }
}

export async function fulfillAssetRequest({
  requestId,
  vendorId,
  productId,
  adminId,
  adminName
}: {
  requestId: string;
  vendorId: string;
  productId: string;
  adminId: string;
  adminName: string;
}) {
  try {
    const me = await actionSession(UserRole.ADMIN);
    if (!me) return { success: false, error: "Only administrators can fulfil requests." };
    adminId = me.userId;
    adminName = me.name;
    await connectDB();

    if (!mongoose.isValidObjectId(requestId) || !mongoose.isValidObjectId(productId) || !mongoose.isValidObjectId(vendorId)) {
      return { success: false, error: "Please choose a supplier and a stock item." };
    }

    // 1. Only an APPROVED request can be fulfilled (and only once)
    const existing = await HardwareRequest.findById(requestId);
    if (!existing) return { success: false, error: "Request record missing." };
    if (existing.status !== "APPROVED_BY_MANAGER") {
      return { success: false, error: "This request is not waiting for procurement." };
    }

    // 2. Take one unit out of inventory — atomically, and never below zero
    const product = await Product.findOneAndUpdate(
      { _id: productId, quantity: { $gt: 0 } },
      { $inc: { quantity: -1 } },
      { new: true }
    );
    if (!product) return { success: false, error: "That item is out of stock (or no longer exists)." };

    // 3. Advance the ticket; put the unit back if that fails
    const request = await HardwareRequest.findOneAndUpdate(
      { _id: requestId, status: "APPROVED_BY_MANAGER" },
      { status: "PROCURED_BY_ADMIN", vendorId },
      { new: true }
    );
    if (!request) {
      await Product.updateOne({ _id: productId }, { $inc: { quantity: 1 } });
      return { success: false, error: "This request was already handled." };
    }

    // 4. Emit tracking record into Global Audit Trail
    await createSystemAuditLog({
      action: "PROCUREMENT_FULFILLED",
      actor: adminName,
      actorId: adminId,
      entityType: "HardwareRequest",
      entityId: requestId,
      targetId: requestId,
      details: `Dispatched ${request.assetType} (${request.modelPreference}). Deducted 1 unit of ${product.name} from inventory (${product.quantity} left).`,
    });

    revalidatePath("/dashboard/admin/procurement");
    revalidatePath("/requests");
    
    return { success: true };
  } catch (error) {
    console.error("Fulfillment loop error:", error);
    return { success: false, error: "Internal processing crash handling dispatch sequence." };
  }
}
