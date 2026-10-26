import { NextResponse } from "next/server";
import { getServerSession } from "@/middlewares/auth";
import { UserRole } from "@/types";

type Session = NonNullable<Awaited<ReturnType<typeof getServerSession>>>;

export type GuardResult =
  | { ok: true; session: Session; role: UserRole; userId: string; userName: string }
  | { ok: false; response: NextResponse };

/**
 * Use at the top of an API route:
 *
 *   const g = await guard(UserRole.ADMIN, UserRole.MANAGER);
 *   if (!g.ok) return g.response;
 *
 * With no roles passed, any signed-in user is allowed.
 */
export async function guard(...roles: UserRole[]): Promise<GuardResult> {
  let session: Session | null = null;
  try {
    session = await getServerSession({ fresh: true });
  } catch {
    session = null;
  }

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized — please sign in." }, { status: 401 }),
    };
  }

  const role = ((session.user as any).role || UserRole.STAFF) as UserRole;
  if (roles.length > 0 && !roles.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Forbidden — requires ${roles.join(" or ")} role.` },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    session,
    role,
    userId: session.user.id,
    userName: session.user.name || session.user.email || "Unknown",
  };
}

export function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Turns Mongo/Mongoose errors into friendly JSON responses. */
export function apiError(error: any) {
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || "value";
    return NextResponse.json({ error: `A record with this ${field} already exists.` }, { status: 409 });
  }
  if (error?.name === "ValidationError") {
    const first = Object.values(error.errors || {})[0] as any;
    return NextResponse.json({ error: first?.message || error.message }, { status: 400 });
  }
  if (error?.name === "CastError") {
    return NextResponse.json({ error: "Invalid id or value supplied." }, { status: 400 });
  }
  console.error("[api]", error);
  return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
}

export function changedKeys(body: Record<string, unknown>) {
  return Object.keys(body || {}).filter((k) => !k.startsWith("_")).join(", ") || "no fields";
}

/**
 * Which Vendor record does this SUPPLIER login belong to?
 * 1) user.vendorId (set by an admin)   2) a vendor whose email matches the login email.
 */
export async function resolveSupplierVendorId(g: { session: any }): Promise<string | null> {
  const user = g.session?.user as any;
  if (user?.vendorId) return String(user.vendorId);
  // Matching by email is only safe when the email is verified; otherwise anyone could sign up
  // as a supplier using a vendor's address and see that vendor's orders. Admins link otherwise.
  if (!user?.email || !user?.emailVerified) return null;
  const { connectDB } = await import("@/config/database");
  const { Vendor } = await import("@/models/Vendor");
  await connectDB();
  const vendor: any = await Vendor.findOne({ email: String(user.email).toLowerCase() }).select("_id").lean();
  return vendor?._id ? String(vendor._id) : null;
}
