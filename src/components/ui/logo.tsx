export default function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-lg font-bold text-black">
        V
      </div>

      <div>
        <h2 className="text-lg font-bold text-white">
          VendorVault
        </h2>

        <p className="text-xs text-zinc-500">
          Inventory Management
        </p>
      </div>
    </div>
  );
}