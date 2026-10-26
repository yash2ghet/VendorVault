"use client";

import { Truck } from "lucide-react";

interface Vendor {
  _id: string;
  name: string;
}

interface VendorSelectorProps {
  vendors: Vendor[];
  selectedValue: string;
  onChange: (value: string) => void;
}

export default function VendorSelector({ vendors, selectedValue, onChange }: VendorSelectorProps) {
  return (
    <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-1.5 focus-within:border-zinc-700 transition-colors">
      <Truck className="h-4 w-4 text-zinc-500" />
      <select
        value={selectedValue}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer h-7 min-w-[140px] appearance-none pr-4"
      >
        <option value="" disabled className="bg-zinc-950 text-zinc-500">
          Assign Supplier
        </option>
        {vendors.map((vendor) => (
          <option key={vendor._id} value={vendor._id} className="bg-zinc-950 text-zinc-200">
            {vendor.name}
          </option>
        ))}
      </select>
    </div>
  );
}