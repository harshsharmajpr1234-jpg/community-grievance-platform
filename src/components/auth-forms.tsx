"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "@/lib/client-api";
import type { AreaDto, UserDto } from "@/shared/types";
import { useI18n } from "./i18n-provider";
import { Alert, Field } from "./ui";

/* ------------------------------------------------------------------ */
/* Login — mobile number OR email + password                            */
/* ------------------------------------------------------------------ */
export function LoginForm({ onSuccess, redirectTo, compact }: { onSuccess?: (user: UserDto) => void; redirectTo?: string; compact?: boolean }) {
  const { lang, t, L, setLang } = useI18n();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ token: string; user: UserDto }>("/api/auth/login", { method: "POST", json: { identifier, password } });
      if (res.user.language === "hi" || res.user.language === "en") setLang(res.user.language);
      if (onSuccess) onSuccess(res.user);
      else router.push(redirectTo || "/dashboard");
      router.refresh();
    } catch (err: any) {
      const msg = apiErrorMessage(lang, err);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "" : "card jaipur-card-accent shadow-md"}>
      <div className="flex flex-col items-center mb-2 text-center">
        <img src="/jansahayak-logo.png" alt="जन समस्या निवारण मंच" className="h-16 w-16 object-contain rounded-full border border-amber-300 p-0.5 shadow-sm mb-2" />
        <h2 className="text-xl font-extrabold text-civic-800">{t("login_title")}</h2>
        <p className="text-xs font-semibold text-civic-600 mt-0.5">{L("वार्ड 12, 13 एवं 14 • नागरिक पोर्टल", "Ward 12, 13 & 14 • Civic Portal")}</p>
      </div>

      {error && <div className="mt-3"><Alert kind="error">{error}</Alert></div>}

      <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
        <Field label={t("login_identifier")} required>
          <input
            className="input"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            maxLength={190}
            autoComplete="username"
            placeholder={L("98XXXXXXXX या email@example.com", "98XXXXXXXX or email@example.com")}
          />
        </Field>

        <Field label={t("login_password")} required>
          <div className="relative">
            <input
              className="input pr-10"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
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

        <button className="btn-primary w-full text-base font-bold py-3 shadow-md" disabled={busy || !identifier.trim() || !password}>
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {t("common_loading")}
            </span>
          ) : (
            t("login_submit")
          )}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm border-t border-amber-100 pt-3">
        <Link href="/forgot-password" className="font-medium text-civic-700 hover:underline">{t("login_forgot")}</Link>
        <Link href="/register" className="font-bold text-civic-600 hover:underline">{t("login_no_account")}</Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Registration                                                         */
