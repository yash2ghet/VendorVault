import { notFound } from "next/navigation";
import { getPortal } from "@/lib/portals";
import RoleSignUp from "@/components/auth/role-sign-up";

export default async function Page({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const portal = getPortal(role);
  if (!portal) notFound();
  return <RoleSignUp slug={portal.slug} />;
}
