import { notFound } from "next/navigation";
import { getPortal } from "@/lib/portals";
import RoleSignIn from "@/components/auth/role-sign-in";

export default async function Page({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const portal = getPortal(role);
  if (!portal) notFound();
  return <RoleSignIn slug={portal.slug} />;
}
