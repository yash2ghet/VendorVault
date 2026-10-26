import { createAuthClient } from "better-auth/react";

// In the browser always talk to the origin that served the page, so login keeps working
// when Next.js falls back to :3001 or you open the app via 127.0.0.1.
const baseURL =
  typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL;

export const authClient = createAuthClient({ baseURL });

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
} = authClient;
