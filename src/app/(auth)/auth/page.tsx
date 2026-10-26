import Link from "next/link";
import { PORTAL_LIST } from "@/lib/portals";
import { PORTAL_ICONS } from "@/components/auth/portal-icons";

export const metadata = { title: "Choose your portal — VendorVault" };

/** /auth — pick the portal that matches your role. */
export default function ChoosePortalPage() {
  return (
    <div className="w-full max-w-3xl py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">Welcome to VendorVault</h1>
        <p className="mt-2 text-sm text-zinc-400">Choose how you use VendorVault to continue.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PORTAL_LIST.map((p) => {
          const Icon = PORTAL_ICONS[p.slug];
          return (
            <div key={p.slug} className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${p.chip}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-white">{p.label}</h2>
              <p className="text-sm font-medium text-zinc-300">{p.tagline}</p>
              <p className="mt-2 flex-1 text-sm text-zinc-500">{p.description}</p>

              <div className="mt-5 flex items-center gap-3">
                <Link
                  href={`/auth/${p.slug}/sign-in`}
                  className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 text-center text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
                >
                  Sign in
                </Link>
                <Link
                  href={`/auth/${p.slug}/sign-up`}
                  className="text-sm text-emerald-400 hover:text-emerald-300"
                >
                  {p.signUp === "invite" ? "Have a code?" : "Create account"}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
