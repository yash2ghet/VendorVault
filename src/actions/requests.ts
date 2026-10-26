"use server";

import { connectDB } from "@/lib/mongodb";
import HardwareRequest from "@/models/HardwareRequest";
import { revalidatePath } from "next/cache";
import { actionSession } from "@/lib/action-guard";
import { UserRole } from "@/types";
import { createNotification } from "@/lib/notification";
import { createSystemAuditLog } from "@/lib/audit-log";

interface CreateRequestInput {
  userId: string;
  userName: string;
  assetType: string;
  modelPreference: string;
  reason: string;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export async function createRequest(data: CreateRequestInput) {
  try {
    console.log("📥 [SERVER] createRequest payload received:", data);

    // identity comes from the session — the browser cannot file a request as someone else
    const me = await actionSession(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN);
    if (!me) return { success: false, error: "Only signed-in employees, managers or admins can submit a request." };
    data = { ...data, userId: me.userId, userName: me.name || data.userName };

    // 1. Establish database connection
    await connectDB();

    // 2. Validate essential incoming fields to prevent Mongoose validation crashes
    if (!data.userId || !data.assetType || !data.modelPreference || !data.reason) {
      console.error("❌ [SERVER] Missing required fields in form submission payload.");
      return { success: false, error: "Validation Error: All form fields are required." };
    }

    // 3. Write record to MongoDB collection
    const request = await HardwareRequest.create({
      ...data,
      status: "PENDING",
      isEdited: false
    });
    console.log("✅ [SERVER] Database entry saved successfully! ID:", request._id.toString());

    // 4. Fire notification quietly without letting it block the submission pipeline
    try {
      await createNotification({
        type: "info",
        title: "New Asset Request",
        description: `${data.userName} submitted a request for ${data.assetType}.`,
      });
    } catch (notifError) {
      console.error("🔔 [SERVER] Notification failed to log, skipping gracefully:", notifError);
    }

    // 5. Emit audit log
    await createSystemAuditLog({
      action: "REQUEST_CREATED",
      actor: me.name || data.userName,
      actorId: me.userId,
      entityType: "HardwareRequest",
      entityId: request._id.toString(),
      details: `${data.userName} submitted asset request for ${data.assetType} (${data.modelPreference}, Urgency: ${data.urgency})`,
    }).catch(() => {});

    // 6. Purge router cache layers to trigger data updates across pages
    revalidatePath("/requests");
    revalidatePath("/manager/approvals");

    return { success: true };
  } catch (error: any) {
    console.error("❌ [SERVER] Critical database operation failed:", error);
    return {
      success: false,
      error: error.message || "Internal Server Error occurred during save operation.",
    };
  }
}

export async function getUserRequests(userId: string) {
  try {
    const me = await actionSession(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN);
    if (!me || (me.role === UserRole.STAFF && me.userId !== userId)) return { success: false, data: [] };
    await connectDB();

    const requests = await HardwareRequest.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    const plainRequests = requests.map((r: any) => ({
      id: r._id.toString(),
      userId: r.userId,
      userName: r.userName,
      assetType: r.assetType,
      modelPreference: r.modelPreference,
      reason: r.reason,
      urgency: r.urgency,
      status: r.status,
      managerFeedback: r.managerFeedback,
      isEdited: r.isEdited || false,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt).toISOString(),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : new Date(r.updatedAt).toISOString(),
    }));

    return { success: true, data: plainRequests };
  } catch (error) {
    console.error("❌ [SERVER] Failed to fetch user requests:", error);
    return { success: false, data: [] };
  }
}

