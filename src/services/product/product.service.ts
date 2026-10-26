import { connectDB } from "@/config/database";
import { Product } from "@/models/Product";
import { ActivityLog } from "@/models/ActivityLog";
import { AuditAction } from "@/types";
import { z } from "zod";
import { createProductSchema, updateProductSchema } from "@/validators/product";

type CreateProductInput = z.infer<typeof createProductSchema>;
type UpdateProductInput = z.infer<typeof updateProductSchema>;

export class ProductService {
  static async getAll(query: {
    page?: number; limit?: number; status?: string;
    brandId?: string; categoryId?: string; vendorId?: string; search?: string;
  }) {
    await connectDB();
    const page = query.page || 1;
    const limit = query.limit || 20;
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.brandId) filter.brandId = query.brandId;
    if (query.categoryId) filter.categoryId = query.categoryId;
    if (query.vendorId) filter.vendorId = query.vendorId;
    if (query.search) filter.name = { $regex: query.search, $options: "i" };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("brandId", "name")
        .populate("categoryId", "name")
        .populate("vendorId", "name companyName")
        .skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
      Product.countDocuments(filter),
    ]);
    return { products, total, page, totalPages: Math.ceil(total / limit) };
  }

  static async getById(id: string) {
    await connectDB();
    return Product.findById(id)
      .populate("brandId", "name logo")
      .populate("categoryId", "name")
      .populate("vendorId", "name companyName email");
  }

  static async create(data: Omit<CreateProductInput, "lowStockThreshold"> & { lowStockThreshold?: number }, userId: string, ip: string) {
    await connectDB();
    const product = await Product.create(data);

    await ActivityLog.create({
      userId, action: AuditAction.PRODUCT_CREATE, entityType: "Product", entityId: product._id, ipAddress: ip,
    });

    if (product.quantity <= product.lowStockThreshold) {
      await ActivityLog.create({
        userId, action: AuditAction.LOW_STOCK_ALERT, entityType: "Product", entityId: product._id,
        metadata: { quantity: product.quantity, threshold: product.lowStockThreshold }, ipAddress: ip,
      });
    }

    return product;
  }

  static async update(id: string, data: UpdateProductInput, userId: string, ip: string) {
    await connectDB();
    const product = await Product.findByIdAndUpdate(id, data, { new: true });

    await ActivityLog.create({
      userId, action: AuditAction.PRODUCT_UPDATE, entityType: "Product", entityId: id, metadata: data, ipAddress: ip,
    });

    if (product && product.quantity <= product.lowStockThreshold) {
      await ActivityLog.create({
        userId, action: AuditAction.LOW_STOCK_ALERT, entityType: "Product", entityId: id,
        metadata: { quantity: product.quantity, threshold: product.lowStockThreshold }, ipAddress: ip,
      });
    }

    return product;
  }

  static async delete(id: string) {
    await connectDB();
    return Product.findByIdAndDelete(id);
  }
}
