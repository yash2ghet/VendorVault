"use client";

import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import Logo from "./logo";
import UserProfile from "./user-profile";
import { navItemsFor } from "@/lib/navigation";
import { useSession } from "@/lib/auth-client";
import { ROLE_LABELS } from "@/lib/roles";

interface SidebarProps {
  pathname: string;
  isCollapsed: boolean;
  onCollapse: () => void;
  closeSidebar?: () => void;
}

export default function Sidebar({
  pathname,
  isCollapsed,
  onCollapse,
  closeSidebar,
}: SidebarProps) {
  
  const { data: session } = useSession();
  const role = ((session?.user as any)?.role as string) || "STAFF";
  const items = navItemsFor(role);

  const segments = ["MAIN", "MANAGEMENT", "SYSTEM"] as const;
  const getGroupedItems = (group: (typeof segments)[number]) => items.filter((item) => item.group === group);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-card text-card-foreground transition-all duration-300 ease-in-out lg:flex ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Top Banner Row: Logo Identity + Panel Toggle Controller */}
      <div className={`flex h-16 items-center border-b border-border px-4 ${isCollapsed ? "justify-center" : "justify-between"}`}>
        {!isCollapsed ? (
          <>
            <div className="animate-in fade-in duration-200">
              <Logo />
            </div>
            
            {!closeSidebar && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onCollapse}
                className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border rounded-lg transition-all flex items-center justify-center shrink-0"
                title="Collapse Sidebar"
              >
                <PanelLeftClose className="h-5 w-5" />
              </Button>
            )}
          </>
        ) : (
          !closeSidebar && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCollapse}
              className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border rounded-lg transition-all flex items-center justify-center"
              title="Expand Sidebar"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </Button>
          )
        )}
      </div>

      {!isCollapsed && (
        <div className="px-4 pt-3">
          <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            {ROLE_LABELS[role] || role}
          </span>
        </div>
      )}

      {/* Dynamic Group Navigation Stack Workspace */}
      <nav aria-label="Sidebar Navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {segments.filter((g) => getGroupedItems(g).length > 0).map((groupName) => (
          <div key={groupName} className="space-y-1">
            {!isCollapsed ? (
              <h3 className="px-3 text-[10px] font-bold tracking-wider text-muted-foreground mb-2 animate-in fade-in duration-200 uppercase">
                {groupName}
              </h3>
            ) : (
              <div className="border-t border-border my-4 first:hidden" />
            )}

            {getGroupedItems(groupName).map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : item.href === "/requests"
                  ? pathname === "/requests"
                  : pathname.startsWith(item.href);

              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSidebar}
                  className={`group flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  } ${isCollapsed ? "justify-center px-0" : "px-3"}`}
                  title={item.label}
                >
                  <Icon
                    className={`h-5 w-5 min-w-[20px] transition-colors duration-200 ${
                      active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="truncate animate-in fade-in duration-200">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Profile Shield Container */}
      <div 
        className={`mt-auto w-full transition-all duration-200 ${
          isCollapsed ? "flex justify-center pb-2" : ""
        }`}
      >
        <UserProfile isCollapsed={isCollapsed} />
      </div>
    </aside>
  );
}
