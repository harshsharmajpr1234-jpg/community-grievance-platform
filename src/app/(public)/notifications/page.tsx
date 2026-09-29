import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NotificationsList } from "@/components/notifications-list";
import { PageHeader } from "@/components/ui";
import { getLang } from "@/lib/lang";
import { getUserSession } from "@/server/auth/session";
import { t } from "@/shared/i18n";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const [session, lang] = await Promise.all([getUserSession(), getLang()]);
  if (!session) redirect("/login?next=/notifications");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`🔔 ${t(lang, "nav_notifications")}`} />
      <NotificationsList />
    </div>
  );
}
