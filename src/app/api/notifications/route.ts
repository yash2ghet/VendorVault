import { NextResponse } from "next/server";
import { getNotifications, clearNotifications } from "@/lib/notification";
import { guard } from "@/lib/api-guard";
import { UserRole } from "@/types";

// Prevent Next.js 15 from caching this endpoint
export const dynamic = "force-dynamic";
export const revalidate = 0;

// These are system-wide operational notices (new requests, vendor changes...). Admins and managers
// see them; everyone else gets an empty list (not an error) so the bell simply stays quiet.
export async function GET() {
  const g = await guard();
  if (!g.ok) return g.response;
  if (g.role !== UserRole.ADMIN && g.role !== UserRole.MANAGER) {
    return NextResponse.json({ success: true, notifications: [] });
  }
  try {
    const notifications = await getNotifications();
    return NextResponse.json({ success: true, notifications });
  } catch (error) {
    console.error("API Notifications GET Error:", error);
    return NextResponse.json({ success: false, notifications: [] }, { status: 500 });
  }
}

export async function DELETE() {
  const g = await guard(UserRole.ADMIN, UserRole.MANAGER);
  if (!g.ok) return g.response;
  try {
    await clearNotifications();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Notifications DELETE Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
