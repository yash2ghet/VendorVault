export const NETWORK_ERROR =
  "Can't reach the server. Check your internet connection and try again. If you are running locally, make sure the dev server is running and open the app at the address it printed.";

type AuthErrorLike = { status?: number; statusText?: string; message?: string; code?: string } | null | undefined;

/** Turns a Better Auth error into a message a person can act on. */
export function friendlyAuthError(err: AuthErrorLike, fallback: string): string {
  if (!err) return fallback;
  const status = err.status ?? 0;

  // 5xx with an empty body is what you get when MongoDB is down/unreachable.
  if (status >= 500) {
    return "The server could not reach its database. Please try again in a moment. If it keeps happening, contact an administrator.";
  }

  if (err.code === "INVALID_ORIGIN" || (status === 403 && /origin/i.test(err.message || ""))) {
    const here = typeof window !== "undefined" ? window.location.origin : "";
    const correct = process.env.NEXT_PUBLIC_APP_URL;
    return `Sign-in is blocked for this address${here ? ` (${here})` : ""}.${
      correct ? ` Open the app at ${correct} instead.` : " Open the app using its official address."
    }`;
  }

  return err.message || fallback;
}