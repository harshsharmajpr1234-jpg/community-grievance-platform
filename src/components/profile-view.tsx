"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, apiErrorMessage, qs } from "@/lib/client-api";
import { formatDate } from "@/shared/i18n";
import type { AreaDto, ComplaintDto, Paged, UserDto } from "@/shared/types";
import { useI18n } from "./i18n-provider";
import { NotificationsList } from "./notifications-list";
import { Alert, EmptyState, Field, Pagination, PriorityBadge, Spinner, StatusBadge } from "./ui";

type Tab = "complaints" | "notifications" | "profile";

export function ProfileView({ user: initialUser, initialTab = "complaints" }: { user: UserDto; initialTab?: Tab }) {
  const { lang, t, L } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [user, setUser] = useState(initialUser);
  const [page, setPage] = useState(1);
  const [list, setList] = useState<Paged<ComplaintDto> | null>(null);
  const [areas, setAreas] = useState<AreaDto[]>([]);
  const [form, setForm] = useState({ name: user.name ?? "", email: user.email ?? "", areaId: user.areaId ?? "", address: user.address ?? "" });
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (tab !== "complaints") return;
    api<Paged<ComplaintDto>>(`/api/complaints${qs({ mine: true, page, pageSize: 10 })}`).then(setList).catch(() => setList({ items: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 } }));
  }, [tab, page]);
  useEffect(() => {
    api<{ areas: AreaDto[] }>("/api/meta").then((m) => setAreas(m.areas.filter((a) => a.type !== "CITY"))).catch(() => {});
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ user: UserDto }>("/api/auth/me", { method: "PATCH", json: { ...form, areaId: form.areaId || undefined, email: form.email || undefined } });
      setUser(r.user);
      setMsg({ kind: "success", text: L("प्रोफ़ाइल सहेजी गई।", "Profile saved.") });
    } catch (err) {
      setMsg({ kind: "error", text: apiErrorMessage(lang, err) });
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  async function requestDeletion() {
    if (!confirm(L("क्या आप खाता हटाने का अनुरोध करना चाहते हैं?", "Do you want to request account deletion?"))) return;
    await api("/api/auth/me", { method: "DELETE" });
    setMsg({ kind: "success", text: L("अनुरोध दर्ज हो गया। गोपनीयता नीति के अनुसार 30 दिनों में संसाधित होगा।", "Request recorded. It will be processed within 30 days per the privacy policy.") });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "complaints", label: t("nav_my_complaints") },
    { id: "notifications", label: t("nav_notifications") },
    { id: "profile", label: t("nav_profile") },
  ];

  return (
    <div>
      <div className="card mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-civic-100 text-xl font-bold text-civic-700" aria-hidden>{(user.name || "U").charAt(0).toUpperCase()}</span>
          <div>
            <p className="font-bold text-slate-900">{user.name || L("निवासी", "Resident")}</p>
            <p className="text-sm text-slate-500">+91 {user.mobileMasked} • {L("सदस्य", "Member since")} {formatDate(user.createdAt, lang)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/complaints" className="btn-primary btn-sm">📝 {t("nav_submit")}</Link>
          <button type="button" className="btn-ghost btn-sm" onClick={logout}>{t("nav_logout")}</button>
        </div>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1" role="tablist">
        {tabs.map((tb) => (
          <button key={tb.id} role="tab" aria-selected={tab === tb.id} type="button" onClick={() => setTab(tb.id)} className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${tab === tb.id ? "bg-white text-civic-700 shadow-sm" : "text-slate-600"}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "complaints" && (
        !list ? <Spinner label={t("common_loading")} /> : list.items.length === 0 ? (
          <EmptyState icon="📝" title={L("आपने अभी तक कोई शिकायत दर्ज नहीं की है।", "You have not registered any complaint yet.")} />
        ) : (
          <>
            <ul className="space-y-3">
              {list.items.map((c) => (
                <li key={c.id}>
                  <Link href={`/complaints/${c.code}`} className="card block hover:border-civic-200">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-civic-700">{c.code}</span>
                      <StatusBadge status={c.status} lang={lang} />
                      <PriorityBadge priority={c.priority} lang={lang} />
                    </div>
                    <p className="mt-1.5 font-semibold text-slate-900">{c.title}</p>
                    <p className="text-xs text-slate-500">{c.category ? (lang === "hi" ? c.category.nameHi : c.category.nameEn) : ""} • {formatDate(c.createdAt, lang)} • {t("complaint_last_update")}: {formatDate(c.lastUpdateAt, lang, true)}</p>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={list.pagination.page} totalPages={list.pagination.totalPages} onPage={setPage} lang={lang} />
          </>
        )
      )}

      {tab === "notifications" && <NotificationsList />}

      {tab === "profile" && (
        <form onSubmit={save} className="card max-w-xl space-y-4">
          {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
          <Field label={t("register_name")}>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} />
          </Field>
          <Field label={L("ईमेल (वैकल्पिक)", "Email (optional)")}>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={190} />
          </Field>
          <Field label={t("common_locality")}>
            <select className="input" value={form.areaId} onChange={(e) => setForm({ ...form, areaId: e.target.value })}>
              <option value="">{L("— चुनें —", "— select —")}</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{lang === "hi" ? a.nameHi || a.name : a.name}</option>)}
            </select>
          </Field>
          <Field label={L("पता (वैकल्पिक, केवल एडमिन को दिखेगा)", "Address (optional, visible to admins only)")}>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={300} />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button className="btn-primary" disabled={busy}>{busy ? t("common_loading") : t("common_save")}</button>
            <button type="button" className="text-sm text-rose-600 underline" onClick={requestDeletion}>{L("खाता हटाने का अनुरोध", "Request account deletion")}</button>
          </div>
        </form>
      )}
    </div>
  );
}
