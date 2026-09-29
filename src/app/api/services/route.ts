import { z } from "zod";
import { ok, paginationMeta, parseQuery, withHandler } from "@/server/api";
import { listServices } from "@/server/services/content";
import { SERVICE_CATEGORIES } from "@/shared/constants";

export const dynamic = "force-dynamic";

const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(50),
  q: z.string().trim().max(120).optional(),
  category: z.preprocess((v) => (v === "" ? undefined : v), z.enum(SERVICE_CATEGORIES).optional()),
});

/** GET /api/services — public service directory */
export const GET = withHandler(async (req) => {
  const q = parseQuery(req, schema);
  const { rows, total } = await listServices(q);
  return ok({ items: rows, pagination: paginationMeta(q.page, q.pageSize, total) });
});
