"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StockAlert {
  productId: string;
  productName: string;
  sku: string;
  currentQuantity: number;
  threshold: number;
  vendorId: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchAlerts() {
    setLoading(true);
    const res = await fetch("/api/inventory/alerts");
    const data = await res.json();
    setAlerts(data.alerts);
    setLoading(false);
  }

  useEffect(() => { fetchAlerts(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Stock Alerts</h1>
          <p className="text-sm text-zinc-400">
            Products below their low-stock threshold
          </p>
        </div>
        <Button variant="outline" onClick={fetchAlerts} className="border-zinc-700 text-zinc-400 hover:text-white">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {alerts.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 py-16">
          <Package className="mb-4 h-12 w-12 text-zinc-600" />
          <p className="text-lg font-medium text-zinc-400">All clear</p>
          <p className="text-sm text-zinc-500">No products are below their stock threshold</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((alert) => {
            const severity = alert.currentQuantity === 0
              ? "border-red-500/30 bg-red-500/5"
              : alert.currentQuantity <= alert.threshold / 2
                ? "border-orange-500/30 bg-orange-500/5"
                : "border-yellow-500/30 bg-yellow-500/5";

            return (
              <div key={alert.productId} className={`rounded-xl border p-5 ${severity}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-white">{alert.productName}</p>
                    <p className="mt-1 text-xs text-zinc-500">SKU: {alert.sku}</p>
                  </div>
                  <AlertTriangle className={`h-5 w-5 ${alert.currentQuantity === 0 ? "text-red-400" : "text-amber-400"}`} />
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-zinc-500">Current Stock</p>
                    <p className={`text-2xl font-bold ${alert.currentQuantity === 0 ? "text-red-400" : "text-amber-400"}`}>
                      {alert.currentQuantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Threshold</p>
                    <p className="text-lg font-semibold text-zinc-400">{alert.threshold}</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-zinc-800">
                  <div
                    className={`h-1.5 rounded-full ${alert.currentQuantity === 0 ? "bg-red-500" : "bg-amber-500"}`}
                    style={{ width: `${Math.min((alert.currentQuantity / alert.threshold) * 100, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
