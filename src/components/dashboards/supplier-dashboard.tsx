"use client";

import Link from "next/link";
import { Truck, PackageCheck, Clock, Boxes, IndianRupee, Hourglass, AlertCircle } from "lucide-react";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { StatCard, Panel, Empty, inr, fmtDate, PO_STATUS, useDashboardData } from "./shared";

interface Row { id: string; poNumber: string; orderStatus: string; paymentStatus?: string; expectedDeliveryDate: string; totalAmount: number }
interface Data {
  linked: boolean;
  message?: string;
  vendor?: { name: string; companyName: string; email: string; verificationStatus: string };
  cards: { toShip: number; inTransit: number; delivered: number; awaitingApproval: number; products: number; paidRevenue: number; outstanding: number };
  recent: Row[];
  upcoming: Row[];
}

export default function SupplierDashboard() {
  const { data, error, loading } = useDashboardData<Data>();
  if (loading) return <DashboardSkeleton />;
  if (error || !data) return <p className="text-sm text-red-500">{error || "Could not load dashboard"}</p>;

  if (!data.linked) {
    return (
      <div className="mx-auto mt-10 max-w-lg rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-amber-600 dark:text-amber-400" />
        <h1 className="text-lg font-semibold text-foreground">Account not linked yet</h1>
        <p className="mt-1 text-sm text-muted-foreground">{data.message}</p>
      </div>
    );
  }

  const c = data.cards;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.vendor?.companyName || data.vendor?.name}</h1>
        <p className="text-sm text-muted-foreground">
          Supplier portal · {data.vendor?.verificationStatus === "VERIFIED" ? "Verified vendor ✔" : `Status: ${data.vendor?.verificationStatus}`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ready to ship" value={c.toShip} icon={PackageCheck} tone={c.toShip ? "amber" : "zinc"} href="/supplier/orders" hint="approved by buyer" />
        <StatCard label="In transit" value={c.inTransit} icon={Truck} tone="purple" href="/supplier/orders" />
        <StatCard label="Delivered" value={c.delivered} icon={PackageCheck} tone="emerald" href="/supplier/orders" />
        <StatCard label="Awaiting buyer approval" value={c.awaitingApproval} icon={Clock} tone="blue" href="/supplier/orders" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Payments received" value={inr(c.paidRevenue)} icon={IndianRupee} tone="emerald" />
        <StatCard label="Outstanding payments" value={inr(c.outstanding)} icon={Hourglass} tone={c.outstanding ? "amber" : "zinc"} />
        <StatCard label="Products you supply" value={c.products} icon={Boxes} tone="zinc" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Upcoming deliveries" action={{ label: "Manage orders", href: "/supplier/orders" }}>
          {data.upcoming.length === 0 ? <Empty text="Nothing scheduled" /> : (
            <ul className="divide-y divide-border">
              {data.upcoming.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-mono text-xs font-semibold text-foreground">{o.poNumber}</p>
                    <p className="text-xs text-muted-foreground">Due {fmtDate(o.expectedDeliveryDate)}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PO_STATUS[o.orderStatus]}`}>{o.orderStatus}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent orders" action={{ label: "View all", href: "/supplier/orders" }}>
          {data.recent.length === 0 ? <Empty text="No orders yet" /> : (
            <ul className="divide-y divide-border">
              {data.recent.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-mono text-xs font-semibold text-foreground">{o.poNumber}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(o.expectedDeliveryDate)} · {inr(o.totalAmount)} · {o.paymentStatus}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PO_STATUS[o.orderStatus]}`}>{o.orderStatus}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