/* ------------------------------------------------------------------ */
export function RegisterForm() {
  const { lang, t, L } = useI18n();
  const [form, setForm] = useState({ name: "", mobile: "", email: "", password: "", confirmPassword: "", ward: "", address: "", acceptTerms: false });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError(L("पासवर्ड मेल नहीं खाते", "Passwords do not match"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/register", {
        method: "POST",
        json: { ...form, email: form.email || undefined, address: form.address || undefined },
      });
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      const msg = apiErrorMessage(lang, err);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card jaipur-card-accent text-center p-8 shadow-lg">
        <img src="/jansahayak-logo.png" alt="जन समस्या निवारण मंच" className="mx-auto h-20 w-20 object-contain rounded-full border border-amber-300 p-1 mb-3" />
        <p className="text-5xl mb-2" aria-hidden>🎉</p>
        <h2 className="text-2xl font-extrabold text-leaf-800">{t("register_success")}</h2>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          {L("आपका खाता सफलतापूर्वक बना दिया गया है। अब आप अपनी शिकायत दर्ज व ट्रैक करने के लिए लॉगिन कर सकते हैं।", "Your account has been successfully created. You can now log in to register and track complaints.")}
        </p>
        <Link href="/login" className="btn-primary mt-6 px-8 py-3 font-bold text-base shadow-md inline-block">
          {t("login_submit")} →
        </Link>
      </div>
    );
  }

  const set = (k: keyof typeof form, v: string | boolean) => setForm({ ...form, [k]: v });

  return (
    <div className="card jaipur-card-accent shadow-md">
      <div className="flex flex-col items-center mb-3 text-center">
        <img src="/jansahayak-logo.png" alt="जन समस्या निवारण मंच" className="h-16 w-16 object-contain rounded-full border border-amber-300 p-0.5 shadow-sm mb-2" />
        <h2 className="text-xl font-extrabold text-civic-800">{t("register_title")}</h2>
        <p className="text-xs font-semibold text-civic-600 mt-0.5">{L("जन समस्या निवारण मंच • वार्ड 12, 13 एवं 14", "Jan Samasya Nivaran Manch • Ward 12, 13 & 14")}</p>
      </div>

      {error && (
        <div className="mt-3">
          <Alert kind="error">
            <div className="space-y-2">
              <p className="font-medium">{error}</p>
              {(error.includes("पहले से मौजूद") || error.includes("already exists") || error.includes("mobile") || error.includes("email") || error.includes("login") || error.includes("लॉगिन")) && (
                <div className="pt-1">
                  <Link href="/login" className="btn-primary btn-sm inline-flex items-center gap-1.5 font-bold shadow-sm">
                    🔑 {t("login_submit")} ➔
                  </Link>
                </div>
              )}
            </div>
          </Alert>
        </div>
      )}

      <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
        <Field label={t("register_name")} required>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required minLength={2} maxLength={120} autoComplete="name" placeholder={L("पूरा नाम दर्ज करें", "Enter full name")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("register_mobile")} required hint={L("10 अंकों का भारतीय मोबाइल नंबर", "10 digit Indian mobile number")}>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-xl border border-r-0 border-amber-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600">+91</span>
              <input className="input rounded-l-none" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={form.mobile} onChange={(e) => set("mobile", e.target.value.replace(/\D/g, ""))} required placeholder="9876543210" />
            </div>
          </Field>
          <Field label={t("register_email")}>
            <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={190} autoComplete="email" placeholder="you@example.com" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("register_password")} required hint={L("कम से कम 4 अक्षर का पासवर्ड", "Min 4 characters password")}>
            <div className="relative">
              <input className="input pr-10" type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={4} autoComplete="new-password" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-civic-700 px-1 py-0.5">
                {showPassword ? L("छिपाएँ", "Hide") : L("दिखाएँ", "Show")}
              </button>
            </div>
          </Field>
          <Field label={t("register_confirm")} required>
            <input className="input" type={showPassword ? "text" : "password"} value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} required minLength={4} autoComplete="new-password" placeholder="••••••••" />
          </Field>
        </div>

        <Field label={L("वार्ड चुनें *", "Select Ward *")} required>
          <select className="input font-semibold text-slate-800" value={form.ward} onChange={(e) => set("ward", e.target.value)} required>
            <option value="">{L("— अपना वार्ड चुनें —", "— Select Your Ward —")}</option>
            <option value="Ward 12">{L("🏛️ वार्ड 12 (Ward 12)", "🏛️ Ward 12")}</option>
            <option value="Ward 13">{L("🏛️ वार्ड 13 (Ward 13)", "🏛️ Ward 13")}</option>
            <option value="Ward 14">{L("🏛️ वार्ड 14 (Ward 14)", "🏛️ Ward 14")}</option>
          </select>
        </Field>

        <Field label={L("पता (वैकल्पिक)", "Address (optional)")}>
          <input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={300} autoComplete="street-address" placeholder={L("मकान नं., गली विवरण आदि", "House No., Street detail etc.")} />
        </Field>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700 bg-amber-50/60 p-3 rounded-xl border border-amber-200/60">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-civic-600 rounded" checked={form.acceptTerms} onChange={(e) => set("acceptTerms", e.target.checked)} required />
          <span className="leading-snug">
            {t("register_terms")} — <Link href="/terms" className="text-civic-700 font-semibold underline">{t("nav_terms")}</Link>, <Link href="/privacy" className="text-civic-700 font-semibold underline">{t("nav_privacy")}</Link>
          </span>
        </label>

        <button className="btn-primary w-full text-base font-bold py-3 shadow-md" disabled={busy || !form.acceptTerms || form.mobile.length !== 10 || !form.ward || !form.name || !form.password}>
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {t("common_loading")}
            </span>
          ) : (
            t("register_submit")
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600 border-t border-amber-100 pt-3">
        {L("पहले से खाता है?", "Already have an account?")} <Link href="/login" className="font-bold text-civic-600 hover:underline ml-1">{t("login_submit")}</Link>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Forgot password                                                      */
/* ------------------------------------------------------------------ */
export function ForgotPasswordForm() {
  const { lang, t, L } = useI18n();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api<{ message: string }>("/api/auth/forgot-password", { method: "POST", json: { email } });
      setMessage(L("यदि इस ईमेल से खाता मौजूद है, तो पासवर्ड रीसेट लिंक भेज दिया गया है।", "If an account exists with this email, a password reset link has been sent."));
    } catch (err) {
      setError(apiErrorMessage(lang, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-slate-900">{t("forgot_title")}</h2>
      <p className="mt-1 text-sm text-slate-600">{L("अपना पंजीकृत ईमेल दर्ज करें — आपको एक सुरक्षित, एक बार उपयोग होने वाला रीसेट लिंक भेजा जाएगा।", "Enter your registered email — you will receive a secure, single-use reset link.")}</p>
      {error && <div className="mt-3"><Alert kind="error">{error}</Alert></div>}
      {message && !error && <div className="mt-3"><Alert kind="success">{message}</Alert></div>}
      {!message && (
        <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
          <Field label={t("register_email")} required>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          <button className="btn-primary w-full" disabled={busy || !email}>{busy ? t("common_loading") : t("forgot_submit")}</button>
        </form>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reset password (from email link)                                     */
/* ------------------------------------------------------------------ */
export function ResetPasswordForm({ token }: { token: string }) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/reset-password", { method: "POST", json: { token, ...form } });
      router.push("/login?reset=1");
    } catch (err) {
      setError(apiErrorMessage(lang, err));
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="card">
        <Alert kind="error">{t("common_error")}</Alert>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-slate-900">{t("reset_title")}</h2>
      {error && <div className="mt-3"><Alert kind="error">{error}</Alert></div>}
      <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
        <Field label={t("register_password")} required>
          <input className="input" type="password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required minLength={4} autoComplete="new-password" />
        </Field>
        <Field label={t("register_confirm")} required>
          <input className="input" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required autoComplete="new-password" />
        </Field>
        <button className="btn-primary w-full" disabled={busy || !form.newPassword}>{busy ? t("common_loading") : t("reset_submit")}</button>
      </form>
    </div>
  );
}
