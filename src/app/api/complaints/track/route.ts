import { getClientIp, ok, parseBody, withHandler } from "@/server/api";
import { trackComplaint } from "@/server/services/complaints";
import { trackComplaintSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

/** POST /api/complaints/track — { code, mobile } */
export const POST = withHandler(async (req) => {
  const { code, mobile } = await parseBody(req, trackComplaintSchema);
  return ok(await trackComplaint(code, mobile, getClientIp(req)));
});
