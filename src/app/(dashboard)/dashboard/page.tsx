"use client";

import { useSession } from "@/lib/auth-client";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import AdminDashboard from "@/components/dashboards/admin-dashboard";
import ManagerDashboard from "@/components/dashboards/manager-dashboard";
import EmployeeDashboard from "@/components/dashboards/employee-dashboard";
import SupplierDashboard from "@/components/dashboards/supplier-dashboard";

/** One URL, four dashboards — chosen by the signed-in user's role. */
export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  if (isPending) return <DashboardSkeleton />;

  switch ((session?.user as any)?.role) {
    case "ADMIN": return <AdminDashboard />;
    case "MANAGER": return <ManagerDashboard />;
    case "SUPPLIER": return <SupplierDashboard />;
    default: return <EmployeeDashboard />; // STAFF (and anything unknown) → least privilege
  }
}
