import mongoose, { Schema, Document, Types } from "mongoose";

export interface IProduct extends Document {
  name: string;
  sku: string;
  price: number;
  quantity: number;
  lowStockThreshold: number;
  brandId: Types.ObjectId;
  categoryId: Types.ObjectId;
  vendorId: Types.ObjectId;
  description?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 10, min: 0 },
    brandId: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    description: { type: String },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
  },
  { timestamps: true }
);

export const Product =
  mongoose.models.Product ||
  mongoose.model<IProduct>("Product", ProductSchema);
