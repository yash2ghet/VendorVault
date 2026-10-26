import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/database";
import { Category } from "@/models/Category";
import { guard } from "@/lib/api-guard";
import { UserRole } from "@/types";
import { createSystemAuditLog } from "@/lib/audit-log";

function resolveIpFromRequest(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "System/Server"
  );
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const g = await guard(UserRole.ADMIN, UserRole.MANAGER);
    if (!g.ok) return g.response;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;

    const filter: Record<string, unknown> = {};
    if (searchParams.get("status")) filter.status = searchParams.get("status");

    // Fetch documents, populate parent fields, and count total in parallel
    const [categories, total] = await Promise.all([
      Category.find(filter)
        .populate("parentCategory", "name")
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Category.countDocuments(filter),
    ]);

    return NextResponse.json({ 
      categories, 
      total, 
      page, 
      totalPages: Math.ceil(total / limit) 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const g = await guard(UserRole.ADMIN, UserRole.MANAGER);
    if (!g.ok) return g.response;

    await connectDB();
    const body = await req.json();

    const category = await Category.create({
      name: body.name,
      description: body.description || "",
      parentCategory: body.parentCategory || null,
      status: body.status || "ACTIVE",
    });

    await createSystemAuditLog({
      action: "CATEGORY_CREATE",
      actor: g.userName,
      actorId: g.userId,
      entityType: "Category",
      entityId: category._id.toString(),
      details: `Created category '${category.name}'`,
      ipAddress: resolveIpFromRequest(req),
    }).catch(() => {});

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}