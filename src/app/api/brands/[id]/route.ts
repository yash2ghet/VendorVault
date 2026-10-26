import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/database";
import { Brand } from "@/models/Brand";
import { createNotification } from "@/lib/notification";
import { createSystemAuditLog } from "@/lib/audit-log";
import { guard } from "@/lib/api-guard";
import { UserRole } from "@/types";

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
    const brand = await Brand.findById(id).lean();

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    return NextResponse.json(brand);
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

    const brand = await Brand.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Trigger Notification for Update
    await createNotification({
      type: "info",
      title: "Brand Updated",
      description: `Brand profiles modified: Parameters for '${(brand as any).name}' updated.`,
    });

    await createSystemAuditLog({
      action: "BRAND_UPDATE",
      actor: g.userName,
      actorId: g.userId,
      entityType: "Brand",
      entityId: id,
      details: `Updated brand profile for '${(brand as any).name}'`,
      ipAddress: resolveIpFromRequest(req),
    }).catch(() => {});

    return NextResponse.json(brand);
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
    const brand = await Brand.findByIdAndDelete(id);

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Trigger Notification for Delete
    await createNotification({
      type: "error",
      title: "Brand Deleted",
      description: `Brand label identity references for '${(brand as any).name}' deleted.`,
    });

    await createSystemAuditLog({
      action: "BRAND_DELETED",
      actor: g.userName,
      actorId: g.userId,
      entityType: "Brand",
      entityId: id,
      details: `Removed brand '${(brand as any).name}' from catalog`,
      ipAddress: resolveIpFromRequest(req),
    }).catch(() => {});

    return NextResponse.json({ message: "Brand deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}