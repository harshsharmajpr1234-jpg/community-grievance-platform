import { getClientIp, ok, paginationMeta, parseBody, parseQuery, requireUser, withHandler } from "@/server/api";
import { createComplaint, listPublicComplaints, listUserComplaints } from "@/server/services/complaints";
import { createComplaintSchema, listQuerySchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

/** GET /api/complaints — public transparent list, or ?mine=true for the logged-in resident */
export const GET = withHandler(async (req) => {
  const q = parseQuery(req, listQuerySchema);
  if (q.mine) {
    const user = await requireUser(req);
    const { items, total } = await listUserComplaints(user.id, q);
    return ok({ items, pagination: paginationMeta(q.page, q.pageSize, total) });
  }
  const { items, total } = await listPublicComplaints(q);
  return ok({ items, pagination: paginationMeta(q.page, q.pageSize, total) });
});

/** POST /api/complaints — create (login required) */
export const POST = withHandler(async (req) => {
  const user = await requireUser(req);
  const input = await parseBody(req, createComplaintSchema);
  const result = await createComplaint(user, input, getClientIp(req));
  return ok(result, { status: 201 });
});

