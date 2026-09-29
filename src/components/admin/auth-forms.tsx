"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, apiErrorMessage, ClientApiError } from "@/lib/client-api";
import { BRAND } from "@/shared/constants";
import { useI18n } from "../i18n-provider";
import { LangSwitch } from "../site-header";
import { Alert, Field } from "../ui";
import { Logo } from "../site-header";

function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-civic-900 via-civic-800 to-navy-900 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-5 flex items-center justify-center gap-3 text-white">
          <Logo size={48} className="border-amber-300" />
          <div>
            <p className="font-extrabold text-lg leading-tight">{lang === "hi" ? BRAND.nameHi : BRAND.name}</p>
            <p className="text-xs text-amber-200">{lang === "hi" ? BRAND.subtitleHi : BRAND.subtitle} • Administrative Portal</p>
          </div>
        </div>
        <div className="card jaipur-card-accent shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
            </div>
            <LangSwitch lang={lang} onChange={setLang} />
          </div>
          {children}
        </div>
        <p className="mt-4 text-center text-xs text-blue-100"><Link href="/" className="underline hover:text-white">{t("admin_back")}</Link></p>
      </div>
    </div>
  );
}

export function AdminLoginForm() {
  const { lang, t, L } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", totp: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [needTotp, setNeedTotp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupAvailable, setSetupAvailable] = useState(false);

  useEffect(() => {
    api<{ setupAvailable: boolean }>("/api/admin/setup").then((r) => setSetupAvailable(r.setupAvailable)).catch(() => {});
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ admin: { mustChangePassword: boolean }; twoFactorSetupRequired: boolean }>("/api/admin/login", { method: "POST", json: { ...form, totp: form.totp || undefined } });
      router.push(r.admin.mustChangePassword ? "/admin/change-password" : r.twoFactorSetupRequired ? "/admin/account?setup2fa=1" : "/admin");
      router.refresh();
    } catch (err: any) {
      if (err instanceof ClientApiError && err.code === "TOTP_REQUIRED") {
        setNeedTotp(true);
      } else {
        const msg = apiErrorMessage(lang, err);
        if (msg.includes("500") || msg.includes("Internal Server Error")) {
          setError(L("प्रशासक सर्वर से कनेक्ट करने में समस्या हुई। कृपया थोड़ी देर बाद प्रयास करें।", "Unable to connect to the admin server. Please try again later."));
        } else {
          setError(msg);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title={t("admin_login")} subtitle={t("admin_login_sub")}>
      <form onSubmit={submit} className="mt-4 space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        
        <Field label={t("admin_email")} required>
          <input
            className="input"
            type="email"
            autoComplete="username"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            placeholder="admin@jansahayak.local"
          />
        </Field>

        <Field label={t("admin_password")} required>
          <div className="relative">
            <input
              className="input pr-10"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              placeholder="••••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-civic-700 px-1 py-0.5"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? L("छिपाएँ", "Hide") : L("दिखाएँ", "Show")}
            </button>
          </div>
        </Field>

        {needTotp && (
          <Field label={t("admin_totp")} required>
            <input
              className="input tracking-widest text-center text-lg font-mono font-bold"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              value={form.totp}
              onChange={(e) => setForm({ ...form, totp: e.target.value.replace(/\D/g, "") })}
              required
              autoFocus
              placeholder="000000"
            />
          </Field>
        )}

        <button className="btn-primary w-full text-base font-bold py-3 shadow-md" disabled={busy || !form.email || !form.password}>
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {t("admin_signing")}
            </span>
          ) : (
            t("admin_signin")
          )}
        </button>
      </form>
      {setupAvailable && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 border border-amber-200">
          {t("admin_nosetup")} <Link href="/admin/setup" className="font-semibold underline text-civic-700">{t("admin_runsetup")}</Link>.
        </p>
      )}
    </Shell>
  );
}

export function AdminSetupForm() {
  const { lang, t } = useI18n();
  const router = useRouter();
  const [state, setState] = useState<{ setupAvailable: boolean; tokenRequired: boolean } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", setupToken: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ setupAvailable: boolean; tokenRequired: boolean }>("/api/admin/setup").then(setState).catch(() => setState({ setupAvailable: false, tokenRequired: false }));
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/setup", { method: "POST", json: { ...form, setupToken: form.setupToken || undefined } });
      router.push("/admin/login");
    } catch (err) {
      setError(apiErrorMessage(lang, err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell title={t("admin_setup")} subtitle={t("admin_setup_sub")}>
      {state === null ? <p className="mt-4 text-sm text-slate-500">{t("admin_checking")}</p> : !state.setupAvailable ? (
        <div className="mt-4"><Alert kind="warning">{t("admin_setup_done")} <Link href="/admin/login" className="underline">{t("admin_goto_login")}</Link>.</Alert></div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <Field label={t("admin_fullname")} required><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} /></Field>
          <Field label={t("admin_email")} required><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
          <Field label={t("admin_password")} required hint={t("admin_pw_hint")}><input className="input" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={10} /></Field>
          {state.tokenRequired && <Field label={t("admin_setup_token")} required><input className="input" value={form.setupToken} onChange={(e) => setForm({ ...form, setupToken: e.target.value })} required /></Field>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? t("admin_creating") : t("admin_create")}</button>
        </form>
      )}
    </Shell>
  );
}

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      setError(t("admin_pw_mismatch"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/change-password", { method: "POST", json: { currentPassword: form.currentPassword, newPassword: form.newPassword } });
      setDone(true);
      if (forced) {
        router.push("/admin");
        router.refresh();
      }
    } catch (err) {
      setError(apiErrorMessage(lang, err));
    } finally {
      setBusy(false);
    }
  }
  const body = (
    <form onSubmit={submit} className="mt-4 space-y-4">
      {error && <Alert kind="error">{error}</Alert>}
      {done && !forced && <Alert kind="success">{t("admin_changed")}</Alert>}
      <Field label={t("admin_current")} required><input className="input" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required /></Field>
      <Field label={t("admin_newpwd")} required hint={t("admin_pw_hint")}><input className="input" type="password" autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required minLength={10} /></Field>
      <Field label={t("admin_confirm")} required><input className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required /></Field>
      <button className="btn-primary w-full" disabled={busy}>{busy ? t("admin_saving") : t("admin_change")}</button>
    </form>
  );
  return forced ? <Shell title={t("admin_setnew")} subtitle={t("admin_setnew_sub")}>{body}</Shell> : body;
}
