import { ok, parseBody, requireAdmin, withHandler } from "@/server/api";
import { updateAdmin } from "@/server/services/admin";
import { adminUpdateSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

export const PATCH = withHandler(async (req, { params }) => {
  const { id } = await params;
  const ctx = await requireAdmin(req, "admins.manage");
  const input = await parseBody(req, adminUpdateSchema);
  return ok(await updateAdmin(ctx, id, input));
});
