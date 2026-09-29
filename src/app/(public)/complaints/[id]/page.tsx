import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComplaintDetailView } from "@/components/complaint-detail-view";
import { getLang } from "@/lib/lang";
import { ApiError } from "@/server/api";
import { getUserSession } from "@/server/auth/session";
import { getComplaintDetail } from "@/server/services/complaints";
import { bi } from "@/shared/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `${decodeURIComponent(id).toUpperCase()} | Complaint`, robots: { index: false } };
}

export default async function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session, lang] = await Promise.all([params, getUserSession(), getLang()]);
  let detail;
  try {
    detail = await getComplaintDetail(decodeURIComponent(id), session ? { kind: "owner", userId: session.sub } : { kind: "public" });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/complaints/track" className="text-civic-700 hover:underline">← {bi(lang, "शिकायत ट्रैक करें", "Track complaint")}</Link>
        {!detail.isOwner && !session && <Link href={`/login?next=/complaints/${detail.code}`} className="text-civic-700 hover:underline">{bi(lang, "यह आपकी शिकायत है? लॉगिन करें", "Is this your complaint? Login")}</Link>}
      </div>
      <ComplaintDetailView detail={detail} />
    </div>
  );
}
