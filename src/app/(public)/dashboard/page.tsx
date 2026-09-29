import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { collections } from "@/db";
import { publicUser } from "@/server/auth/account";
import { getUserSession } from "@/server/auth/session";
import { listUserComplaints } from "@/server/services/complaints";
import { listPublishedNotices } from "@/server/services/content";
import { listNotifications, unreadCount } from "@/server/services/notifications";
import { PageHeader, PriorityBadge, StatusBadge } from "@/components/ui";
import { getLang } from "@/lib/lang";
import { bi, formatDate, t } from "@/shared/i18n";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [session, lang] = await Promise.all([getUserSession(), getLang()]);
  if (!session) redirect("/login?next=/dashboard");
  const c = await collections();
  const user = await c.users.findOne({ id: session.sub });
  if (!user || user.isActive === false) redirect("/login?next=/dashboard");
  const L = (hi: string, en: string) => bi(lang, hi, en);

  // Fetch complaints belonging ONLY to this authenticated user (IDOR prevention)
  const [mine, notes, notices, unread, userComplaintsList] = await Promise.all([
    listUserComplaints(user.id, { page: 1, pageSize: 5, q: undefined, status: undefined, categoryId: undefined, areaId: undefined, priority: undefined, assignedAdminId: undefined, from: undefined, to: undefined, mine: true }),
    listNotifications({ userId: user.id }, 1, 5),
    listPublishedNotices({ page: 1, pageSize: 3 }),
    unreadCount({ userId: user.id }),
    c.complaints.find({ userId: user.id }, { projection: { status: 1 } }).toArray(),
  ]);

  const profile = publicUser(user);

  // Calculate status counts for user metrics
  const totalCount = userComplaintsList.length;
  const pendingCount = userComplaintsList.filter((c) => c.status === "SUBMITTED" || c.status === "VERIFIED" || c.status === "NEEDS_INFORMATION").length;
  const inProgressCount = userComplaintsList.filter((c) => c.status === "ASSIGNED" || c.status === "FORWARDED" || c.status === "IN_PROGRESS" || c.status === "ACTION_TAKEN").length;
  const resolvedCount = userComplaintsList.filter((c) => c.status === "RESOLVED").length;

  const actions = [
    { href: "/complaints", icon: "📝", label: t(lang, "nav_submit") },
    { href: "/my-complaints", icon: "📋", label: L("मेरी शिकायतें", "My Complaints") },
    { href: "/complaints/track", icon: "🔎", label: t(lang, "nav_track") },
    { href: "/notices", icon: "📢", label: t(lang, "nav_notices") },
    { href: "/profile", icon: "👤", label: t(lang, "nav_profile") },
    { href: "/profile?tab=notifications", icon: "🔔", label: t(lang, "nav_notifications") },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-civic-800 via-civic-700 to-amber-800 p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src="/jansahayak-logo.png" alt="जन समस्या निवारण मंच" className="h-16 w-16 object-contain rounded-full border-2 border-amber-300 bg-white p-0.5 shadow" />
            <div>
              <span className="inline-block rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-bold text-amber-200 uppercase tracking-wider mb-1 border border-amber-300/30">
                {t(lang, "nav_dashboard")}
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {L(`नमस्ते${profile.name ? `, ${profile.name}` : ""}!`, `Welcome${profile.name ? `, ${profile.name}` : ""}!`)}
              </h1>
              <p className="text-sm text-amber-100/90 mt-1">
                {L("जन समस्या निवारण मंच — वार्ड 12, 13 एवं 14 नागरिक पोर्टल", "Jan Samasya Nivaran Manch — Ward 12, 13 & 14 Civic Portal")}
              </p>
            </div>
          </div>
          <Link href="/complaints" className="btn-primary bg-amber-500 hover:bg-amber-600 text-slate-900 border-none font-bold px-5 py-3 shadow-md whitespace-nowrap self-start md:self-auto">
            📝 {L("नई शिकायत दर्ज करें", "Submit New Complaint")}
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card jaipur-card-accent border-l-4 border-l-civic-800 p-4 shadow-sm hover:shadow-md transition">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{L("कुल शिकायतें", "Total Complaints")}</p>
          <p className="mt-2 text-3xl font-extrabold text-civic-800">{totalCount}</p>
        </div>
        <div className="card border-l-4 border-l-sky-500 p-4 shadow-sm hover:shadow-md transition">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{L("लंबित", "Pending")}</p>
          <p className="mt-2 text-3xl font-extrabold text-sky-700">{pendingCount}</p>
        </div>
        <div className="card border-l-4 border-l-amber-500 p-4 shadow-sm hover:shadow-md transition">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{L("प्रगति पर", "In Progress")}</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-700">{inProgressCount}</p>
        </div>
        <div className="card border-l-4 border-l-leaf-600 p-4 shadow-sm hover:shadow-md transition">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{L("निस्तारित / हल", "Resolved")}</p>
          <p className="mt-2 text-3xl font-extrabold text-leaf-700">{resolvedCount}</p>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className="card group flex flex-col items-center py-4 text-center transition hover:-translate-y-0.5 hover:border-civic-600 shadow-xs">
            <span className="relative text-3xl" aria-hidden>
              {a.icon}
              {a.href.includes("notifications") && unread > 0 && (
                <span className="absolute -right-2 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white">{unread}</span>
              )}
            </span>
            <span className="mt-2 text-xs font-bold text-slate-800 group-hover:text-civic-700">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="recent-complaints">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-complaints" className="text-lg font-bold text-slate-900 flex items-center gap-2">
              📋 <span>{L("मेरी हाल की शिकायतें", "My recent complaints")}</span>
            </h2>
            <Link href="/my-complaints" className="text-sm font-semibold text-civic-700 hover:underline">{L("सभी देखें", "View all")} →</Link>
          </div>
          {mine.items.length === 0 ? (
            <div className="card text-center p-8 border-dashed border-2 border-amber-200">
              <p className="text-3xl mb-2">📥</p>
              <p className="text-sm font-semibold text-slate-700">{L("अभी कोई शिकायत उपलब्ध नहीं है।", "No complaints available yet.")}</p>
              <p className="text-xs text-slate-500 mt-1">{L("अपने क्षेत्र की समस्या समाधान हेतु शिकायत दर्ज करें।", "Report community issues in your locality for prompt resolution.")}</p>
              <Link href="/complaints" className="btn-primary btn-sm mt-4 px-5">📝 {t(lang, "nav_submit")}</Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {mine.items.map((c) => (
                <li key={c.id}>
                  <Link href={`/complaints/${c.code}`} className="card block hover:border-civic-600 transition shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 pb-2 mb-2">
                      <span className="font-mono text-xs font-extrabold text-civic-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{c.code}</span>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={c.status} lang={lang} />
                        <PriorityBadge priority={c.priority} lang={lang} />
                      </div>
                    </div>
                    <p className="font-bold text-slate-900 text-base leading-snug">{c.title}</p>
                    <p className="text-xs text-slate-500 mt-2 flex items-center justify-between">
                      <span>{formatDate(c.createdAt, lang)}</span>
                      <span>{t(lang, "complaint_last_update")}: {formatDate(c.lastUpdateAt, lang, true)}</span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section aria-labelledby="recent-notifications">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="recent-notifications" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                🔔 <span>{t(lang, "nav_notifications")}</span> {unread > 0 && <span className="chip bg-rose-100 text-rose-800 ring-rose-300 font-extrabold">{unread} {L("नई", "new")}</span>}
              </h2>
              <Link href="/profile?tab=notifications" className="text-sm font-semibold text-civic-700 hover:underline">{L("सभी देखें", "View all")} →</Link>
            </div>
            {notes.rows.length === 0 ? (
              <p className="card text-sm text-slate-500 p-4">{L("कोई नई सूचना नहीं।", "No notifications.")}</p>
            ) : (
              <ul className="divide-y divide-amber-100 rounded-2xl border border-amber-200 bg-white shadow-xs">
                {notes.rows.slice(0, 4).map((n) => (
                  <li key={n.id} className="flex gap-3 px-4 py-3 items-start">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.isRead ? "bg-transparent" : "bg-civic-600 animate-pulse"}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${n.isRead ? "font-medium text-slate-700" : "font-bold text-slate-900"}`}>{n.title}</p>
                      <p className="truncate text-xs text-slate-600 mt-0.5">{n.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="imp-notices">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="imp-notices" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                📢 <span>{L("महत्वपूर्ण सूचनाएँ", "Important notices")}</span>
              </h2>
              <Link href="/notices" className="text-sm font-semibold text-civic-700 hover:underline">{L("सभी देखें", "View all")} →</Link>
            </div>
            {notices.rows.length === 0 ? (
              <p className="card text-sm text-slate-500 p-4">{L("अभी कोई सूचना नहीं है।", "No notices yet.")}</p>
            ) : (
              <ul className="space-y-2">
                {notices.rows.map((n) => (
                  <li key={n.id}>
                    <Link href={`/notices/${n.id}`} className="card block py-3 hover:border-civic-600 transition shadow-xs">
                      <p className="font-bold text-slate-900 text-sm">{lang === "hi" ? n.titleHi || n.title : n.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{formatDate(n.publishDate, lang)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
