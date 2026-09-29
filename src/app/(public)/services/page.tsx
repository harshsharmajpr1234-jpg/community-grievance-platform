import type { Metadata } from "next";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { EmptyState, PageHeader } from "@/components/ui";
import { getLang } from "@/lib/lang";
import { listServices } from "@/server/services/content";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS, type ServiceCategory } from "@/shared/constants";
import { bi, pick, t } from "@/shared/i18n";

export const metadata: Metadata = { title: "सरकारी सेवाएँ | Government & Public Services" };
export const dynamic = "force-dynamic";

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const [lang, sp] = await Promise.all([getLang(), searchParams]);
  const category = SERVICE_CATEGORIES.includes(sp.category as ServiceCategory) ? sp.category : undefined;
  const { rows } = await listServices({ page: 1, pageSize: 50, q: sp.q?.slice(0, 120), category });
  const L = (hi: string, en: string) => bi(lang, hi, en);
  const grouped = SERVICE_CATEGORIES.map((c) => ({ c, items: rows.filter((r) => r.category === c) })).filter((g) => g.items.length > 0);
  return (
    <div>
      <PageHeader eyebrow={t(lang, "nav_services")} title={L("सरकारी व सार्वजनिक सेवाओं की जानकारी", "Government & Public Services Directory")} subtitle={L("हेल्पलाइन, विभाग, आधिकारिक पोर्टल और आपातकालीन संपर्क।", "Helplines, departments, official portals and emergency contacts.")} />
      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        <span className="chip bg-leaf-50 text-leaf-700 ring-leaf-100">🏛️ {t(lang, "common_official")}</span>
        <span className="chip bg-slate-100 text-slate-700 ring-slate-200">🤝 {t(lang, "common_community_info")}</span>
      </div>
      <SearchFilterBar placeholder={L("सेवा या विभाग खोजें…", "Search a service or department…")} selects={[{ name: "category", label: t(lang, "common_category"), options: SERVICE_CATEGORIES.map((c) => ({ value: c, label: pick(lang, SERVICE_CATEGORY_LABELS[c]) })) }]} />
      {grouped.length === 0 && <EmptyState icon="🏛️" title={t(lang, "common_no_results")} />}
      <div className="space-y-8">
        {grouped.map((g) => (
          <section key={g.c} aria-labelledby={`cat-${g.c}`}>
            <h2 id={`cat-${g.c}`} className="mb-3 text-lg font-bold text-slate-900">{pick(lang, SERVICE_CATEGORY_LABELS[g.c])}</h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {g.items.map((s) => (
                <li key={s.id} className={`card ${s.isEmergency ? "border-rose-200" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900">{lang === "hi" ? s.nameHi || s.name : s.name}</h3>
                      <p className="text-sm text-slate-500">{s.department}</p>
                    </div>
                    <span className={`chip shrink-0 ${s.isOfficial ? "bg-leaf-50 text-leaf-700 ring-leaf-100" : "bg-slate-100 text-slate-700 ring-slate-200"}`}>{s.isOfficial ? L("आधिकारिक", "Official") : L("सामुदायिक", "Community")}</span>
                  </div>
                  {s.description && <p className="mt-2 text-sm text-slate-600">{s.description}</p>}
                  <dl className="mt-3 space-y-1 text-sm">
                    {s.phone && <div className="flex gap-2"><dt aria-hidden>📞</dt><dd><a className="font-semibold text-civic-700 hover:underline" href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a></dd></div>}
                    {s.website && <div className="flex gap-2"><dt aria-hidden>🌐</dt><dd><a className="break-all text-civic-700 hover:underline" href={s.website} target="_blank" rel="noreferrer noopener">{s.website.replace(/^https?:\/\//, "")}</a> <span className="text-xs text-slate-400">({L("बाहरी लिंक", "external")})</span></dd></div>}
                    {s.address && <div className="flex gap-2"><dt aria-hidden>📍</dt><dd className="text-slate-700">{s.address}</dd></div>}
                    {s.workingHours && <div className="flex gap-2"><dt aria-hidden>🕒</dt><dd className="text-slate-700">{s.workingHours}</dd></div>}
                  </dl>
                  {s.notes && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{s.notes}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
