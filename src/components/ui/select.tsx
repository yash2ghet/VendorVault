"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import Header from "../../components/ui/header";
import Sidebar from "../../components/ui/sidebar";
import MobileSidebar from "../../components/ui/mobile-sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();

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
    <div className="flex h-screen overflow-hidden bg-[#121212]">
      
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
      {/* Note: The dynamic transition-all and left-margin shifting classes are added here */}
      <div 
        className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <Header
          pathname={pathname}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto bg-[#121212] p-6">
          {children}
        </main>
      </div>

    </div>
  );
}