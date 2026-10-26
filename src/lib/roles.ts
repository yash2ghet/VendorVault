import { UserRole } from "@/types";

/** Safe to import from both client and server code. */
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  MANAGER: "Manager",
  STAFF: "Employee",
  SUPPLIER: "Supplier",
};

/** Where each role lands after sign-in. */
export function homeFor(_role?: string) {
  return "/dashboard"; // /dashboard renders a different dashboard per role
}

/**
 * Page access rules. First matching prefix wins (longest prefix first).
 * A route not listed here is ADMIN-only by default (safe default).
 */
const RULES: { prefix: string; exact?: boolean; roles: UserRole[] }[] = [
  { prefix: "/dashboard/users", roles: [UserRole.ADMIN] },
  { prefix: "/dashboard/audit-logs", roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { prefix: "/dashboard/approvals", roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { prefix: "/dashboard/stock-alerts", roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { prefix: "/dashboard/alerts", roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { prefix: "/dashboard/orders", roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { prefix: "/dashboard/vendors", roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { prefix: "/dashboard/products", roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { prefix: "/dashboard/brands", roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { prefix: "/dashboard/categories", roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { prefix: "/dashboard", exact: true, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.SUPPLIER] }, // the role-specific dashboard itself
  { prefix: "/logs", roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { prefix: "/admin", roles: [UserRole.ADMIN] },
  { prefix: "/manager", roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { prefix: "/requests", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF] },
  { prefix: "/supplier", roles: [UserRole.SUPPLIER] }, // supplier portal only (admins use /dashboard/orders)
];

export function canAccess(role: string | undefined, pathname: string): boolean {
  const r = (role || UserRole.STAFF) as UserRole;
  const rule = [...RULES]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((x) => pathname === x.prefix || (!x.exact && pathname.startsWith(x.prefix + "/")));
  if (!rule) return r === UserRole.ADMIN;
  return rule.roles.includes(r);
}
