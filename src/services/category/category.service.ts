import { connectDB } from "@/config/database";
import { Category } from "@/models/Category";
import { ActivityLog } from "@/models/ActivityLog";
import { AuditAction } from "@/types";
import { z } from "zod";
import { createCategorySchema, updateCategorySchema } from "@/validators/category";

type CreateCategoryInput = z.infer<typeof createCategorySchema>;
type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export class CategoryService {
  static async getAll(query: { page?: number; limit?: number; status?: string }) {
    await connectDB();
    const page = query.page || 1;
    const limit = query.limit || 20;
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;

    const [categories, total] = await Promise.all([
      Category.find(filter).populate("parentCategory", "name").skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
      Category.countDocuments(filter),
    ]);
    return { categories, total, page, totalPages: Math.ceil(total / limit) };
  }

  static async getById(id: string) {
    await connectDB();
    return Category.findById(id).populate("parentCategory", "name");
  }

  static async create(data: CreateCategoryInput, userId: string, ip: string) {
    await connectDB();
    const category = await Category.create(data);
    await ActivityLog.create({
      userId, action: AuditAction.CATEGORY_CREATE, entityType: "Category", entityId: category._id, ipAddress: ip,
    });
    return category;
  }

  static async update(id: string, data: UpdateCategoryInput, userId: string, ip: string) {
    await connectDB();
    const category = await Category.findByIdAndUpdate(id, data, { new: true });
    await ActivityLog.create({
      userId, action: AuditAction.CATEGORY_UPDATE, entityType: "Category", entityId: id, metadata: data, ipAddress: ip,
    });
    return category;
  }

  static async delete(id: string) {
    await connectDB();
    return Category.findByIdAndDelete(id);
  }
}
