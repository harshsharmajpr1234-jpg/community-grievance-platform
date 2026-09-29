import { ok, withHandler } from "@/server/api";
import { clearAdminCookie } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const POST = withHandler(async () => {
  await clearAdminCookie();
  return ok({ loggedOut: true });
});
