import { ok, requireAdmin, withHandler } from "@/server/api";
import { dashboardStats } from "@/server/services/admin";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req) => {
  await requireAdmin(req, "analytics.view");
  return ok(await dashboardStats());
});
