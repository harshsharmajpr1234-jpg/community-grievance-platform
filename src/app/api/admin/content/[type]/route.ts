import { z } from "zod";
import { ApiError, ok, paginationMeta, parseQuery, requireAdmin, withHandler } from "@/server/api";
import { contentRegistry, isContentType } from "@/server/services/content";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional(),
  status: z.string().trim().max(30).optional(),
  category: z.string().trim().max(40).optional(),
  type: z.string().trim().max(30).optional(),
});

function registry(type: string) {
  if (!isContentType(type)) throw new ApiError(404, "NOT_FOUND", "Unknown content type");
  return contentRegistry[type];
}

/** GET /api/admin/content/:type — notices | development | services | community | areas | categories */
export const GET = withHandler(async (req, { params }) => {
  const { type } = await params;
  const reg = registry(type);
  await requireAdmin(req, reg.permission);
  const q = parseQuery(req, querySchema);
  const { rows, total } = await reg.list(q);
  return ok({ items: rows, pagination: paginationMeta(q.page, q.pageSize, total) });
});

/** POST /api/admin/content/:type */
export const POST = withHandler(async (req, { params }) => {
  const { type } = await params;
  const reg = registry(type);
  const ctx = await requireAdmin(req, reg.permission);
  const body = (await req.json()) as Record<string, unknown>;
  return ok(await reg.create(body, ctx), { status: 201 });
});
