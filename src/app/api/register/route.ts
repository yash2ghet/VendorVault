import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { getPortal, type Portal } from "@/lib/portals";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Role-based registration.
 *
 * The browser NEVER decides the role. It only says which portal the person is using, and the
 * server decides whether that portal may be registered into:
 *
 *   employee, supplier  -> open to everyone
 *   manager             -> needs MANAGER_SIGNUP_CODE (closed if the code isn't configured)
 *   admin               -> needs ADMIN_SIGNUP_CODE. If no code is configured, the very first
 *                          admin can register without one (bootstrap); after that it is closed.
 *
 * Accounts are created as STAFF through Better Auth, then promoted to the portal's role.
 */

// ---- tiny in-memory rate limit (per IP) so invite codes can't be brute-forced ----
const hits = new Map<string, number[]>();
function rateLimited(key: string, max = 15, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}
function clientKey(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function sameSecret(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function configuredCode(portal: Portal): string | undefined {
  const code =
    portal.role === UserRole.ADMIN
      ? process.env.ADMIN_SIGNUP_CODE
      : portal.role === UserRole.MANAGER
      ? process.env.MANAGER_SIGNUP_CODE
      : undefined;
  return code?.trim() || undefined;
}

async function adminExists() {
  const ctx = await auth.$context;
  const count = await ctx.adapter.count({
    model: "user",
    where: [{ field: "role", value: UserRole.ADMIN }],
  });
  return count > 0;
}

interface SignupStatus {
  available: boolean;
  codeRequired: boolean;
  message?: string;
}

async function signupStatus(portal: Portal): Promise<SignupStatus> {
  if (portal.signUp === "open") return { available: true, codeRequired: false };

  const code = configuredCode(portal);

  if (portal.role === UserRole.ADMIN) {
    if (code) return { available: true, codeRequired: true };
    // No code configured: allow ONLY the first administrator to register.
    if (!(await adminExists())) return { available: true, codeRequired: false };
    return {
      available: false,
      codeRequired: false,
      message: "Administrator accounts are created by invitation. Ask an existing administrator.",
    };
  }

  // manager
  if (code) return { available: true, codeRequired: true };
  return {
    available: false,
    codeRequired: false,
    message: "Manager accounts are created by invitation. Ask an administrator to give you the manager role.",
  };
}

/** GET /api/register?portal=admin  ->  what the sign-up page should show. */
export async function GET(req: NextRequest) {
  const portal = getPortal(new URL(req.url).searchParams.get("portal"));
  if (!portal) return NextResponse.json({ error: "Unknown portal." }, { status: 404 });
  try {
    return NextResponse.json(await signupStatus(portal));
  } catch (error) {
    console.error("[register] status failed:", error);
    return NextResponse.json({ error: "Could not check sign-up availability." }, { status: 500 });
  }
}

const bodySchema = z.object({
  portal: z.string().min(1),
  name: z.string().trim().min(1, "Please enter your name.").max(100),
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
  code: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  if (rateLimited(clientKey(req))) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request." }, { status: 400 });
  }
  const { portal: slug, name, email, password, code } = parsed.data;

  const portal = getPortal(slug);
  if (!portal) return NextResponse.json({ error: "Unknown portal." }, { status: 404 });

  try {
    const status = await signupStatus(portal);
    if (!status.available) {
      return NextResponse.json({ error: status.message || "Sign-up is closed for this role." }, { status: 403 });
    }
    if (status.codeRequired) {
      const expected = configuredCode(portal)!;
      if (!code || !sameSecret(code.trim(), expected)) {
        return NextResponse.json({ error: "That invite code is not valid." }, { status: 403 });
      }
    }

    const ctx = await auth.$context;

    // Better Auth answers "success" for an existing email when auto sign-in is off (to avoid
    // revealing which emails exist), so check ourselves and give a clear message.
    if ((await ctx.internalAdapter.findUserByEmail(email.toLowerCase()))?.user) {
      return NextResponse.json(
        { error: "An account with this email already exists. Try signing in instead.", code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" },
        { status: 422 }
      );
    }

    // 1) create the account (always STAFF at this point — `role` is not accepted from clients)
    await auth.api.signUpEmail({ body: { name, email, password }, headers: req.headers });
    const row = await ctx.internalAdapter.findUserByEmail(email.toLowerCase());
    if (!row?.user) throw new Error("Account was not created.");
    const userId = row.user.id;

    // 2) promote to the portal's role
    if (portal.role !== UserRole.STAFF) {
      try {
        await ctx.internalAdapter.updateUser(userId, { role: portal.role });
      } catch (err) {
        // never leave a half-created account behind
        await ctx.internalAdapter.deleteUser(userId).catch(() => {});
        throw err;
      }
    }

    return NextResponse.json({ ok: true, role: portal.role });
  } catch (error) {
    if (error instanceof APIError) {
      const body = (error.body ?? {}) as { message?: string; code?: string };
      return NextResponse.json(
        { error: body.message || error.message || "Registration failed.", code: body.code },
        { status: typeof error.statusCode === "number" ? error.statusCode : 400 }
      );
    }
    console.error("[register] failed:", error);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
