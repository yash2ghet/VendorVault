"use client";

import { ClipboardCheck, ShoppingCart, Truck, AlertTriangle, IndianRupee, CheckCircle2, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { StatCard, Panel, Empty, inr, fmtDate, URGENCY, useDashboardData } from "./shared";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Data {
  cards: {
    pendingRequests: number; approvedRequests: number; rejectedRequests: number;
    poPendingApproval: number; poInTransit: number; lowStock: number; spendThisMonth: number;
  };
  recentPending: { id: string; userName: string; assetType: string; urgency: string; createdAt: string }[];
  poPendingList: { id: string; poNumber?: string; vendor: string; totalAmount: number; createdAt: string }[];
  spendByMonth: { y: number; m: number; total: number; orders: number }[];
}

export default function ManagerDashboard() {
  const { data, error, loading } = useDashboardData<Data>();
  if (loading) return <DashboardSkeleton />;
  if (error || !data) return <p className="text-sm text-red-500">{error || "Could not load dashboard"}</p>;

  const c = data.cards;
  const chart = data.spendByMonth.map((x) => ({ name: `${MONTHS[x.m - 1]} ${String(x.y).slice(-2)}`, Spend: x.total }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Manager Dashboard</h1>
        <p className="text-sm text-muted-foreground">What needs your decision today, and how spending is trending.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Requests awaiting approval" value={c.pendingRequests} icon={ClipboardCheck} tone="amber" href="/manager/approvals" />
        <StatCard label="POs awaiting approval" value={c.poPendingApproval} icon={ShoppingCart} tone="blue" href="/dashboard/orders" />
        <StatCard label="Orders in transit" value={c.poInTransit} icon={Truck} tone="purple" href="/dashboard/orders" />
        <StatCard label="Low-stock items" value={c.lowStock} icon={AlertTriangle} tone={c.lowStock ? "red" : "zinc"} href="/dashboard/alerts" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Spend this month" value={inr(c.spendThisMonth)} icon={IndianRupee} tone="emerald" />
        <StatCard label="Requests approved" value={c.approvedRequests} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Requests rejected" value={c.rejectedRequests} icon={XCircle} tone="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Needs your approval — hardware requests" action={{ label: "Open inbox", href: "/manager/approvals" }}>
          {data.recentPending.length === 0 ? <Empty text="All caught up 🎉" /> : (
            <ul className="divide-y divide-border">
              {data.recentPending.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{r.assetType}</p>
                    <p className="text-xs text-muted-foreground">{r.userName} · {fmtDate(r.createdAt)}</p>
                  </div>
                  <span className={`text-xs font-semibold ${URGENCY[r.urgency] || ""}`}>{r.urgency}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Purchase orders to approve" action={{ label: "All orders", href: "/dashboard/orders" }}>
          {data.poPendingList.length === 0 ? <Empty text="No purchase orders waiting" /> : (
            <ul className="divide-y divide-border">
              {data.poPendingList.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{o.vendor}</p>
                    <p className="text-xs text-muted-foreground">{o.poNumber || `PO-${o.id.slice(-6).toUpperCase()}`} · {fmtDate(o.createdAt)}</p>
                  </div>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{inr(o.totalAmount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Procurement spend — last 6 months">
        {chart.length === 0 ? <Empty text="No orders yet" /> : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--popover-foreground))" }} />
                <Bar dataKey="Spend" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
    </div>
  );
}
