"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("token") || searchParams.get("code") || "";

  const [token, setToken] = useState(urlToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const activeToken = token.trim() || urlToken;
    if (!activeToken) {
      setError("Please provide a valid reset token");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");

    const { error: authError } = await resetPassword({
      newPassword: password,
      token: activeToken,
    });

    if (authError) {
      setError(authError.message || "Failed to update password. Token may be invalid or expired.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="w-full max-w-md animate-in fade-in duration-200">
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-card-foreground shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Password updated</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your password has been successfully reset.
          </p>
          <Link href="/sign-in">
            <Button className="mt-6 w-full bg-emerald-500 font-semibold text-zinc-950 hover:bg-emerald-400">
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-in fade-in duration-200">
      <div className="rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Set new password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a strong password to secure your account.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!urlToken && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Reset Token / Code</label>
              <Input
                type="text"
                placeholder="Paste token from email link"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-500/40 text-sm"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">New Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-500/40 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Confirm Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-500/40 text-sm"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-emerald-500 font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Update Password
          </Button>
        </form>

        <Link
          href="/sign-in"
          className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
