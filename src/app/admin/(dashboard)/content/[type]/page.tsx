import { notFound, redirect } from "next/navigation";
import { collections } from "@/db";
import { ContentManager, type ContentType } from "@/components/admin/content-manager";
import { getAdminSession } from "@/server/auth/session";
import { contentRegistry, isContentType } from "@/server/services/content";
import { hasPermission } from "@/shared/rbac";

export const dynamic = "force-dynamic";

export default async function ContentPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!isContentType(type)) notFound();
  const session = await getAdminSession();
  const c = await collections();
  const admin = await c.admins.findOne({ id: session!.sub });
  if (!admin || !hasPermission(admin.role, contentRegistry[type].permission)) redirect("/admin");
  return <ContentManager type={type as ContentType} />;
}
