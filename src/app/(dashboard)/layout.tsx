"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { canAccess, homeFor } from "@/lib/roles";

import Header from "../../components/ui/header";
import Sidebar from "../../components/ui/sidebar";
import MobileSidebar from "../../components/ui/mobile-sidebar";
import NavigationProgress from "@/components/navigation-progress";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const allowed = isPending || !session ? true : canAccess(role, pathname);

  // Role gate: wrong role → bounce to that role's own dashboard
  useEffect(() => {
    if (isPending || !session) return;
    if (!canAccess(role, pathname)) {
      toast.error("You don't have access to that page.");
      router.replace(homeFor(role));
    }
  }, [isPending, session, role, pathname, router]);

  // Mobile Drawer sheet state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Desktop Sidebar collapse state tracker
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Close mobile drawer sheet on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Close active mobile drawer using Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Top loading bar while moving between pages */}
      <NavigationProgress />

      {/* 1. Desktop Sidebar Context Panel Linkage */}
      <Sidebar 
        pathname={pathname} 
        isCollapsed={isCollapsed}
        onCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* 2. Mobile Drawer Overlays Sheet Context */}
      <MobileSidebar
        open={sidebarOpen}
        pathname={pathname}
        onClose={() => setSidebarOpen(false)}
      />

      {/* 3. Main Operational Content Wrapper Block */}
      <div 
        className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <Header
          pathname={pathname}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto bg-background p-6 transition-colors duration-200">
          {allowed ? children : null}
        </main>
      </div>

    </div>
  );
}