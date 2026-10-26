import { connectDB } from "@/config/database";
import { Brand } from "@/models/Brand";
import { ActivityLog } from "@/models/ActivityLog";
import { AuditAction } from "@/types";
import { z } from "zod";
import { createBrandSchema, updateBrandSchema } from "@/validators/brand";

type CreateBrandInput = z.infer<typeof createBrandSchema>;
type UpdateBrandInput = z.infer<typeof updateBrandSchema>;

export class BrandService {
  static async getAll(query: { page?: number; limit?: number; status?: string }) {
    await connectDB();
    const page = query.page || 1;
    const limit = query.limit || 20;
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;

    const [brands, total] = await Promise.all([
      Brand.find(filter).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
      Brand.countDocuments(filter),
    ]);
    return { brands, total, page, totalPages: Math.ceil(total / limit) };
  }

  static async getById(id: string) {
    await connectDB();
    return Brand.findById(id);
  }

  static async create(data: CreateBrandInput, userId: string, ip: string) {
    await connectDB();
    const brand = await Brand.create(data);
    await ActivityLog.create({
      userId, action: AuditAction.BRAND_CREATE, entityType: "Brand", entityId: brand._id, ipAddress: ip,
    });
    return brand;
  }

  static async update(id: string, data: UpdateBrandInput, userId: string, ip: string) {
    await connectDB();
    const brand = await Brand.findByIdAndUpdate(id, data, { new: true });
    await ActivityLog.create({
      userId, action: AuditAction.BRAND_UPDATE, entityType: "Brand", entityId: id, metadata: data, ipAddress: ip,
    });
    return brand;
  }

  static async delete(id: string) {
    await connectDB();
    return Brand.findByIdAndDelete(id);
  }
}
