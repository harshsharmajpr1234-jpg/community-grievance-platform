import { collections } from "@/db";
import { ok, parseBody, requireUser, withHandler } from "@/server/api";
import { publicUser } from "@/server/auth/account";
import { unreadCount } from "@/server/services/notifications";
import { profileUpdateSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

/** GET /api/auth/me */
export const GET = withHandler(async (req) => {
  const user = await requireUser(req);
  const unread = await unreadCount({ userId: user.id });
  return ok({ user: publicUser(user), unreadNotifications: unread });
});

/** PATCH /api/auth/me — update profile / language preference */
export const PATCH = withHandler(async (req) => {
  const user = await requireUser(req);
  const input = await parseBody(req, profileUpdateSchema);
  const c = await collections();
  const now = new Date();

  await c.users.updateOne(
    { id: user.id },
    { $set: { ...input, updatedAt: now } }
  );

  const updated = (await c.users.findOne({ id: user.id }))!;
  return ok({ user: publicUser(updated) });
});

/** DELETE /api/auth/me — request account deletion (processed by admins per privacy policy) */
export const DELETE = withHandler(async (req) => {
  const user = await requireUser(req);
  const c = await collections();
  const now = new Date();

  await c.users.updateOne(
    { id: user.id },
    { $set: { deletionRequestedAt: now, updatedAt: now } }
  );
  return ok({ deletionRequested: true });
});

