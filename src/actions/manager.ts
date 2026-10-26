"use server";

import { connectDB } from "@/lib/mongodb";
import HardwareRequest from "@/models/HardwareRequest";
import { revalidatePath } from "next/cache";
import { actionSession } from "@/lib/action-guard";
import { UserRole } from "@/types";
import { sendRequestStatusEmail, getUserEmailById } from "@/lib/email";
import { createSystemAuditLog } from "@/lib/audit-log";

export async function getAllPendingRequests() {
  try {
    if (!(await actionSession(UserRole.MANAGER, UserRole.ADMIN))) return { success: false, data: [] };
    await connectDB();

    const requests = await HardwareRequest.find({
      status: "PENDING",
    }).lean();

    return {
      success: true,
      data: requests.map((r: any) => ({
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
        editCount: r.editCount || 0,
        lastEditedAt: r.lastEditedAt ? new Date(r.lastEditedAt).toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      data: [],
    };
  }
}

export async function getManagerHistoryLogs() {
  try {
    if (!(await actionSession(UserRole.MANAGER, UserRole.ADMIN))) return { success: false, data: [] };
    await connectDB();

    // Fetch all requests that are no longer pending
    const history = await HardwareRequest.find({
      status: { $in: ["APPROVED_BY_MANAGER", "PROCURED_BY_ADMIN", "REJECTED"] },
    })
      .sort({ updatedAt: -1 })
      .lean();

    return {
      success: true,
      data: history.map((r: any) => ({
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
        editCount: r.editCount || 0,
        lastEditedAt: r.lastEditedAt ? new Date(r.lastEditedAt).toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Failed to fetch manager history logs:", error);
    return {
      success: false,
      data: [],
    };
  }
}

export async function updateRequestStatus(
  requestId: string,
  status: "APPROVED_BY_MANAGER" | "REJECTED",
  feedback: string,
  actor?: { id?: string; name?: string }
) {
  try {
    const me = await actionSession(UserRole.MANAGER, UserRole.ADMIN);
    if (!me) return { success: false, error: "Only managers or admins can review requests." };
    actor = { id: me.userId, name: me.name }; // trust the session, not the browser
    await connectDB();

    // Fetch previous state for potential undo features
    const originalRequest: any = await HardwareRequest.findById(requestId).lean();
    if (!originalRequest) {
      return { success: false, error: "Request not found" };
    }

    const previousStatus = originalRequest.status;
    const previousFeedback = originalRequest.managerFeedback;

    const request = await HardwareRequest.findByIdAndUpdate(
      requestId,
      {
        status,
        managerFeedback: feedback,
      },
      {
        new: true,
      }
    ).lean();

    // Send to the employee who raised the request (previously hard-coded to a dummy address)
    const employeeEmail = await getUserEmailById((request as any).userId);
    if (employeeEmail) {
      await sendRequestStatusEmail({
        toEmail: employeeEmail,
        employeeName: (request as any).userName,
        assetType: (request as any).assetType,
        status,
        feedback,
      });
    } else {
      console.warn(`[manager] No email found for user ${(request as any).userId}; status email skipped.`);
    }

    // 📜 Emit audit log
    const actionType = status === "APPROVED_BY_MANAGER" ? "REQUEST_APPROVED" : "REQUEST_REJECTED";
    await createSystemAuditLog({
      action: actionType,
      actor: me.name,
      actorId: me.userId,
      entityType: "HardwareRequest",
      entityId: requestId,
      details: `${status === "APPROVED_BY_MANAGER" ? "Approved" : "Rejected"} asset request for ${(originalRequest as any).userName} (${(originalRequest as any).assetType})${feedback ? `: ${feedback}` : ""}`,
    }).catch(() => {});

    revalidatePath("/requests");
    revalidatePath("/manager/approvals");

    return { 
      success: true, 
      previousStatus, 
      previousFeedback 
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "Internal Server Error",
    };
  }
} 

// NEW: Server action to handle revert / undo logic
export async function undoRequestStatus(
  requestId: string,
  targetStatus: "PENDING" = "PENDING",
  feedback?: string,
  actor?: { id?: string; name?: string }
) {
  try {
    const me = await actionSession(UserRole.MANAGER, UserRole.ADMIN);
    if (!me) return { success: false, error: "Only managers or admins can undo a decision." };
    actor = { id: me.userId, name: me.name };
    await connectDB();

    const request = await HardwareRequest.findByIdAndUpdate(
      requestId,
      {
        status: targetStatus,
        managerFeedback: feedback || "", // Clears out manager feedback on revert
      },
      { new: true }
    ).lean();

    if (!request) {
      return { success: false, error: "Request not found" };
    }

    // 📜 Emit audit log
    await createSystemAuditLog({
      action: "REQUEST_DECISION_UNDONE",
      actor: me.name,
      actorId: me.userId,
      entityType: "HardwareRequest",
      entityId: requestId,
      details: `Reverted review decision for ${(request as any).userName} (${(request as any).assetType}) back to ${targetStatus}`,
    }).catch(() => {});

    revalidatePath("/requests");
    revalidatePath("/manager/approvals");

    return { success: true };
  } catch (error) {
    console.error("Failed to revert request status:", error);
    return { success: false, error: "Internal Server Error" };
  }
}
