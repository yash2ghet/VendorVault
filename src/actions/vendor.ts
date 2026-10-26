"use server";

import { connectDB } from "@/lib/mongodb";
import { Vendor } from "@/models/Vendor";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notification";
import { actionSession } from "@/lib/action-guard";
import { UserRole } from "@/types";
import { createSystemAuditLog } from "@/lib/audit-log";

export async function verifyVendorAction(vendorId: string) {
  try {
    const me = await actionSession(UserRole.ADMIN, UserRole.MANAGER);
    if (!me) {
      return { success: false, error: "Only administrators and managers can verify vendors." };
    }

    await connectDB();

    const result = await Vendor.findByIdAndUpdate(
      vendorId,
      {
        $set: {
          verification: "VERIFIED",
          verificationStatus: "VERIFIED",
        },
      },
      { new: true }
    );

    if (!result) {
      return {
        success: false,
        error: "Vendor not found",
      };
    }

    // 🔔 Create notification
    await createNotification({
      type: "success",
      title: "Vendor Verified",
      description: `Vendor "${result.name}" has been verified successfully.`,
    });

    // 📜 Create audit log
    await createSystemAuditLog({
      action: "VENDOR_VERIFY",
      actor: me.name,
      actorId: me.userId,
      entityType: "Vendor",
      entityId: vendorId,
      details: `Vendor "${result.name}" verified successfully.`,
    }).catch(() => {});

    revalidatePath("/dashboard/vendors");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Verification server error:", error);

    return {
      success: false,
      error: "Failed to update vendor status",
    };
  }
}