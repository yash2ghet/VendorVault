import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/database";
import { Category } from "@/models/Category";
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
    const category = await Category.findById(id).populate("parentCategory", "name").lean();

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json(category);
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

    const category = await Category.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).populate("parentCategory", "name").lean();

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Trigger Notification for Update
    await createNotification({
      type: "info",
      title: "Category Updated",
      description: `Taxonomy nodes reconfigured: Category '${(category as any).name}' changed.`,
    });

    // Create Audit Log
    await createSystemAuditLog({
      action: "CATEGORY_UPDATE",
      actor: g.userName,
      actorId: g.userId,
      entityType: "Category",
      entityId: id,
      details: `Updated category specifications for '${(category as any).name}'`,
      ipAddress: resolveIpFromRequest(req),
    }).catch(() => {});

    return NextResponse.json(category);
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
    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Trigger Notification for Delete
    await createNotification({
      type: "error",
      title: "Category Deleted",
      description: `Operational group classification '${(category as any).name}' completely removed.`,
    });

    // Create Audit Log
    await createSystemAuditLog({
      action: "CATEGORY_DELETE",
      actor: g.userName,
      actorId: g.userId,
      entityType: "Category",
      entityId: id,
      details: `Removed category '${(category as any).name}' from system taxonomy`,
      ipAddress: resolveIpFromRequest(req),
    }).catch(() => {});

    return NextResponse.json({ message: "Category deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}