"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signIn, signOut } from "@/lib/auth-client";
import { friendlyAuthError, NETWORK_ERROR } from "@/lib/auth-errors";
import { PORTALS, portalForRole, type PortalSlug } from "@/lib/portals";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import PortalShell from "./portal-shell";

const inputClass =
  "border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500/40";

const an = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

export default function RoleSignIn({ slug }: { slug: PortalSlug }) {
  const portal = PORTALS[slug];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wrongPortal, setWrongPortal] = useState<PortalSlug | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setWrongPortal(null);

    let succeeded = false;
    try {
      const { data, error: authError } = await signIn.email({
        email: email.trim(),
        password,
        rememberMe: remember,
      });

      if (authError) {
        setError(friendlyAuthError(authError, "Invalid email or password"));
        return;
      }

      // Right password, wrong door? Don't keep them signed in — point them to the right portal.
      const actualRole = ((data?.user as { role?: string } | undefined)?.role || "STAFF") as string;
      if (actualRole !== portal.role) {
        await signOut().catch(() => {});
        setWrongPortal(portalForRole(actualRole).slug);
        return;
      }

      succeeded = true;
      window.location.assign("/dashboard"); // full load: fresh cookie, no cached redirects
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      if (!succeeded) setLoading(false);
    }
  }

  const right = wrongPortal ? PORTALS[wrongPortal] : null;

  return (
    <PortalShell
      slug={slug}
      mode="sign-in"
      title={`${portal.label} sign in`}
      subtitle="Enter your credentials to continue."
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {right && (
        <div className="mb-4 rounded-lg border border-amber-800/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-300">
          That account is {an(right.label)} <strong>{right.label}</strong> account, not {an(portal.label)} {portal.label} account.
          Please use the{" "}
          <Link href={`/auth/${right.slug}/sign-in`} className="font-semibold underline">
            {right.label} sign in
          </Link>
          .
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Email</label>
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={inputClass}
          />
        </div>

        
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">
            Password
          </label>

          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={`${inputClass} pr-16`}
            />

            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-3 flex items-center text-sm text-zinc-400 transition-colors hover:text-white"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>


        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={remember}
              onCheckedChange={(v) => setRemember(v === true)}
              className="border-zinc-700 data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500"
            />
            <label htmlFor="remember" className="text-sm text-zinc-400">
              Remember me
            </label>
          </div>
          <Link href="/forgot-password" className="text-sm text-emerald-400 hover:text-emerald-300">
            Forgot password?
          </Link>

        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-500 font-semibold text-zinc-950 hover:bg-emerald-400"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Sign in
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-zinc-500">
        <p>
          {portal.signUp === "invite" ? "Have an invite code?" : "Don't have an account?"}{" "}
          <Link href={`/auth/${slug}/sign-up`} className="text-emerald-400 hover:text-emerald-300">
            Sign up
          </Link>
        </p>
      </div>
    </PortalShell>
  );
}
