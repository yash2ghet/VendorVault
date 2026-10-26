import { guard } from "@/lib/api-guard";
import { UserRole } from "@/types";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/database";
import { PurchaseOrder } from "@/models/Order";
import { Product } from "@/models/Product";
import { OrderStatus } from "@/types";
import { getServerSession } from "@/middlewares/auth";
import { createSystemAuditLog } from "@/lib/audit-log";

type Params = { params: Promise<{ id: string }> };

function resolveIpFromRequest(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "System/Server"
  );
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const g = await guard(UserRole.ADMIN, UserRole.MANAGER);
    if (!g.ok) return g.response;
    await connectDB();
    const { id } = await params;
    const order = await PurchaseOrder.findById(id)
      .populate("vendorId", "name companyName email phone address city")
      .populate("products.productId", "name sku price")
      .lean();

    if (!order) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }
    return NextResponse.json(order);
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

    const existingOrder = await PurchaseOrder.findById(id);
    if (!existingOrder) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    const previousStatus = existingOrder.orderStatus;
    const updateData: Record<string, any> = {};

    if (body.orderStatus) updateData.orderStatus = body.orderStatus;
    if (body.paymentStatus) updateData.paymentStatus = body.paymentStatus;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const order = await PurchaseOrder.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("vendorId", "name companyName")
      .populate("products.productId", "name sku price")
      .lean();

    // 🚀 INVENTORY INTEGRATION: Automatically update stock when delivered
    if (body.orderStatus === OrderStatus.DELIVERED && previousStatus !== OrderStatus.DELIVERED) {
      for (const item of (order as any).products) {
        if (item.productId?._id || item.productId) {
          const prodId = item.productId._id || item.productId;
          await Product.findByIdAndUpdate(prodId, {
            $inc: { quantity: item.quantity },
          });
        }
      }
    }

    const session = await getServerSession().catch(() => null);
    const actorName = session?.user?.name || "System Manager";
    const actorId = session?.user?.id || "system";

    let auditAction = "PO_STATUS_UPDATED";
    if (body.orderStatus === OrderStatus.CONFIRMED) auditAction = "PO_APPROVED";
    if (body.orderStatus === OrderStatus.CANCELLED) auditAction = "PO_CANCELLED";
    if (body.orderStatus === OrderStatus.DELIVERED) auditAction = "PO_DELIVERED";

    await createSystemAuditLog({
      action: auditAction,
      actor: actorName,
      actorId: actorId,
      entityType: "PurchaseOrder",
      entityId: id,
      details: `Updated PO for ${(order as any)?.vendorId?.companyName || "Vendor"} - Status: ${body.orderStatus || previousStatus}, Payment: ${body.paymentStatus || existingOrder.paymentStatus}`,
      ipAddress: resolveIpFromRequest(req),
    }).catch(() => {});

    return NextResponse.json(order);
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
    const order = await PurchaseOrder.findByIdAndDelete(id).populate("vendorId", "companyName name");

    if (!order) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    const session = await getServerSession().catch(() => null);
    await createSystemAuditLog({
      action: "PO_CANCELLED",
      actor: session?.user?.name || "System Admin",
      actorId: session?.user?.id || "system",
      entityType: "PurchaseOrder",
      entityId: id,
      details: `Deleted Purchase Order #${id.slice(-6)} for ${(order as any)?.vendorId?.companyName || "Vendor"} (Total: ₹${(order as any).totalAmount})`,
      ipAddress: resolveIpFromRequest(req),
    }).catch(() => {});

    return NextResponse.json({ message: "Purchase order removed successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
