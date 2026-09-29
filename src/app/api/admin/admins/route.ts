import { ok, parseBody, requireAdmin, withHandler } from "@/server/api";
import { createAdmin, listAdmins } from "@/server/services/admin";
import { adminCreateSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req) => {
  await requireAdmin(req, "admins.view");
  return ok({ items: await listAdmins() });
});

export const POST = withHandler(async (req) => {
  const ctx = await requireAdmin(req, "admins.manage");
  const input = await parseBody(req, adminCreateSchema);
  return ok(await createAdmin(ctx, input), { status: 201 });
});
