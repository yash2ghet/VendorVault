import { Briefcase, ShieldCheck, Truck, User, type LucideIcon } from "lucide-react";
import type { PortalSlug } from "@/lib/portals";

export const PORTAL_ICONS: Record<PortalSlug, LucideIcon> = {
  admin: ShieldCheck,
  manager: Briefcase,
  employee: User,
  supplier: Truck,
};
