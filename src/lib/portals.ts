import { UserRole } from "@/types";

/**
 * One "portal" per kind of person who signs in. The slug is what appears in the URL:
 *   /auth/admin/sign-in   /auth/manager/sign-up   /auth/employee/sign-in   /auth/supplier/sign-up
 *
 * To add another role later: add it to UserRole, then add an entry here (and an icon in
 * components/auth/portal-icons.ts). Everything else — pages, sign-up rules — follows from this list.
 */
export type PortalSlug = "admin" | "manager" | "employee" | "supplier";

export interface Portal {
  slug: PortalSlug;
  role: UserRole;
  label: string;
  tagline: string;
  description: string;
  /** "open": anyone can register.  "invite": needs an invite code (see /api/register). */
  signUp: "open" | "invite";
  /** Tailwind classes for the icon chip (kept as full strings so Tailwind can see them). */
  chip: string;
}

export const PORTALS: Record<PortalSlug, Portal> = {
  admin: {
    slug: "admin",
    role: UserRole.ADMIN,
    label: "Administrator",
    tagline: "Full control of VendorVault",
    description: "Manage users and roles, vendors, products, orders, approvals and audit logs.",
    signUp: "invite",
    chip: "bg-rose-500/10 text-rose-400",
  },
  manager: {
    slug: "manager",
    role: UserRole.MANAGER,
    label: "Manager",
    tagline: "Approvals and operations",
    description: "Review hardware requests, manage vendors, products and purchase orders.",
    signUp: "invite",
    chip: "bg-sky-500/10 text-sky-400",
  },
  employee: {
    slug: "employee",
    role: UserRole.STAFF,
    label: "Employee",
    tagline: "Request what you need",
    description: "Raise hardware requests and follow their approval and delivery status.",
    signUp: "open",
    chip: "bg-emerald-500/10 text-emerald-400",
  },
  supplier: {
    slug: "supplier",
    role: UserRole.SUPPLIER,
    label: "Supplier",
    tagline: "Fulfil purchase orders",
    description: "See orders placed with your company and mark them as shipped.",
    signUp: "open",
    chip: "bg-amber-500/10 text-amber-400",
  },
};

export const PORTAL_LIST: Portal[] = Object.values(PORTALS);

const ALIASES: Record<string, PortalSlug> = { staff: "employee", vendor: "supplier" };

/** URL slug -> portal (or null if it isn't one). */
export function getPortal(slug: string | undefined | null): Portal | null {
  const key = String(slug ?? "").toLowerCase();
  const resolved = (ALIASES[key] ?? key) as PortalSlug;
  return PORTALS[resolved] ?? null;
}

/** A user's stored role -> the portal they belong to (unknown/missing => employee). */
export function portalForRole(role: string | undefined | null): Portal {
  return PORTAL_LIST.find((p) => p.role === role) ?? PORTALS.employee;
}
