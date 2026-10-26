import { NextResponse } from "next/server";
import { UserRole } from "@/types";
import { getServerSession } from "./auth";

export function requireRole(...allowedRoles: UserRole[]) {
  return async function () {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role as UserRole;
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return session;
  };
}
