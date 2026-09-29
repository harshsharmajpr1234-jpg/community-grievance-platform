import Image from "next/image";
import Link from "next/link";
import { DemoTag, StatusBadge } from "@/components/ui";
import { getLang } from "@/lib/lang";
import { getUserSession } from "@/server/auth/session";
import { listPublicComplaints, publicStats } from "@/server/services/complaints";
import { listCommunityPosts, listPublishedNotices, listPublishedProjects } from "@/server/services/content";
import { BRAND, NOTICE_CATEGORY_LABELS, PROJECT_STATUS_LABELS } from "@/shared/constants";
import { bi, formatDate, pick, t } from "@/shared/i18n";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const lang = await getLang();
  const L = (hi: string, en: string) => bi(lang, hi, en);
  const [stats, notices, recent, projects, posts, session] = await Promise.all([
    publicStats().catch((err) => {
      console.error("[home] publicStats error:", err);
      return { total: 0, resolved: 0, pending: 0, activeNotices: 0 };
    }),
    listPublishedNotices({ page: 1, pageSize: 3 }).catch((err) => {
      console.error("[home] listPublishedNotices error:", err);
      return { rows: [], total: 0 };
    }),
    listPublicComplaints({ page: 1, pageSize: 5 }).catch((err) => {
      console.error("[home] listPublicComplaints error:", err);
      return { items: [], total: 0 };
    }),
    listPublishedProjects({ page: 1, pageSize: 2 }).catch((err) => {
      console.error("[home] listPublishedProjects error:", err);
      return { rows: [], total: 0 };
    }),
    listCommunityPosts({ page: 1, pageSize: 2 }).catch((err) => {
      console.error("[home] listCommunityPosts error:", err);
      return { rows: [], total: 0 };
    }),
    getUserSession().catch(() => null),
  ]);

  const features = [
    { href: "/complaints", icon: "📝", hi: "जनसमस्या दर्ज करें", en: "Register a public issue", dhi: "सड़क, पानी, बिजली, सफाई जैसी स्थानीय समस्याएँ फोटो व पता के साथ दर्ज करें।", den: "Report local problems like roads, water, electricity and sanitation with photos and address." },
    { href: "/complaints/track", icon: "🔎", hi: "शिकायत ट्रैक करें", en: "Track a complaint", dhi: "शिकायत आईडी और अपने मोबाइल नंबर से समाधान की स्थिति देखें।", den: "See the status and updates using your Complaint ID and mobile number." },
    { href: "/notices", icon: "📢", hi: "महत्वपूर्ण सूचनाएँ", en: "Important notices", dhi: "वार्ड 12, 13 एवं 14 से जुड़ी स्थानीय सूचनाएँ और घोषणाएँ एक जगह।", den: "Local announcements and important notices for Ward 12, 13 & 14." },
    { href: "/help", icon: "❓", hi: "सहायता व मार्गदर्शिका", en: "Help & FAQ", dhi: "शिकायत दर्ज करने और ट्रैक करने से संबंधित सहायता।", den: "Guidelines on registering and tracking community complaints." },
    { href: "/contact", icon: "📞", hi: "संपर्क करें", en: "Contact Us", dhi: "मंच टीम और डेवलपर से सीधे संपर्क करें।", den: "Reach out directly to the Manch team and platform developer." },
    { href: "/about", icon: "🏛️", hi: "हमारे बारे में", en: "About Platform", dhi: "जन समस्या निवारण मंच का उद्देश्य और कार्यप्रणाली।", den: "Learn about the mission and operating model of the Manch." },
  ];

  const statCards = [
    { label: t(lang, "stat_total"), value: stats.total, color: "text-civic-700" },
    { label: t(lang, "stat_resolved"), value: stats.resolved, color: "text-leaf-700" },
    { label: t(lang, "stat_pending"), value: stats.pending, color: "text-amber-700" },
    { label: t(lang, "stat_notices"), value: stats.activeNotices, color: "text-indigo-700" },
  ];

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-civic-800 via-civic-700 to-leaf-700 text-white shadow-lg">
        <div className="grid items-center gap-8 px-6 py-10 sm:px-10 lg:grid-cols-2 lg:py-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/30">
              🏘️ {L("स्वतंत्र नागरिक मंच • वार्ड 12, 13 एवं 14", "Independent Civic Platform • Ward 12, 13 & 14")}
            </p>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">{BRAND.name}</h1>
            <p className="mt-2 text-lg font-semibold text-blue-100">{BRAND.nameHi}</p>
            <p className="mt-4 text-xl font-bold text-white sm:text-2xl">{BRAND.tagline}</p>
            <p className="mt-1 text-sm text-blue-100">{BRAND.taglineEn}</p>
            <p className="mt-3 text-base italic text-leaf-100">{BRAND.secondaryTagline}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/complaints" className="btn bg-white text-civic-800 shadow hover:bg-blue-50">
                📝 {t(lang, "home_submit")}
              </Link>
              <Link href="/complaints/track" className="btn border border-white/40 bg-white/10 text-white hover:bg-white/20">
                🔎 {t(lang, "home_track")}
              </Link>
            </div>
            {session ? (
              <Link href="/dashboard" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-white underline underline-offset-4 hover:text-blue-100">
                📊 {t(lang, "nav_dashboard")} →
              </Link>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold">
                <Link href="/register" className="text-white underline underline-offset-4 hover:text-blue-100">
                  {t(lang, "nav_register")}
                </Link>
                <Link href="/login" className="text-blue-100 underline underline-offset-4 hover:text-white">
                  {t(lang, "nav_login")}
                </Link>
              </div>
            )}
          </div>
          <div className="relative hidden aspect-[16/10] overflow-hidden rounded-2xl ring-1 ring-white/30 lg:block">
            <Image src="/images/hero.jpg" alt={L("दादी का फाटक क्षेत्र का चित्रण", "Illustration of the Dadi Ka Phatak neighbourhood")} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          {L("आँकड़े", "Statistics")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {statCards.map((s) => (
            <div key={s.label} className="card text-center">
              <p className={`text-3xl font-extrabold ${s.color}`}>{s.value.toLocaleString("en-IN")}</p>
              <p className="mt-1 text-sm font-medium text-slate-600">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-slate-500">{L("आँकड़े डेटाबेस से वास्तविक समय में लिए गए हैं।", "Figures are computed live from the platform database.")}</p>
      </section>

      {/* Features */}
      <section aria-labelledby="features-heading">
        <h2 id="features-heading" className="text-2xl font-bold text-slate-900">
          {L("यह मंच क्या करता है", "What this platform offers")}
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Link key={f.href} href={f.href} className="card group transition hover:-translate-y-0.5 hover:border-civic-200 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-civic-50 text-2xl" aria-hidden>
                {f.icon}
              </div>
              <h3 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-civic-700">{L(f.hi, f.en)}</h3>
              <p className="mt-1 text-sm text-slate-600">{L(f.dhi, f.den)}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="card bg-gradient-to-br from-white to-civic-50">
        <h2 className="text-2xl font-bold text-slate-900">{L("कैसे काम करता है", "How it works")}</h2>
        <ol className="mt-5 grid gap-5 sm:grid-cols-3">
          {[
            { hi: "रजिस्टर करके लॉगिन करें", en: "Register and login", d: L("मजबूत पासवर्ड से सुरक्षित खाता; आपका नंबर सार्वजनिक नहीं होता।", "A password-secured account; your number is never shown publicly.") },
            { hi: "समस्या दर्ज करें", en: "Submit the problem", d: L("श्रेणी, स्थान, विवरण और फोटो जोड़ें। आपको एक शिकायत आईडी मिलेगी।", "Add category, location, details and photos. You receive a Complaint ID.") },
            { hi: "स्थिति ट्रैक करें", en: "Track the status", d: L("हर स्थिति परिवर्तन दिनांक और समय के साथ दर्ज होता है।", "Every status change is recorded with date and time.") },
          ].map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-civic-600 font-bold text-white">{i + 1}</span>
              <div>
                <p className="font-semibold text-slate-900">{L(s.hi, s.en)}</p>
                <p className="text-sm text-slate-600">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Notices + Transparency */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">📢 {L("नवीनतम सूचनाएँ", "Latest notices")}</h2>
            <Link href="/notices" className="text-sm font-semibold text-civic-700 hover:underline">
              {L("सभी देखें", "View all")} →
            </Link>
          </div>
          <div className="space-y-3">
            {notices.rows.length === 0 && <p className="card text-sm text-slate-500">{L("अभी कोई सूचना नहीं है।", "No notices yet.")}</p>}
            {notices.rows.map((n) => (
              <Link key={n.id} href={`/notices/${n.id}`} className="card block hover:border-civic-200">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="chip bg-civic-50 text-civic-700 ring-civic-100">{pick(lang, NOTICE_CATEGORY_LABELS[n.category])}</span>
                  {n.isPinned && <span className="chip bg-amber-50 text-amber-700 ring-amber-100">📌</span>}
                  {n.isDemo && <DemoTag lang={lang} />}
                  <span className="text-slate-500">{formatDate(n.publishDate, lang)}</span>
                </div>
                <p className="mt-2 font-semibold text-slate-900">{lang === "hi" ? n.titleHi || n.title : n.title}</p>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">🧾 {L("पारदर्शी शिकायत इतिहास", "Transparent complaint history")}</h2>
            <Link href="/complaints/track" className="text-sm font-semibold text-civic-700 hover:underline">
              {L("ट्रैक करें", "Track")} →
            </Link>
          </div>
          <div className="card divide-y divide-slate-100 p-0">
            {recent.items.length === 0 && <p className="p-5 text-sm text-slate-500">{L("अभी कोई शिकायत उपलब्ध नहीं है।", "No complaints available yet.")}</p>}
            {recent.items.map((c) => (
              <Link key={c.id} href={`/complaints/${c.code}`} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold text-civic-700">{c.code}</p>
                  <p className="truncate text-sm font-medium text-slate-900">{c.title}</p>
                  <p className="text-xs text-slate-500">
                    {c.category ? (lang === "hi" ? c.category.nameHi : c.category.nameEn) : ""} {c.area ? `• ${lang === "hi" ? c.area.nameHi || c.area.name : c.area.name}` : ""}
                  </p>
                </div>
                <StatusBadge status={c.status} lang={lang} />
              </Link>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">{L("केवल शीर्षक, श्रेणी, क्षेत्र और स्थिति सार्वजनिक हैं — व्यक्तिगत जानकारी कभी नहीं।", "Only title, category, locality and status are public — never personal details.")}</p>
        </div>
      </section>

      {/* Development + Community */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">🏗️ {L("विकास कार्य", "Development works")}</h2>
            <Link href="/development" className="text-sm font-semibold text-civic-700 hover:underline">
              {L("सभी देखें", "View all")} →
            </Link>
          </div>
          <div className="space-y-3">
            {projects.rows.length === 0 && <p className="card text-sm text-slate-500">{L("अभी कोई प्रविष्टि नहीं।", "No entries yet.")}</p>}
            {projects.rows.map((p) => (
              <Link key={p.id} href={`/development/${p.id}`} className="card block hover:border-civic-200">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{lang === "hi" ? p.nameHi || p.name : p.name}</p>
                  <span className="chip bg-leaf-50 text-leaf-700 ring-leaf-100">{pick(lang, PROJECT_STATUS_LABELS[p.status])}</span>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-leaf-500" style={{ width: `${p.progress}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{p.progress}% {p.isDemo ? "• DEMO" : ""}</p>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">🤝 {L("समुदाय", "Community")}</h2>
            <Link href="/community" className="text-sm font-semibold text-civic-700 hover:underline">
              {L("सभी देखें", "View all")} →
            </Link>
          </div>
          <div className="space-y-3">
            {posts.rows.length === 0 && <p className="card text-sm text-slate-500">{L("अभी कोई पोस्ट नहीं।", "No posts yet.")}</p>}
            {posts.rows.map((p) => (
              <div key={p.id} className="card">
                <p className="font-semibold text-slate-900">{p.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.content}</p>
                <p className="mt-2 text-xs text-slate-500">{formatDate(p.createdAt, lang)} • {p.authorName}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
        <strong className="text-slate-800">{L("महत्वपूर्ण:", "Important:")}</strong>{" "}
        {L(
          "यह एक स्वतंत्र, गैर-राजनीतिक सामुदायिक मंच है। यहाँ दिखाई गई सूचनाएँ और विकास कार्य केवल अधिकृत एडमिन द्वारा दर्ज/सत्यापित जानकारी पर आधारित हैं। आपातकाल में कृपया 112 पर कॉल करें।",
          "This is an independent, non-partisan community platform. Notices and development works shown here are based only on information entered/verified by authorised admins. In an emergency, please call 112.",
        )}
      </section>
    </div>
  );
}
