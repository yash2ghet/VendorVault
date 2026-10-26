import Link from "next/link";
import { PORTAL_LIST, type PortalSlug } from "@/lib/portals";
import { PORTAL_ICONS } from "./portal-icons";

/**
 * Row of role buttons shown on every sign-in / sign-up card.
 * It keeps you on the same page type: on a sign-up page the buttons go to the other roles'
 * sign-up pages, on a sign-in page to their sign-in pages.
 */
export default function PortalSwitcher({
  active,
  mode,
}: {
  active: PortalSlug;
  mode: "sign-in" | "sign-up";
}) {
  return (
    <nav aria-label="Choose your role" className="mb-7 grid grid-cols-4 gap-1 rounded-xl bg-zinc-950 p-1">
      {PORTAL_LIST.map((p) => {
        const Icon = PORTAL_ICONS[p.slug];
        const isActive = p.slug === active;
        return (
          <Link
            key={p.slug}
            href={`/auth/${p.slug}/${mode}`}
            aria-current={isActive ? "page" : undefined}
            className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors ${
              isActive ? "bg-zinc-800 text-white" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
            }`}
          >
            <Icon className={`h-4 w-4 ${isActive ? p.chip.split(" ")[1] : ""}`} />
            {p.label}
          </Link>
        );
      })}
    </nav>
  );
}
