import { collections } from "@/db";
import { UsersTable } from "@/components/admin/misc";
import { PageHeader } from "@/components/ui";
import { getAdminSession } from "@/server/auth/session";
import { hasPermission } from "@/shared/rbac";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getAdminSession();
  const c = await collections();
  const admin = await c.admins.findOne({ id: session!.sub });
  if (!admin || !hasPermission(admin.role, "users.view")) return <p className="card">No permission.</p>;
  return (
    <div>
      <PageHeader title="Residents" subtitle="Registered residents. Contact details are confidential and visible only to roles with sensitive-data access." />
      <UsersTable canManage={hasPermission(admin.role, "users.manage")} />
    </div>
  );
}
