"use client";

import { useState } from "react";
import { Bell, AlertTriangle, CheckCircle, Package } from "lucide-react";

interface NotificationItem {
  id: string;
  type: "ALERT" | "SUCCESS" | "INFO";
  message: string;
  time: string;
  read: boolean;
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: "1", type: "ALERT", message: "Critical Stock Alert: 'Milk' is running low (5 left)!", time: "2 mins ago", read: false },
    { id: "2", type: "SUCCESS", message: "Asset Request for Dell G15 i5 approved successfully.", time: "1 hr ago", read: false },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 text-zinc-400 hover:text-white transition-colors rounded-lg bg-zinc-900/50 border border-zinc-800/80">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-zinc-800 flex justify-between items-center">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">System Operational Activity</h4>
            {unreadCount > 0 && (
              <button onClick={() => setNotifications(n => n.map(item => ({ ...item, read: true })))} className="text-[10px] text-emerald-400 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="divide-y divide-zinc-900 max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-xs text-zinc-500 text-center">No active alerts currently.</p>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`p-3 flex gap-2.5 transition-colors ${n.read ? "opacity-60" : "bg-zinc-900/20"}`}>
                  {n.type === "ALERT" ? <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" /> : <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />}
                  <div className="space-y-0.5">
                    <p className="text-xs text-zinc-200 leading-tight">{n.message}</p>
                    <span className="text-[10px] text-zinc-500 font-mono">{n.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}