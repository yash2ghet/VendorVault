import {
  AlertTriangle, Building2, LayoutDashboard, Layers3, Package, Shield, ShoppingCart,
  Tags, Users, Laptop, ClipboardCheck, Truck, PackageCheck, FilePlus2,
} from "lucide-react";

import { NavItem } from "@/types/navigation";
import { UserRole } from "@/types";

const { ADMIN, MANAGER, STAFF, SUPPLIER } = UserRole;

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "MAIN", roles: [ADMIN, MANAGER, STAFF, SUPPLIER] },

  // employee
  { href: "/requests", label: "My Requests", icon: Laptop, group: "MAIN", roles: [ADMIN, MANAGER, STAFF] },
  { href: "/requests/new", label: "New Request", icon: FilePlus2, group: "MAIN", roles: [STAFF] },

  // supplier portal
  { href: "/supplier/orders", label: "Purchase Orders", icon: Truck, group: "MAIN", roles: [SUPPLIER] },

  // admin + manager
  { href: "/dashboard/vendors", label: "Vendors", icon: Building2, group: "MAIN", roles: [ADMIN, MANAGER] },
  { href: "/dashboard/products", label: "Products", icon: Package, group: "MAIN", roles: [ADMIN, MANAGER] },
  { href: "/manager/approvals", label: "Approvals Inbox", icon: ClipboardCheck, group: "MANAGEMENT", roles: [ADMIN, MANAGER] },
  { href: "/dashboard/brands", label: "Brands", icon: Tags, group: "MANAGEMENT", roles: [ADMIN, MANAGER] },
  { href: "/dashboard/categories", label: "Categories", icon: Layers3, group: "MANAGEMENT", roles: [ADMIN, MANAGER] },
  { href: "/dashboard/orders", label: "Purchase Orders", icon: ShoppingCart, group: "MANAGEMENT", roles: [ADMIN, MANAGER] },

  // admin only
  { href: "/admin/procurement", label: "Procurement Desk", icon: PackageCheck, group: "MANAGEMENT", roles: [ADMIN] },
  { href: "/dashboard/users", label: "Users", icon: Users, group: "SYSTEM", roles: [ADMIN] },
  { href: "/dashboard/audit-logs", label: "Audit Logs", icon: Shield, group: "SYSTEM", roles: [ADMIN, MANAGER] },
  { href: "/dashboard/alerts", label: "Stock Alerts", icon: AlertTriangle, group: "SYSTEM", roles: [ADMIN, MANAGER] },
];

export function navItemsFor(role?: string) {
  const r = (role || STAFF) as UserRole;
  return navItems.filter((item) => item.roles.includes(r));
}
