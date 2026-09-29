import { ok, parseBody, withHandler } from "@/server/api";
import { resetPassword } from "@/server/auth/account";
import { resetPasswordSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

/** POST /api/auth/reset-password — { token, newPassword, confirmPassword } (single-use, expiring) */
export const POST = withHandler(async (req) => {
  const input = await parseBody(req, resetPasswordSchema);
  return ok(await resetPassword(input));
});
