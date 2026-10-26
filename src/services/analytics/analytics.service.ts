import { connectDB } from "@/config/database";
import { Vendor } from "@/models/Vendor";
import { Product } from "@/models/Product";
import { Brand } from "@/models/Brand";
import { Category } from "@/models/Category";
import { PurchaseOrder } from "@/models/PurchaseOrder";
import { User } from "@/models/User";

export class AnalyticsService {
  static async getDashboardCards() {
    await connectDB();
    const [vendors, products, categories, brands, orders, users] =
      await Promise.all([
        Vendor.countDocuments(),
        Product.countDocuments(),
        Category.countDocuments(),
        Brand.countDocuments(),
        PurchaseOrder.countDocuments(),
        User.countDocuments(),
      ]);

    return { vendors, products, categories, brands, orders, users };
  }

  static async getProductsByCategory() {
    await connectDB();
    return Product.aggregate([
      { $match: { status: "ACTIVE" } },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      { $project: { name: "$category.name", count: 1 } },
      { $sort: { count: -1 } },
    ]);
  }

  static async getOrdersByMonth() {
    await connectDB();
    return PurchaseOrder.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 },
    ]);
  }

  static async getVendorPerformance() {
    await connectDB();
    return PurchaseOrder.aggregate([
      { $match: { orderStatus: "DELIVERED" } },
      {
        $group: {
          _id: "$vendorId",
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
      {
        $lookup: {
          from: "vendors",
          localField: "_id",
          foreignField: "_id",
          as: "vendor",
        },
      },
      { $unwind: "$vendor" },
      {
        $project: {
          vendorName: "$vendor.name",
          totalOrders: 1,
          totalRevenue: 1,
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
    ]);
  }
}
