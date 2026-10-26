"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Plus, Loader2, Search, CheckCircle, X, Trash2, Download, Eye, 
  ShoppingCart, Building2, Calendar, FileText, ArrowRight, DollarSign 
} from "lucide-react";

interface OrderItem {
  productId?: { _id: string; name: string; sku: string; price?: number };
  quantity: number;
  price: number;
}

interface PO {
  _id: string;
  vendorId?: { _id: string; name: string; companyName: string; email?: string; phone?: string };
  products?: OrderItem[];
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  expectedDeliveryDate: string;
  createdBy?: { name: string } | string;
  notes?: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  CONFIRMED: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  SHIPPED: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  DELIVERED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  CANCELLED: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

const paymentColors: Record<string, string> = {
  UNPAID: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  PARTIAL: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  PAID: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  REFUNDED: "bg-muted text-muted-foreground border-border",
};

const emptyForm = { 
  vendorId: "", 
  expectedDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0], 
  notes: "", 
  productId: "", 
  quantity: "1", 
  price: "" 
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<PO[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<PO | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);

  // Dynamic Lookup States
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Filtering Options
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchLookups = async () => {
    try {
      const [vRes, pRes] = await Promise.all([
        fetch("/api/vendors?limit=100"),
        fetch("/api/products?limit=100")
      ]);
      const [vData, pData] = await Promise.all([vRes.json(), pRes.json()]);
      setVendors(vData.vendors || []);
      setProducts(pData.products || []);
    } catch (err) {
      console.error("Lookups data retrieval failure", err);
    }
  };

