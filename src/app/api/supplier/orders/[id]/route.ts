import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/database";
import { PurchaseOrder } from "@/models/Order";
import { guard, apiError, resolveSupplierVendorId } from "@/lib/api-guard";
import { createSystemAuditLog } from "@/lib/audit-log";
import { createNotification } from "@/lib/notification";
import { UserRole } from "@/types";

type Params = { params: Promise<{ id: string }> };

/**
 * Supplier actions on THEIR OWN orders only:
 *   { action: "SHIP", note? }   CONFIRMED → SHIPPED
 * Everything else (approval, delivery, payment) stays with the buyer.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const g = await guard(UserRole.SUPPLIER);
    if (!g.ok) return g.response;

    const vendorId = await resolveSupplierVendorId(g);
    if (!vendorId) return NextResponse.json({ error: "Your login is not linked to a vendor profile." }, { status: 403 });

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    // vendorId in the query = a supplier can never touch another vendor's order
    const order: any = await PurchaseOrder.findOne({ _id: id, vendorId });
    if (!order) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });

    if (body.action !== "SHIP") return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    if (order.orderStatus !== "CONFIRMED") {
      return NextResponse.json(
        { error: `Only approved (CONFIRMED) orders can be shipped. This order is ${order.orderStatus}.` },
        { status: 400 }
      );
    }

    order.orderStatus = "SHIPPED";
    if (Array.isArray(order.statusHistory)) {
      order.statusHistory.push({ status: "SHIPPED", by: g.userId, byName: g.userName, at: new Date(), note: body.note || undefined });
    }
    if (body.note) order.notes = `${order.notes ? order.notes + "\n" : ""}[Supplier] ${String(body.note).slice(0, 300)}`;
    await order.save();

    const label = order.poNumber || id;
    await createSystemAuditLog({
      action: "PO_STATUS_CHANGED",
      entityType: "PurchaseOrder",
      entityId: id,
      details: `Supplier ${g.userName} marked ${label} as SHIPPED${body.note ? ` — ${body.note}` : ""}.`,
    });
    await createNotification({
      type: "info",
      title: "Order Shipped",
      description: `${label} was marked as shipped by supplier ${g.userName}.`,
    });

    return NextResponse.json({ ok: true, orderStatus: "SHIPPED" });
  } catch (error) {
    return apiError(error);
  }
}
