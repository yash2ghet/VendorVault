import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLog extends Document {
  userId?: string;       // better-auth session user id — NOT a Mongo ObjectId,
                          // so this must stay a plain string, not an ObjectId ref.
  actorName?: string;    // display name captured at write-time, since we can't
                          // reliably populate() against a non-ObjectId userId.
  action: string;        // e.g. "REQUEST_APPROVED", "USER_STATUS_CHANGED"
  entityType: string;    // e.g. "HardwareRequest", "User", "PurchaseOrder"
  entityId?: string;
  details: string;
  ipAddress: string;
  createdAt: Date;
}

const AuditLogSchema: Schema<IAuditLog> = new Schema(
  {
    userId: {
      type: String,
      required: false,
      index: true,
    },
    actorName: {
      type: String,
      required: false,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      required: false,
      index: true,
    },
    details: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      default: "System/Server",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "audit_logs",
  }
);

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;