import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/admin/auth-forms";
import { getAdminSession } from "@/server/auth/session";

export const metadata: Metadata = { title: "Change Password", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  if (!(await getAdminSession())) redirect("/admin/login");
  return <ChangePasswordForm forced />;
}
