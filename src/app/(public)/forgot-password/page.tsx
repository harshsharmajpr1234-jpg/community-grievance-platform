import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth-forms";
import { getLang } from "@/lib/lang";
import { getUserSession } from "@/server/auth/session";
import { bi } from "@/shared/i18n";

export const metadata: Metadata = { title: "Forgot Password", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const [session, lang] = await Promise.all([getUserSession(), getLang()]);
  if (session) redirect("/dashboard");
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">{bi(lang, "पासवर्ड भूल गए", "Forgot password")}</h1>
      <ForgotPasswordForm />
    </div>
  );
}
