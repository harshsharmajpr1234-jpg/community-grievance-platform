import { ok, parseBody, requireAdmin, withHandler } from "@/server/api";
import { manageTwoFactor } from "@/server/services/admin";
import { twoFactorSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

/** POST /api/admin/2fa — { action: SETUP | ENABLE | DISABLE, code? } */
export const POST = withHandler(async (req) => {
  const ctx = await requireAdmin(req);
  const input = await parseBody(req, twoFactorSchema);
  return ok(await manageTwoFactor(ctx, input.action, input.code));
});
