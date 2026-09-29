import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth-forms";
import { getLang } from "@/lib/lang";
import { getUserSession } from "@/server/auth/session";
import { bi } from "@/shared/i18n";

export const metadata: Metadata = { title: "Reset Password", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [session, lang, sp] = await Promise.all([getUserSession(), getLang(), searchParams]);
  if (session) redirect("/dashboard");
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">{bi(lang, "नया पासवर्ड सेट करें", "Set a new password")}</h1>
      <ResetPasswordForm token={sp.token ?? ""} />
    </div>
  );
}
