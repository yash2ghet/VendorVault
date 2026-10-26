import { redirect } from "next/navigation";

// Sign-up is now per role: /auth/<role>/sign-up
export default function LegacySignUp() {
  redirect("/auth");
}
