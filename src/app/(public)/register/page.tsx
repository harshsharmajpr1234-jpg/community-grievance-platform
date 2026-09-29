import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth-forms";
import { getLang } from "@/lib/lang";
import { getUserSession } from "@/server/auth/session";
import { bi } from "@/shared/i18n";

export const metadata: Metadata = { title: "Register / पंजीकरण करें", description: "Create a resident account to submit and track local complaints." };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const [session, lang] = await Promise.all([getUserSession(), getLang()]);
  if (session) redirect("/dashboard");
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">{bi(lang, "रजिस्टर / पंजीकरण करें", "Register")}</h1>
      <RegisterForm />
    </div>
  );
}
