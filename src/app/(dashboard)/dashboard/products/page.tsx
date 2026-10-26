"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Plus, Loader2, Edit2, Trash2, AlertTriangle, X, 
  Search, Download, CheckCircle, Ban, AlertCircle, Package 
} from "lucide-react";

interface Product {
  _id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  lowStockThreshold: number;
  brandId?: { _id: string; name: string } | null;
  categoryId?: { _id: string; name: string } | null;
  vendorId?: { _id: string; name: string; companyName: string } | null;
  status: string;
  createdAt: string;
}

const emptyForm = {
  name: "", sku: "", price: "", quantity: "", lowStockThreshold: "10",
  brandId: "", categoryId: "", vendorId: "", description: "",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);

  // Relational Lookups Cache lists
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  // Search & Status Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("ALL");

  // Multiselect & Bulk Tracking Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const fetchLookups = async () => {
    try {
      const [bRes, cRes, vRes] = await Promise.all([
        fetch("/api/brands?limit=100"),
        fetch("/api/categories?limit=100"),
        fetch("/api/vendors?limit=100"),
      ]);

      const [bData, cData, vData] = await Promise.all([
        bRes.json(),
        cRes.json(),
        vRes.json(),
      ]);

      setBrands(bData.brands || []);
      setCategories(cData.categories || []);
      setVendors(vData.vendors || []);
    } catch (error) {
      console.error("Relational data lookups failure:", error);
    }
  };

  const fetchProducts = useCallback(async () => {
    setTableLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        statusTab: activeTab,
        search: searchQuery,
      });

      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();

      setProducts(data.products || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("Products retrieval error:", error);
      setProducts([]);
    } finally {
      setTableLoading(false);
    }
  }, [page, activeTab, searchQuery]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchLookups(); }, []);

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    if (products.every((p) => selectedIds.includes(p._id))) {
      setSelectedIds((prev) => prev.filter((id) => !products.some((p) => p._id === id)));
    } else {
      setSelectedIds((prev) => [...prev, ...products.map((p) => p._id).filter((id) => !prev.includes(id))]);
    }
  };

  const handleExportCSV = () => {
    const exportDataset = selectedIds.length > 0
      ? products.filter((p) => selectedIds.includes(p._id))
      : products;

    const headers = ["ID", "Name", "SKU", "Price", "Quantity", "Low Stock Threshold", "Brand", "Category", "Vendor", "Status"];
    const rows = exportDataset.map((p) => [
      p._id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.sku,
      p.price,
      p.quantity,
      p.lowStockThreshold,
      `"${p.brandId?.name || ""}"`,
      `"${p.categoryId?.name || ""}"`,
      `"${p.vendorId?.companyName || p.vendorId?.name || ""}"`,
      p.status || "ACTIVE"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `products_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditSelected = () => {
    if (selectedIds.length !== 1) return;
    const target = products.find((p) => p._id === selectedIds[0]);
    if (target) openEdit(target);
  };

  const updateProductStatus = async (status: "ACTIVE" | "DRAFT") => {
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/products/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        )
      );
      setSelectedIds([]);
      await fetchProducts();
    } catch (e) {
      console.error("Bulk status update failure", e);
    }
  };

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditId(p._id);
    setForm({
      name: p.name,
      sku: p.sku,
      price: String(p.price),
      quantity: String(p.quantity),
      lowStockThreshold: String(p.lowStockThreshold || 10),
      brandId: p.brandId?._id || "",
      categoryId: p.categoryId?._id || "",
      vendorId: p.vendorId?._id || "",
      description: "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editId ? `/api/products/${editId}` : "/api/products";
      const method = editId ? "PATCH" : "POST";
      
      const res = await fetch(url, { 
        method, 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(form) 
      });

      if (res.ok) {
        setDialogOpen(false);
        setForm(emptyForm);
        setSelectedIds([]);
        await fetchProducts();
      } else {
        const errorMsg = await res.json();
        alert(`Inventory registration failed: ${errorMsg.error}`);
      }
    } catch (error: any) {
      alert(`Network connection issue: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function executeBulkDelete() {
    setLoading(true);
    try {
      await Promise.all(selectedIds.map((id) => fetch(`/api/products/${id}`, { method: "DELETE" })));
      setDeleteDialogOpen(false);
      setSelectedIds([]);
      await fetchProducts();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    { 
      key: "name", 
      header: "Product",
      render: (p: Product) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{p.name}</span>
          <span className="text-[11px] text-muted-foreground font-mono">{p.sku}</span>
        </div>
      )
    },
    { 
      key: "price", 
      header: "Price", 
      render: (p: Product) => (
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          ₹{Number(p.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ) 
    },
    {
      key: "quantity", 
      header: "Stock Level",
      render: (p: Product) => {
        const isLow = p.quantity <= p.lowStockThreshold;
        return (
          <div className="flex items-center gap-1.5">
            <span className={`font-semibold ${isLow ? "text-red-500 font-bold" : "text-foreground"}`}>
              {p.quantity} units
            </span>
            {isLow && (
              <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-500 border-red-500/20 px-1 py-0">
                Low Stock
              </Badge>
            )}
          </div>
        );
      },
    },
    { key: "brandId", header: "Brand", render: (p: Product) => <span className="text-muted-foreground">{p.brandId?.name || "—"}</span> },
    { key: "categoryId", header: "Category", render: (p: Product) => <span className="text-muted-foreground">{p.categoryId?.name || "—"}</span> },
    { key: "vendorId", header: "Vendor", render: (p: Product) => <span className="text-muted-foreground">{p.vendorId?.companyName || p.vendorId?.name || "—"}</span> },
    { 
      key: "status", 
      header: "Status", 
      render: (p: Product) => (
        <Badge 
          className={
            p.status === "ACTIVE"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-none hover:bg-emerald-500/10"
              : "bg-muted text-muted-foreground border border-border shadow-none"
          }
        >
          {p.status || "ACTIVE"}
        </Badge>
      ) 
    },
    {
      key: "actions",
      header: "Actions",
      render: (p: Product) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => openEdit(p)}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 relative">
      
      {/* Floating Action Ribbon Menu */}
      {selectedIds.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full border border-border bg-card/95 pl-3 pr-2 py-1.5 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-1.5 border-r border-border pr-3">
            <span className="text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {selectedIds.length} Selected
            </span>
            <Button size="icon" variant="ghost" onClick={() => setSelectedIds([])} className="h-5 w-5 text-muted-foreground hover:text-foreground rounded-full">
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            {selectedIds.length === 1 && (
              <Button onClick={handleEditSelected} size="sm" variant="outline" className="h-7 px-2.5 text-xs font-medium">
                <Edit2 className="mr-1 h-3 w-3" /> Edit
              </Button>
            )}
            
            <Button onClick={() => updateProductStatus("ACTIVE")} size="sm" variant="ghost" className="h-7 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium">
              <CheckCircle className="mr-1 h-3 w-3" /> Activate
            </Button>
            <Button onClick={() => updateProductStatus("DRAFT")} size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:bg-muted font-medium">
              <Ban className="mr-1 h-3 w-3" /> Draft
            </Button>

            <div className="w-[1px] h-3 bg-border mx-1" />

            <Button onClick={handleExportCSV} size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground font-medium">
              <Download className="mr-1 h-3 w-3" /> CSV
            </Button>

            <Button onClick={() => setDeleteDialogOpen(true)} size="sm" variant="ghost" className="h-7 px-2.5 text-xs text-red-500 hover:bg-red-500 hover:text-white font-medium rounded-full">
              <Trash2 className="mr-1 h-3 w-3" /> Delete
            </Button>
          </div>
        </div>
      )}

      {/* Primary Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground">Manage inventory levels, safety thresholds, and catalog mappings</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-500 font-semibold text-zinc-950 hover:bg-emerald-400">
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Filter Control Ribbons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-card p-3 rounded-xl border border-border shadow-sm">
        <div className="flex gap-1 bg-muted p-1 rounded-lg border border-border/60 w-full sm:w-auto overflow-x-auto">
          {[
            { id: "ALL", label: "All Items" },
            { id: "ACTIVE", label: "Active" },
            { id: "LOW_STOCK", label: "Low Stock Alerts ⚠️" },
            { id: "DRAFT", label: "Drafts" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search product name or SKU..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-9 h-9 text-xs border-border bg-background text-foreground"
          />
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={products} 
        page={page} 
        totalPages={totalPages} 
        onPageChange={setPage} 
        isLoading={tableLoading}
        selectedIds={selectedIds}
        onToggleRow={handleToggleRow}
        onToggleAll={handleToggleAll}
      />

      {/* Creation and Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)} className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Product Specifications" : "Register New Product"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-foreground">Product Title</label>
              <Input placeholder="e.g. Dell Latitude 5440" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="border-input bg-background text-foreground" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">SKU Code</label>
              <Input placeholder="e.g. DELL-LAT-5440" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required className="border-input bg-background text-foreground" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Unit Price (₹)</label>
              <Input placeholder="0.00" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className="border-input bg-background text-foreground" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Initial Stock</label>
              <Input placeholder="0" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required className="border-input bg-background text-foreground" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Low Stock Threshold</label>
              <Input placeholder="10" type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} required className="border-input bg-background text-foreground" />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Brand</label>
              <select value={form.brandId} onChange={(e) => setForm({ ...form, brandId: e.target.value })} required className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none">
                <option value="">Choose Brand...</option>
                {brands.map((b) => <option key={b._id} value={b._id} className="bg-popover text-popover-foreground">{b.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Category</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none">
                <option value="">Choose Category...</option>
                {categories.map((c) => <option key={c._id} value={c._id} className="bg-popover text-popover-foreground">{c.name}</option>)}
              </select>
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-foreground">Supplier Vendor</label>
              <select value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })} required className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none">
                <option value="">Assign Supply Vendor...</option>
                {vendors.map((v) => <option key={v._id} value={v._id} className="bg-popover text-popover-foreground">{v.companyName || v.name}</option>)}
              </select>
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-foreground">Description (Optional)</label>
              <Textarea placeholder="Technical specifications..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border-input bg-background text-foreground h-18 resize-none" />
            </div>
            
            <div className="col-span-2 flex justify-end gap-3 mt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-emerald-500 font-semibold text-zinc-950 hover:bg-emerald-400">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editId ? "Update Product" : "Register Product"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Modal */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 mb-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle className="text-center text-foreground text-lg">Confirm Inventory Eviction</DialogTitle>
          </DialogHeader>
          <p className="text-center text-sm text-muted-foreground py-2">
            Are you sure you want to permanently delete these <strong>{selectedIds.length}</strong> selected products?
          </p>
          <div className="flex justify-center gap-3 mt-4">
            <Button variant="outline" disabled={loading} onClick={() => setDeleteDialogOpen(false)}>
              Discard
            </Button>
            <Button disabled={loading} onClick={executeBulkDelete} className="bg-red-500 font-semibold text-white hover:bg-red-600">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Clear Permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
