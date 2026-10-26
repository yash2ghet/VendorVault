"use server";

import { adminChangeRole, adminDeleteUser, adminLinkVendor } from "@/lib/user-admin";

// Server Actions are public HTTP endpoints. The caller's identity and role come from the session
// inside lib/user-admin.ts — the `_actorId` argument is kept only so existing call sites compile
// and is IGNORED (a client must never be able to say who it is).

export async function updateSystemUserRole(userId: string, role: string, _actorId?: string) {
  const r = await adminChangeRole(userId, role);
  return r.ok ? { success: true as const, data: r.data } : { success: false as const, error: r.error };
}

export async function linkSupplierVendor(userId: string, vendorId: string | null) {
  const r = await adminLinkVendor(userId, vendorId);
  return r.ok ? { success: true as const, data: r.data } : { success: false as const, error: r.error };
}

export async function deleteSystemUser(userId: string, _actorId?: string) {
  const r = await adminDeleteUser(userId);
  return r.ok ? { success: true as const } : { success: false as const, error: r.error };
}
