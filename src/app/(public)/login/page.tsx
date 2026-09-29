import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { Alert } from "@/components/ui";
import { getLang } from "@/lib/lang";
import { getUserSession } from "@/server/auth/session";
import { bi } from "@/shared/i18n";

export const metadata: Metadata = { title: "Login" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const [session, lang, sp] = await Promise.all([getUserSession(), getLang(), searchParams]);
  const next = sp.next && sp.next.startsWith("/") ? sp.next : "/dashboard";
  if (session) redirect(next);
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">{bi(lang, "लॉगिन", "Login")}</h1>
      {sp.reset === "1" && (
        <div className="mb-4">
          <Alert kind="success">{bi(lang, "पासवर्ड रीसेट हो गया। कृपया नए पासवर्ड से लॉगिन करें।", "Password has been reset. Please login with your new password.")}</Alert>
        </div>
      )}
      <LoginForm redirectTo={next} />
      <p className="mt-4 text-center text-xs text-slate-500">
        {bi(lang, "लॉगिन करके आप ", "By logging in you agree to the ")}{" "}
        <Link href="/terms" className="underline">{bi(lang, "नियम व शर्तों", "terms")}</Link> {bi(lang, "और", "and")}{" "}
        <Link href="/privacy" className="underline">{bi(lang, "गोपनीयता नीति", "privacy policy")}</Link> {bi(lang, "से सहमत होते हैं।", ".")}
      </p>
    </div>
  );
}
