import mongoose, { Schema, Document, Types } from "mongoose";
import { OrderStatus, PaymentStatus } from "@/types";

export interface OrderItem {
  productId: Types.ObjectId;
  quantity: number;
  price: number;
}

export interface IPurchaseOrder extends Document {
  vendorId: Types.ObjectId;
  products: OrderItem[];
  totalAmount: number;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  expectedDeliveryDate: Date;
  createdBy?: any;
  approvedBy?: any;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<OrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    products: { type: [OrderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0, default: 0 },
    orderStatus: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.DRAFT,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.UNPAID,
    },
    expectedDeliveryDate: { type: Date, required: true },
    createdBy: { type: Schema.Types.Mixed, ref: "User" },
    approvedBy: { type: Schema.Types.Mixed, ref: "User" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const PurchaseOrder =
  mongoose.models.PurchaseOrder ||
  mongoose.model<IPurchaseOrder>("PurchaseOrder", PurchaseOrderSchema);
