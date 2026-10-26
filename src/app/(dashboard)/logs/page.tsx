"use client";

import { useEffect, useState } from "react";
import { getSystemAuditLogs } from "@/actions/audit";
import { History, Shield, User, Info, Calendar } from "lucide-react";

export default function GlobalAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSystemAuditLogs().then((res) => {
      if (res.success) setLogs(res.data);
      setLoading(false);
    });
  }, []);

  const getActionColor = (action: string) => {
    switch (action) {
      case "PROCUREMENT_FULFILLED": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "REQUEST_APPROVED": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "REQUEST_REJECTED": return "text-red-400 bg-red-500/10 border-red-500/20";
      default: return "text-zinc-400 bg-zinc-800/50 border-zinc-700/50";
    }
  };

  if (loading) {
    return <div className="p-8 text-zinc-500 text-sm">Loading security log ledger...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-2">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-emerald-500" /> System Audit Trail
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Immutable systemic trace logs tracking resource state modifications and asset distribution.
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="border border-zinc-800 border-dashed rounded-xl p-16 text-center bg-zinc-900/10 max-w-xl mx-auto">
          <History className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
          <h3 className="text-zinc-200 font-medium text-sm">No log data recorded</h3>
          <p className="text-xs text-zinc-500">System changes and fulfillment actions will register synchronously here.</p>
        </div>
      ) : (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="divide-y divide-zinc-800/60">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-zinc-950/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                
                {/* Action details & info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border uppercase ${getActionColor(log.action)}`}>
                      {log.action.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-zinc-400 font-medium">
                      <User className="h-3 w-3 text-zinc-500" /> {log.actor}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                    {log.details}
                  </p>
                </div>

                {/* Timestamp section */}
                <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[11px] whitespace-nowrap self-end sm:self-center bg-zinc-950/40 px-2.5 py-1 rounded border border-zinc-800/40">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                  <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}