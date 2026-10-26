"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { getMasterProcurementQueue, getAllVendorsAndProducts, fulfillAssetRequest } from "@/actions/admin";
import { Package, Truck, Layers, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminProcurementPage() {
  const { data: session } = useSession();
  const [queue, setQueue] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selections, setSelections] = useState<{ [key: string]: { vendorId: string; productId: string } }>({});
  const [loading, setLoading] = useState(true);

  const initDesk = async () => {
    setLoading(true);
    const [queueRes, optionsRes] = await Promise.all([
      getMasterProcurementQueue(),
      getAllVendorsAndProducts()
    ]);
    if (queueRes.success) setQueue(queueRes.data);
    if (optionsRes.success) {
      setVendors(optionsRes.vendors);
      setProducts(optionsRes.products);
    }
    setLoading(false);
  };

  useEffect(() => { if (session?.user) initDesk(); }, [session]);

  const handleDispatch = async (reqId: string) => {
    const choice = selections[reqId];
    if (!choice?.vendorId || !choice?.productId) return alert("Please map both a valid supplier and inventory item.");

    const res = await fulfillAssetRequest({
      requestId: reqId,
      vendorId: choice.vendorId,
      productId: choice.productId,
      adminId: session?.user?.id || "admin-system",
      adminName: session?.user?.name || "IT Admin Desk"
    });

    if (res.success) {
      setQueue(prev => prev.filter(item => item.id !== reqId));
    } else {
      alert(res.error);
    }
  };

  if (loading) return <div className="p-8 text-zinc-500 text-sm">Synchronizing procurement pipeline state...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-2">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Master Fulfillment Center</h1>
        <p className="text-sm text-zinc-400 mt-1">Disburse inventory, decrement structural hardware metrics, and link vendor pipelines.</p>
      </div>

      {queue.length === 0 ? (
        <div className="border border-zinc-800 border-dashed rounded-xl p-16 text-center bg-zinc-900/10 max-w-xl mx-auto">
          <Package className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
          <h3 className="text-zinc-200 font-medium text-sm">All requests fulfilled</h3>
          <p className="text-xs text-zinc-500">No approved device profiles are currently awaiting structural IT deployment cycles.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((req) => (
            <div key={req.id} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-wider">Manager Approved</span>
                <h3 className="text-base font-bold text-white mt-1.5">{req.assetType}</h3>
                <p className="text-xs text-zinc-400 font-medium">{req.modelPreference} &bull; for <span className="text-zinc-300 font-semibold">{req.userName}</span></p>
              </div>

              {/* Action Form Grid Dropdowns */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1">
                  <Truck className="h-3.5 w-3.5 text-zinc-500" />
                  <select
                    className="bg-transparent text-xs text-white focus:outline-none cursor-pointer h-7 min-w-[130px]"
                    onChange={(e) => setSelections(p => ({ ...p, [req.id]: { ...p[req.id], vendorId: e.target.value } }))}
                    defaultValue=""
                  >
                    <option value="" disabled>Select Supplier</option>
                    {vendors.map(v => <option key={v._id} value={v._id} className="bg-zinc-950 text-white">{v.name}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1">
                  <Layers className="h-3.5 w-3.5 text-zinc-500" />
                  <select
                    className="bg-transparent text-xs text-white focus:outline-none cursor-pointer h-7 min-w-[130px]"
                    onChange={(e) => setSelections(p => ({ ...p, [req.id]: { ...p[req.id], productId: e.target.value } }))}
                    defaultValue=""
                  >
                    <option value="" disabled>Link Stock Asset</option>
                    {products.map(p => <option key={p._id} value={p._id} className="bg-zinc-950 text-white">{p.name} ({p.stock} left)</option>)}
                  </select>
                </div>

                <Button onClick={() => handleDispatch(req.id)} className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 ml-auto lg:ml-0">
                  <CheckCircle2 className="h-4 w-4" /> Dispatch Asset
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}