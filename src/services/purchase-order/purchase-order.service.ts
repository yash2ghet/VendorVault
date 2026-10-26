import { connectDB } from "@/config/database";
import { PurchaseOrder } from "@/models/PurchaseOrder";
import { Product } from "@/models/Product";
import { ActivityLog } from "@/models/ActivityLog";
import { AuditAction, OrderStatus } from "@/types";
import { z } from "zod";
import { createPurchaseOrderSchema } from "@/validators/purchase-order";

type CreatePOInput = z.infer<typeof createPurchaseOrderSchema>;

export class PurchaseOrderService {
  static async getAll(query: {
    page?: number; limit?: number; orderStatus?: string; paymentStatus?: string; vendorId?: string;
  }) {
    await connectDB();
    const page = query.page || 1;
    const limit = query.limit || 20;
    const filter: Record<string, unknown> = {};
    if (query.orderStatus) filter.orderStatus = query.orderStatus;
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
    if (query.vendorId) filter.vendorId = query.vendorId;

    const [orders, total] = await Promise.all([
      PurchaseOrder.find(filter)
        .populate("vendorId", "name companyName")
        .populate("products.productId", "name sku")
        .populate("createdBy", "name")
        .skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
      PurchaseOrder.countDocuments(filter),
    ]);
    return { orders, total, page, totalPages: Math.ceil(total / limit) };
  }

  static async getById(id: string) {
    await connectDB();
    return PurchaseOrder.findById(id)
      .populate("vendorId", "name companyName email")
      .populate("products.productId", "name sku price")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email");
  }

  static async create(data: CreatePOInput, userId: string, ip: string) {
    await connectDB();
    const totalAmount = data.products.reduce((sum, p) => sum + p.quantity * p.price, 0);

    const order = await PurchaseOrder.create({
      ...data,
      totalAmount,
      createdBy: userId,
      expectedDeliveryDate: new Date(data.expectedDeliveryDate),
    });

    await ActivityLog.create({
      userId, action: AuditAction.PO_CREATE, entityType: "PurchaseOrder", entityId: order._id, ipAddress: ip,
    });

    return order;
  }

  static async updateStatus(id: string, orderStatus: string, userId: string, ip: string) {
    await connectDB();
    const update: Record<string, unknown> = { orderStatus };

    if (orderStatus === OrderStatus.CONFIRMED) {
      update.approvedBy = userId;
    }

    const order = await PurchaseOrder.findByIdAndUpdate(id, update, { new: true });

    const action = orderStatus === OrderStatus.CANCELLED
      ? AuditAction.PO_CANCELLED
      : AuditAction.PO_APPROVED;

    await ActivityLog.create({
      userId, action, entityType: "PurchaseOrder", entityId: id,
      metadata: { orderStatus }, ipAddress: ip,
    });

    // On delivery, update product stock
    if (orderStatus === OrderStatus.DELIVERED && order) {
      for (const item of order.products) {
        const product = await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { quantity: item.quantity } },
          { new: true }
        );
        if (product && product.quantity <= product.lowStockThreshold) {
          await ActivityLog.create({
            userId, action: AuditAction.LOW_STOCK_ALERT, entityType: "Product",
            entityId: item.productId, metadata: { quantity: product.quantity, threshold: product.lowStockThreshold },
            ipAddress: ip,
          });
        }
      }
    }

    return order;
  }

  static async updatePaymentStatus(id: string, paymentStatus: string) {
    await connectDB();
    return PurchaseOrder.findByIdAndUpdate(id, { paymentStatus }, { new: true });
  }
}
