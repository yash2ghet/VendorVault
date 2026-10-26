import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/database";
import { PurchaseOrder } from "@/models/Order";
import { guard } from "@/lib/api-guard";
import { UserRole, OrderStatus } from "@/types";
import { createSystemAuditLog } from "@/lib/audit-log";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

function resolveIpFromRequest(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "System/Server"
  );
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const g = await guard(UserRole.ADMIN, UserRole.MANAGER);
    if (!g.ok) return g.response;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const order = await PurchaseOrder.findByIdAndUpdate(
      id,
      { orderStatus: body.orderStatus },
      { new: true, runValidators: true }
    ).populate("vendorId", "companyName name").lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    let auditAction = "PO_STATUS_UPDATED";
    if (body.orderStatus === OrderStatus.CONFIRMED) auditAction = "PO_APPROVED";
    if (body.orderStatus === OrderStatus.CANCELLED) auditAction = "PO_CANCELLED";
    if (body.orderStatus === OrderStatus.DELIVERED) auditAction = "PO_DELIVERED";

    await createSystemAuditLog({
      action: auditAction,
      actor: g.userName,
      actorId: g.userId,
      entityType: "PurchaseOrder",
      entityId: id,
      details: `Updated order status to ${body.orderStatus} for PO #${id.slice(-6)} (${(order as any)?.vendorId?.companyName || "Vendor"})`,
      ipAddress: resolveIpFromRequest(req),
    }).catch(() => {});

    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
