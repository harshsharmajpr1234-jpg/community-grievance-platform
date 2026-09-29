import { ok, optionalUser, parseBody, requireUser, withHandler } from "@/server/api";
import { addUserResponse, getComplaintDetail } from "@/server/services/complaints";
import { userResponseSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

/** GET /api/complaints/:id — id or DPF code. Owners see more than the public. */
export const GET = withHandler(async (req, { params }) => {
  const { id } = await params;
  const user = await optionalUser(req);
  const detail = await getComplaintDetail(id, user ? { kind: "owner", userId: user.id } : { kind: "public" });
  return ok(detail);
});

/** PATCH /api/complaints/:id — resident adds requested information */
export const PATCH = withHandler(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  const { message } = await parseBody(req, userResponseSchema);
  return ok(await addUserResponse(user, id, message));
});
