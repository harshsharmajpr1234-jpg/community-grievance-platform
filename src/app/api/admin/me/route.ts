import { ok, requireAdmin, withHandler } from "@/server/api";
import { safeAdmin } from "@/server/services/admin";
import { unreadCount } from "@/server/services/notifications";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req) => {
  const { admin } = await requireAdmin(req, undefined, { allowPasswordChangePending: true });
  return ok({ admin: safeAdmin(admin), unreadNotifications: await unreadCount({ adminId: admin.id }) });
});
