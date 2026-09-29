import { z } from "zod";
import { ok, paginationMeta, parseQuery, requireAdmin, withHandler } from "@/server/api";
import { listAuditLogs } from "@/server/services/audit";
import { optionalUuid } from "@/shared/validation";

export const dynamic = "force-dynamic";

const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(120).optional(),
  entityType: z.string().trim().max(60).optional(),
  adminId: optionalUuid,
});

/** GET /api/admin/audit-logs — read-only */
export const GET = withHandler(async (req) => {
  await requireAdmin(req, "audit.view");
  const q = parseQuery(req, schema);
  const { rows, total } = await listAuditLogs(q);
  return ok({ items: rows, pagination: paginationMeta(q.page, q.pageSize, total) });
});
