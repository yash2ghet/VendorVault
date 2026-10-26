"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bell, AlertTriangle, CheckCircle, Info, X, Loader2 } from "lucide-react";
import { timeAgo } from "@/lib/time-ago";

interface NotificationItem {
  createdAt: string | Date;
  _id: string; // Updated to match MongoDB standard ID token naming conventions
  type: "warning" | "success" | "info";
  title: string;
  description: string;
  timeAgo: string;
  read: boolean;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔄 Fetch Live Server Notifications
  const fetchNotifications = useCallback(async () => {
  try {
    const res = await fetch("/api/notifications");

    if (!res.ok) return;

    const data = await res.json();

    // Your API returns:
    // {
    //   success: true,
    //   notifications: [...]
    // }

    if (data.success) {
      setNotifications(
        data.notifications.map((item: any) => ({
          ...item,
          _id: item._id,
          timeAgo: new Date(item.createdAt).toLocaleString(),
        }))
      );
    }
  } catch (err) {
    console.error(err);
  }
}, []);

  // Poll for notifications when the dropdown mounts or updates
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 5000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    try {
      // Optimistic update locally
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      // Tell backend to update state matching schema rules
      await fetch("/api/notifications/mark-read", { method: "PATCH" });
    } catch (err) {
      console.error("Failed to mark log as read:", err);
    }
  };

  const clearAll = async () => {
    try {
      setNotifications([]);
      await fetch("/api/notifications", { method: "DELETE" });
    } catch (err) {
      console.error("Failed to empty notification index:", err);
    }
  };

  const iconMap = {
    warning: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />,
    success: <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />,
    info: <Info className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />,
  };

  return (
    <div className="relative inline-block text-left">
      {/* 🔔 Trigger Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/80 text-zinc-400 hover:text-white transition-colors focus:outline-none"
        aria-label="Toggle Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        )}
      </button>

      {/* Backdrop overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 z-50 rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                System Alerts Log
              </span>
              {unreadCount > 0 && (
                <span className="rounded bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 text-[10px] font-medium border border-emerald-500/20">
                  {unreadCount} Pending
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button 
                  onClick={markAllRead}
                  className="text-[10px] text-emerald-400 hover:underline font-medium"
                >
                  Mark read
                </button>
              )}
              <button 
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List Wrapper */}
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 divide-y divide-zinc-900">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle className="h-6 w-6 text-zinc-600 mb-2 stroke-[1.5]" />
                <p className="text-xs text-zinc-500">All caught up! No active alerts.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div 
                  key={item._id} 
                  className={`flex gap-3 text-left pt-2.5 first:pt-0 ${
                    item.read ? "opacity-40" : "bg-zinc-900/10"
                  }`}
                >
                  {iconMap[item.type] || iconMap.info}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-zinc-200 truncate">
                        {item.title}
                      </p>
                      <span className="text-[10px] text-zinc-500 font-mono whitespace-nowrap shrink-0">
                        {timeAgo(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed break-words">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          {notifications.length > 0 && (
            <div className="mt-4 pt-2 border-t border-zinc-800">
              <button
                onClick={clearAll}
                className="w-full text-center text-[11px] font-medium text-zinc-500 hover:text-white transition-colors py-1 rounded hover:bg-zinc-900"
              >
                Clear all operational system alerts
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}