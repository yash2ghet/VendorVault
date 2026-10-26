import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/database";
import { PurchaseOrder } from "@/models/Order";
import { guard } from "@/lib/api-guard";
import { UserRole } from "@/types";
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
      { paymentStatus: body.paymentStatus },
      { new: true, runValidators: true }
    ).populate("vendorId", "companyName name").lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await createSystemAuditLog({
      action: "PO_STATUS_UPDATED",
      actor: g.userName,
      actorId: g.userId,
      entityType: "PurchaseOrder",
      entityId: id,
      details: `Updated payment status to ${body.paymentStatus} for PO #${id.slice(-6)} (${(order as any)?.vendorId?.companyName || "Vendor"})`,
      ipAddress: resolveIpFromRequest(req),
    }).catch(() => {});

    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
