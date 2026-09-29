import { ok, withHandler } from "@/server/api";
import { clearUserCookie } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const POST = withHandler(async () => {
  await clearUserCookie();
  return ok({ loggedOut: true });
});
