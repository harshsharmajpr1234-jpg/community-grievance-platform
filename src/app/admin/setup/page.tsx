import type { Metadata } from "next";
import { AdminSetupForm } from "@/components/admin/auth-forms";

export const metadata: Metadata = { title: "Admin Setup", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function AdminSetupPage() {
  return <AdminSetupForm />;
}
