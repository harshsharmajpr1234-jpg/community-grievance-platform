import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoTag, PriorityBadge } from "@/components/ui";
import { getLang } from "@/lib/lang";
import { getPublishedNotice } from "@/server/services/content";
import { NOTICE_CATEGORY_LABELS } from "@/shared/constants";
import { bi, formatDate, pick } from "@/shared/i18n";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const n = UUID.test(id) ? await getPublishedNotice(id) : null;
  return { title: n ? n.title : "Notice", description: n?.description.slice(0, 160) };
}

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, lang] = await Promise.all([params, getLang()]);
  const n = UUID.test(id) ? await getPublishedNotice(id) : null;
  if (!n) notFound();
  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/notices" className="text-sm text-civic-700 hover:underline">← {bi(lang, "सभी सूचनाएँ", "All notices")}</Link>
      <div className="card mt-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="chip bg-civic-50 text-civic-700 ring-civic-100">{pick(lang, NOTICE_CATEGORY_LABELS[n.category])}</span>
          <PriorityBadge priority={n.priority} lang={lang} />
          {n.isDemo && <DemoTag lang={lang} />}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">{lang === "hi" ? n.titleHi || n.title : n.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {bi(lang, "प्रकाशित", "Published")} {formatDate(n.publishDate, lang, true)}
          {n.expiryDate ? ` • ${bi(lang, "मान्य", "Valid till")} ${formatDate(n.expiryDate, lang)}` : ""}
          {n.area ? ` • ${lang === "hi" ? n.area.nameHi || n.area.name : n.area.name}` : ""}
        </p>
        {n.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={n.imageUrl} alt="" className="mt-4 max-h-96 w-full rounded-xl object-cover" />
        )}
        <div className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{lang === "hi" ? n.descriptionHi || n.description : n.description}</div>
        {lang === "hi" && n.descriptionHi && n.description !== n.descriptionHi && (
          <details className="mt-4 text-sm text-slate-600">
            <summary className="cursor-pointer font-semibold">English</summary>
            <p className="mt-2 whitespace-pre-wrap">{n.description}</p>
          </details>
        )}
        {n.attachmentUrl && (
          <a href={n.attachmentUrl} target="_blank" rel="noreferrer" className="btn-secondary mt-5">📎 {bi(lang, "संलग्नक देखें", "View attachment")}</a>
        )}
      </div>
    </article>
  );
}
