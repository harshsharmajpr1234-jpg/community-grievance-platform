import { z } from "zod";
import { ok, paginationMeta, parseBody, parseQuery, requireUser, withHandler } from "@/server/api";
import { createUserCommunityPost, listCommunityPosts } from "@/server/services/content";
import { COMMUNITY_POST_TYPES } from "@/shared/constants";
import { communityPostSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  q: z.string().trim().max(120).optional(),
  type: z.preprocess((v) => (v === "" ? undefined : v), z.enum(COMMUNITY_POST_TYPES).optional()),
});

/** GET /api/community — approved posts */
export const GET = withHandler(async (req) => {
  const q = parseQuery(req, schema);
  const { rows, total } = await listCommunityPosts(q);
  return ok({ items: rows, pagination: paginationMeta(q.page, q.pageSize, total) });
});

/** POST /api/community — resident submits a post (requires admin approval) */
export const POST = withHandler(async (req) => {
  const user = await requireUser(req);
  const input = await parseBody(req, communityPostSchema);
  const post = await createUserCommunityPost(user, input);
  return ok({ post, message: "Submitted for moderation" }, { status: 201 });
});
