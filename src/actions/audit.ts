"use server";

import { connectDB } from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";
import { actionSession } from "@/lib/action-guard";
import { UserRole } from "@/types";

/** Reading the audit trail is for admins and managers only. (Writing is lib/audit-log.ts — server-only.) */
export async function getSystemAuditLogs() {
  try {
    const me = await actionSession(UserRole.ADMIN, UserRole.MANAGER);
    if (!me) return { success: false, data: [] };

    await connectDB();
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100).lean();
    return { success: true, data: JSON.parse(JSON.stringify(logs)) };
  } catch (error) {
    console.error("Failed to read audit logs:", error);
    return { success: false, data: [] };
  }
}
