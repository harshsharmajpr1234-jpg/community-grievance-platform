import type { Metadata } from "next";
import Link from "next/link";
import { TrackForm } from "@/components/track-form";
import { PageHeader } from "@/components/ui";
import { getLang } from "@/lib/lang";
import { getUserSession } from "@/server/auth/session";
import { bi, t } from "@/shared/i18n";

export const metadata: Metadata = { title: "शिकायत की स्थिति देखें | Track Complaint" };
export const dynamic = "force-dynamic";

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const [lang, session, sp] = await Promise.all([getLang(), getUserSession(), searchParams]);
  const L = (hi: string, en: string) => bi(lang, hi, en);
  return (
    <div>
      <PageHeader
        eyebrow={t(lang, "nav_complaints")}
        title={t(lang, "nav_track")}
        subtitle={L("शिकायत आईडी और पंजीकृत मोबाइल नंबर दर्ज करें। लॉगिन करने पर 'मेरी शिकायतें' में सभी शिकायतें दिखती हैं।", "Enter the Complaint ID and the registered mobile number. When logged in, all your complaints appear under 'My Complaints'.")}
        actions={<Link href={session ? "/my-complaints" : "/login?next=/my-complaints"} className="btn-secondary btn-sm">📋 {t(lang, "nav_my_complaints")}</Link>}
      />
      <TrackForm initialCode={sp.code} />
    </div>
  );
}
