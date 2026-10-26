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
  Search, Download, CheckCircle, Ban, Layers 
} from "lucide-react";

interface Category {
  _id: string;
  name: string;
  description?: string;
  parentCategory?: { _id: string; name: string } | null;
  status: string;
  createdAt: string;
}

const emptyForm = { name: "", description: "", parentCategory: "" };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
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

  const fetchCategories = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await fetch(`/api/categories?page=${page}&limit=50`);
      
      if (!res.ok) {
        console.error(`Server error state returned: ${res.status}`);
        setCategories([]);
        return;
      }

      const data = await res.json();
      setCategories(data.categories || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("Failed to parse category grid data:", error);
      setCategories([]);
    } finally {
      setTableLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const matchesTab = activeTab === "ALL" || (c.status || "ACTIVE") === activeTab;
      const cleanQuery = searchQuery.toLowerCase().trim();
      const matchesSearch = !cleanQuery || 
        c.name?.toLowerCase().includes(cleanQuery) ||
        c.description?.toLowerCase().includes(cleanQuery);
        
      return matchesTab && matchesSearch;
    });
  }, [categories, searchQuery, activeTab]);

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    const allFilteredSelected = filteredCategories.every((c) => selectedIds.includes(c._id));
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredCategories.some((c) => c._id === id)));
    } else {
      const newSelections = filteredCategories.map((c) => c._id).filter((id) => !selectedIds.includes(id));
      setSelectedIds((prev) => [...prev, ...newSelections]);
    }
  };

  function openCreate() { 
    setForm(emptyForm); 
    setEditId(null); 
    setDialogOpen(true); 
  }

  function handleEditSelected() {
    if (selectedIds.length !== 1) return;
    const target = categories.find((c) => c._id === selectedIds[0]);
    if (target) openEdit(target);
  }

  function openEdit(c: Category) {
    setEditId(c._id);
    setForm({
      name: c.name,
      description: c.description || "",
      parentCategory: c.parentCategory?._id || "",
    });
    setDialogOpen(true);
  }

  const updateCategoryStatus = async (status: "ACTIVE" | "INACTIVE") => {
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/categories/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        )
      );
      setSelectedIds([]);
      await fetchCategories();
    } catch (e) {
      console.error("Bulk status transition failure", e);
    }
  };

  const handleExportCSV = () => {
    const exportDataset = selectedIds.length > 0
      ? filteredCategories.filter((c) => selectedIds.includes(c._id))
      : filteredCategories;

    const headers = ["ID", "Name", "Parent Category", "Status", "Description"];
    const rows = exportDataset.map((c) => [
      c._id,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.parentCategory?.name || ""}"`,
      c.status || "ACTIVE",
      `"${(c.description || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `categories_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editId ? `/api/categories/${editId}` : "/api/categories";
      const method = editId ? "PATCH" : "POST";
      
      const payload: Record<string, any> = {
        name: form.name,
        description: form.description || undefined,
        parentCategory: form.parentCategory || null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setDialogOpen(false);
        setForm(emptyForm);
        fetchCategories();
      } else {
        const errorMsg = await res.json();
        alert(`Server Error: ${errorMsg.error || "Failed to save category"}`);
      }
    } catch (error: any) {
      alert(`Network connectivity exception: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function executeBulkDelete() {
    setLoading(true);
    try {
      await Promise.all(selectedIds.map((id) => fetch(`/api/categories/${id}`, { method: "DELETE" })));
      setDeleteDialogOpen(false);
      setSelectedIds([]);
      await fetchCategories();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    { 
      key: "name", 
      header: "Category Name",
      render: (c: Category) => (
        <div className="font-semibold text-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-500" />
          {c.name}
        </div>
      )
    },
    { 
      key: "parentCategory", 
      header: "Parent Node", 
      render: (c: Category) => <span className="text-muted-foreground text-sm">{c.parentCategory?.name || "Root"}</span> 
    },
    { 
      key: "description", 
      header: "Description", 
      render: (c: Category) => <span className="text-muted-foreground text-sm line-clamp-1">{c.description || "—"}</span> 
    },
    { 
      key: "status", 
      header: "Status", 
      render: (b: Category) => (
        <Badge 
          className={
            b.status === "ACTIVE"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-none hover:bg-emerald-500/10"
              : "bg-muted text-muted-foreground border border-border shadow-none"
          }
        >
          {b.status || "ACTIVE"}
        </Badge>
      ) 
    },
    {
      key: "actions",
      header: "Actions",
      render: (c: Category) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => openEdit(c)}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 relative">
      
      {/* Floating Action Bar */}
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
            
            <Button onClick={() => updateCategoryStatus("ACTIVE")} size="sm" variant="ghost" className="h-7 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium">
              <CheckCircle className="mr-1 h-3 w-3" /> Activate
            </Button>
            <Button onClick={() => updateCategoryStatus("INACTIVE")} size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:bg-muted font-medium">
              <Ban className="mr-1 h-3 w-3" /> Deactivate
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground">Manage product classifications and catalog taxonomy</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-500 font-semibold text-zinc-950 hover:bg-emerald-400">
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      {/* Filter Ribbon */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-card p-3 rounded-xl border border-border shadow-sm">
        <div className="flex gap-1 bg-muted p-1 rounded-lg border border-border/60 w-full sm:w-auto overflow-x-auto">
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
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search category name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs border-border bg-background text-foreground"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={filteredCategories || []} 
        page={page} 
        totalPages={totalPages} 
        onPageChange={setPage} 
        isLoading={tableLoading}
        selectedIds={selectedIds}
        onToggleRow={handleToggleRow}
        onToggleAll={handleToggleAll}
      />

      {/* Add / Edit Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Category Name</label>
              <Input 
                placeholder="e.g. Laptops, Networking, Peripherals" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                required 
                className="border-input bg-background text-foreground" 
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Parent Category (Optional)</label>
              <select
                value={form.parentCategory}
                onChange={(e) => setForm({ ...form, parentCategory: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none"
              >
                <option value="">No parent (top-level)</option>
                {categories
                  .filter((c) => c._id !== editId)
                  .map((c) => (
                    <option key={c._id} value={c._id} className="bg-popover text-popover-foreground">
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Description (Optional)</label>
              <Textarea 
                placeholder="Category classification notes..." 
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
                {editId ? "Update Category" : "Create Category"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 mb-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle className="text-center text-foreground text-lg">Confirm Bulk Deletion</DialogTitle>
          </DialogHeader>
          <p className="text-center text-sm text-muted-foreground py-2">
            Are you sure you want to permanently remove these <strong>{selectedIds.length}</strong> selected categories?
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
