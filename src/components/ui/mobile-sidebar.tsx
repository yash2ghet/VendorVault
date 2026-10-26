"use client";

import { PanelLeftClose } from "lucide-react";
import Sidebar from "./sidebar";

interface MobileSidebarProps {
  open: boolean;
  pathname: string;
  onClose: () => void;
}

export default function MobileSidebar({
  open,
  pathname,
  onClose,
}: MobileSidebarProps) {
  return (
    <>
      {/* Dynamic Backdrop Sheet Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* Slide-out Mobile Aside Structural Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:hidden bg-card border-r border-border ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative h-full flex flex-col">
          {/* Top Header Row with Panel Close Button */}
          <div className="absolute right-3 top-3.5 z-50">
            <button
              type="button"
              aria-label="Close Sidebar Drawer"
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground border border-transparent hover:border-border bg-card"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          {/* Render the core unified Sidebar instance inside the mobile layout wrapper */}
          <div className="flex-1 h-full w-full">
            <Sidebar
              pathname={pathname}
              isCollapsed={false}
              onCollapse={onClose}
            />
          </div>
        </div>
      </aside>
    </>
  );
}
