import { guard } from "@/lib/api-guard";
import { UserRole } from "@/types";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

// Uses your preexisting Product model or creates a minimal interface binding
const ProductModel = mongoose.models.Product || mongoose.model("Product", new mongoose.Schema({
  name: String,
  sku: String,
  stock: Number,
  price: Number,
  vendor: String
}));

export async function GET() {
  try {
    const g = await guard(UserRole.ADMIN, UserRole.MANAGER);
    if (!g.ok) return g.response;
    // Queries any structural stock entry that dropped below or equals critical limit (5 units)
    const lowStockItems = await ProductModel.find({ stock: { $lte: 5 } }).lean();
    return NextResponse.json(lowStockItems);
  } catch (error) {
    return NextResponse.json({ error: "Failed to compile alerts context" }, { status: 500 });
  }
}