import { ok, parseBody, requireUser, withHandler } from "@/server/api";
import { submitFeedback } from "@/server/services/complaints";
import { feedbackSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

/** POST /api/complaints/:id/feedback — { isResolved, rating?, comment? } */
export const POST = withHandler(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  const input = await parseBody(req, feedbackSchema);
  return ok(await submitFeedback(user, id, input), { status: 201 });
});
