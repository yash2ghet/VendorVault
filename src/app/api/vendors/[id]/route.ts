import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/database";
import { Vendor } from "@/models/Vendor";
import { createNotification } from "@/lib/notification";
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

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const g = await guard(UserRole.ADMIN, UserRole.MANAGER);
    if (!g.ok) return g.response;

    await connectDB();
    const { id } = await params;
    const vendor = await Vendor.findById(id).lean();

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    return NextResponse.json(vendor);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const g = await guard(UserRole.ADMIN, UserRole.MANAGER);
    if (!g.ok) return g.response;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const vendor = await Vendor.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Trigger Notification for Update
    await createNotification({
      type: "info",
      title: "Vendor Updated",
      description: `Vendor profile details for '${(vendor as any).name || "Unknown"}' were modified.`,
    });

    // Create Audit Log
    await createSystemAuditLog({
      action: "VENDOR_UPDATE",
      actor: g.userName,
      actorId: g.userId,
      entityType: "Vendor",
      entityId: id,
      details: `Updated vendor profile for '${(vendor as any).name || (vendor as any).companyName || id}'`,
      ipAddress: resolveIpFromRequest(req),
    }).catch(() => {});

    return NextResponse.json(vendor);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const g = await guard(UserRole.ADMIN, UserRole.MANAGER);
    if (!g.ok) return g.response;

    await connectDB();
    const { id } = await params;
    const vendor = await Vendor.findByIdAndDelete(id);

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Trigger Notification for Delete
    await createNotification({
      type: "error",
      title: "Vendor Deleted",
      description: `Vendor profile '${(vendor as any).name || "Unknown"}' was permanently removed.`,
    });

    // Create Audit Log
    await createSystemAuditLog({
      action: "VENDOR_DELETE",
      actor: g.userName,
      actorId: g.userId,
      entityType: "Vendor",
      entityId: id,
      details: `Permanently removed vendor '${(vendor as any).name || (vendor as any).companyName || id}'`,
      ipAddress: resolveIpFromRequest(req),
    }).catch(() => {});

    return NextResponse.json({ message: "Vendor deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}