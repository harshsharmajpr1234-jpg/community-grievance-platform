import Link from "next/link";
import { notFound } from "next/navigation";
import { collections } from "@/db";
import { AdminComplaintDetail } from "@/components/admin/complaints";
import { ApiError } from "@/server/api";
import { getAdminSession } from "@/server/auth/session";
import { activeAdminsForAssignment } from "@/server/services/admin";
import { getComplaintDetail } from "@/server/services/complaints";
import { hasPermission, permissionsForRole } from "@/shared/rbac";

export const dynamic = "force-dynamic";

export default async function AdminComplaintPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, getAdminSession()]);
  const c = await collections();
  const admin = await c.admins.findOne({ id: session!.sub });
  if (!admin || !hasPermission(admin.role, "complaints.view")) return <p className="card">You do not have permission to view complaints.</p>;
  let detail;
  try {
    detail = await getComplaintDetail(decodeURIComponent(id), { kind: "admin", admin, sensitive: hasPermission(admin.role, "complaints.view_sensitive") });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const assignable = await activeAdminsForAssignment();
  return (
    <div>
      <Link href="/admin/complaints" className="text-sm text-civic-700 hover:underline">← All complaints</Link>
      <div className="mt-3">
        <AdminComplaintDetail initial={detail} admins={assignable} permissions={permissionsForRole(admin.role)} />
      </div>
    </div>
  );
}
