"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Truck, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PO_STATUS, inr, fmtDate } from "@/components/dashboards/shared";

interface Item { productId?: { name: string; sku: string } | string; quantity: number; price: number }
interface Order {
  _id: string; poNumber?: string; products: Item[]; totalAmount: number; orderStatus: string;
  paymentStatus: string; expectedDeliveryDate: string; notes?: string; createdAt: string;
}

const TABS = ["ALL", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
const PAGE_SIZE = 10;
const label = (o: Order) => o.poNumber || `PO-${o._id.slice(-6).toUpperCase()}`;

export default function SupplierOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ALL");
  const [detail, setDetail] = useState<Order | null>(null);
  const [shipFor, setShipFor] = useState<Order | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/supplier/orders?page=${page}&limit=${PAGE_SIZE}&status=${tab}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Could not load orders"); setOrders([]); return; }
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } finally { setLoading(false); }
  }, [page, tab]);

  useEffect(() => { load(); }, [load]);

  async function ship() {
    if (!shipFor) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/supplier/orders/${shipFor._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SHIP", note: note.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error || "Could not update order");
      toast.success(`${label(shipFor)} marked as shipped`);
      setShipFor(null); setNote(""); setDetail(null);
      load();
    } finally { setBusy(false); }
  }

  const columns = [
    { key: "po", header: "PO #", render: (o: Order) => <span className="font-mono text-xs font-semibold text-foreground">{label(o)}</span> },
    { key: "items", header: "Items", render: (o: Order) => <span className="text-muted-foreground">{o.products.length}</span> },
    { key: "total", header: "Total", render: (o: Order) => <span className="font-semibold text-emerald-600 dark:text-emerald-400">{inr(o.totalAmount)}</span> },
    { key: "status", header: "Status", render: (o: Order) => <Badge className={PO_STATUS[o.orderStatus]}>{o.orderStatus}</Badge> },
    { key: "pay", header: "Payment", render: (o: Order) => <span className="text-xs text-muted-foreground">{o.paymentStatus}</span> },
    { key: "due", header: "Deliver by", render: (o: Order) => <span className="text-muted-foreground">{fmtDate(o.expectedDeliveryDate)}</span> },
    {
      key: "actions", header: "Actions",
      render: (o: Order) => (
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setDetail(o)}><Eye className="mr-1 h-3.5 w-3.5" />View</Button>
          {o.orderStatus === "CONFIRMED" && (
            <Button size="sm" className="h-7 bg-emerald-500 text-[11px] text-zinc-950 hover:bg-emerald-400" onClick={() => setShipFor(o)}>
              <Truck className="mr-1 h-3.5 w-3.5" />Mark shipped
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Purchase Orders</h1>
        <p className="text-sm text-muted-foreground">Orders placed with your company. Mark approved orders as shipped once dispatched.</p>
      </div>

      <div className="flex w-full gap-1 overflow-x-auto rounded-lg border border-border bg-muted/40 p-1 sm:w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => { setTab(t); setPage(1); }}
            className={`whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all ${tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={orders} page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE}
        onPageChange={setPage} isLoading={loading} emptyMessage="No orders for your company yet" />

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)} className="max-w-xl">
        {detail && (
          <DialogContent onClose={() => setDetail(null)}>
            <DialogHeader><DialogTitle>{label(detail)}</DialogTitle></DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="flex gap-2"><Badge className={PO_STATUS[detail.orderStatus]}>{detail.orderStatus}</Badge>
                <span className="text-xs text-muted-foreground">Deliver by {fmtDate(detail.expectedDeliveryDate)}</span></div>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 text-muted-foreground"><tr>
                    <th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Unit</th><th className="px-3 py-2 text-right">Subtotal</th></tr></thead>
                  <tbody>
                    {detail.products.map((it, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2 text-foreground">{typeof it.productId === "object" ? `${it.productId.name} (${it.productId.sku})` : "Product"}</td>
                        <td className="px-3 py-2 text-right">{it.quantity}</td>
                        <td className="px-3 py-2 text-right">{inr(it.price)}</td>
                        <td className="px-3 py-2 text-right font-medium">{inr(it.price * it.quantity)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-border bg-muted/40"><td colSpan={3} className="px-3 py-2 text-right font-semibold">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">{inr(detail.totalAmount)}</td></tr>
                  </tbody>
                </table>
              </div>
              {detail.notes && <p className="whitespace-pre-line rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">{detail.notes}</p>}
              {detail.orderStatus === "CONFIRMED" && (
                <div className="flex justify-end"><Button className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400" onClick={() => setShipFor(detail)}><Truck className="mr-2 h-4 w-4" />Mark shipped</Button></div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!shipFor} onOpenChange={(o) => !o && setShipFor(null)}>
        {shipFor && (
          <DialogContent onClose={() => setShipFor(null)}>
            <DialogHeader><DialogTitle>Ship {label(shipFor)}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">The buyer will be notified. Add a courier / tracking reference if you have one.</p>
              <Input placeholder="e.g. BlueDart AWB 1234567890" value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShipFor(null)}>Cancel</Button>
                <Button disabled={busy} onClick={ship} className="bg-emerald-500 font-semibold text-zinc-950 hover:bg-emerald-400">
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm shipment
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
