"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { friendlyAuthError, NETWORK_ERROR } from "@/lib/auth-errors";
import { PORTALS, type PortalSlug } from "@/lib/portals";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PortalShell from "./portal-shell";

const inputClass =
  "h-9 border-zinc-800 bg-zinc-900/50 text-sm text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500/40";
const labelClass = "text-[11px] font-medium text-zinc-300";

interface Status {
  available: boolean;
  codeRequired: boolean;
  message?: string;
}

/** Password input with a small eye toggle (saves the width "Show/Hide" text used). */
function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1">
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
          minLength={minLength}
          autoComplete="new-password"
          className={`${inputClass} pr-9`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-2.5 flex items-center text-zinc-400 hover:text-white"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function RoleSignUp({ slug }: { slug: PortalSlug }) {
  const portal = PORTALS[slug];
  const [status, setStatus] = useState<Status | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", code: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Ask the server whether this role can be registered right now, and whether it needs a code.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/register?portal=${slug}`)
      .then((r) => r.json())
      .then((s) => !cancelled && setStatus(s.error ? { available: true, codeRequired: portal.signUp === "invite" } : s))
      .catch(() => !cancelled && setStatus({ available: true, codeRequired: portal.signUp === "invite" }));
    return () => {
      cancelled = true;
    };
  }, [slug, portal.signUp]);

  const update =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");

    let succeeded = false;
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portal: slug,
          name: form.name,
          email: form.email,
          password: form.password,
          code: form.code,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" || /already exists/i.test(body?.error || "")
            ? "An account with this email already exists. Try signing in instead."
            : body?.error || "Registration failed";
        setError(msg);
        return;
      }

      // Account exists with the right role — now sign in so the session carries it.
      const { error: signInError } = await signIn.email({ email: form.email.trim(), password: form.password });
      if (signInError) {
        setError(friendlyAuthError(signInError, "Account created, but automatic sign-in failed. Please sign in."));
        return;
      }
      succeeded = true;
      window.location.assign("/dashboard");
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      if (!succeeded) setLoading(false);
    }
  }

  return (
    <PortalShell
      slug={slug}
      mode="sign-up"
      title={`Create ${portal.label.toLowerCase()} account`}
      subtitle={portal.tagline}
    >
      {status && !status.available ? (
        <div className="space-y-3 text-center">
          <div className="rounded-lg border border-amber-800/50 bg-amber-900/20 px-3 py-2 text-xs text-amber-300">
            {status.message || "Sign-up is closed for this role."}
          </div>
          <Link href={`/auth/${slug}/sign-in`} className="inline-block text-sm text-emerald-400 hover:text-emerald-300">
            Back to {portal.label.toLowerCase()} sign in
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-3 rounded-lg border border-red-800/50 bg-red-900/20 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2.5">
            {/* name + email side by side */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="space-y-1">
                <label className={labelClass}>Full name</label>
                <Input type="text" placeholder="John Doe" value={form.name} onChange={update("name")} required className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Email</label>
                <Input type="email" placeholder="you@company.com" value={form.email} onChange={update("email")} required autoComplete="email" className={inputClass} />
              </div>
            </div>

            {/* password + confirm side by side */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <PasswordField label="Password" placeholder="Min. 8 characters" value={form.password} onChange={update("password")} minLength={8} />
              <PasswordField label="Confirm password" placeholder="Repeat password" value={form.confirmPassword} onChange={update("confirmPassword")} />
            </div>

            {status?.codeRequired && (
              <div className="space-y-1">
                <label className={labelClass}>Invite code</label>
                <Input type="password" placeholder="Code from your administrator" value={form.code} onChange={update("code")} required autoComplete="off" className={inputClass} />
              </div>
            )}

            {status && !status.codeRequired && portal.signUp === "invite" && (
              <p className="text-[11px] leading-snug text-zinc-500">
                First-time setup: no administrator exists yet, so this account becomes the first one.
              </p>
            )}

            {slug === "supplier" && (
              <p className="text-[11px] leading-snug text-zinc-500">
                After you register, an administrator links your login to your company&apos;s vendor record.
              </p>
            )}

            <Button
              type="submit"
              disabled={loading || !status}
              className="h-9 w-full bg-emerald-500 font-semibold text-zinc-950 hover:bg-emerald-400"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create account
            </Button>
          </form>

          <p className="mt-3 text-center text-xs text-zinc-500">
            Already have an account?{" "}
            <Link href={`/auth/${slug}/sign-in`} className="text-emerald-400 hover:text-emerald-300">
              Sign in
            </Link>
          </p>
        </>
      )}
    </PortalShell>
  );
}