"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { Trash2, Search, X, Users as UsersIcon, ShieldAlert } from "lucide-react";
import { updateSystemUserRole, deleteSystemUser, linkSupplierVendor } from "@/actions/user";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  vendorId?: string;
  createdAt: string;
}

interface VendorOption {
  _id: string;
  name: string;
  companyName?: string;
}

const ROLES = ["ADMIN", "MANAGER", "STAFF", "SUPPLIER"] as const;
const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", MANAGER: "Manager", STAFF: "Employee", SUPPLIER: "Supplier" };

const roleColors: Record<string, string> = {
  ADMIN: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  MANAGER: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  STAFF: "bg-muted text-muted-foreground border-border",
  SUPPLIER: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tableLoading, setTableLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: session } = useSession();
  const myId = session?.user?.id;
  const [vendors, setVendors] = useState<VendorOption[]>([]);

  // vendors for the "Linked vendor" dropdown (supplier accounts)
  useEffect(() => {
    fetch("/api/vendors?limit=200")
      .then((r) => r.json())
      .then((d) => setVendors(Array.isArray(d?.vendors) ? d.vendors : []))
      .catch(() => setVendors([]));
  }, []);

  const fetchUsers = useCallback(async () => {
    setTableLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        role: activeTab !== "ALL" ? activeTab : "",
        search: searchQuery
      });
      
      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      
      if (data && data.users) {
        setUsers(data.users);
        setTotalPages(data.totalPages || 1);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to retrieve user list.");
      setUsers([]);
    } finally {
      setTableLoading(false);
    }
  }, [page, activeTab, searchQuery]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const handleToggleAll = () => {
    if (users.every((u) => selectedIds.includes(u._id))) {
      setSelectedIds((prev) => prev.filter((id) => !users.some((u) => u._id === id)));
    } else {
      setSelectedIds((prev) => [...prev, ...users.map((u) => u._id).filter((id) => !prev.includes(id))]);
    }
  };

  async function updateRole(targetUserId: string, newRole: string) {
    try {
      const result = await updateSystemUserRole(targetUserId, newRole);

      if (result.success) {
        toast.success(`Role changed to ${ROLE_LABEL[newRole] || newRole}. They will need to sign in again.`);
        fetchUsers();
      } else {
        toast.error(result.error || "Failed to update user role.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network interface error occurred.");
    }
  }

  async function linkVendor(targetUserId: string, vendorId: string) {
    const result = await linkSupplierVendor(targetUserId, vendorId || null);
    if (result.success) {
      toast.success(vendorId ? "Supplier linked to vendor." : "Vendor link removed.");
      setUsers((prev) => prev.map((u) => (u._id === targetUserId ? { ...u, vendorId: vendorId || undefined } : u)));
    } else {
      toast.error(result.error || "Could not link vendor.");
    }
  }

  async function deleteUser(targetUserId: string) {
    if (!confirm("Are you sure you want to permanently delete this user?")) return;
    try {
      const result = await deleteSystemUser(targetUserId);

      if (result.success) {
        toast.success("User permanently deleted.");
        fetchUsers();
      } else {
        toast.error(result.error || "Failed to delete user profile.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Operation failed.");
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Are you sure you want to permanently erase these ${selectedIds.length} profiles?`)) return;
    setTableLoading(true);
    try {
      const results = await Promise.all(selectedIds.filter((id) => id !== myId).map((id) => deleteSystemUser(id)));
      const failedCount = results.filter(r => !r.success).length;

      if (failedCount === 0) {
        toast.success(`Successfully purged ${selectedIds.length} user profile(s)`);
      } else {
        toast.error(`Purged ${selectedIds.length - failedCount} profile(s). ${failedCount} failed.`);
      }
      setSelectedIds([]);
      fetchUsers();
    } catch (error) {
      console.error("Bulk delete failure", error);
      toast.error("Process ran into an unexpected critical error.");
    } finally {
      setTableLoading(false);
    }
  }

  const columns = [
    { 
      key: "name", 
      header: "User Identity",
      render: (u: User) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{u.name || "—"}</span>
          <span className="text-[11px] text-muted-foreground font-mono select-all">{u._id}</span>
        </div>
      )
    },
    { 
      key: "email", 
      header: "Email Address",
      render: (u: User) => (
        <span className="text-foreground text-sm font-medium">{u.email}</span>
      )
    },
    {
      key: "role", 
      header: "Authorization Tier",
      render: (u: User) => (
        <select
          value={u.role || "STAFF"}
          onChange={(e) => updateRole(u._id, e.target.value)}
          disabled={u._id === myId}
          title={u._id === myId ? "You can't change your own role" : undefined}
          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold cursor-pointer ${
            roleColors[u.role] || "bg-muted text-muted-foreground border-border"
          } bg-background text-foreground focus:outline-none`}
        >
          {ROLES.map((r) => (
            <option key={r} value={r} className="bg-popover text-popover-foreground">{r}</option>
          ))}
        </select>
      ),
    },
    {
      key: "vendor",
      header: "Linked Vendor",
      render: (u: User) =>
        u.role === "SUPPLIER" ? (
          <select
            value={u.vendorId || ""}
            onChange={(e) => linkVendor(u._id, e.target.value)}
            className="max-w-[180px] rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
          >
            <option value="">— not linked —</option>
            {vendors.map((v) => (
              <option key={v._id} value={v._id}>{v.companyName || v.name}</option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "emailVerified", 
      header: "Verification",
      render: (u: User) => (
        <Badge className={`font-medium ${u.emailVerified ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"}`}>
          {u.emailVerified ? "Verified" : "Unverified"}
        </Badge>
      ),
    },
    { 
      key: "createdAt", 
      header: "Registered", 
      render: (u: User) => (
        <span className="text-muted-foreground text-xs">
          {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
        </span>
      )
    },
    {
      key: "actions", 
      header: "Actions",
      render: (u: User) => u._id === myId ? null : (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={(e) => { e.stopPropagation(); deleteUser(u._id); }} 
          className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 h-7 w-7 rounded-lg"
          title="Delete User"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 relative">
      {selectedIds.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-full border border-border bg-card/95 pl-4 pr-2 py-1.5 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{selectedIds.length} Profiles Selected</span>
          <Button size="icon" variant="ghost" onClick={() => setSelectedIds([])} className="h-5 w-5 text-muted-foreground hover:text-foreground rounded-full">
            <X className="h-3 w-3" />
          </Button>
          <div className="w-[1px] h-4 bg-border" />
          <Button onClick={handleBulkDelete} size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:bg-red-500/10">
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete Selected
          </Button>
        </div>
      )}

      {/* Header Container */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-emerald-500" /> User Directory
          </h1>
          <p className="text-sm text-muted-foreground">Manage user authorizations, access tiers, and security credentials</p>
        </div>
      </div>

      {/* Query Filters */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-card p-3 rounded-xl border border-border shadow-sm">
        <div className="flex gap-1 bg-muted p-1 rounded-lg border border-border/60 overflow-x-auto w-full sm:w-auto">
          {["ALL", ...ROLES].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "ALL" ? "All" : ROLE_LABEL[tab]}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search name or email..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
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
        data={users} 
        page={page} 
        totalPages={totalPages} 
        onPageChange={setPage} 
        isLoading={tableLoading}
        selectedIds={selectedIds}
        onToggleRow={handleToggleRow}
        onToggleAll={handleToggleAll}
      />
    </div>
  );
}
