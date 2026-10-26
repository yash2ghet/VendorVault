"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { createRequest } from "@/actions/requests";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";

export default function NewRequestPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    // Safeguard check to make sure session context is online
    if (!session?.user) {
      setError("Authentication Failure: You must be logged in to submit a hardware request.");
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    
    const result = await createRequest({
      userId: session.user.id,
      userName: session.user.name || "Employee",
      assetType: formData.get("assetType") as string,
      modelPreference: formData.get("modelPreference") as string,
      reason: formData.get("reason") as string,
      urgency: formData.get("urgency") as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    });

    if (result.success) {
      router.push("/requests");
    } else {
      setError(result.error || "Something went wrong while executing the transaction.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Asset Request Wizard</h1>
        <p className="text-sm text-zinc-400">Submit a request pipeline item for standard equipment upgrades.</p>
      </div>

      {/* Error Alert Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Session Loading Warning Badge */}
      {!isPending && !session?.user && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Active system session could not be tracked. Please re-authenticate your profile dashboard login.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Asset Category</label>
          <select name="assetType" required className="w-full bg-zinc-950 border border-zinc-800 rounded-lg h-10 px-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors">
            <option value="Laptop">Laptop / Workstation</option>
            <option value="Monitor">External Monitor</option>
            <option value="Accessories">Peripherals / Accessories</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Model Preference & Specs</label>
          <input type="text" name="modelPreference" required placeholder="e.g. MacBook Pro M3 16GB RAM, 27 Inch 4K Monitor" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg h-10 px-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Urgency Priority</label>
          <select name="urgency" defaultValue="MEDIUM" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg h-10 px-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors">
            <option value="LOW">Low - Routine Stock Upgrade</option>
            <option value="MEDIUM">Medium - Active Project Cycle</option>
            <option value="HIGH">High - Equipment Failure</option>
            <option value="CRITICAL">Critical - Immediate Blocker</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Business Justification Reason</label>
          <textarea name="reason" required rows={4} placeholder="Please describe why this equipment is needed for your upcoming task responsibilities..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors resize-none" />
        </div>

        <Button type="submit" disabled={isSubmitting || isPending} className="w-full bg-emerald-500 text-black hover:bg-emerald-600 font-semibold h-10 transition-all rounded-lg">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Submit Procurement Request
        </Button>
      </form>
    </div>
  );
}