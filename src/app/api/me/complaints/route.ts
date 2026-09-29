import { ok, paginationMeta, parseQuery, requireUser, withHandler } from "@/server/api";
import { listUserComplaints } from "@/server/services/complaints";
import { listQuerySchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

/** GET /api/me/complaints — the logged-in resident's own complaints only */
export const GET = withHandler(async (req) => {
  const user = await requireUser(req);
  const q = parseQuery(req, listQuerySchema);
  const { items, total } = await listUserComplaints(user.id, q);
  return ok({ items, pagination: paginationMeta(q.page, q.pageSize, total) });
});
