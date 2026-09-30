import type { Metadata } from "next";
import { CommunityPostForm } from "@/components/community-post-form";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { DemoTag, EmptyState, PageHeader, Pagination } from "@/components/ui";
import { getLang } from "@/lib/lang";
import { getUserSession } from "@/server/auth/session";
import { listCommunityPosts } from "@/server/services/content";
import { COMMUNITY_POST_TYPES, COMMUNITY_TYPE_LABELS, type CommunityPostType } from "@/shared/constants";
import { bi, formatDate, pick, t } from "@/shared/i18n";

export const metadata: Metadata = { title: "समुदाय | Community" };
export const dynamic = "force-dynamic";

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; page?: string }> }) {
  const [lang, session, sp] = await Promise.all([getLang(), getUserSession(), searchParams]);
  const page = Math.max(1, Number(sp.page) || 1);
  const type = COMMUNITY_POST_TYPES.includes(sp.type as CommunityPostType) ? sp.type : undefined;
  const { rows, total } = await listCommunityPosts({ page, pageSize: 10, q: sp.q?.slice(0, 120), type });
  const hrefFor = (p: number) => `?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(type ? { type } : {}), page: String(p) })}`;
  const L = (hi: string, en: string) => bi(lang, hi, en);
  return (
    <div>
      <PageHeader eyebrow={t(lang, "nav_community")} title={L("डिजिटल सामुदायिक मंच", "Digital Community Platform")} subtitle={L("स्थानीय कार्यक्रम, स्वच्छता अभियान, जागरूकता गतिविधियाँ और सामुदायिक पहल — प्रकाशन से पहले एडमिन द्वारा अनुमोदित।", "Local events, cleanliness drives, awareness activities and community initiatives — approved by admins before publishing.")} />
      <div className="mb-5"><CommunityPostForm loggedIn={Boolean(session)} /></div>
      <SearchFilterBar placeholder={L("पोस्ट खोजें…", "Search posts…")} selects={[{ name: "type", label: L("प्रकार", "Type"), options: COMMUNITY_POST_TYPES.map((ty) => ({ value: ty, label: pick(lang, COMMUNITY_TYPE_LABELS[ty]) })) }]} />
      {rows.length === 0 ? (
        <EmptyState icon="🤝" title={t(lang, "common_no_results")} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {rows.map((p) => (
            <li key={p.id} className="card">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="chip bg-civic-50 text-civic-700 ring-civic-100">{pick(lang, COMMUNITY_TYPE_LABELS[p.type])}</span>
                {p.isDemo && <DemoTag lang={lang} />}
                {p.eventDate && <span className="chip bg-leaf-50 text-leaf-700 ring-leaf-100">📅 {formatDate(p.eventDate, lang, true)}</span>}
              </div>
              <h2 className="mt-2 text-lg font-bold text-slate-900">{p.title}</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{p.content}</p>
              <p className="mt-3 text-xs text-slate-500">{p.location ? `📍 ${p.location} • ` : ""}{p.authorName} • {formatDate(p.createdAt, lang)}</p>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(Number(total) / 10))} hrefFor={hrefFor} lang={lang} />
    </div>
  );
}
