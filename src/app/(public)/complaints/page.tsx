import type { Metadata } from "next";
import { ComplaintForm } from "@/components/complaint-form";
import { PageHeader } from "@/components/ui";
import { getLang } from "@/lib/lang";
import { bi, t } from "@/shared/i18n";

export const metadata: Metadata = { title: "जनसमस्या दर्ज करें | Submit Complaint", description: "Register a local public issue with photos and track it with a Complaint ID." };
export const dynamic = "force-dynamic";

export default async function SubmitComplaintPage() {
  const lang = await getLang();
  return (
    <div>
      <PageHeader eyebrow={t(lang, "nav_complaints")} title={t(lang, "nav_submit")} subtitle={bi(lang, "स्थानीय समस्या दर्ज करें — आपको एक शिकायत आईडी मिलेगी जिससे आप हर चरण ट्रैक कर सकेंगे।", "Register a local issue — you will get a Complaint ID to track every step.")} />
      <ComplaintForm />
    </div>
  );
}