export async function deleteUserRequest(id: string) {
  try {
    await connectDB();
    const me = await actionSession(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN);
    if (!me) return { success: false, error: "Please sign in." };
    const own: any = await HardwareRequest.findById(id).select("userId assetType").lean();
    if (!own) return { success: false, error: "Document not found" };
    if (own.userId !== me.userId && me.role === UserRole.STAFF) return { success: false, error: "You can only change your own requests." };

    const result = await HardwareRequest.findByIdAndDelete(id);
    if (!result) return { success: false, error: "Document not found" };

    await createSystemAuditLog({
      action: "REQUEST_DELETED",
      actor: me.name,
      actorId: me.userId,
      entityType: "HardwareRequest",
      entityId: id,
      details: `${me.name} deleted asset request ticket for ${(own as any)?.assetType || "item"}`,
    }).catch(() => {});

    revalidatePath("/requests");
    revalidatePath("/manager/approvals");
    return { success: true };
  } catch (error) {
    console.error("❌ [SERVER] Failed to delete database record:", error);
    return { success: false, error: "Database transaction failed" };
  }
}

export async function updateUserRequest(
  id: string,
  updatedFields: {
    assetType?: string;
    modelPreference?: string;
    reason?: string;
    status?: string;
    isEdited?: boolean;
  }
) {
  try {
    await connectDB();
    const me = await actionSession(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN);
    if (!me) return { success: false, error: "Please sign in." };
    const own: any = await HardwareRequest.findById(id).select("userId").lean();
    if (!own) return { success: false, error: "Document not found" };
    if (own.userId !== me.userId && me.role === UserRole.STAFF) return { success: false, error: "You can only change your own requests." };

    // Server is the single source of truth for edit metadata — never trust
    // the client to compute this, so it can't drift out of sync with status.
    const result = await HardwareRequest.findByIdAndUpdate(
      id,
      {
        $set: { ...updatedFields, isEdited: true, lastEditedAt: new Date() },
        $inc: { editCount: 1 },
      },
      { new: true }
    ).lean();

    if (!result) return { success: false, error: "Document not found" };

    await createSystemAuditLog({
      action: "REQUEST_UPDATED",
      actor: me.name,
      actorId: me.userId,
      entityType: "HardwareRequest",
      entityId: id,
      details: `${me.name} updated asset request ticket for ${(result as any)?.assetType || "item"}`,
    }).catch(() => {});

    revalidatePath("/requests");
    revalidatePath("/manager/approvals");

    // Return the real saved doc so the UI reflects DB truth, not a guess
    return {
      success: true,
      data: {
        id: (result as any)._id.toString(),
        status: (result as any).status,
        editCount: (result as any).editCount || 0,
        lastEditedAt: (result as any).lastEditedAt
          ? new Date((result as any).lastEditedAt).toISOString()
          : null,
      },
    };
  } catch (error) {
    console.error("❌ [SERVER] Failed to update database record:", error);
    return { success: false, error: "Database transaction failed" };
  }
}

export async function revertRequestToPending(id: string) {
  try {
    await connectDB();
    const me = await actionSession(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN);
    if (!me) return { success: false, error: "Please sign in." };
    const own: any = await HardwareRequest.findById(id).select("userId assetType").lean();
    if (!own) return { success: false, error: "Document not found" };
    if (own.userId !== me.userId && me.role === UserRole.STAFF) return { success: false, error: "You can only change your own requests." };

    const result = await HardwareRequest.findByIdAndUpdate(
      id,
      {
        $set: {
          status: "PENDING",
          managerFeedback: "",
        },
      },
      { new: true }
    ).lean();

    if (!result) return { success: false, error: "Document not found" };

    await createSystemAuditLog({
      action: "REQUEST_REVERTED",
      actor: me.name,
      actorId: me.userId,
      entityType: "HardwareRequest",
      entityId: id,
      details: `${me.name} reverted asset request status to PENDING for ${(result as any)?.assetType || "item"}`,
    }).catch(() => {});

    revalidatePath("/requests");
    revalidatePath("/manager/approvals");
    return { success: true };
  } catch (error) {
    console.error("❌ [SERVER] Failed to revert request status:", error);
    return { success: false, error: "Database transaction failed" };
  }
}
