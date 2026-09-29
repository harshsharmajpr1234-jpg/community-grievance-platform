import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { collections } from "@/db";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSession } from "@/server/auth/session";
import { safeAdmin } from "@/server/services/admin";
import { contentCounts } from "@/server/services/content";
import { unreadCount } from "@/server/services/notifications";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | JSNM Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const c = await collections();
  const admin = await c.admins.findOne({ id: session.sub });
  if (!admin || admin.isActive === false) redirect("/admin/login");
  if (admin.mustChangePassword) redirect("/admin/change-password");
  const [counts, unread, newComplaints] = await Promise.all([
    contentCounts(),
    unreadCount({ adminId: admin.id }),
    c.complaints.countDocuments({ status: "SUBMITTED" }),
  ]);
  return (
    <AdminShell admin={safeAdmin(admin)} counts={{ pendingPosts: counts.pendingPosts, newComplaints }} unread={unread}>
      {children}
    </AdminShell>
  );
}
