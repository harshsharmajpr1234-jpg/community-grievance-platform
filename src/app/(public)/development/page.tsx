import type { Metadata } from "next";
import Link from "next/link";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { DemoTag, EmptyState, PageHeader, Pagination, ProgressBar } from "@/components/ui";
import { getLang } from "@/lib/lang";
import { listPublishedProjects } from "@/server/services/content";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, type ProjectStatus } from "@/shared/constants";
import { bi, formatDate, pick, t } from "@/shared/i18n";

export const metadata: Metadata = { title: "विकास कार्य | Development Works" };
export const dynamic = "force-dynamic";

export default async function DevelopmentPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const [lang, sp] = await Promise.all([getLang(), searchParams]);
  const page = Math.max(1, Number(sp.page) || 1);
  const status = PROJECT_STATUSES.includes(sp.status as ProjectStatus) ? sp.status : undefined;
  const { rows, total } = await listPublishedProjects({ page, pageSize: 10, q: sp.q?.slice(0, 120), status });
  const hrefFor = (p: number) => `?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(status ? { status } : {}), page: String(p) })}`;
  return (
    <div>
      <PageHeader eyebrow={t(lang, "nav_development")} title={bi(lang, "विकास कार्यों की जानकारी", "Development Works")} subtitle={bi(lang, "केवल अधिकृत एडमिन द्वारा दर्ज/सत्यापित जानकारी प्रदर्शित की जाती है।", "Only information entered/verified by authorised admins is displayed.")} />
      <SearchFilterBar placeholder={bi(lang, "परियोजना खोजें…", "Search projects…")} selects={[{ name: "status", label: t(lang, "common_status"), options: PROJECT_STATUSES.map((s) => ({ value: s, label: pick(lang, PROJECT_STATUS_LABELS[s]) })) }]} />
      {rows.length === 0 ? (
        <EmptyState icon="🏗️" title={t(lang, "common_no_results")} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {rows.map((p) => (
            <li key={p.id}>
              <Link href={`/development/${p.id}`} className="card block h-full hover:border-civic-200">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="chip bg-leaf-50 text-leaf-700 ring-leaf-100">{pick(lang, PROJECT_STATUS_LABELS[p.status])}</span>
                  {p.isDemo && <DemoTag lang={lang} />}
                </div>
                <h2 className="mt-2 text-lg font-bold text-slate-900">{lang === "hi" ? p.nameHi || p.name : p.name}</h2>
                <p className="text-sm text-slate-500">{p.location || (p.area ? (lang === "hi" ? p.area.nameHi || p.area.name : p.area.name) : "")}{p.department ? ` • ${p.department}` : ""}</p>
                <div className="mt-3"><ProgressBar value={p.progress} /></div>
                <p className="mt-1 flex justify-between text-xs text-slate-500"><span>{p.progress}%</span><span>{p.expectedCompletion ? `${bi(lang, "अपेक्षित पूर्णता", "Expected")} ${formatDate(p.expectedCompletion, lang)}` : ""}</span></p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / 10))} hrefFor={hrefFor} lang={lang} />
    </div>
  );
}
