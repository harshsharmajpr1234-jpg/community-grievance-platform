import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { getLang } from "@/lib/lang";
import { getSettings } from "@/server/services/settings";
import { bi } from "@/shared/i18n";

export const metadata: Metadata = { title: "Contact" };
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const [lang, settings] = await Promise.all([getLang(), getSettings()]);
  const L = (hi: string, en: string) => bi(lang, hi, en);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={L("संपर्क", "Contact")} title={L("हमसे संपर्क करें", "Get in touch")} subtitle={L("शिकायतों के लिए कृपया ऑनलाइन फ़ॉर्म का उपयोग करें — इससे ट्रैकिंग संभव होती है।", "For complaints please use the online form — it enables tracking.")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <h2 className="font-bold text-slate-900">{lang === "hi" ? settings.organizationNameHi : settings.organizationName}</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>📞 {settings.contactNumber ? <a className="text-civic-700 hover:underline" href={`tel:${settings.contactNumber}`}>{settings.contactNumber}</a> : <span className="text-slate-500">{L("संपर्क नंबर एडमिन सेटिंग्स में जोड़ें", "Contact number to be configured in admin settings")}</span>}</li>
            <li>✉️ {settings.contactEmail ? <a className="text-civic-700 hover:underline" href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a> : <span className="text-slate-500">{L("ईमेल एडमिन सेटिंग्स में जोड़ें", "Email to be configured in admin settings")}</span>}</li>
            {settings.website && <li>🌐 <a className="text-civic-700 hover:underline" href={settings.website} target="_blank" rel="noreferrer">{settings.website}</a></li>}
            <li>📍 {L("दादी का फाटक, जयपुर, राजस्थान", "Dadi Ka Phatak, Jaipur, Rajasthan")}</li>
          </ul>
        </div>
        <div className="card">
          <h2 className="font-bold text-slate-900">{L("आपातकाल", "Emergency")}</h2>
          <p className="mt-2 text-sm text-slate-600">{L("यह मंच आपातकालीन सेवा नहीं है। तत्काल सहायता के लिए:", "This platform is not an emergency service. For immediate help:")}</p>
          <ul className="mt-3 space-y-1 text-sm font-semibold text-slate-800">
            <li>🚨 112 — {L("आपातकालीन सहायता", "Emergency response")}</li>
            <li>👮 100 — {L("पुलिस", "Police")}</li>
            <li>🚒 101 — {L("अग्निशमन", "Fire")}</li>
            <li>🚑 108 — {L("एम्बुलेंस", "Ambulance")}</li>
          </ul>
          <Link href="/services" className="btn-secondary btn-sm mt-4">{L("सभी सेवाएँ देखें", "See all services")}</Link>
        </div>
      </div>
      <div className="card mt-4">
        <h2 className="font-bold text-slate-900">{L("डेटा / खाता संबंधी अनुरोध", "Data / account requests")}</h2>
        <p className="mt-2 text-sm text-slate-600">
          {L("अपने खाते या डेटा को हटाने का अनुरोध आप प्रोफ़ाइल पृष्ठ से कर सकते हैं। अनुरोध गोपनीयता नीति के अनुसार संसाधित किए जाते हैं।", "You can request deletion of your account or data from the profile page. Requests are processed as per the privacy policy.")}{" "}
          <Link href="/privacy" className="text-civic-700 hover:underline">{L("गोपनीयता नीति", "Privacy policy")}</Link>
        </p>
      </div>
    </div>
  );
}
