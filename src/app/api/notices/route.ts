import { z } from "zod";
import { ok, paginationMeta, parseQuery, withHandler } from "@/server/api";
import { getPublishedNotice, listPublishedNotices } from "@/server/services/content";
import { NOTICE_CATEGORIES } from "@/shared/constants";
import { optionalUuid } from "@/shared/validation";

export const dynamic = "force-dynamic";

const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  q: z.string().trim().max(120).optional(),
  category: z.preprocess((v) => (v === "" ? undefined : v), z.enum(NOTICE_CATEGORIES).optional()),
  areaId: optionalUuid,
  id: optionalUuid,
});

/** GET /api/notices — published notices (search, category, locality) or ?id= for one */
export const GET = withHandler(async (req) => {
  const q = parseQuery(req, schema);
  if (q.id) return ok({ item: await getPublishedNotice(q.id) });
  const { rows, total } = await listPublishedNotices(q);
  return ok({ items: rows, pagination: paginationMeta(q.page, q.pageSize, total) });
});
