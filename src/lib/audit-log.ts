import { connectDB } from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";
import { headers } from "next/headers";

// NOTE: deliberately NOT a "use server" file. Anything exported from a "use server" file is a public
// HTTP endpoint, which would let any visitor write fake entries into the audit trail. This helper
// can only be called from our own server code.

interface CreateLogInput {
  action: string;
  // Two supported naming styles, since different call sites in this codebase
  // use different names for the same concepts — both are accepted here so
  // no caller silently fails to compile or silently logs nothing.
  actor?: string;       // display name of who performed the action
  actorId?: string;     // string session user id (not a Mongo ObjectId)
  userId?: string;      // alias for actorId
  entityType?: string;  // e.g. "HardwareRequest", "User" — defaults to "System"
  entityId?: string;
  targetId?: string;    // alias for entityId
  details: string;
  ipAddress?: string;
}

/** Best-effort request IP lookup for Server Actions, which don't get a
 *  NextRequest directly. Falls back gracefully if headers aren't available
 *  (e.g. outside a request context). */
async function resolveIp(explicit?: string) {
  if (explicit) return explicit;
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim()
      || h.get("x-real-ip")
      || "System/Server";
  } catch {
    return "System/Server";
  }
}

export async function createSystemAuditLog(input: CreateLogInput) {
  try {
    await connectDB();

    const log = await AuditLog.create({
      userId: input.userId || input.actorId || undefined,
      actorName: input.actor || undefined,
      action: input.action,
      entityType: input.entityType || "System",
      entityId: input.entityId || input.targetId || undefined,
      details: input.details,
      ipAddress: await resolveIp(input.ipAddress),
    });

    return { success: true, data: JSON.parse(JSON.stringify(log)) };
  } catch (error) {
    // Logging must never break the primary action it's attached to — every
    // caller already fire-and-forgets or .catch()es this, so we just report
    // failure here rather than throwing.
    console.error("Global Logging Failure:", error);
    return { success: false, error: "Failed to record transaction log." };
  }
}
