import { randomUUID } from "node:crypto";
import { collections } from "@/db";
import type { Notification } from "@/db/schema";
import { env } from "@/lib/env";
import type { AdminRole, NotificationType } from "@/shared/constants";
import { buildTelegramNewComplaintMessage, getEmailProvider, sendTelegramAlert } from "@/server/integrations";
import { getSettings } from "./settings";

type NotifyInput = {
  title: string;
  message: string;
  type: NotificationType;
  referenceType?: string;
  referenceId?: string;
  meta?: { complaintCode?: string; category?: string; area?: string; priority?: string; status?: string };
};

export async function notifyUser(userId: string, input: NotifyInput, opts: { email?: boolean } = {}) {
  const c = await collections();
  const now = new Date();
  const notif: Notification = {
    id: randomUUID(),
    userId,
    adminId: null,
    title: input.title,
    message: input.message,
    type: input.type,
    referenceType: input.referenceType ?? null,
    referenceId: input.referenceId ?? null,
    isRead: false,
    readAt: null,
    createdAt: now,
  };

  await c.notifications.insertOne(notif);
  const settings = await getSettings();
  const user = await c.users.findOne({ id: userId });
  if (!user) return;

  void (async () => {
    try {
      if (opts.email !== false && settings.notifyUsersByEmail && user.email) {
        await getEmailProvider().send(user.email, input.title, `<p>${input.message}</p>`);
      }
    } catch (error) {
      console.error("[notify] dispatch failed", error);
    }
  })();
}

export async function notifyAdmins(roles: AdminRole[], input: NotifyInput) {
  if (roles.length === 0) return;
  const settings = await getSettings();
  if (input.type === "NEW_COMPLAINT" && !settings.notifyAdminsOnNewComplaint) return;

  const c = await collections();
  const targets = await c.admins.find({ isActive: true, role: { $in: roles } }).toArray();
  if (targets.length === 0) return;

  const now = new Date();
  const docs: Notification[] = targets.map((a) => ({
    id: randomUUID(),
    userId: null,
    adminId: a.id,
    title: input.title,
    message: input.message,
    type: input.type,
    referenceType: input.referenceType ?? null,
    referenceId: input.referenceId ?? null,
    isRead: false,
    readAt: null,
    createdAt: now,
  }));

  await c.notifications.insertMany(docs);

  const complaintCode = input.type === "NEW_COMPLAINT" ? input.meta?.complaintCode : undefined;
  const alertMeta = complaintCode ? input.meta : undefined;
  if (complaintCode && alertMeta) {
    void (async () => {
      try {
        const adminUrl = `${env.appUrl.replace(/\/$/, "")}/admin/complaints/${complaintCode}`;
        if (env.telegramBotToken && env.telegramAdminChatId) {
          const text = buildTelegramNewComplaintMessage({
            code: complaintCode,
            category: alertMeta.category ?? "—",
            area: alertMeta.area ?? "—",
            priority: alertMeta.priority ?? "—",
            status: alertMeta.status ?? "SUBMITTED",
            adminUrl,
          });
          const result = await sendTelegramAlert(text);
          if (!result.delivered) console.error("[notify] telegram failed", result.error);
        }
      } catch (error) {
        console.error("[notify] admin alert dispatch failed", error);
      }
    })();
  }
}

export async function notifyComplaintUpdate(userId: string, complaintCode: string, newStatus: string, message?: string) {
  await notifyUser(userId, {
    title: `Status update: ${complaintCode}`,
    message: message || `Your complaint status has been updated to ${newStatus}.`,
    type: "COMPLAINT_STATUS_CHANGED",
    referenceType: "complaint",
    referenceId: complaintCode,
  });
}

export async function listNotifications(who: { userId?: string; adminId?: string }, page = 1, pageSize = 20) {
  const c = await collections();
  const filter = who.userId ? { userId: who.userId } : { adminId: who.adminId ?? "" };

  const total = await c.notifications.countDocuments(filter);
  const unread = await c.notifications.countDocuments({ ...filter, isRead: false });
  const skip = (page - 1) * pageSize;
  const rows = await c.notifications.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).toArray();

  return { rows, total, unread };
}

export async function unreadCount(who: { userId?: string; adminId?: string }): Promise<number> {
  const c = await collections();
  const filter = who.userId ? { userId: who.userId, isRead: false } : { adminId: who.adminId ?? "", isRead: false };
  return c.notifications.countDocuments(filter);
}

export async function markNotificationsRead(who: { userId?: string; adminId?: string }, ids?: string[]) {
  const c = await collections();
  const filter: any = who.userId ? { userId: who.userId } : { adminId: who.adminId ?? "" };
  if (ids && ids.length > 0) {
    filter.id = { $in: ids };
  }
  await c.notifications.updateMany(filter, { $set: { isRead: true } });
}
