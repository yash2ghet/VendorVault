export const NETWORK_ERROR =
  "Can't reach the server. Make sure the app is running and that you opened it at the same address and port the dev server printed (for example http://localhost:3000).";

type AuthErrorLike = { status?: number; statusText?: string; message?: string; code?: string } | null | undefined;

/** Turns a Better Auth error into a message a person can act on. */
export function friendlyAuthError(err: AuthErrorLike, fallback: string): string {
  if (!err) return fallback;
  const status = err.status ?? 0;

  // 5xx with an empty body is what you get when MongoDB is down/unreachable.
  if (status >= 500) {
    return "The server could not reach its database. Make sure MongoDB is running (see MONGODB_URI in .env), then try again.";
  }
  if (err.code === "INVALID_ORIGIN" || (status === 403 && /origin/i.test(err.message || ""))) {
    const here = typeof window !== "undefined" ? window.location.origin : "";
    return `Sign-in is blocked for this address${here ? ` (${here})` : ""}. Open the app at http://localhost:3000 instead.`;
  }
  return err.message || fallback;
}