  const fetchOrders = useCallback(async () => {
    setTableLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        statusTab: activeTab,
        search: searchQuery
      });
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error(error);
    } finally {
      setTableLoading(false);
    }
  }, [page, activeTab, searchQuery]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { fetchLookups(); }, []);

  const handleProductSelect = (productId: string) => {
    const selectedProd = products.find((p) => p._id === productId);
    setForm((prev) => ({
      ...prev,
      productId,
      price: selectedProd?.price !== undefined ? String(selectedProd.price) : prev.price,
      // If vendor not yet picked and product has a vendor, auto-select vendor
      vendorId: prev.vendorId || (selectedProd?.vendorId?._id || selectedProd?.vendorId || "")
    }));
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const handleToggleAll = () => {
    if (orders.every((o) => selectedIds.includes(o._id))) {
      setSelectedIds((prev) => prev.filter((id) => !orders.some((o) => o._id === id)));
    } else {
      setSelectedIds((prev) => [...prev, ...orders.map((o) => o._id).filter((id) => !prev.includes(id))]);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: form.vendorId,
          expectedDeliveryDate: new Date(form.expectedDeliveryDate).toISOString(),
          notes: form.notes || undefined,
          products: [{ productId: form.productId, quantity: Number(form.quantity), price: Number(form.price) }],
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        setForm(emptyForm);
        fetchOrders();
      } else {
        const errorData = await res.json();
        alert(`Order Creation Failed: ${errorData.error || "Check backend error log"}`);
      }
    } catch (err: any) {
      console.error("Networking error:", err);
      alert(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, orderStatus: string) {
    try {
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus }),
      });
      fetchOrders();
      if (viewOrder && viewOrder._id === id) {
        setViewOrder({ ...viewOrder, orderStatus });
      }
    } catch (e) {
      console.error("Failed to update order status", e);
    }
  }

  async function updatePayment(id: string, paymentStatus: string) {
    try {
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus }),
      });
      fetchOrders();
      if (viewOrder && viewOrder._id === id) {
        setViewOrder({ ...viewOrder, paymentStatus });
      }
    } catch (e) {
      console.error("Failed to update payment status", e);
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Are you sure you want to remove ${selectedIds.length} purchase order record(s)?`)) return;
    await Promise.all(selectedIds.map(id => fetch(`/api/orders/${id}`, { method: "DELETE" })));
    setSelectedIds([]);
    fetchOrders();
  }

  const columns = [
    { 
      key: "vendorId", 
      header: "Vendor Company", 
      render: (o: PO) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{o.vendorId?.companyName || o.vendorId?.name || "—"}</span>
          <span className="text-[11px] text-muted-foreground font-mono">PO-{o._id.slice(-6).toUpperCase()}</span>
        </div>
      ) 
    },
    { 
      key: "totalAmount", 
      header: "Total Value", 
      render: (o: PO) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          ₹{Number(o.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ) 
    },
    {
      key: "orderStatus", 
      header: "Order Progress",
      render: (o: PO) => <Badge className={`${statusColors[o.orderStatus] || statusColors.DRAFT} border font-medium`}>{o.orderStatus}</Badge>,
    },
    {
      key: "paymentStatus", 
      header: "Payment State",
      render: (o: PO) => <Badge className={`${paymentColors[o.paymentStatus] || paymentColors.UNPAID} border font-medium`}>{o.paymentStatus}</Badge>,
    },
    { 
      key: "expectedDeliveryDate", 
      header: "Delivery Timeline", 
      render: (o: PO) => (
        <span className="text-xs text-muted-foreground">
          {o.expectedDeliveryDate ? new Date(o.expectedDeliveryDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
        </span>
      ) 
    },
    {
      key: "actions", 
      header: "Actions",
      render: (o: PO) => {
        const nextMap: Record<string, string> = { 
          DRAFT: "PENDING", 
          PENDING: "CONFIRMED", 
          CONFIRMED: "SHIPPED", 
          SHIPPED: "DELIVERED" 
        };
        const nextStatus = nextMap[o.orderStatus];

        return (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setViewOrder(o)}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              title="View Order Details"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            {nextStatus && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => updateStatus(o._id, nextStatus)} 
                className="text-[11px] h-7 px-2 border-border hover:bg-accent text-foreground transition-colors"
              >
                Advance to {nextStatus}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 relative">
      
      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-full border border-border bg-card/95 pl-4 pr-2 py-1.5 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{selectedIds.length} POs Selected</span>
          <Button size="icon" variant="ghost" onClick={() => setSelectedIds([])} className="h-5 w-5 text-muted-foreground hover:text-foreground rounded-full">
            <X className="h-3 w-3" />
          </Button>
          <div className="w-[1px] h-4 bg-border" />
          <Button onClick={handleBulkDelete} size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:bg-red-500/10">
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
          </Button>
        </div>
      )}

      {/* Header Container */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">Procure inventory, track supplier shipments, and manage payments</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-emerald-500 font-semibold text-zinc-950 hover:bg-emerald-400">
          <Plus className="mr-2 h-4 w-4" /> New Order
        </Button>
      </div>

      {/* Query Filters Control Panel */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-card p-3 rounded-xl border border-border shadow-sm">
        <div className="flex gap-1 bg-muted p-1 rounded-lg border border-border/60 overflow-x-auto w-full sm:w-auto">
          {["ALL", "DRAFT", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(1); }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                activeTab === tab 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search notes or vendor..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-9 h-9 text-xs border-border bg-background text-foreground"
          />
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={orders} 
        page={page} 
        totalPages={totalPages} 
        onPageChange={setPage} 
        isLoading={tableLoading}
        selectedIds={selectedIds}
        onToggleRow={handleToggleRow}
        onToggleAll={handleToggleAll}
      />

      {/* Creation Modal Sheet */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)} className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-xs text-foreground font-medium flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Supplier / Vendor
              </label>
              <select 
                value={form.vendorId} 
                onChange={(e) => setForm({ ...form, vendorId: e.target.value })} 
                required 
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none"
              >
                <option value="">Select Vendor...</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id} className="bg-popover text-popover-foreground">
                    {v.companyName || v.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-foreground font-medium flex items-center gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" /> Product Catalog Item
              </label>
              <select 
                value={form.productId} 
                onChange={(e) => handleProductSelect(e.target.value)} 
                required 
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none"
              >
                <option value="">Select Product...</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id} className="bg-popover text-popover-foreground">
                    {p.name} ({p.sku}) — ₹{p.price}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-foreground font-medium">Quantity</label>
                <Input 
                  type="number" 
                  min="1" 
                  value={form.quantity} 
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })} 
                  required 
                  className="border-input bg-background text-foreground" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-foreground font-medium">Unit Price (₹)</label>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  value={form.price} 
                  onChange={(e) => setForm({ ...form, price: e.target.value })} 
                  required 
                  className="border-input bg-background text-foreground" 
                />
              </div>
            </div>

            {/* Estimated Total Calculation Preview */}
            <div className="rounded-lg bg-muted/50 p-2.5 flex items-center justify-between text-xs border border-border">
              <span className="text-muted-foreground">Order Total (Estimated):</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                ₹{(Number(form.quantity || 0) * Number(form.price || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-foreground font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Expected Delivery Date
              </label>
              <Input 
                type="date" 
                value={form.expectedDeliveryDate} 
                onChange={(e) => setForm({ ...form, expectedDeliveryDate: e.target.value })} 
                required 
                className="border-input bg-background text-foreground" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-foreground font-medium">Internal Notes & Reference</label>
              <Input 
                placeholder="Shipping instructions, PO references..." 
                value={form.notes} 
                onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                className="border-input bg-background text-foreground" 
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Discard
              </Button>
              <Button type="submit" disabled={loading} className="bg-emerald-500 font-semibold text-zinc-950 hover:bg-emerald-400">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Order
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Order Details Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={(open) => !open && setViewOrder(null)}>
        {viewOrder && (
          <DialogContent onClose={() => setViewOrder(null)} className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Purchase Order Details</span>
                <span className="text-xs font-mono text-muted-foreground font-normal">
                  PO-{viewOrder._id.slice(-6).toUpperCase()}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider block">Vendor</span>
                  <span className="font-semibold text-foreground">
                    {viewOrder.vendorId?.companyName || viewOrder.vendorId?.name || "—"}
                  </span>
                  {viewOrder.vendorId?.email && (
                    <span className="text-xs text-muted-foreground block">{viewOrder.vendorId.email}</span>
                  )}
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider block">Total Amount</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{Number(viewOrder.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Order Status</span>
                  <select
                    value={viewOrder.orderStatus}
                    onChange={(e) => updateStatus(viewOrder._id, e.target.value)}
                    className="h-8 w-full rounded border border-input bg-background px-2 text-xs text-foreground"
                  >
                    {["DRAFT", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Payment Status</span>
                  <select
                    value={viewOrder.paymentStatus}
                    onChange={(e) => updatePayment(viewOrder._id, e.target.value)}
                    className="h-8 w-full rounded border border-input bg-background px-2 text-xs text-foreground"
                  >
                    {["UNPAID", "PARTIAL", "PAID", "REFUNDED"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {viewOrder.products && viewOrder.products.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-foreground block">Line Items</span>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted text-muted-foreground border-b border-border">
                        <tr>
                          <th className="px-3 py-1.5 text-left font-medium">Item</th>
                          <th className="px-3 py-1.5 text-right font-medium">Qty</th>
                          <th className="px-3 py-1.5 text-right font-medium">Unit Price</th>
                          <th className="px-3 py-1.5 text-right font-medium">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {viewOrder.products.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 text-foreground font-medium">
                              {item.productId?.name || "Product Item"}
                              {item.productId?.sku && (
                                <span className="text-muted-foreground ml-1">({item.productId.sku})</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right text-foreground">{item.quantity}</td>
                            <td className="px-3 py-2 text-right text-foreground">₹{Number(item.price).toLocaleString('en-IN')}</td>
                            <td className="px-3 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                              ₹{(item.quantity * item.price).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {viewOrder.notes && (
                <div className="rounded-lg bg-muted/30 p-2.5 border border-border text-xs">
                  <span className="text-muted-foreground block font-medium">Notes:</span>
                  <p className="text-foreground mt-0.5">{viewOrder.notes}</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setViewOrder(null)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
