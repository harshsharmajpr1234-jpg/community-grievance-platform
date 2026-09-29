import { ok, parseBody, requireAdmin, withHandler } from "@/server/api";
import { changeAdminPassword } from "@/server/services/admin";
import { changePasswordSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

export const POST = withHandler(async (req) => {
  const ctx = await requireAdmin(req, undefined, { allowPasswordChangePending: true });
  const input = await parseBody(req, changePasswordSchema);
  await changeAdminPassword(ctx, input.currentPassword, input.newPassword);
  return ok({ changed: true });
});
