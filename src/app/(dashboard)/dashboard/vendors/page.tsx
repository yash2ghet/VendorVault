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
  Search, Download, CheckCircle, ShieldAlert, Ban, CheckCircle2 
} from "lucide-react";

interface Vendor {
  _id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  gstNumber: string;
  address: string;
  city: string;
  state: string;
  country: string;
  verificationStatus: "PENDING" | "VERIFIED" | "FLAGGED" | "SUSPENDED";
  status: "ACTIVE" | "INACTIVE";
  notes?: string;
  createdAt: string;
}

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  companyName: "",
  gstNumber: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  notes: "",
};

const verificationColors: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  VERIFIED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  FLAGGED: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  SUSPENDED: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
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

  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: "" });

  const triggerAlert = (msg: string) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: "" }), 4000);
  };

  const fetchVendors = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await fetch(`/api/vendors?page=${page}&limit=50`);
      const data = await res.json();
      setVendors(data.vendors || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Fetch vendors failed:", err);
    } finally {
      setTableLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const matchesTab = activeTab === "ALL" || v.verificationStatus === activeTab;
      const cleanQuery = searchQuery.toLowerCase().trim();
      const matchesSearch = !cleanQuery || 
        v.companyName.toLowerCase().includes(cleanQuery) ||
        v.name.toLowerCase().includes(cleanQuery) ||
        v.gstNumber.toLowerCase().includes(cleanQuery) ||
        v.city.toLowerCase().includes(cleanQuery);
        
      return matchesTab && matchesSearch;
    });
  }, [vendors, searchQuery, activeTab]);

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    const allFilteredSelected = filteredVendors.length > 0 && filteredVendors.every((v) => selectedIds.includes(v._id));
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredVendors.some((v) => v._id === id)));
    } else {
      const idsToAdd = filteredVendors.map((v) => v._id).filter((id) => !selectedIds.includes(id));
      setSelectedIds((prev) => [...prev, ...idsToAdd]);
    }
  };

  const handleExportCSV = () => {
    const exportDataset = selectedIds.length > 0
      ? filteredVendors.filter((v) => selectedIds.includes(v._id))
      : filteredVendors;

    const headers = ["ID", "Company", "Name", "Email", "Phone", "GST", "City", "State", "Status", "Verification"];
    const rows = exportDataset.map((v) => [
      v._id,
      `"${v.companyName.replace(/"/g, '""')}"`,
      `"${v.name.replace(/"/g, '""')}"`,
      v.email,
      v.phone,
      v.gstNumber,
      `"${v.city}"`,
      `"${v.state}"`,
      v.status,
      v.verificationStatus
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vendors_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateVerificationStatus = async (status: "VERIFIED" | "FLAGGED" | "SUSPENDED") => {
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/vendors/${id}/verify`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ verificationStatus: status }),
          })
        )
      );

      setVendors((prev) =>
        prev.map((v) => (selectedIds.includes(v._id) ? { ...v, verificationStatus: status } : v))
      );
      setSelectedIds([]);
      triggerAlert(`Updated verification status for selected vendors.`);
    } catch (e) {
      console.error("Bulk status update failed", e);
    }
  };

  const handleEditSelected = () => {
    if (selectedIds.length !== 1) return;
    const target = vendors.find((v) => v._id === selectedIds[0]);
    if (target) openEdit(target);
  };

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(v: Vendor) {
    setEditId(v._id);
    setForm({
      name: v.name,
      email: v.email,
      phone: v.phone,
      companyName: v.companyName,
      gstNumber: v.gstNumber,
      address: v.address,
      city: v.city,
      state: v.state,
      country: v.country,
      notes: v.notes || "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editId ? `/api/vendors/${editId}` : "/api/vendors";
      const method = editId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setDialogOpen(false);
        setForm(emptyForm);
        fetchVendors();
        triggerAlert(editId ? "Vendor profile updated successfully." : "New vendor registered successfully.");
      } else {
        const errorData = await res.json();
        alert(`Failed: ${errorData.error || "Unable to save vendor record"}`);
      }
    } catch (err) {
      console.error("Submission failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function executeBulkDelete() {
    setLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) => fetch(`/api/vendors/${id}`, { method: "DELETE" }))
      );
      
      setVendors((prev) => prev.filter((v) => !selectedIds.includes(v._id)));
      setDeleteDialogOpen(false);
      setSelectedIds([]);
      triggerAlert("Selected vendor records removed.");
    } catch (err) {
      console.error("Bulk deletion failed:", err);
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    { 
      key: "companyName", 
      header: "Company",
      render: (v: Vendor) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{v.companyName}</span>
          <span className="text-[11px] text-muted-foreground">{v.name}</span>
        </div>
      )
    },
    { key: "email", header: "Email" },
    { key: "city", header: "Location", render: (v: Vendor) => <span>{v.city}, {v.state}</span> },
    { key: "gstNumber", header: "GST Number" },
    {
      key: "verificationStatus",
      header: "Verification",
      render: (v: Vendor) => (
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${verificationColors[v.verificationStatus] || "bg-muted text-muted-foreground border-border"}`}>
          {v.verificationStatus || "PENDING"}
        </span>
      ),
    },
    { 
      key: "status", 
      header: "Status", 
      render: (b: Vendor) => (
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
      render: (v: Vendor) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => openEdit(v)}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 relative">
      
      {/* Toast Alert */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-card border border-emerald-500 text-foreground px-4 py-3 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 max-w-md backdrop-blur-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <div className="text-xs font-semibold tracking-wide">
            {toast.message}
          </div>
        </div>
      )}
      
      {/* Bulk Action Bar */}
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
              onClick={() => updateVerificationStatus("VERIFIED")} 
              size="sm" 
              variant="ghost" 
              className="h-7 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium"
            >
              <CheckCircle className="mr-1 h-3 w-3" /> Verify
            </Button>
            <Button 
              onClick={() => updateVerificationStatus("FLAGGED")} 
              size="sm" 
              variant="ghost" 
              className="h-7 px-2 text-xs text-orange-500 hover:bg-orange-500/10 font-medium"
            >
              <ShieldAlert className="mr-1 h-3 w-3" /> Flag
            </Button>
            <Button 
              onClick={() => updateVerificationStatus("SUSPENDED")} 
              size="sm" 
              variant="ghost" 
              className="h-7 px-2 text-xs text-red-500 hover:bg-red-500/10 font-medium"
            >
              <Ban className="mr-1 h-3 w-3" /> Suspend
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendors</h1>
          <p className="text-sm text-muted-foreground">Manage vendor profiles, compliance verification, and suppliers directory</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-500 font-semibold text-zinc-950 hover:bg-emerald-400">
          <Plus className="mr-2 h-4 w-4" /> Add Vendor
        </Button>
      </div>

      {/* Filter Ribbon */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-card p-3 rounded-xl border border-border shadow-sm">
        <div className="flex gap-1 bg-muted p-1 rounded-lg border border-border/60 w-full sm:w-auto overflow-x-auto">
          {["ALL", "PENDING", "VERIFIED", "FLAGGED", "SUSPENDED"].map((tab) => (
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
            placeholder="Search company, name, GST..." 
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
        data={filteredVendors || []}
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
        <DialogContent onClose={() => setDialogOpen(false)} className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Vendor Details" : "Register New Vendor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Contact Name</label>
              <Input placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="border-input bg-background text-foreground" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Email Address</label>
              <Input placeholder="vendor@example.com" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="border-input bg-background text-foreground" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Phone Number</label>
              <Input placeholder="+91 98765 43210" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required className="border-input bg-background text-foreground" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Company Name</label>
              <Input placeholder="Acme Technologies" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required className="border-input bg-background text-foreground" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">GST Number</label>
              <Input placeholder="22AAAAA0000A1Z5" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} required className="border-input bg-background text-foreground" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">City</label>
              <Input placeholder="Mumbai" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required className="border-input bg-background text-foreground" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">State</label>
              <Input placeholder="Maharashtra" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required className="border-input bg-background text-foreground" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Country</label>
              <Input placeholder="India" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required className="border-input bg-background text-foreground" />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-foreground">Street Address</label>
              <Input placeholder="Industrial Area, Phase 2" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required className="border-input bg-background text-foreground" />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-foreground">Notes / Terms (Optional)</label>
              <Textarea placeholder="Payment terms, delivery preferences..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="border-input bg-background text-foreground resize-none h-18" />
            </div>

            <div className="col-span-2 flex justify-end gap-3 mt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-emerald-500 font-semibold text-zinc-950 hover:bg-emerald-400">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editId ? "Update Vendor" : "Register Vendor"}
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
            Are you sure you want to permanently delete these <strong>{selectedIds.length}</strong> selected vendor profiles?
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
