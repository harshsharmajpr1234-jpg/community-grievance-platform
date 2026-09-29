import { ok, parseBody, requireAdmin, withHandler } from "@/server/api";
import { applyAdminAction, getComplaintDetail } from "@/server/services/complaints";
import { hasPermission } from "@/shared/rbac";
import { adminComplaintActionSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

/** GET /api/admin/complaints/:id */
export const GET = withHandler(async (req, { params }) => {
  const { id } = await params;
  const { admin } = await requireAdmin(req, "complaints.view");
  return ok(await getComplaintDetail(id, { kind: "admin", admin, sensitive: hasPermission(admin.role, "complaints.view_sensitive") }));
});

/** PATCH /api/admin/complaints/:id — apply an action (verify/assign/forward/status/...) */
export const PATCH = withHandler(async (req, { params }) => {
  const { id } = await params;
  const ctx = await requireAdmin(req, "complaints.view");
  const action = await parseBody(req, adminComplaintActionSchema);
  return ok(await applyAdminAction(ctx, id, action));
});
