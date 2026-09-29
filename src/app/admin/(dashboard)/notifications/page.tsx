import { NotificationsList } from "@/components/notifications-list";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function AdminNotificationsPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Notifications" subtitle="New complaints, resident responses and community submissions." />
      <NotificationsList endpoint="/api/admin/notifications" linkBase="/admin/complaints" />
    </div>
  );
}
