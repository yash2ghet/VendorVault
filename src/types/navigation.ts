import { LucideIcon } from "lucide-react";
import { UserRole } from "@/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** roles that see this item in the sidebar */
  roles: UserRole[];
  group: "MAIN" | "MANAGEMENT" | "SYSTEM";
}
