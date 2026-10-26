import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getServerSession } from "@/middlewares/auth";
import { createSystemAuditLog } from "@/lib/audit-log";
import { User } from "@/models/User";
import { Vendor } from "@/models/Vendor";
import { UserRole } from "@/types";

/**
 * Everything an administrator can do to OTHER people's accounts, in one place.
 * Both the API routes (/api/users/...) and the server actions (actions/user.ts) call these, so the
 * safety rules can't drift apart:
 *   - the caller must be an ADMIN (checked against the database, not a cached cookie);
 *   - nobody can change or delete their own account here — this also guarantees at least one
 *     administrator always remains (the caller);
 *   - the role must be one of UserRole; vendor links only apply to SUPPLIER accounts.
 */

type Fail = { ok: false; status: number; error: string };
export type AdminResult<T = unknown> = { ok: true; data: T } | Fail;

const fail = (status: number, error: string): Fail => ({ ok: false, status, error });

async function requireAdmin() {
  const session = await getServerSession({ fresh: true }).catch(() => null);
  if (!session?.user) return fail(401, "Unauthorized — please sign in.");
  const role = (session.user as { role?: string }).role || UserRole.STAFF;
  if (role !== UserRole.ADMIN) return fail(403, "Forbidden — requires ADMIN role.");
  return {
    ok: true as const,
    id: session.user.id,
    name: session.user.name || session.user.email || "Admin",
  };
}

async function loadTarget(adminId: string, targetId: string, opts: { allowSelf?: boolean } = {}) {
  if (!mongoose.isValidObjectId(targetId)) return fail(400, "Invalid user id.");
  if (!opts.allowSelf && targetId === adminId) return fail(400, "You can't do that to your own account.");
  const target = await User.findById(targetId);
  if (!target) return fail(404, "User not found.");
  return { ok: true as const, target };
}

const plain = (doc: unknown) => JSON.parse(JSON.stringify(doc));

export async function adminChangeRole(targetId: string, newRole: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return admin;
  if (!Object.values(UserRole).includes(newRole as UserRole)) return fail(400, "Unknown role.");

  await connectDB();
  const t = await loadTarget(admin.id, targetId);
  if (!t.ok) return t;
  const { target } = t;

  const previous = target.role || UserRole.STAFF;
  if (previous === newRole) return { ok: true, data: plain(target) };

  // a vendor link only makes sense for SUPPLIER logins
  const update: Record<string, unknown> = { $set: { role: newRole, updatedAt: new Date() } };
  if (newRole !== UserRole.SUPPLIER) update.$unset = { vendorId: "" };
  await User.updateOne({ _id: target._id }, update);

  // force a fresh sign-in so their session carries the new role
  const ctx = await auth.$context;
  await ctx.adapter
    .deleteMany({ model: "session", where: [{ field: "userId", value: String(target._id) }] })
    .catch(() => {});

  await createSystemAuditLog({
    action: "USER_ROLE_UPDATED",
    actor: admin.name,
    actorId: admin.id,
    entityType: "User",
    entityId: targetId,
    details: `Changed role of ${target.name} (${target.email}) from ${previous} to ${newRole}.`,
  });

  return { ok: true, data: plain(await User.findById(targetId).select("-__v").lean()) };
}

/** vendorId = null unlinks. */
export async function adminLinkVendor(targetId: string, vendorId: string | null): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  await connectDB();
  const t = await loadTarget(admin.id, targetId, { allowSelf: true });
  if (!t.ok) return t;
  const { target } = t;
  if (target.role !== UserRole.SUPPLIER) return fail(400, "Only SUPPLIER accounts can be linked to a vendor.");

  let vendorName = "none";
  if (vendorId) {
    if (!mongoose.isValidObjectId(vendorId)) return fail(400, "Invalid vendor id.");
    const vendor = await Vendor.findById(vendorId).select("name companyName").lean<{ name?: string; companyName?: string }>();
    if (!vendor) return fail(404, "Vendor not found.");
    vendorName = vendor.companyName || vendor.name || vendorId;
    await User.updateOne({ _id: target._id }, { $set: { vendorId: String(vendorId), updatedAt: new Date() } });
  } else {
    await User.updateOne({ _id: target._id }, { $unset: { vendorId: "" }, $set: { updatedAt: new Date() } });
  }

  await createSystemAuditLog({
    action: "USER_VENDOR_LINKED",
    actor: admin.name,
    actorId: admin.id,
    entityType: "User",
    entityId: targetId,
    details: `Linked supplier login ${target.email} to vendor: ${vendorName}.`,
  });

  return { ok: true, data: plain(await User.findById(targetId).select("-__v").lean()) };
}

export async function adminDeleteUser(targetId: string): Promise<AdminResult<{ deleted: true }>> {
  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  await connectDB();
  const t = await loadTarget(admin.id, targetId);
  if (!t.ok) return t;
  const { target } = t;

  // removes the user, their credentials and sessions (Better Auth tables), not just the profile row
  const ctx = await auth.$context;
  await ctx.internalAdapter.deleteUser(String(target._id)).catch(() => {});
  await User.deleteOne({ _id: target._id });

  await createSystemAuditLog({
    action: "USER_DELETED",
    actor: admin.name,
    actorId: admin.id,
    entityType: "User",
    entityId: targetId,
    details: `Permanently removed ${target.name} (${target.email}).`,
  });

  return { ok: true, data: { deleted: true } };
}

export async function adminGetUser(targetId: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return admin;
  await connectDB();
  const t = await loadTarget(admin.id, targetId, { allowSelf: true });
  if (!t.ok) return t;
  return { ok: true, data: plain(await User.findById(targetId).select("-__v").lean()) };
}
