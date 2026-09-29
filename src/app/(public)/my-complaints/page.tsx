import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { collections } from "@/db";
import { getUserSession } from "@/server/auth/session";
import { listUserComplaints } from "@/server/services/complaints";
import { EmptyState, PageHeader, Pagination, PriorityBadge, StatusBadge } from "@/components/ui";
import { getLang } from "@/lib/lang";
import { bi, formatDate, t } from "@/shared/i18n";

export const metadata: Metadata = { title: "My Complaints / मेरी शिकायतें", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MyComplaintsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const [session, lang, sp] = await Promise.all([getUserSession(), getLang(), searchParams]);
  if (!session) redirect("/login?next=/my-complaints");
  const c = await collections();
  const user = await c.users.findOne({ id: session.sub });
  if (!user) redirect("/login?next=/my-complaints");

  const page = Math.max(1, Number(sp.page) || 1);
  const { items: rows, total } = await listUserComplaints(user.id, {
    page, pageSize: 10, q: undefined, status: undefined, categoryId: undefined, areaId: undefined,
    priority: undefined, assignedAdminId: undefined, from: undefined, to: undefined, mine: true,
  });
  const L = (hi: string, en: string) => bi(lang, hi, en);

  return (
    <div>
      <PageHeader
        eyebrow={t(lang, "nav_complaints")}
        title={L("मेरी शिकायतें", "My Complaints")}
        subtitle={L("केवल आपकी अपनी शिकायतें यहाँ दिखती हैं।", "Only your own complaints are shown here.")}
        actions={<Link href="/complaints" className="btn-primary btn-sm">📝 {t(lang, "nav_submit")}</Link>}
      />
      {rows.length === 0 ? (
        <EmptyState icon="📝" title={L("आपने अभी तक कोई शिकायत दर्ज नहीं की है।", "You have not registered any complaint yet.")} />
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/complaints/${c.code}`} className="card block hover:border-civic-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-civic-700">{c.code}</span>
                  <StatusBadge status={c.status} lang={lang} />
                  <PriorityBadge priority={c.priority} lang={lang} />
                </div>
                <p className="mt-1.5 font-semibold text-slate-900">{c.title}</p>
                <p className="text-xs text-slate-500">
                  {c.category ? (lang === "hi" ? c.category.nameHi : c.category.nameEn) : ""}{" "}
                  {c.area ? `• ${lang === "hi" ? c.area.nameHi || c.area.name : c.area.name}` : ""} • {formatDate(c.createdAt, lang)} • {t(lang, "complaint_last_update")}: {formatDate(c.lastUpdateAt, lang, true)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / 10))} hrefFor={(p) => `/my-complaints?page=${p}`} lang={lang} />
    </div>
  );
}
