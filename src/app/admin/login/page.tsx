import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/auth-forms";
import { getAdminSession } from "@/server/auth/session";

export const metadata: Metadata = { title: "Admin Login", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect("/admin");
  return <AdminLoginForm />;
}
