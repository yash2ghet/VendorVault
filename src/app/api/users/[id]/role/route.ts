import { NextRequest, NextResponse } from "next/server";
import { adminChangeRole } from "@/lib/user-admin";

type Params = { params: Promise<{ id: string }> };

/** PATCH { role } — administrators only (checks and audit logging live in lib/user-admin.ts). */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const r = await adminChangeRole(id, String(body.role ?? ""));
  return r.ok ? NextResponse.json(r.data) : NextResponse.json({ error: r.error }, { status: r.status });
}
