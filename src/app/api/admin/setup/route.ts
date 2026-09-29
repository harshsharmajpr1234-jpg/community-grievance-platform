import { getClientIp, ok, parseBody, withHandler } from "@/server/api";
import { adminCount, setupFirstAdmin } from "@/server/services/admin";
import { adminSetupSchema } from "@/shared/validation";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** GET /api/admin/setup — whether first-run setup is available */
export const GET = withHandler(async () => ok({ setupAvailable: (await adminCount()) === 0, tokenRequired: Boolean(env.setupToken) }));

/** POST /api/admin/setup — create the first SUPER_ADMIN */
export const POST = withHandler(async (req) => {
  const input = await parseBody(req, adminSetupSchema);
  return ok(await setupFirstAdmin(input, getClientIp(req)), { status: 201 });
});
