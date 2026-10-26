import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/database";
import { PurchaseOrder } from "@/models/Order";
import { guard, apiError, resolveSupplierVendorId } from "@/lib/api-guard";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

/** Purchase orders addressed to the signed-in supplier's vendor (drafts are never shown). */
export async function GET(req: NextRequest) {
  try {
    const g = await guard(UserRole.SUPPLIER);
    if (!g.ok) return g.response;

    const vendorId = await resolveSupplierVendorId(g);
    if (!vendorId) {
      return NextResponse.json({ error: "Your login is not linked to a vendor profile. Ask an administrator." }, { status: 403 });
    }
    await connectDB();

    const sp = new URL(req.url).searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 10));
    const status = sp.get("status") || "ALL";

    const filter: Record<string, any> = { vendorId, orderStatus: { $ne: "DRAFT" } };
    if (status !== "ALL") filter.orderStatus = status === "DRAFT" ? "__none__" : status;

    const [orders, total] = await Promise.all([
      PurchaseOrder.find(filter)
        .populate("products.productId", "name sku")
        .select("-createdBy -approvedBy")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PurchaseOrder.countDocuments(filter),
    ]);

    return NextResponse.json({ orders, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    return apiError(error);
  }
}
