import { z } from "zod";
import { ok, paginationMeta, parseQuery, withHandler } from "@/server/api";
import { getProjectWithUpdates, listPublishedProjects } from "@/server/services/content";
import { PROJECT_STATUSES } from "@/shared/constants";
import { optionalUuid } from "@/shared/validation";

export const dynamic = "force-dynamic";

const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  q: z.string().trim().max(120).optional(),
  status: z.preprocess((v) => (v === "" ? undefined : v), z.enum(PROJECT_STATUSES).optional()),
  id: optionalUuid,
});

/** GET /api/development — published development works, or ?id= for one with updates */
export const GET = withHandler(async (req) => {
  const q = parseQuery(req, schema);
  if (q.id) return ok({ item: await getProjectWithUpdates(q.id) });
  const { rows, total } = await listPublishedProjects(q);
  return ok({ items: rows, pagination: paginationMeta(q.page, q.pageSize, total) });
});
