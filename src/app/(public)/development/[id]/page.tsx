import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoTag, ProgressBar } from "@/components/ui";
import { getLang } from "@/lib/lang";
import { getProjectWithUpdates } from "@/server/services/content";
import { PROJECT_STATUS_LABELS } from "@/shared/constants";
import { bi, formatDate, pick } from "@/shared/i18n";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = UUID.test(id) ? await getProjectWithUpdates(id) : null;
  return { title: p ? p.name : "Development work" };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, lang] = await Promise.all([params, getLang()]);
  const p = UUID.test(id) ? await getProjectWithUpdates(id) : null;
  if (!p) notFound();
  const L = (hi: string, en: string) => bi(lang, hi, en);
  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <Link href="/development" className="text-sm text-civic-700 hover:underline">← {L("सभी विकास कार्य", "All development works")}</Link>
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="chip bg-leaf-50 text-leaf-700 ring-leaf-100">{pick(lang, PROJECT_STATUS_LABELS[p.status])}</span>
          {p.isDemo && <DemoTag lang={lang} />}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">{lang === "hi" ? p.nameHi || p.name : p.name}</h1>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-xs uppercase text-slate-500">{L("स्थान", "Location")}</dt><dd className="font-medium">{p.location || (p.area ? p.area.name : "—")}</dd></div>
          <div><dt className="text-xs uppercase text-slate-500">{L("विभाग / एजेंसी", "Department / agency")}</dt><dd className="font-medium">{p.department || "—"}</dd></div>
          <div><dt className="text-xs uppercase text-slate-500">{L("प्रारंभ", "Start")}</dt><dd className="font-medium">{formatDate(p.startDate, lang)}</dd></div>
          <div><dt className="text-xs uppercase text-slate-500">{L("अपेक्षित पूर्णता", "Expected completion")}</dt><dd className="font-medium">{formatDate(p.expectedCompletion, lang)}</dd></div>
          <div><dt className="text-xs uppercase text-slate-500">{L("प्रगति", "Progress")}</dt><dd className="font-medium">{p.progress}%</dd></div>
        </dl>
        <div className="mt-3"><ProgressBar value={p.progress} /></div>
        <p className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{p.description}</p>
        {p.sourceNote && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">ℹ️ {p.sourceNote}</p>}
        {p.photos.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {p.photos.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" loading="lazy" className="aspect-video w-full rounded-lg object-cover" />
            ))}
          </div>
        )}
        {p.documents.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm">
            {p.documents.map((d) => (
              <li key={d.url}><a className="text-civic-700 hover:underline" href={d.url} target="_blank" rel="noreferrer">📄 {d.name}</a></li>
            ))}
          </ul>
        )}
      </div>
      <div className="card">
        <h2 className="font-bold text-slate-900">{L("प्रगति अपडेट", "Progress updates")}</h2>
        <ol className="mt-3 space-y-3 border-l-2 border-slate-200 pl-4">
          {p.updates.map((u) => (
            <li key={u.id} className="text-sm">
              <p className="text-xs text-slate-500">{formatDate(u.createdAt, lang, true)} {u.progress !== null ? `• ${u.progress}%` : ""}</p>
              <p className="text-slate-700">{u.message}</p>
            </li>
          ))}
          {p.updates.length === 0 && <li className="text-sm text-slate-500">—</li>}
        </ol>
      </div>
    </article>
  );
}
