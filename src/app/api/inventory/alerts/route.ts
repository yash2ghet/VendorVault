import { guard } from "@/lib/api-guard";
import { UserRole } from "@/types";
import { NextResponse } from "next/server";
import { connectDB } from "@/config/database";
import { Product } from "@/models/Product";

export async function GET() {
  try {
    const g = await guard(UserRole.ADMIN, UserRole.MANAGER);
    if (!g.ok) return g.response;
    await connectDB();

    const products = await Product.find({
      $expr: { $lte: ["$quantity", "$lowStockThreshold"] },
      status: "ACTIVE",
    })
      .populate("vendorId", "name email")
      .lean();

    const alerts = products.map((p: any) => ({
      productId: p._id.toString(),
      productName: p.name,
      sku: p.sku,
      currentQuantity: p.quantity,
      threshold: p.lowStockThreshold,
      vendorId: p.vendorId?._id?.toString() ?? "",
    }));

    return NextResponse.json({ alerts, count: alerts.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
