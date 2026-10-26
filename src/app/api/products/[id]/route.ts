import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/database";
import { Product } from "@/models/Product";
import { createNotification } from "@/lib/notification";
import { createSystemAuditLog } from "@/lib/audit-log";
import { guard } from "@/lib/api-guard";
import { UserRole } from "@/types";

type Params = { params: Promise<{ id: string }> };

function resolveIpFromRequest(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "System/Server"
  );
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const g = await guard(UserRole.ADMIN, UserRole.MANAGER);
    if (!g.ok) return g.response;

    await connectDB();
    const { id } = await params;
    const product = await Product.findById(id)
      .populate("brandId", "name")
      .populate("categoryId", "name")
      .populate("vendorId", "name companyName")
      .lean();

    if (!product) {
      return NextResponse.json({ error: "Product record not found" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const g = await guard(UserRole.ADMIN, UserRole.MANAGER);
    if (!g.ok) return g.response;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const product = await Product.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    })
      .populate("brandId", "name")
      .populate("categoryId", "name")
      .populate("vendorId", "name companyName")
      .lean();

    if (!product) {
      return NextResponse.json({ error: "Product record not found" }, { status: 404 });
    }

    // Trigger Notification for Update
    await createNotification({
      type: "info",
      title: "Product Updated",
      description: `Inventory specifications for item '${(product as any).name}' have been updated.`,
    });

    await createSystemAuditLog({
      action: "PRODUCT_UPDATE",
      actor: g.userName,
      actorId: g.userId,
      entityType: "Product",
      entityId: id,
      details: `Updated product '${(product as any).name}' (Stock: ${(product as any).quantity}, Price: ₹${(product as any).price})`,
      ipAddress: resolveIpFromRequest(req),
    }).catch(() => {});

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const g = await guard(UserRole.ADMIN, UserRole.MANAGER);
    if (!g.ok) return g.response;

    await connectDB();
    const { id } = await params;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return NextResponse.json({ error: "Product record not found" }, { status: 404 });
    }

    // Trigger Notification for Delete
    await createNotification({
      type: "error",
      title: "Product Deleted",
      description: `Inventory item '${(product as any).name}' was dropped from catalogue index maps.`,
    });

    await createSystemAuditLog({
      action: "PRODUCT_DELETED",
      actor: g.userName,
      actorId: g.userId,
      entityType: "Product",
      entityId: id,
      details: `Deleted product '${(product as any).name}' (SKU: ${(product as any).sku})`,
      ipAddress: resolveIpFromRequest(req),
    }).catch(() => {});

    return NextResponse.json({ message: "Product deleted from inventory" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
