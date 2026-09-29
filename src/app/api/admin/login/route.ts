import { getClientIp, ok, parseBody, withHandler } from "@/server/api";
import { setAdminCookie } from "@/server/auth/session";
import { adminLogin } from "@/server/services/admin";
import { adminLoginSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

/** POST /api/admin/login — { email, password, totp? } */
export const POST = withHandler(async (req) => {
  const input = await parseBody(req, adminLoginSchema);
  const result = await adminLogin(input, getClientIp(req), req.headers.get("user-agent"));
  await setAdminCookie(result.token);
  return ok(result);
});
