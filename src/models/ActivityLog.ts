import mongoose, { Schema, Document, Types } from "mongoose";
import { AuditAction } from "@/types";

export interface IActivityLog extends Document {
  userId: Types.ObjectId;
  action: AuditAction;
  entityType: string;
  entityId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, enum: Object.values(AuditAction), required: true },
  entityType: { type: String, required: true },
  entityId: { type: Schema.Types.ObjectId },
  metadata: { type: Schema.Types.Mixed },
  ipAddress: { type: String, required: true },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now, index: true },
});

ActivityLogSchema.index({ userId: 1, timestamp: -1 });
ActivityLogSchema.index({ action: 1, timestamp: -1 });

export const ActivityLog =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
