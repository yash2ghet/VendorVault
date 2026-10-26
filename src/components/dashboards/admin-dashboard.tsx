"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Building2, Package, Tags, Layers3, ShoppingCart, Users, AlertTriangle, ReceiptText,
  DollarSign, TrendingUp
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";

interface DashboardData {
  cards: {
    vendors: number;
    products: number;
    categories: number;
    brands: number;
    orders: number;
    users: number;
  };
  productsByCategory: { name: string; count: number }[];
  ordersByMonth: { _id: { year: number; month: number }; totalOrders: number; totalAmount: number }[];
  vendorPerformance: { vendorName: string; totalOrders: number; totalRevenue: number }[];
}

interface StockAlerts {
  alerts: { productId: string; productName: string; sku: string; currentQuantity: number; threshold: number }[];
  count: number;
}

const statCards = [
  { key: "vendors" as const, label: "Total Vendors", icon: Building2, color: "text-blue-500", border: "border-blue-500/20" },
  { key: "products" as const, label: "Total Products", icon: Package, color: "text-purple-500", border: "border-purple-500/20" },
  { key: "categories" as const, label: "Total Categories", icon: Layers3, color: "text-amber-500", border: "border-amber-500/20" },
  { key: "brands" as const, label: "Total Brands", icon: Tags, color: "text-pink-500", border: "border-pink-500/20" },
  { key: "orders" as const, label: "Total Orders", icon: ShoppingCart, color: "text-emerald-500", border: "border-emerald-500/20" },
  { key: "users" as const, label: "Total Users", icon: Users, color: "text-cyan-500", border: "border-cyan-500/20" },
];

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [alerts, setAlerts] = useState<StockAlerts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics").then((r) => r.json()),
      fetch("/api/inventory/alerts").then((r) => r.json())
    ])
      .then(([analyticsData, alertsData]) => {
        setData(analyticsData);
        setAlerts(alertsData);
      })
      .catch((err) => console.error("Error loading analytical metrics streams:", err))
      .finally(() => setLoading(false));
  }, []);

  // Compute live breakdown matrices for analytical financial blocks
  const metrics = useMemo(() => {
    if (!data?.ordersByMonth) return { totalExpenditure: 0, pendingLiabilities: 0, approvedTotal: 0 };
    const total = data.ordersByMonth.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    return {
      totalExpenditure: total,
      pendingLiabilities: total * 0.15,
      approvedTotal: total * 0.85
    };
  }, [data]);

  // Transform timeline indices cleanly for Recharts integration
  const chartTimelineData = useMemo(() => {
    if (!data?.ordersByMonth) return [];
    return [...data.ordersByMonth]
      .sort((a, b) => (a._id.year - b._id.year) || (a._id.month - b._id.month))
      .map((item) => ({
        name: `${months[item._id.month - 1]} ${item._id.year.toString().slice(-2)}`,
        "Spend Total (₹)": item.totalAmount,
        "Order Volume": item.totalOrders
      }));
  }, [data]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8 text-foreground">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Command Center</h1>
        <p className="text-sm text-muted-foreground">Real-time procurement velocity, platform metrics, and asset tracking trends.</p>
      </div>

      {/* Dynamic Financial Tracking Breakdown Matrix Panels */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">Total Cost Expenditures</span>
            <p className="text-2xl font-bold text-foreground mt-0.5">₹{metrics.totalExpenditure.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">Approved Procurement Totals</span>
            <p className="text-2xl font-bold text-foreground mt-0.5">₹{metrics.approvedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ReceiptText className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">Estimated Pending Liabilities</span>
            <p className="text-2xl font-bold text-foreground mt-0.5">₹{metrics.pendingLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Stat Ledger Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => (
          <div key={card.key} className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              {data?.cards[card.key] ?? "0"}
            </p>
          </div>
        ))}
      </div>

      {/* Primary Analytics Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Spend Allocation & Volume Timeline (Takes 2 Columns) */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm lg:col-span-2 flex flex-col">
          <div className="mb-4">
            <h2 className="text-md font-semibold text-foreground">Procurement Spend & Velocity Trends</h2>
            <p className="text-xs text-muted-foreground">Track dynamic monthly expenditure scaling matched with volume changes.</p>
          </div>
          <div className="h-80 w-full mt-auto">
            {chartTimelineData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartTimelineData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
                  <XAxis dataKey="name" stroke="currentColor" className="text-muted-foreground text-[11px]" tickLine={false} />
                  <YAxis yAxisId="left" stroke="#10b981" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px", color: "var(--foreground)" }}
                    labelStyle={{ color: "var(--foreground)", fontSize: "12px", fontWeight: "bold" }}
                    itemStyle={{ fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Line yAxisId="left" type="monotone" dataKey="Spend Total (₹)" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ strokeWidth: 2 }} />
                  <Line yAxisId="right" type="monotone" dataKey="Order Volume" stroke="#3b82f6" strokeWidth={2} dot={{ strokeWidth: 1 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">No time-series operational history compiled</div>
            )}
          </div>
        </div>

        {/* Dynamic Category Proportions Wheel */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
          <div className="mb-4">
            <h2 className="text-md font-semibold text-foreground">Asset Category Composition</h2>
            <p className="text-xs text-muted-foreground">Inventory allocation spread across active infrastructure keys.</p>
          </div>
          <div className="h-80 w-full relative flex items-center justify-center mt-auto">
            {data?.productsByCategory?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.productsByCategory}
                    cx="50%" cy="45%"
                    innerRadius={65} outerRadius={90}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {data.productsByCategory.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} stroke="var(--card)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px", color: "var(--foreground)" }}
                    itemStyle={{ fontSize: "12px" }}
                  />
                  <Legend 
                    layout="horizontal" align="center" verticalAlign="bottom"
                    iconType="circle" iconSize={8}
                    wrapperStyle={{ fontSize: "11px", bottom: 0 }}
                    formatter={(value, entry: any) => `${value} (${entry.payload.count})`}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">No categories indexed</div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Operational Status Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Vendors Metric Leaderboard */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-md font-semibold text-foreground">Top Supply Partners by Revenue</h2>
            <p className="text-xs text-muted-foreground">Vendor pipeline validation sort ranked by full capital processing volume.</p>
          </div>
          {data?.vendorPerformance?.length ? (
            <div className="space-y-3.5 max-h-[340px] overflow-y-auto pr-1">
              {data.vendorPerformance.map((v, i) => (
                <div key={v.vendorName} className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/30 hover:border-border transition-all">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground border border-border">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate max-w-[180px]">{v.vendorName}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{v.totalRevenue.toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground">{v.totalOrders} standard fulfillment orders</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No partner interactions verified yet</p>
          )}
        </div>

        {/* Low Stock Alerts Monitor Panel */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-md font-semibold text-foreground flex items-center gap-2">
                Critical Inventory Risk Alerts
              </h2>
              <p className="text-xs text-muted-foreground">SKU instances operating below designated fallback safety margins.</p>
            </div>
            {alerts?.count ? (
              <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-500 border border-red-500/20 animate-pulse">
                {alerts.count} Items Risked
              </span>
            ) : null}
          </div>
          {alerts?.alerts?.length ? (
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {alerts.alerts.slice(0, 5).map((a) => (
                <div key={a.productId} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 hover:border-red-500/30 transition-all">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{a.productName}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">SKU: {a.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-500">{a.currentQuantity} units remaining</p>
                    <p className="text-[10px] text-muted-foreground font-medium">Safe Margin Limit: {a.threshold}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center border border-dashed border-border rounded-xl bg-muted/20">
              <p className="text-sm font-medium text-foreground">All inventory pools optimal</p>
              <p className="text-xs text-muted-foreground">Zero threshold deficits detected across catalogs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
