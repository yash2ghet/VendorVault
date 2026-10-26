import { connectDB } from "@/config/database";
import { ActivityLog } from "@/models/ActivityLog";

export class AuditService {
  static async getLogs(query: {
    page?: number; limit?: number; userId?: string; action?: string;
    entityType?: string; startDate?: string; endDate?: string;
  }) {
    await connectDB();
    const page = query.page || 1;
    const limit = query.limit || 50;
    const filter: Record<string, unknown> = {};

    if (query.userId) filter.userId = query.userId;
    if (query.action) filter.action = query.action;
    if (query.entityType) filter.entityType = query.entityType;
    if (query.startDate || query.endDate) {
      filter.timestamp = {};
      if (query.startDate) (filter.timestamp as any).$gte = new Date(query.startDate);
      if (query.endDate) (filter.timestamp as any).$lte = new Date(query.endDate);
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate("userId", "name email")
        .skip((page - 1) * limit).limit(limit).sort({ timestamp: -1 }),
      ActivityLog.countDocuments(filter),
    ]);

    return { logs, total, page, totalPages: Math.ceil(total / limit) };
  }
}
