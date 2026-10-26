"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useCallback } from "react";
import { Menu, Bell, Sun, Moon, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { navItems } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NotificationItem {
  _id: string;
  type: "success" | "warning" | "info" | "error";
  title: string;
  description: string;
  read: boolean;
  createdAt: string;
}

interface HeaderProps {
  pathname: string;
  onMenuClick: () => void;
}

// Custom simple helper function to generate relative time strings
function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date();
    const past = new Date(dateString);
    const msPerMinute = 60 * 1000;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;
    const elapsed = now.getTime() - past.getTime();

    if (elapsed < msPerMinute) {
      return "Just now";
    } else if (elapsed < msPerHour) {
      const mins = Math.round(elapsed / msPerMinute);
      return `${mins}m ago`;
    } else if (elapsed < msPerDay) {
      const hours = Math.round(elapsed / msPerHour);
      return `${hours}h ago`;
    } else {
      const days = Math.round(elapsed / msPerDay);
      return `${days}d ago`;
    }
  } catch (e) {
    return "Recently";
  }
}

export default function Header({ pathname, onMenuClick }: HeaderProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [alerts, setAlerts] = useState<NotificationItem[]>([]);

  // Prevent hydration mismatch for icons
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch notifications log
  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        // Fallback checks for response shapes matching standard lists
        setAlerts(Array.isArray(data) ? data : data.notifications || []);
      }
    } catch (err) {
      console.error("Failed to parse server notifications:", err);
    }
  }, []);

  // Setup pooling background intervals
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const unreadCount = alerts.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      setAlerts((prev) => prev.map((n) => ({ ...n, read: true })));
      await fetch("/api/notifications/mark-read", { method: "PATCH" });
    } catch (err) {
      console.error("Error setting log rows read status:", err);
    }
  };

  const handleClearAll = async () => {
    try {
      setAlerts([]);
      await fetch("/api/notifications", { method: "DELETE" });
    } catch (err) {
      console.error("Error clearing notification records:", err);
    }
  };

  const currentPage =
    navItems.find((item) =>
      item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname.startsWith(item.href)
    )?.label ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-border bg-background/80 backdrop-blur-md px-6 flex items-center justify-between transition-colors duration-200">
      
      {/* Left Block: Mobile Menu controls */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Toggle Sidebar"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden sm:block">
          <h1 className="text-md font-bold text-foreground tracking-tight flex items-center gap-2">
            {currentPage} <span className="text-xs font-normal text-muted-foreground">| Overview</span>
          </h1>
        </div>
      </div>

      {/* Right Block: Actions Tray */}
      <div className="flex items-center gap-2.5">
        
        {/* Theme Switching System */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg border border-transparent hover:border-border transition-all"
        >
          {mounted && resolvedTheme === "dark" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}
        </Button>

        {/* Notifications Center Dropdown */}
        <DropdownMenu onOpenChange={(open) => open && loadNotifications()}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg border border-transparent hover:border-border transition-all"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white ring-2 ring-background">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-card border border-border text-foreground rounded-xl shadow-2xl p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
            <DropdownMenuLabel className="text-xs font-bold text-muted-foreground px-2.5 py-2 flex items-center justify-between tracking-wider">
              SYSTEM ALERTS LOG
              {unreadCount > 0 && (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 text-[10px] h-4 px-1.5 font-bold">
                  {unreadCount} Pending
                </Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            
            <div className="max-h-64 overflow-y-auto space-y-0.5 my-1">
              {alerts.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  All caught up! No active alerts.
                </div>
              ) : (
                alerts.map((alert) => (
                  <DropdownMenuItem key={alert._id} className={`flex gap-3 px-2.5 py-2 rounded-lg focus:bg-accent focus:text-accent-foreground cursor-pointer transition-colors duration-150 ${alert.read ? "opacity-50" : ""}`}>
                    <div className="mt-0.5 shrink-0">
                      {alert.type === "warning" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      {alert.type === "error" && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      {alert.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      {alert.type === "info" && <Info className="h-4 w-4 text-blue-500" />}
                    </div>
                    <div className="flex-1 space-y-0.5 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground truncate">{alert.title}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">{formatRelativeTime(alert.createdAt)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-normal break-words">{alert.description}</p>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            
            {alerts.length > 0 && (
              <>
                <DropdownMenuSeparator className="bg-border" />
                <div className="p-1 flex flex-col gap-1">
                  <Button 
                    onClick={handleMarkAllRead}
                    variant="ghost" 
                    className="w-full h-7 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"
                  >
                    Mark all read
                  </Button>
                  <Button 
                    onClick={handleClearAll}
                    variant="ghost" 
                    className="w-full h-7 text-[11px] font-medium text-destructive hover:text-destructive hover:bg-destructive/10 rounded-md"
                  >
                    Clear all
                  </Button>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}