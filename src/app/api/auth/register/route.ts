import { getClientIp, ok, parseBody, withHandler } from "@/server/api";
import { registerUser } from "@/server/auth/account";
import { registerSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

/** POST /api/auth/register — { name, mobile, email?, password, confirmPassword, ward, address?, acceptTerms } */
export const POST = withHandler(async (req) => {
  const input = await parseBody(req, registerSchema);
  const user = await registerUser(input, getClientIp(req));
  return ok({ user, message: "Registration successful. Please login." }, { status: 201 });
});
