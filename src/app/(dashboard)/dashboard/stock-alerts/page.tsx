"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, ShoppingCart, CheckCircle2 } from "lucide-react";

interface LowStockItem {
  _id: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  vendor: string;
}

export default function StockAlertsDashboard() {
  const [alerts, setAlerts] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAlerts() {
      try {
        const res = await fetch("/api/stock-alerts");
        const data = await res.json();
        if (Array.isArray(data)) setAlerts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAlerts();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Stock Level Warnings</h1>
        <p className="text-sm text-zinc-500">Automated warning panel identifying warehouse replenishment exceptions.</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-zinc-500 animate-pulse">Running inventory criteria verification...</div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/20 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-3" />
          <p className="text-sm font-medium text-zinc-200">Inventory Status Stable</p>
          <p className="text-xs text-zinc-500 mt-1">All catalog lines meet active safety stock margins currently.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {alerts.map((item) => (
            <div 
              key={item._id} 
              className="flex items-center justify-between p-4 bg-amber-500/5 dark:bg-amber-950/10 border border-amber-500/20 rounded-xl transition-all hover:border-amber-500/30"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg mt-0.5">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</h3>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">SKU: {item.sku} • Supplier Node: {item.vendor || "Unassigned"}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-xs text-zinc-400 block">Current Assets</span>
                  <span className="text-sm font-bold font-mono text-red-400">{item.stock} Units left</span>
                </div>
                <button 
                  onClick={() => alert(`Creating system order pipeline intent for ${item.name}`)}
                  className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-zinc-950 text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                >
                  <ShoppingCart className="h-3.5 w-3.5" /> Reorder Bulk Shipment
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}