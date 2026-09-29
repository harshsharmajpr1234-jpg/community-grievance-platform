import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { getLang } from "@/lib/lang";
import { BRAND } from "@/shared/constants";
import { bi } from "@/shared/i18n";

export const metadata: Metadata = { title: "About Jan Samasya Nivaran Manch", description: "About जन समस्या निवारण मंच (Ward 12, 13 & 14) — a non-partisan community platform." };

export default async function AboutPage() {
  const lang = await getLang();
  const L = (hi: string, en: string) => bi(lang, hi, en);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={L("हमारे बारे में", "About")} title={lang === "hi" ? BRAND.nameHi : BRAND.name} subtitle={`${lang === "hi" ? BRAND.subtitleHi : BRAND.subtitle} — ${BRAND.tagline}`} />
      <div className="card prose-civic">
        <p>
          {L(
            "जन समस्या निवारण मंच (वार्ड 12, 13 एवं 14) एक स्वतंत्र, गैर-राजनीतिक सामुदायिक मंच है, जिसका उद्देश्य वार्ड 12, 13 और 14 (दादी का फाटक व आसपास के क्षेत्रों) के निवासियों को अपनी स्थानीय समस्याएँ एक जगह दर्ज करने, उनकी स्थिति पारदर्शी रूप से देखने और सत्यापित सार्वजनिक जानकारी पाने की सुविधा देना है।",
            "Jan Samasya Nivaran Manch (Ward 12, 13 & 14) is an independent, non-partisan community platform. It enables residents of Ward 12, 13 & 14 to register local problems in one place, follow their status transparently and access verified public information.",
          )}
        </p>
        <h2>{L("हम क्या करते हैं", "What we do")}</h2>
        <ul>
          <li>{L("निवासियों की जनसमस्याओं को दर्ज कर संबंधित विभागों तक पहुँचाना और हर चरण की जानकारी देना।", "Record residents' public issues, route them to the concerned departments and record every step.")}</li>
          <li>{L("पानी, बिजली, सड़क, सफाई और आपातकालीन सूचनाएँ प्रकाशित करना।", "Publish water, electricity, road, sanitation and emergency notices.")}</li>
          <li>{L("क्षेत्र में चल रहे विकास कार्यों की अधिकृत जानकारी साझा करना।", "Share authorised information about development works in the area.")}</li>
          <li>{L("सरकारी और सार्वजनिक सेवाओं की निर्देशिका उपलब्ध कराना।", "Provide a directory of government and public services.")}</li>
          <li>{L("स्वच्छता अभियान, जागरूकता और सामुदायिक पहलों को जोड़ना।", "Connect cleanliness drives, awareness activities and community initiatives.")}</li>
        </ul>
        <h2>{L("हम क्या नहीं हैं", "What we are not")}</h2>
        <p>
          {L(
            "यह मंच किसी राजनीतिक दल, उम्मीदवार या चुनाव अभियान से संबद्ध नहीं है। यहाँ कोई राजनीतिक प्रचार, चंदा या विज्ञापन नहीं है। यह किसी सरकारी विभाग का आधिकारिक पोर्टल भी नहीं है — आधिकारिक शिकायत पोर्टल की जानकारी 'सरकारी सेवाएँ' अनुभाग में अलग से दी गई है।",
            "This platform is not affiliated with any political party, candidate or election campaign. There is no political promotion, donation or advertising here. It is also not an official government portal — official grievance portals are listed separately under 'Government Services'.",
          )}
        </p>
        <h2>{L("पारदर्शिता और गोपनीयता", "Transparency and privacy")}</h2>
        <p>
          {L(
            "हर शिकायत का पूरा इतिहास सुरक्षित रहता है और हर एडमिन कार्रवाई ऑडिट लॉग में दर्ज होती है। निवासियों के मोबाइल नंबर, पते और दस्तावेज़ कभी सार्वजनिक नहीं किए जाते।",
            "The complete history of every complaint is preserved and every admin action is written to an audit log. Residents' mobile numbers, addresses and documents are never made public.",
          )}
        </p>
        <p className="mt-6 flex flex-wrap gap-3">
          <Link href="/complaints" className="btn-primary">{L("जनसमस्या दर्ज करें", "Register an issue")}</Link>
          <Link href="/help" className="btn-secondary">{L("सहायता व FAQ", "Help & FAQ")}</Link>
        </p>
      </div>
    </div>
  );
}
