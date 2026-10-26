"use client";

import { useEffect, useState } from "react";
import { getAllPendingRequests, updateRequestStatus, getManagerHistoryLogs, undoRequestStatus } from "@/actions/manager";
import { Check, X, Inbox, History, MessageSquare, User, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ApprovalsInboxPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [historyRequests, setHistoryRequests] = useState<any[]>([]);
  const [feedbackInputs, setFeedbackInputs] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [pendingRes, historyRes] = await Promise.all([
      getAllPendingRequests(),
      getManagerHistoryLogs()
    ]);
    
    if (pendingRes.success) setPendingRequests(pendingRes.data);
    if (historyRes.success) setHistoryRequests(historyRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (id: string, status: "APPROVED_BY_MANAGER" | "REJECTED") => {
    const feedback = feedbackInputs[id] || `Actioned by Manager.`;
    const res = await updateRequestStatus(id, status, feedback);
    if (res.success) {
      setFeedbackInputs(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      await loadData();
      toast.success("Request updated successfully");
    } else {
      toast.error("Failed to update request");
    }
  };

  const handleRevertToPending = async (id: string, assetType: string) => {
    try {
      const res = await undoRequestStatus(id, "PENDING");
      if (res.success) {
        toast.success(`Moved "${assetType}" back to pending status.`);
        await loadData();
      } else {
        toast.error("Could not revert this request");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while reverting");
    }
  };

  const getStatusBadge = (status: string) => {
    const cleanStatus = status?.toUpperCase() || "";
    if (cleanStatus.includes("APPROV")) {
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
    if (cleanStatus.includes("PROCUR")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
    return "bg-red-500/10 text-red-400 border-red-500/20";
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-2">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800/60 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Approvals Desk</h1>
          <p className="text-sm text-zinc-400 mt-1">Review employee procurement submissions and audit team decision histories.</p>
        </div>

        {/* Tab Selection Row */}
        <div className="bg-zinc-950 p-1 rounded-lg border border-zinc-800/80 flex items-center gap-1 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "pending"
                ? "bg-zinc-900 text-white shadow"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Inbox className="h-3.5 w-3.5" />
            Active Pending ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "history"
                ? "bg-zinc-900 text-white shadow"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Audit History ({historyRequests.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-zinc-500 text-sm">Loading database records...</div>
      ) : activeTab === "pending" ? (
        /* PENDING LOG VIEW */
        pendingRequests.length === 0 ? (
          <div className="border border-zinc-800 border-dashed rounded-xl p-16 text-center max-w-xl mx-auto space-y-3 bg-zinc-900/10">
            <Inbox className="h-8 w-8 text-zinc-600 mx-auto" />
            <h3 className="text-white font-medium text-sm">Inbox completely empty</h3>
            <p className="text-xs text-zinc-500">No active hardware requests require manager review actions at this time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((req) => (
              <div key={req.id} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                      <User className="h-3 w-3" /> {req.userName}
                    </div>
                    <span className="text-xs font-mono text-zinc-500">{new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">{req.assetType}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">{req.modelPreference}</p>
                  </div>
                  <div className="flex gap-2 bg-zinc-950/40 border border-zinc-800/40 px-3 py-2.5 rounded-lg max-w-xl">
                    <MessageSquare className="h-3.5 w-3.5 text-zinc-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-zinc-400 leading-relaxed italic">&ldquo;{req.reason}&rdquo;</p>
                  </div>
                </div>

                {/* Processing Desk */}
                <div className="flex flex-col justify-between gap-3 min-w-[240px]">
                  <input
                    type="text"
                    placeholder="Provide review response notes..."
                    value={feedbackInputs[req.id] || ""}
                    onChange={(e) => setFeedbackInputs(prev => ({ ...prev, [req.id]: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
                  />
                  <div className="flex items-center gap-2">
                    {/* Changed h-9 to h-8 */}
                    <Button onClick={() => handleAction(req.id, "APPROVED_BY_MANAGER")} className="flex-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950 font-bold text-xs h-8 gap-1.5 border border-emerald-500/20 transition-all">
                      <Check className="h-4 w-4 stroke-[2.5]" /> Approve
                    </Button>
                    {/* Changed h-9 to h-8 */}
                    <Button onClick={() => handleAction(req.id, "REJECTED")} className="flex-1 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white font-bold text-xs h-8 gap-1.5 border border-red-500/20 transition-all">
                      <X className="h-4 w-4 stroke-[2.5]" /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* HISTORY AUDIT LOG VIEW */
        historyRequests.length === 0 ? (
          <div className="border border-zinc-800 border-dashed rounded-xl p-16 text-center max-w-xl mx-auto space-y-3 bg-zinc-900/10">
            <History className="h-8 w-8 text-zinc-600 mx-auto" />
            <h3 className="text-white font-medium text-sm">No review history found</h3>
            <p className="text-xs text-zinc-500">Decisions or actions completed across your teams will be saved in this workspace layout.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {historyRequests.map((req) => {
              const isTerminal = (req.status || "").toUpperCase() === "PROCURED_BY_ADMIN";
              
              return (
                <div key={req.id || req._id} className="bg-zinc-900/20 border border-zinc-800/60 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 opacity-90">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-sm font-bold text-zinc-200">{req.assetType}</h4>
                      <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-md border uppercase ${getStatusBadge(req.status)}`}>
                        {req.status ? req.status.replace(/_/g, " ") : "PROCESSED"}
                      </span>
                    </div>
                    
                    <p className="text-xs text-zinc-500">
                      Requested by <span className="text-zinc-400 font-medium">{req.userName || "Employee"}</span> 
                      {req.updatedAt && (
                        <>
                          {" • "}
                          Updated {new Date(req.updatedAt).toLocaleDateString()}
                        </>
                      )}
                    </p>
                    
                    {req.managerFeedback && (
                      <p className="text-xs text-zinc-400 bg-zinc-950/20 border border-zinc-800/40 px-3 py-1.5 rounded italic max-w-xl">
                        <strong>Notes:</strong> &ldquo;{req.managerFeedback}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Changed h-9 to h-8 */}
                  <Button
                    onClick={() => handleRevertToPending(req.id || req._id, req.assetType)}
                    disabled={isTerminal}
                    title={isTerminal ? "Already completed by administration" : "Send back to pending inbox"}
                    className="shrink-0 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-zinc-950 font-bold text-xs h-8 gap-1.5 border border-amber-500/20 transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <Undo2 className="h-2 w-3.5" /> Revert to Pending
                  </Button>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}