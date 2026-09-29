import { ok, requireUser, withHandler } from "@/server/api";
import { markNotificationsRead } from "@/server/services/notifications";
import { uuidSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

/** PATCH /api/notifications/:id/read — mark one notification as read (owner only) */
export const PATCH = withHandler(async (req, { params }) => {
  const { id } = await params;
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return ok({ marked: false });
  const user = await requireUser(req);
  await markNotificationsRead({ userId: user.id }, [parsed.data]);
  return ok({ marked: true });
});
