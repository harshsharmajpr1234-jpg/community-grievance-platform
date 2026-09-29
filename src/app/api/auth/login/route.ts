import { getClientIp, ok, parseBody, withHandler } from "@/server/api";
import { loginUser } from "@/server/auth/account";
import { setUserCookie } from "@/server/auth/session";
import { loginSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

/** POST /api/auth/login — { identifier, password } → sets session cookie and returns token for mobile clients */
export const POST = withHandler(async (req) => {
  const input = await parseBody(req, loginSchema);
  const result = await loginUser(input, getClientIp(req));
  await setUserCookie(result.token);
  return ok({ token: result.token, user: result.user });
});
