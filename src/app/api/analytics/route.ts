import { guard } from "@/lib/api-guard";
import { UserRole } from "@/types";
import { NextResponse } from "next/server";
import { connectDB } from "@/config/database";
import { Vendor } from "@/models/Vendor";
import { Product } from "@/models/Product";
import { Brand } from "@/models/Brand";
import { Category } from "@/models/Category";
import { PurchaseOrder } from "@/models/Order";
import { User } from "@/models/User";

export async function GET() {
  try {
    const g = await guard(UserRole.ADMIN, UserRole.MANAGER);
    if (!g.ok) return g.response;
    await connectDB();

    const [vendors, products, categories, brands, orders, users] = await Promise.all([
      Vendor.countDocuments(),
      Product.countDocuments(),
      Category.countDocuments(),
      Brand.countDocuments(),
      PurchaseOrder.countDocuments(),
      User.countDocuments(),
    ]);

    const productsByCategory = await Product.aggregate([
      { $match: { status: "ACTIVE" } },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
      { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" } },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      { $project: { name: { $ifNull: ["$category.name", "Uncategorized"] }, count: 1 } },
      { $sort: { count: -1 } },
    ]);

    const ordersByMonth = await PurchaseOrder.aggregate([
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 },
    ]);

    const vendorPerformance = await PurchaseOrder.aggregate([
      { $match: { orderStatus: "DELIVERED" } },
      { $group: { _id: "$vendorId", totalOrders: { $sum: 1 }, totalRevenue: { $sum: "$totalAmount" } } },
      { $lookup: { from: "vendors", localField: "_id", foreignField: "_id", as: "vendor" } },
      { $unwind: { path: "$vendor", preserveNullAndEmptyArrays: true } },
      { $project: { vendorName: { $ifNull: ["$vendor.name", "Unknown"] }, totalOrders: 1, totalRevenue: 1 } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
    ]);

    return NextResponse.json({
      cards: { vendors, products, categories, brands, orders, users },
      productsByCategory,
      ordersByMonth,
      vendorPerformance,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
