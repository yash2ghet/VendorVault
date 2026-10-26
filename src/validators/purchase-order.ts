import { z } from "zod";

export const createPurchaseOrderSchema = z.object({
  vendorId: z.string(),
  products: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1),
        price: z.number().min(0),
      })
    )
    .min(1),
  expectedDeliveryDate: z.string().datetime(),
  notes: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  orderStatus: z.enum([
    "DRAFT",
    "PENDING",
    "CONFIRMED",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ]),
});

export const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(["UNPAID", "PARTIAL", "PAID", "REFUNDED"]),
});
