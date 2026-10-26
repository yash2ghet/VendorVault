import type { ReactNode } from "react";
import { PORTALS, type PortalSlug } from "@/lib/portals";
import { PORTAL_ICONS } from "./portal-icons";
import PortalSwitcher from "./portal-switcher";

/** Shared card header (role icon + title) used by the role sign-in and sign-up pages. */
export default function PortalShell({
  slug,
  mode,
  title,
  subtitle,
  children,
}: {
  slug: PortalSlug;
  mode: "sign-in" | "sign-up";
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const portal = PORTALS[slug];
  const Icon = PORTAL_ICONS[slug];
  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <PortalSwitcher active={slug} mode={mode} />
        <div className="mb-8 text-center">
          <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${portal.chip}`}>
            <Icon className="h-6 w-6" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{portal.label} portal</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">{title}</h1>
          <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
