import { z } from "zod";
import { ok, paginationMeta, parseQuery, requireAdmin, withHandler } from "@/server/api";
import { listUsers } from "@/server/services/admin";
import { hasPermission } from "@/shared/rbac";

export const dynamic = "force-dynamic";

const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(120).optional(),
});

export const GET = withHandler(async (req) => {
  const { admin } = await requireAdmin(req, "users.view");
  const q = parseQuery(req, schema);
  const { rows, total } = await listUsers(q, hasPermission(admin.role, "complaints.view_sensitive"));
  return ok({ items: rows, pagination: paginationMeta(q.page, q.pageSize, total) });
});
