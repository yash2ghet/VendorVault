import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * `fresh: true` skips the 5-minute cookie cache and re-reads the session + user from the database.
 * Permission checks use it, so a demoted/removed user loses access immediately.
 */
export async function getServerSession(opts?: { fresh?: boolean }) {
  const session = await auth.api.getSession({
    headers: await headers(),
    query: opts?.fresh ? { disableCookieCache: true } : undefined,
  });
  return session;
}

export async function requireAuth() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}
