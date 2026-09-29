import Link from "next/link";
import { collections } from "@/db";
import { SettingsForm } from "@/components/admin/misc";
import { PageHeader } from "@/components/ui";
import { getAdminSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getAdminSession();
  const c = await collections();
  const admin = await c.admins.findOne({ id: session!.sub });
  return (
    <div>
      <PageHeader title="Settings" subtitle="Organisation details, notifications, upload limits and maintenance mode." actions={<Link href="/admin/content/categories" className="btn-secondary btn-sm">Complaint categories</Link>} />
      <SettingsForm isSuper={admin?.role === "SUPER_ADMIN"} />
    </div>
  );
}
