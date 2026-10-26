"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/**
 * Thin progress bar at the top of the screen while you move between pages.
 *
 * The Next.js App Router has no "navigation started" event, so we do it in two halves:
 *   START  — a click on an internal <a> (every <Link>, including the sidebar and mobile menu)
 *            that goes to a different page. The bar creeps toward 90% while the page loads.
 *   FINISH — the pathname changes, i.e. the new page is ready. The bar jumps to 100% and fades.
 * A safety timeout hides it if a click never ends in a navigation.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const [value, setValue] = useState(0);
  const [visible, setVisible] = useState(false);

  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const active = useRef(false);
  const lastPath = useRef(pathname);

  const clearAll = useCallback(() => {
    if (trickle.current) clearInterval(trickle.current);
    trickle.current = null;
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const finish = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    clearAll();
    setValue(100);
    timers.current.push(setTimeout(() => setVisible(false), 250)); // fade out
    timers.current.push(setTimeout(() => setValue(0), 700)); // reset once invisible
  }, [clearAll]);

  const start = useCallback(() => {
    clearAll();
    active.current = true;
    setVisible(true);
    setValue(8);
    // ease toward 90% — never reaches it, so it never looks "done" before the page is
    trickle.current = setInterval(() => setValue((v) => v + (90 - v) * 0.12), 200);
    timers.current.push(setTimeout(finish, 10000)); // safety net
  }, [clearAll, finish]);

  // START: any click on an internal link to a different page
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.getAttribute("href")) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return; // external link
      if (url.pathname === window.location.pathname) return; // same page / #hash only
      start();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  // FINISH: the route actually changed
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      finish();
    }
  }, [pathname, finish]);

  useEffect(() => clearAll, [clearAll]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[100] transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <Progress
        value={value}
        className="h-[3px] rounded-none bg-transparent [&_[data-slot=progress-indicator]]:bg-emerald-500"
      />
    </div>
  );
}
