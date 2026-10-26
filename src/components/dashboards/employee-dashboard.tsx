"use client";

import Link from "next/link";
import { Laptop, Clock, CheckCircle2, PackageCheck, XCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { StatCard, Panel, Empty, fmtDate, REQUEST_STATUS, URGENCY, useDashboardData } from "./shared";

interface Data {
  cards: { total: number; pending: number; approved: number; procured: number; rejected: number };
  recent: {
    id: string; assetType: string; modelPreference: string; status: string; urgency: string;
    managerFeedback: string; createdAt: string; updatedAt: string;
  }[];
}

export default function EmployeeDashboard() {
  const { data, error, loading } = useDashboardData<Data>();
  if (loading) return <DashboardSkeleton />;
  if (error || !data) return <p className="text-sm text-red-500">{error || "Could not load dashboard"}</p>;
  const c = data.cards;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My Dashboard</h1>
          <p className="text-sm text-muted-foreground">Track the hardware you&apos;ve asked for.</p>
        </div>
        <Link href="/requests/new">
          <Button className="bg-emerald-500 font-semibold text-zinc-950 hover:bg-emerald-400">
            <Plus className="mr-2 h-4 w-4" /> New request
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total requests" value={c.total} icon={Laptop} tone="zinc" href="/requests" />
        <StatCard label="Waiting for review" value={c.pending} icon={Clock} tone="amber" href="/requests" />
        <StatCard label="Approved" value={c.approved} icon={CheckCircle2} tone="blue" href="/requests" />
        <StatCard label="Delivered / fulfilled" value={c.procured} icon={PackageCheck} tone="emerald" href="/requests" />
      </div>
      {c.rejected > 0 && (
        <StatCard label="Rejected (check manager notes)" value={c.rejected} icon={XCircle} tone="red" href="/requests" />
      )}

      <Panel title="Recent requests" action={{ label: "View all", href: "/requests" }}>
        {data.recent.length === 0 ? (
          <Empty text="You haven't requested anything yet. Click “New request” to get started." />
        ) : (
          <ul className="divide-y divide-border">
            {data.recent.map((r) => {
              const st = REQUEST_STATUS[r.status] || { label: r.status, cls: "" };
              return (
                <li key={r.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.assetType} <span className="font-normal text-muted-foreground">· {r.modelPreference}</span></p>
                    <p className="text-xs text-muted-foreground">
                      Requested {fmtDate(r.createdAt)} · <span className={URGENCY[r.urgency]}>{r.urgency}</span>
                    </p>
                    {r.managerFeedback && <p className="mt-1 text-xs italic text-muted-foreground">Manager: “{r.managerFeedback}”</p>}
                  </div>
                  <span className={`w-fit rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
