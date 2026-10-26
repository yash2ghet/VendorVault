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
  Search, Download, CheckCircle, Ban, Image as ImageIcon, Sparkles
} from "lucide-react";

interface Brand {
  _id: string;
  name: string;
  logo?: string;
  description?: string;
  status: string;
  createdAt: string;
}

const emptyForm = { name: "", logo: "", description: "" };

const BRAND_LOGO_PRESETS = [
  { name: "Apple", logo: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { name: "Dell", logo: "https://upload.wikimedia.org/wikipedia/commons/4/48/Dell_Logo.svg" },
  { name: "HP", logo: "https://upload.wikimedia.org/wikipedia/commons/a/ad/HP_logo_630x630.png" },
  { name: "Lenovo", logo: "https://upload.wikimedia.org/wikipedia/commons/b/b8/Lenovo_logo_2015.svg" },
  { name: "Cisco", logo: "https://upload.wikimedia.org/wikipedia/commons/0/08/Cisco_logo_blue_2016.svg" },
  { name: "Samsung", logo: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { name: "Logitech", logo: "https://upload.wikimedia.org/wikipedia/commons/d/d4/Logitech_logo.svg" },
  { name: "Microsoft", logo: "https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg" },
  { name: "Intel", logo: "https://upload.wikimedia.org/wikipedia/commons/7/7d/Intel_logo_%282020%29.svg" },
  { name: "ASUS", logo: "https://upload.wikimedia.org/wikipedia/commons/2/2e/ASUS_Logo.svg" },
];

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("ALL");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const fetchBrands = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await fetch(`/api/brands?page=${page}&limit=50`);
      
      if (!res.ok) {
        console.error(`Server error state returned: ${res.status}`);
        setBrands([]);
        return;
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Invalid response body content type");
        setBrands([]);
        return;
      }

      const data = await res.json();
      
      if (Array.isArray(data)) {
        setBrands(data);
        setTotalPages(1);
      } else if (data && data.brands) {
        setBrands(data.brands);
        setTotalPages(data.totalPages || 1);
      } else {
        setBrands([]);
      }
    } catch (error) {
      console.error("Failed to parse brand grid data:", error);
      setBrands([]);
    } finally {
      setTableLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const filteredBrands = useMemo(() => {
    return brands.filter((b) => {
      const matchesTab = activeTab === "ALL" || (b.status || "ACTIVE") === activeTab;
      const cleanQuery = searchQuery.toLowerCase().trim();
      const matchesSearch = !cleanQuery || 
        b.name?.toLowerCase().includes(cleanQuery) ||
        b.description?.toLowerCase().includes(cleanQuery);
        
      return matchesTab && matchesSearch;
    });
  }, [brands, searchQuery, activeTab]);

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    const allFilteredSelected = filteredBrands.length > 0 && filteredBrands.every((b) => selectedIds.includes(b._id));
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredBrands.some((b) => b._id === id)));
    } else {
      const idsToAdd = filteredBrands.map((b) => b._id).filter((id) => !selectedIds.includes(id));
      setSelectedIds((prev) => [...prev, ...idsToAdd]);
    }
  };

  const handleExportCSV = () => {
    const exportDataset = selectedIds.length > 0
      ? filteredBrands.filter((b) => selectedIds.includes(b._id))
      : filteredBrands;

    const headers = ["ID", "Name", "Logo", "Status", "Description"];
    const rows = exportDataset.map((b) => [
      b._id,
      `"${b.name.replace(/"/g, '""')}"`,
      `"${b.logo || ""}"`,
      b.status || "ACTIVE",
      `"${(b.description || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `brands_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditSelected = () => {
    if (selectedIds.length !== 1) return;
    const target = brands.find((b) => b._id === selectedIds[0]);
    if (target) openEdit(target);
  };

  const updateBrandStatus = async (status: "ACTIVE" | "INACTIVE") => {
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/brands/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        )
      );
      setSelectedIds([]);
      await fetchBrands();
    } catch (e) {
      console.error("Bulk status transition failure", e);
    }
  };

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(b: Brand) {
    setEditId(b._id);
    setForm({ name: b.name, logo: b.logo || "", description: b.description || "" });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editId ? `/api/brands/${editId}` : "/api/brands";
      const method = editId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setDialogOpen(false);
        setForm(emptyForm);
        fetchBrands();
      } else {
        const errorMsg = await res.json();
        alert(`Server Error: ${errorMsg.error || "Failed to save brand"}`);
      }
    } catch (error: any) {
      console.error("Brand submission failure:", error);
      alert(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function executeBulkDelete() {
    setLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) => fetch(`/api/brands/${id}`, { method: "DELETE" }))
      );
      setDeleteDialogOpen(false);
      setSelectedIds([]);
      await fetchBrands();
    } catch (error) {
      console.error("Bulk brand deletion error:", error);
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    { 
      key: "logo", 
      header: "Logo",
      render: (b: Brand) => (
        <div className="h-9 w-9 rounded-lg border border-border bg-card p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
          {b.logo ? (
            <img 
              src={b.logo} 
              alt={`${b.name} logo`} 
              className="h-full w-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 h-full w-full flex items-center justify-center rounded">
              {b.name?.[0]?.toUpperCase() || <ImageIcon className="h-4 w-4 text-muted-foreground" />}
            </span>
          )}
        </div>
      )
    },
    { 
      key: "name", 
      header: "Brand Name",
      render: (b: Brand) => (
        <div className="font-semibold text-foreground flex items-center gap-2">
          {b.name}
        </div>
      )
    },
    { 
      key: "description", 
      header: "Description", 
      render: (b: Brand) => <span className="text-muted-foreground text-sm line-clamp-1">{b.description || "—"}</span> 
    },
    { 
      key: "status", 
      header: "Status", 
      render: (b: Brand) => (
        <Badge 
          className={
            b.status === "ACTIVE"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-none hover:bg-emerald-500/10"
              : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shadow-none hover:bg-red-500/10"
          }
        >
          {b.status || "ACTIVE"}
        </Badge>
      ) 
    },
    {
      key: "actions",
      header: "Actions",
      render: (b: Brand) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => openEdit(b)}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 relative">
      
      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full border border-border bg-card/95 pl-3 pr-2 py-1.5 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-1.5 border-r border-border pr-3">
            <span className="text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {selectedIds.length} Selected
            </span>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => setSelectedIds([])} 
              className="h-5 w-5 text-muted-foreground hover:text-foreground rounded-full"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            {selectedIds.length === 1 && (
              <Button 
                onClick={handleEditSelected} 
                size="sm" 
                variant="outline"
                className="h-7 px-2.5 text-xs font-medium"
              >
                <Edit2 className="mr-1 h-3 w-3" /> Edit
              </Button>
            )}
            
            <Button 
              onClick={() => updateBrandStatus("ACTIVE")} 
              size="sm" 
              variant="ghost" 
              className="h-7 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium"
            >
              <CheckCircle className="mr-1 h-3 w-3" /> Activate
            </Button>
            <Button 
              onClick={() => updateBrandStatus("INACTIVE")} 
              size="sm" 
              variant="ghost" 
              className="h-7 px-2 text-xs text-muted-foreground hover:bg-muted font-medium"
            >
              <Ban className="mr-1 h-3 w-3" /> Deactivate
            </Button>

            <div className="w-[1px] h-3 bg-border mx-1" />

            <Button 
              onClick={handleExportCSV} 
              size="sm" 
              variant="ghost" 
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground font-medium"
            >
              <Download className="mr-1 h-3 w-3" /> CSV
            </Button>

            <Button 
              onClick={() => setDeleteDialogOpen(true)} 
              size="sm" 
              variant="ghost" 
              className="h-7 px-2.5 text-xs text-red-500 hover:bg-red-500 hover:text-white font-medium rounded-full"
            >
              <Trash2 className="mr-1 h-3 w-3" /> Delete
            </Button>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Brands</h1>
          <p className="text-sm text-muted-foreground">Manage manufacturer brands, logos, and catalog classifications</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-500 font-semibold text-zinc-950 hover:bg-emerald-400">
          <Plus className="mr-2 h-4 w-4" /> Add Brand
        </Button>
      </div>

      {/* Filter Controls Ribbon */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-card p-3 rounded-xl border border-border shadow-sm">
        <div className="flex gap-1 bg-muted p-1 rounded-lg border border-border/60 w-full sm:w-auto">
          {["ALL", "ACTIVE", "INACTIVE"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex-1 sm:flex-initial ${
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
            placeholder="Search brands..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs border-border bg-background text-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={filteredBrands || []} 
        page={page} 
        totalPages={totalPages} 
        onPageChange={setPage} 
        isLoading={tableLoading}
        selectedIds={selectedIds}
        onToggleRow={handleToggleRow}
        onToggleAll={handleToggleAll}
      />

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Brand" : "Add Brand"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Brand Name</label>
              <Input 
                placeholder="e.g. Dell, Apple, Lenovo" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                required 
                className="border-input bg-background text-foreground" 
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Brand Logo URL</label>
                {form.logo && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Previewing</span>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <Input 
                  placeholder="https://example.com/logo.svg" 
                  value={form.logo} 
                  onChange={(e) => setForm({ ...form, logo: e.target.value })} 
                  className="border-input bg-background text-foreground flex-1" 
                />
                {form.logo && (
                  <div className="h-9 w-9 rounded-lg border border-border bg-card p-1 flex items-center justify-center shrink-0">
                    <img 
                      src={form.logo} 
                      alt="Preview" 
                      className="h-full w-full object-contain"
                      onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Quick Logo Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" /> Quick Preset Logos:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-muted/40 rounded-lg border border-border">
                {BRAND_LOGO_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setForm({ 
                      ...form, 
                      name: form.name || preset.name, 
                      logo: preset.logo 
                    })}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-card hover:bg-accent border border-border text-[11px] text-foreground transition-colors"
                  >
                    <img src={preset.logo} alt={preset.name} className="h-3.5 w-3.5 object-contain" />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Description (Optional)</label>
              <Textarea 
                placeholder="Hardware manufacturer notes..." 
                value={form.description} 
                onChange={(e) => setForm({ ...form, description: e.target.value })} 
                className="border-input bg-background text-foreground resize-none h-20" 
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-emerald-500 font-semibold text-zinc-950 hover:bg-emerald-400">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editId ? "Update Brand" : "Create Brand"}
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
            <DialogTitle className="text-center text-foreground text-lg">Confirm Bulk Deletion</DialogTitle>
          </DialogHeader>
          <p className="text-center text-sm text-muted-foreground py-2">
            Are you sure you want to permanently delete these <strong>{selectedIds.length}</strong> selected product brands?
          </p>
          <div className="flex justify-center gap-3 mt-4">
            <Button variant="outline" disabled={loading} onClick={() => setDeleteDialogOpen(false)}>
              Discard
            </Button>
            <Button disabled={loading} onClick={executeBulkDelete} className="bg-red-500 font-semibold text-white hover:bg-red-600">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete Permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
