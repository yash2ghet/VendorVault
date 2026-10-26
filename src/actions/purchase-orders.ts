"use server";

import { connectDB } from "@/lib/mongodb";
import { PurchaseOrder as Order } from "@/models/Order";
import { createSystemAuditLog } from "@/lib/audit-log";
import { actionSession } from "@/lib/action-guard";
import { UserRole } from "@/types";

export async function updatePurchaseOrderStatus(
  orderId: string, 
  orderStatus: string, 
  _actorId?: string // ignored — the actor is always the signed-in user
) {
  try {
    const me = await actionSession(UserRole.ADMIN, UserRole.MANAGER);
    if (!me) return { success: false, error: "Only admins or managers can change purchase orders." };
    await connectDB();

    const order = await Order.findById(orderId).populate("vendorId");
    if (!order) {
      return { success: false, error: "Purchase order not found." };
    }

    const oldStatus = order.orderStatus;
    order.orderStatus = orderStatus;
    await order.save();

    // Map your custom logic to the specific UI filter tokens
    let actionType = "PO_STATUS_ADVANCED";
    if (orderStatus === "APPROVED") actionType = "PO_APPROVED";
    if (orderStatus === "CANCELLED") actionType = "PO_CANCELLED";

    await createSystemAuditLog({
      action: actionType,
      actor: me.name,
      actorId: me.userId,
      entityType: "PurchaseOrder",
      entityId: orderId,
      details: `Changed purchase order status for ${order.vendorId?.companyName || "Vendor"} from ${oldStatus} to ${orderStatus}. Total value: ₹${order.totalAmount.toLocaleString('en-IN')}`,
    });

    return { success: true, data: JSON.parse(JSON.stringify(order)) };
  } catch (error) {
    console.error("Failed to update purchase order status:", error);
    return { success: false, error: "Failed to update order status." };
  }
}

export async function deletePurchaseOrder(orderId: string, _actorId?: string) {
  try {
    const me = await actionSession(UserRole.ADMIN, UserRole.MANAGER);
    if (!me) return { success: false, error: "Only admins or managers can delete purchase orders." };
    await connectDB();

    const order = await Order.findById(orderId).populate("vendorId");
    if (!order) {
      return { success: false, error: "Purchase order record not found." };
    }

    await Order.findByIdAndDelete(orderId);

    await createSystemAuditLog({
      action: "PO_CANCELLED", // Emits fallback token recognizable by the UI actionColors matrix
      actor: me.name,
      actorId: me.userId,
      entityType: "PurchaseOrder",
      entityId: orderId,
      details: `Deleted procurement pipeline record for ${order.vendorId?.companyName || "Vendor"} (Total: ₹${order.totalAmount}).`,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to erase purchase order:", error);
    return { success: false, error: "Failed to delete purchase order record." };
  }
}