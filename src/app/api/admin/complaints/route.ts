import { ok, paginationMeta, parseQuery, requireAdmin, withHandler } from "@/server/api";
import { adminListComplaints } from "@/server/services/complaints";
import { hasPermission } from "@/shared/rbac";
import { listQuerySchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

/** GET /api/admin/complaints — search + filters + pagination */
export const GET = withHandler(async (req) => {
  const { admin } = await requireAdmin(req, "complaints.view");
  const q = parseQuery(req, listQuerySchema);
  const { items, total } = await adminListComplaints(q, admin, hasPermission(admin.role, "complaints.view_sensitive"));
  return ok({ items, pagination: paginationMeta(q.page, q.pageSize, total) });
});
