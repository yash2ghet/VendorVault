import { connectDB } from "@/config/database";
import { User } from "@/models/User";
import { ActivityLog } from "@/models/ActivityLog";
import { AuditAction } from "@/types";

export class UserService {
  static async getAll(query: { page?: number; limit?: number; role?: string }) {
    await connectDB();
    const page = query.page || 1;
    const limit = query.limit || 20;
    const filter: Record<string, unknown> = {};
    if (query.role) filter.role = query.role;

    const [users, total] = await Promise.all([
      User.find(filter).select("-__v").skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);
    return { users, total, page, totalPages: Math.ceil(total / limit) };
  }

  static async getById(id: string) {
    await connectDB();
    return User.findById(id).select("-__v");
  }

  static async updateRole(id: string, role: string, adminId: string, ip: string) {
    await connectDB();
    const user = await User.findByIdAndUpdate(id, { role }, { new: true });
    await ActivityLog.create({
      userId: adminId, action: AuditAction.USER_UPDATE, entityType: "User", entityId: id,
      metadata: { role }, ipAddress: ip,
    });
    return user;
  }

  static async delete(id: string, adminId: string, ip: string) {
    await connectDB();
    await ActivityLog.create({
      userId: adminId, action: AuditAction.USER_DELETE, entityType: "User", entityId: id, ipAddress: ip,
    });
    return User.findByIdAndDelete(id);
  }
}
