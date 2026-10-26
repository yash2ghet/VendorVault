import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/database";
import { Vendor } from "@/models/Vendor";
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

    const [vendors, total] = await Promise.all([
      Vendor.find(filter)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Vendor.countDocuments(filter),
    ]);

    return NextResponse.json({ vendors, total, page, totalPages: Math.ceil(total / limit) });
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

    const vendor = await Vendor.create({
      name: body.name,
      email: body.email,
      phone: body.phone,
      companyName: body.companyName,
      gstNumber: body.gstNumber,
      address: body.address,
      city: body.city,
      state: body.state,
      country: body.country || "India",
      status: body.status || "ACTIVE",
    });

    await createSystemAuditLog({
      action: "VENDOR_CREATE",
      actor: g.userName,
      actorId: g.userId,
      entityType: "Vendor",
      entityId: vendor._id.toString(),
      details: `Created vendor '${vendor.name}' (${vendor.companyName || "No company"})`,
      ipAddress: resolveIpFromRequest(req),
    }).catch(() => {});

    return NextResponse.json(vendor, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
