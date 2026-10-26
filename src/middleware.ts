import { NextRequest, NextResponse } from "next/server";

// Pages anyone can open without being signed in.
const publicPaths = ["/sign-in", "/sign-up", "/forgot-password", "/verify-otp", "/update-password"];
const isPublic = (pathname: string) =>
  pathname === "/auth" || pathname.startsWith("/auth/") || publicPaths.some((p) => pathname.startsWith(p));

// Pages that need a session. When one is opened signed-out, send the visitor to the matching portal.
const privateAreas: { prefix: string; portal: string | null }[] = [
  { prefix: "/admin", portal: "admin" },
  { prefix: "/manager", portal: "manager" },
  { prefix: "/supplier", portal: "supplier" },
  { prefix: "/requests", portal: "employee" },
  { prefix: "/dashboard", portal: null }, // shared by every role -> let them choose
  { prefix: "/logs", portal: null },
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname) || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const sessionCookie =
    req.cookies.get("better-auth.session_token") ||
    req.cookies.get("__Secure-better-auth.session_token");

  const area = privateAreas.find((a) => pathname === a.prefix || pathname.startsWith(a.prefix + "/"));
  if (!sessionCookie && area) {
    const target = area.portal ? `/auth/${area.portal}/sign-in` : "/auth";
    return NextResponse.redirect(new URL(target, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
