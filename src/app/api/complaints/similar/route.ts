import { z } from "zod";
import { ok, parseQuery, requireUser, withHandler } from "@/server/api";
import { findSimilarComplaints } from "@/server/services/complaints";
import { optionalUuid, uuidSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

const schema = z.object({ categoryId: uuidSchema, areaId: optionalUuid, title: z.string().trim().min(3).max(200) });

/** GET /api/complaints/similar — duplicate suggestions before submitting */
export const GET = withHandler(async (req) => {
  await requireUser(req);
  const q = parseQuery(req, schema);
  return ok({ items: await findSimilarComplaints(q.categoryId, q.areaId, q.title) });
});
