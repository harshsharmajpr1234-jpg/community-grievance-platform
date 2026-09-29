import { collections } from "@/db";
import { AdminsManager } from "@/components/admin/misc";
import { PageHeader } from "@/components/ui";
import { getAdminSession } from "@/server/auth/session";
import { hasPermission } from "@/shared/rbac";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  const session = await getAdminSession();
  const c = await collections();
  const admin = await c.admins.findOne({ id: session!.sub });
  if (!admin || !hasPermission(admin.role, "admins.view")) return <p className="card">No permission.</p>;
  return (
    <div>
      <PageHeader title="Admin Team & Roles" subtitle="Role based access control. New admins must change their temporary password on first login." />
      <AdminsManager canManage={hasPermission(admin.role, "admins.manage")} selfId={admin.id} />
    </div>
  );
}
