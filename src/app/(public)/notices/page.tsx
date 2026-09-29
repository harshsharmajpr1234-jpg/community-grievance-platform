import type { Metadata } from "next";
import Link from "next/link";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { DemoTag, EmptyState, PageHeader, Pagination, PriorityBadge } from "@/components/ui";
import { getLang } from "@/lib/lang";
import { listPublishedNotices } from "@/server/services/content";
import { NOTICE_CATEGORIES, NOTICE_CATEGORY_LABELS, type NoticeCategory } from "@/shared/constants";
import { bi, formatDate, pick, t } from "@/shared/i18n";

export const metadata: Metadata = { title: "महत्वपूर्ण सूचनाएँ | Notices" };
export const dynamic = "force-dynamic";

export default async function NoticesPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; page?: string }> }) {
  const [lang, sp] = await Promise.all([getLang(), searchParams]);
  const page = Math.max(1, Number(sp.page) || 1);
  const category = NOTICE_CATEGORIES.includes(sp.category as NoticeCategory) ? sp.category : undefined;
  const { rows, total } = await listPublishedNotices({ page, pageSize: 10, q: sp.q?.slice(0, 120), category });
  const totalPages = Math.max(1, Math.ceil(total / 10));
  const hrefFor = (p: number) => `?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(category ? { category } : {}), page: String(p) })}`;
  return (
    <div>
      <PageHeader eyebrow={t(lang, "nav_notices")} title={bi(lang, "महत्वपूर्ण सूचनाएँ", "Important Notices")} subtitle={bi(lang, "अधिकृत एडमिन द्वारा प्रकाशित सार्वजनिक सूचनाएँ।", "Public notices published by authorised admins.")} />
      <SearchFilterBar placeholder={bi(lang, "सूचना खोजें…", "Search notices…")} selects={[{ name: "category", label: t(lang, "common_category"), options: NOTICE_CATEGORIES.map((c) => ({ value: c, label: pick(lang, NOTICE_CATEGORY_LABELS[c]) })) }]} />
      {rows.length === 0 ? (
        <EmptyState icon="📢" title={t(lang, "common_no_results")} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {rows.map((n) => (
            <li key={n.id}>
              <Link href={`/notices/${n.id}`} className="card block h-full hover:border-civic-200">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="chip bg-civic-50 text-civic-700 ring-civic-100">{pick(lang, NOTICE_CATEGORY_LABELS[n.category])}</span>
                  <PriorityBadge priority={n.priority} lang={lang} />
                  {n.isPinned && <span className="chip bg-amber-50 text-amber-700 ring-amber-100">📌 {bi(lang, "पिन", "Pinned")}</span>}
                  {n.isDemo && <DemoTag lang={lang} />}
                </div>
                <h2 className="mt-2 text-lg font-bold text-slate-900">{lang === "hi" ? n.titleHi || n.title : n.title}</h2>
                <p className="mt-1 line-clamp-3 text-sm text-slate-600">{lang === "hi" ? n.descriptionHi || n.description : n.description}</p>
                <p className="mt-3 text-xs text-slate-500">
                  {formatDate(n.publishDate, lang)}
                  {n.expiryDate ? ` • ${bi(lang, "मान्य", "Valid till")} ${formatDate(n.expiryDate, lang)}` : ""}
                  {n.area ? ` • ${lang === "hi" ? n.area.nameHi || n.area.name : n.area.name}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} lang={lang} />
    </div>
  );
}
