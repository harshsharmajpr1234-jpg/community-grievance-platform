import { z } from "zod";
import { ok, paginationMeta, parseBody, parseQuery, requireUser, withHandler } from "@/server/api";
import { listNotifications, markNotificationsRead } from "@/server/services/notifications";
import { uuidSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

const querySchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20) });
const readSchema = z.object({ ids: z.array(uuidSchema).max(100).optional() });

/** GET /api/notifications — resident notification centre */
export const GET = withHandler(async (req) => {
  const user = await requireUser(req);
  const q = parseQuery(req, querySchema);
  const { rows, total, unread } = await listNotifications({ userId: user.id }, q.page, q.pageSize);
  return ok({ items: rows, unread, pagination: paginationMeta(q.page, q.pageSize, total) });
});

/** PATCH /api/notifications — mark read ({ ids } or all) */
export const PATCH = withHandler(async (req) => {
  const user = await requireUser(req);
  const { ids } = await parseBody(req, readSchema);
  await markNotificationsRead({ userId: user.id }, ids);
  return ok({ marked: true });
});
