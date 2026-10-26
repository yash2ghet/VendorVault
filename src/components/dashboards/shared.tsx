"use client";

import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  zinc: "bg-muted text-muted-foreground",
} as const;
export type Tone = keyof typeof TONES;

export function StatCard({
  label, value, icon: Icon, tone = "emerald", href, hint,
}: { label: string; value: string | number; icon: LucideIcon; tone?: Tone; href?: string; hint?: string }) {
  const body = (
    <div className={cn("flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-colors", href && "hover:border-emerald-500/40")}>
      <div className={cn("rounded-lg p-3", TONES[tone])}><Icon className="h-6 w-6" /></div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-2xl font-bold text-foreground">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Panel({
  title, action, children, className,
}: { title: string; action?: { label: string; href: string }; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5 shadow-sm", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {action && (
          <Link href={action.href} className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400">
            {action.label} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}

export const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
export const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const REQUEST_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pending review", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  APPROVED_BY_MANAGER: { label: "Approved", cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  PROCURED_BY_ADMIN: { label: "Fulfilled", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  REJECTED: { label: "Rejected", cls: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30" },
};
export const PO_STATUS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  CONFIRMED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  SHIPPED: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
  DELIVERED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  CANCELLED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
};
export const URGENCY: Record<string, string> = {
  LOW: "text-muted-foreground", MEDIUM: "text-amber-600 dark:text-amber-400",
  HIGH: "text-orange-600 dark:text-orange-400", CRITICAL: "text-red-600 dark:text-red-400",
};

/** fetches /api/dashboard once and exposes loading/error */
import { useEffect, useState } from "react";
export function useDashboardData<T>() {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
        setData(j);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  return { data, error, loading };
}
