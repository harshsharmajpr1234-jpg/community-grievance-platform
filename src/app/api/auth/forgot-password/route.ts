import { getClientIp, ok, parseBody, withHandler } from "@/server/api";
import { requestPasswordReset } from "@/server/auth/account";
import { forgotPasswordSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

/** POST /api/auth/forgot-password — { email } → emails a single-use reset link (email provider required) */
export const POST = withHandler(async (req) => {
  const input = await parseBody(req, forgotPasswordSchema);
  return ok(await requestPasswordReset(input, getClientIp(req)));
});
