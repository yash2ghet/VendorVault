import { NextResponse } from "next/server";
import { clearNotifications } from "@/lib/notification";
import { guard } from "@/lib/api-guard";
import { UserRole } from "@/types";

export async function DELETE() {
  const g = await guard(UserRole.ADMIN, UserRole.MANAGER);
  if (!g.ok) return g.response;
  try {
    await clearNotifications();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
