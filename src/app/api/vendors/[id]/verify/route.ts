import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/database";
import { Vendor } from "@/models/Vendor";
import { guard } from "@/lib/api-guard";
import { UserRole } from "@/types";
import { createSystemAuditLog } from "@/lib/audit-log";

type Params = { params: Promise<{ id: string }> };

function resolveIpFromRequest(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "System/Server"
  );
}

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const g = await guard(UserRole.ADMIN, UserRole.MANAGER);
    if (!g.ok) return g.response;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const update: Record<string, unknown> = {
      verificationStatus: body.verificationStatus,
    };
    if (body.verificationStatus === "VERIFIED") {
      update.verifiedAt = new Date();
    }
    if (body.notes) {
      update.notes = body.notes;
    }

    const vendor = await Vendor.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const action = body.verificationStatus === "SUSPENDED" ? "VENDOR_SUSPEND" : "VENDOR_VERIFY";
    await createSystemAuditLog({
      action,
      actor: g.userName,
      actorId: g.userId,
      entityType: "Vendor",
      entityId: id,
      details: `Vendor '${(vendor as any).name || (vendor as any).companyName || id}' verification status changed to '${body.verificationStatus}'${body.notes ? `: ${body.notes}` : ""}`,
      ipAddress: resolveIpFromRequest(req),
    }).catch(() => {});

    return NextResponse.json(vendor);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
