"use client";

import { useState } from "react";
import { Package, Layers, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import VendorSelector from "./vendor-selector";

interface ProcurementCardProps {
  request: {
    id: string;
    assetType: string;
    modelPreference: string;
    userName: string;
    reason?: string;
  };
  vendors: Array<{ _id: string; name: string }>;
  products: Array<{ _id: string; name: string; stock: number }>;
  onFulfill: (requestId: string, vendorId: string, productId: string) => Promise<void>;
}

export default function ProcurementCard({ request, vendors, products, onFulfill }: ProcurementCardProps) {
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleDispatch = async () => {
    if (!selectedVendor || !selectedProduct) {
      alert("Please assign a supplier and link a valid stock asset before dispatching.");
      return;
    }
    setSubmitting(true);
    await onFulfill(request.id, selectedVendor, selectedProduct);
    setSubmitting(false);
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700/60 rounded-xl p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 transition-all duration-200">
      
      {/* Left: Metadata context details */}
      <div className="space-y-1.5 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-wider">
            Approved & Ready
          </span>
        </div>
        <h3 className="text-base font-bold text-white tracking-tight">{request.assetType}</h3>
        <p className="text-xs text-zinc-400 font-medium">
          {request.modelPreference} &bull; Requested by <span className="text-zinc-200 font-semibold">{request.userName}</span>
        </p>
        {request.reason && (
          <p className="text-xs text-zinc-500 font-normal italic max-w-xl truncate mt-1">
            &ldquo;{request.reason}&rdquo;
          </p>
        )}
      </div>

      {/* Right: Functional drop downs and actions logic */}
      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
        
        {/* Dynamic Vendor Dropdown */}
        <VendorSelector 
          vendors={vendors} 
          selectedValue={selectedVendor} 
          onChange={setSelectedVendor} 
        />

        {/* Link Stock Asset Dropdown */}
        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-1.5 focus-within:border-zinc-700 transition-colors">
          <Layers className="h-4 w-4 text-zinc-500" />
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer h-7 min-w-[150px] appearance-none pr-4"
          >
            <option value="" disabled className="bg-zinc-950 text-zinc-500">
              Link Stock Item
            </option>
            {products.map((prod) => (
              <option key={prod._id} value={prod._id} className="bg-zinc-950 text-zinc-200">
                {prod.name} ({prod.stock} units)
              </option>
            ))}
          </select>
        </div>

        {/* Dispatch Trigger Button */}
        <Button
          onClick={handleDispatch}
          disabled={submitting}
          className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-500/5 transition-all w-full sm:w-auto"
        >
          <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
          {submitting ? "Dispatching..." : "Dispatch Asset"}
        </Button>
      </div>

    </div>
  );
}