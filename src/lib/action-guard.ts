import { getServerSession } from "@/middlewares/auth";
import { UserRole } from "@/types";

/**
 * Server Actions are public HTTP endpoints, so every one that changes data must
 * check who is calling. Identity comes from the session, never from arguments.
 */
export async function actionSession(...roles: UserRole[]) {
  const session = await getServerSession({ fresh: true }).catch(() => null);
  if (!session) return null;
  const role = ((session.user as any).role || UserRole.STAFF) as UserRole;
  if (roles.length && !roles.includes(role)) return null;
  return { session, userId: session.user.id, name: session.user.name || session.user.email, role };
}
