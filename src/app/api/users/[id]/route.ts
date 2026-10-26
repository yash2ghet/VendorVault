import { NextRequest, NextResponse } from "next/server";
import { adminChangeRole, adminDeleteUser, adminGetUser, adminLinkVendor, type AdminResult } from "@/lib/user-admin";

type Params = { params: Promise<{ id: string }> };

const respond = (r: AdminResult) =>
  r.ok ? NextResponse.json(r.data) : NextResponse.json({ error: r.error }, { status: r.status });

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  return respond(await adminGetUser(id));
}

/** Body: { role?: "ADMIN"|"MANAGER"|"STAFF"|"SUPPLIER", vendorId?: string | null } — administrators only. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  let result: AdminResult | null = null;
  if (typeof body.role === "string") {
    result = await adminChangeRole(id, body.role);
    if (!result.ok) return respond(result);
  }
  if ("vendorId" in body) {
    result = await adminLinkVendor(id, body.vendorId ? String(body.vendorId) : null);
  }
  return respond(result ?? { ok: false, status: 400, error: "Nothing to update (send role and/or vendorId)." });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const r = await adminDeleteUser(id);
  return r.ok ? NextResponse.json({ message: "User deleted" }) : respond(r);
}
