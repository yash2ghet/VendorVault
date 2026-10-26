"use client";

import { useEffect, useState, useCallback } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, Search, Calendar, User, RefreshCw, X, FileText } from "lucide-react";

interface AuditLog {
  _id: string;
  userId?: string;
  actorName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  ipAddress: string;
  timestamp: string;
}

const actionBadges: Record<string, { label: string; className: string }> = {
  LOW_STOCK_ALERT: { label: "Low Stock", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  VENDOR_SUSPEND: { label: "Vendor Suspended", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  PO_CANCELLED: { label: "PO Cancelled", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  VENDOR_VERIFY: { label: "Vendor Verified", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  PO_CREATE: { label: "PO Created", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  PO_APPROVED: { label: "PO Approved", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  PO_STATUS_UPDATED: { label: "PO Updated", className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  PO_STATUS_ADVANCED: { label: "PO Advanced", className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  PO_DELIVERED: { label: "PO Delivered", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  REQUEST_APPROVED: { label: "Request Approved", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  REQUEST_REJECTED: { label: "Request Rejected", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  REQUEST_DECISION_UNDONE: { label: "Decision Undone", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  USER_STATUS_CHANGED: { label: "User Status Changed", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  USER_ROLE_CHANGED: { label: "User Role Changed", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  USER_ROLE_UPDATED: { label: "Role Updated", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  USER_DELETED: { label: "User Deleted", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  PROCUREMENT_FULFILLED: { label: "Procurement Fulfilled", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
};

const ACTION_OPTIONS = [
  "PO_CREATE", "PO_APPROVED", "PO_STATUS_UPDATED", "PO_DELIVERED", "PO_CANCELLED",
  "USER_ROLE_UPDATED", "USER_STATUS_CHANGED", "USER_DELETED",
  "VENDOR_CREATE", "VENDOR_UPDATE", "VENDOR_VERIFY", "VENDOR_SUSPEND",
  "BRAND_CREATE", "CATEGORY_CREATE", "PRODUCT_CREATE", "LOW_STOCK_ALERT",
  "REQUEST_APPROVED", "REQUEST_REJECTED", "PROCUREMENT_FULFILLED",
];

const ENTITY_OPTIONS = ["PurchaseOrder", "Product", "Vendor", "Brand", "Category", "User", "HardwareRequest", "System"];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (actionFilter) params.set("action", actionFilter);
      if (entityFilter) params.set("entityType", entityFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/audit-logs?${params}`);
      const data = await res.json();

      if (data && Array.isArray(data.logs)) {
        setLogs(data.logs);
        setTotalPages(data.totalPages || 1);
      } else if (Array.isArray(data)) {
        setLogs(data);
        setTotalPages(1);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter, searchQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns = [
    { 
      key: "timestamp", 
      header: "Timestamp", 
      render: (l: AuditLog) => (
        <div className="flex flex-col text-xs">
          <span className="font-medium text-foreground">
            {new Date(l.timestamp).toLocaleDateString()}
          </span>
          <span className="text-[11px] text-muted-foreground font-mono">
            {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      ) 
    },
    { 
      key: "actorName", 
      header: "Actor", 
      render: (l: AuditLog) => (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center justify-center shrink-0">
            {l.actorName?.[0]?.toUpperCase() || "S"}
          </div>
          <span className="font-medium text-xs text-foreground truncate max-w-[120px]">
            {l.actorName || "System"}
          </span>
        </div>
      ) 
    },
    {
      key: "action", 
      header: "Action",
      render: (l: AuditLog) => {
        const meta = actionBadges[l.action];
        return (
          <Badge className={`${meta?.className || "bg-muted text-muted-foreground border-border"} border text-[11px] font-mono shadow-none`}>
            {meta?.label || l.action}
          </Badge>
        );
      },
    },
    { 
      key: "entityType", 
      header: "Entity",
      render: (l: AuditLog) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40">
          {l.entityType}
        </span>
      )
    },
    { 
      key: "details", 
      header: "Operation Details", 
      render: (l: AuditLog) => (
        <p className="text-xs text-foreground leading-snug max-w-md line-clamp-2" title={l.details}>
          {l.details || "—"}
        </p>
      )
    },
    { 
      key: "ipAddress", 
      header: "Origin IP", 
      render: (l: AuditLog) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {l.ipAddress || "System"}
        </span>
      ) 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-emerald-500" /> Audit Ledger
          </h1>
          <p className="text-sm text-muted-foreground">
            Immutable system-wide compliance log tracking changes to orders, roles, inventory, and users.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLogs()}
          className="self-start sm:self-auto h-9 gap-1.5 border-border"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Trail
        </Button>
      </div>

      {/* Filtering Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-card p-3 rounded-xl border border-border shadow-sm">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none"
          >
            <option value="">All Actions ({ACTION_OPTIONS.length})</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a} className="bg-popover text-popover-foreground">{a}</option>
            ))}
          </select>

          <select
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none"
          >
            <option value="">All Entities</option>
            {ENTITY_OPTIONS.map((e) => (
              <option key={e} value={e} className="bg-popover text-popover-foreground">{e}</option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search details, actor, ID..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
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
        data={logs} 
        page={page} 
        totalPages={totalPages} 
        onPageChange={setPage} 
        isLoading={loading}
      />
    </div>
  );
}
