"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { getUserRequests, updateUserRequest, deleteUserRequest } from "@/actions/requests";
import { Plus, Laptop, Clock, AlertCircle, ShieldCheck, Edit2, Trash2, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner"; // Imported sonner toast

export default function MyRequestsPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline Editing States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAssetType, setEditAssetType] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editReason, setEditReason] = useState("");

  // Expandable Description Tracking State (Stores request IDs that are expanded)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (session?.user?.id) {
      getUserRequests(session.user.id).then((res) => {
        if (res.success) setRequests(res.data);
        setLoading(false);
      });
    }
  }, [session]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const startEdit = (req: any) => {
    setEditingId(req.id);
    setEditAssetType(req.assetType);
    setEditModel(req.modelPreference);
    setEditReason(req.reason || "");
  };

  const saveEdit = async (id: string, currentStatus: string) => {
    // If it was rejected, resubmitting routes it straight back to the Approvals Inbox
    const newStatus = currentStatus === "REJECTED" ? "PENDING" : currentStatus;

    const res = await updateUserRequest(id, {
      assetType: editAssetType,
      modelPreference: editModel,
      reason: editReason,
      status: newStatus,
    });

    if (res.success && res.data) {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                assetType: editAssetType,
                modelPreference: editModel,
                reason: editReason,
                status: res.data!.status,
                isEdited: true,
                editCount: res.data!.editCount,
                lastEditedAt: res.data!.lastEditedAt,
              }
            : r
        )
      );
      setEditingId(null);
      
      // Dynamic Toast Alerts triggered globally
      if (currentStatus === "REJECTED") {
        toast.success("Request re-submitted to pending queue!");
      } else {
        toast.success("Request updated successfully!");
      }
    } else {
      toast.error("Could not update database entry.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this asset request permanently?")) {
      const res = await deleteUserRequest(id);
      if (res.success) {
        setRequests((prev) => prev.filter((r) => r.id !== id));
        toast.success("Request has been deleted successfully!");
      } else {
        toast.error("Could not clear record from database collection.");
      }
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "PENDING": 
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "APPROVED_BY_MANAGER": 
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold shadow-sm shadow-emerald-500/5";
      case "PROCURED_BY_ADMIN": 
        return "bg-teal-500/10 text-teal-400 border-teal-500/20";
      case "REJECTED": 
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default: 
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  const getUrgencyStyle = (urgency: string) => {
    switch (urgency) {
      case "CRITICAL": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "HIGH": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "MEDIUM": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Requests</h1>
          <p className="text-sm text-zinc-400">Track real-time hardware allocations and manager approvals status metrics.</p>
        </div>
        <Link href="/requests/new">
          <Button className="bg-emerald-500 text-black hover:bg-emerald-600 font-medium rounded-lg h-9 text-xs flex items-center gap-1.5 px-3">
            <Plus className="h-4 w-4" /> New Asset Request
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-zinc-500 text-sm">Loading request timelines...</div>
      ) : requests.length === 0 ? (
        <div className="border border-zinc-800 border-dashed rounded-xl p-12 text-center max-w-xl mx-auto space-y-3 mt-8">
          <Laptop className="h-8 w-8 text-zinc-600 mx-auto" />
          <h3 className="text-white font-medium text-sm">No Hardware requests submitted</h3>
          <p className="text-xs text-zinc-500">You currently have no active device asset items running through the automated procurement pipeline logs.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 font-medium text-xs bg-zinc-950/40">
                <th className="p-4">Requested Item & Reason</th>
                <th className="p-4">Urgency</th>
                <th className="p-4">Submission Timestamp</th>
                <th className="p-4">Pipeline Status</th>
                <th className="p-4">Manager Feedback</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-white">
              {requests.map((req) => {
                const isExpanded = !!expandedIds[req.id];
                return (
                  <tr key={req.id} className="hover:bg-zinc-950/20 transition-colors">
                    
                    {/* Item Description, Input Fields & Dropdown Arrow Feature */}
                    <td className="p-4 align-top max-w-xs">
                      {editingId === req.id ? (
                        <div className="space-y-2 max-w-sm">
                          <input
                            type="text"
                            value={editAssetType}
                            onChange={(e) => setEditAssetType(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                            placeholder="Asset Type"
                          />
                          <input
                            type="text"
                            value={editModel}
                            onChange={(e) => setEditModel(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
                            placeholder="Model Preference"
                          />
                          <textarea
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-400 focus:outline-none focus:border-emerald-500 italic"
                            rows={2}
                            placeholder="Reason"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{req.assetType}</span>
                            
                            {req.isEdited && (
                              <span
                                title={req.lastEditedAt ? `Last edited ${new Date(req.lastEditedAt).toLocaleString()}` : undefined}
                                className="text-[10px] text-zinc-500 px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700/60 font-medium cursor-help"
                              >
                                Edited{req.editCount ? ` ×${req.editCount}` : ""}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-400 mt-0.5 font-normal">{req.modelPreference}</div>
                          
                          {req.reason && (
                            <div className="mt-2">
                              <button
                                onClick={() => toggleExpand(req.id)}
                                className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium mb-1 focus:outline-none"
                              >
                                {isExpanded ? (
                                  <>Show less <ChevronUp className="h-3 w-3" /></>
                                ) : (
                                  <>Show full justification <ChevronDown className="h-3 w-3" /></>
                                )}
                              </button>
                              
                              <p className={`text-xs text-zinc-500 bg-zinc-950/30 border border-zinc-800/50 p-2 rounded-md max-w-sm italic ${
                                isExpanded ? "whitespace-normal break-words" : "truncate"
                              }`}>
                                &ldquo;{req.reason}&rdquo;
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </td>

                    {/* Urgency Tag */}
                    <td className="p-4 align-top">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold tracking-wider rounded border uppercase ${getUrgencyStyle(req.urgency)}`}>
                        <AlertCircle className="h-3 w-3" />
                        {req.urgency}
                      </span>
                    </td>

                    {/* Date & Time */}
                    <td className="p-4 text-xs text-zinc-400 align-top whitespace-nowrap">
                      <div className="font-medium text-zinc-300">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>

                    {/* Status Tag */}
                    <td className="p-4 align-top">
                      <span className={`px-2.5 py-1 text-[11px] font-semibold tracking-wide rounded-md border ${getStatusStyle(req.status)}`}>
                        {req.status.replace(/_/g, " ")}
                      </span>
                    </td>

                    {/* Feedback Box */}
                    <td className="p-4 text-xs text-zinc-400 align-top max-w-xs whitespace-normal break-words">
                      {req.managerFeedback ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Review Note</span>
                          </div>
                          <p className="text-zinc-300 italic">{req.managerFeedback}</p>
                        </div>
                      ) : (
                        <span className="text-zinc-600 italic">No feedback provided yet</span>
                      )}
                    </td>

                    {/* Action Buttons Layer */}
                    <td className="p-4 align-top text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {editingId === req.id ? (
                          <>
                            <Button 
                              variant="ghost" size="icon" onClick={() => saveEdit(req.id, req.status)}
                              className="h-7 w-7 text-emerald-400 hover:bg-emerald-500/10 rounded-md"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" size="icon" onClick={() => setEditingId(null)}
                              className="h-7 w-7 text-red-400 hover:bg-red-500/10 rounded-md"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            {req.status !== "APPROVED_BY_MANAGER" && req.status !== "PROCURED_BY_ADMIN" && (
                              <Button
                                variant="ghost" size="icon" 
                                onClick={() => startEdit(req)}
                                className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md"
                                title="Edit Request"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost" size="icon" onClick={() => handleDelete(req.id)}
                              className="h-7 w-7 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md"
                              title="Delete Request"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}