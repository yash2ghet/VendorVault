import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/database";
import { Brand } from "@/models/Brand";
import { createSystemAuditLog } from "@/lib/audit-log";
import { guard } from "@/lib/api-guard";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

function resolveIpFromRequest(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "System/Server"
  );
}

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

    const [brands, total] = await Promise.all([
      Brand.find(filter)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Brand.countDocuments(filter),
    ]);

    // Matches your exact vendor return structure format
    return NextResponse.json({ brands, total, page, totalPages: Math.ceil(total / limit) });
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

    const brand = await Brand.create({
      name: body.name,
      logo: body.logo || "",
      description: body.description || "",
      status: body.status || "ACTIVE",
    });

    await createSystemAuditLog({
      action: "BRAND_CREATE",
      actor: g.userName,
      actorId: g.userId,
      entityType: "Brand",
      entityId: brand._id.toString(),
      details: `Registered brand '${brand.name}' into catalog`,
      ipAddress: resolveIpFromRequest(req),
    }).catch(() => {});

    return NextResponse.json(brand, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}