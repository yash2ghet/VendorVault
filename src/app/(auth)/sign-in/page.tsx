import { redirect } from "next/navigation";

// Sign-in is now per role: /auth/admin/sign-in, /auth/manager/sign-in, /auth/employee/sign-in, /auth/supplier/sign-in
export default function LegacySignIn() {
  redirect("/auth");
}
