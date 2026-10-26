"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // The installed better-auth version (1.6.20) renamed this method to
      // requestPasswordReset back in v1.4 — forgotPassword/forgetPassword
      // no longer exist on the client at all in this version.
      const { error: authError } = await authClient.requestPasswordReset({
        email,
        redirectTo: "/update-password",
      });

      if (authError) {
        setError(authError.message || "Failed to send reset email. Ensure SMTP credentials are configured.");
        setLoading(false);
        return;
      }

      setSent(true);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-xl text-card-foreground">
        {sent ? (
          <div className="text-center animate-in scale-in duration-150 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <Mail className="h-7 w-7 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We&apos;ve sent a password reset link to{" "}
              <span className="text-emerald-500 font-semibold">{email}</span>. Click the link in the email to set a new password.
            </p>
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground text-left space-y-1">
              <p className="font-semibold text-foreground">💡 Didn&apos;t receive it?</p>
              <p>• Check your spam/junk folder.</p>
              <p>• In local development, the reset link is printed directly to the server terminal console.</p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/sign-in" className="block w-full">
                <Button className="w-full bg-emerald-500 font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors">
                  Back to Sign In
                </Button>
              </Link>
              <Link href="/update-password" className="text-xs text-muted-foreground hover:text-foreground underline">
                Have a reset token? Enter manually
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Forgot your password?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your email and we&apos;ll dispatch a secure reset link.
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-500 animate-in fade-in duration-150">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Email Address</label>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-500/30 text-sm h-10"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-emerald-500 font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
            </form>

            <div className="mt-6 flex justify-center">
              <Link
                href="/sign-in"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}