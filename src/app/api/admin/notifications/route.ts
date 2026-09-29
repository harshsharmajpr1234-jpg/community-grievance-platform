import { z } from "zod";
import { ok, paginationMeta, parseBody, parseQuery, requireAdmin, withHandler } from "@/server/api";
import { listNotifications, markNotificationsRead } from "@/server/services/notifications";
import { uuidSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

const querySchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20) });

export const GET = withHandler(async (req) => {
  const { admin } = await requireAdmin(req, "notifications.view");
  const q = parseQuery(req, querySchema);
  const { rows, total, unread } = await listNotifications({ adminId: admin.id }, q.page, q.pageSize);
  return ok({ items: rows, unread, pagination: paginationMeta(q.page, q.pageSize, total) });
});

export const PATCH = withHandler(async (req) => {
  const { admin } = await requireAdmin(req, "notifications.view");
  const { ids } = await parseBody(req, z.object({ ids: z.array(uuidSchema).max(100).optional() }));
  await markNotificationsRead({ adminId: admin.id }, ids);
  return ok({ marked: true });
});
