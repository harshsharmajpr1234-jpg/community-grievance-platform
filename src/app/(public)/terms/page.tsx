import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { getLang } from "@/lib/lang";
import { bi } from "@/shared/i18n";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default async function TermsPage() {
  const lang = await getLang();
  const L = (hi: string, en: string) => bi(lang, hi, en);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={L("नीति", "Policy")} title={L("नियम व शर्तें", "Terms & Conditions")} />
      <div className="card prose-civic">
        <h2>{L("1. मंच की प्रकृति", "1. Nature of the platform")}</h2>
        <p>{L("यह एक सामुदायिक सेवा मंच है, कोई सरकारी पोर्टल या आपातकालीन सेवा नहीं। शिकायत दर्ज करने से समाधान की कोई कानूनी गारंटी नहीं बनती; हम शिकायत को संबंधित विभाग तक पहुँचाने और प्रगति दर्ज करने का प्रयास करते हैं।", "This is a community service platform, not a government portal or an emergency service. Registering a complaint creates no legal guarantee of resolution; we endeavour to route it to the concerned department and record progress.")}</p>
        <h2>{L("2. स्वीकार्य उपयोग", "2. Acceptable use")}</h2>
        <ul>
          <li>{L("केवल सही और अपनी जानकारी के अनुसार सत्य समस्याएँ दर्ज करें।", "Submit only genuine problems that are true to the best of your knowledge.")}</li>
          <li>{L("किसी व्यक्ति पर असत्यापित आरोप, मानहानिकारक, अभद्र या घृणास्पद सामग्री पोस्ट न करें।", "Do not post unverified accusations, defamatory, abusive or hateful content about any person.")}</li>
          <li>{L("राजनीतिक प्रचार, विज्ञापन या स्पैम की अनुमति नहीं है।", "Political promotion, advertising or spam is not permitted.")}</li>
          <li>{L("दूसरों के व्यक्तिगत डेटा (फ़ोन, पता, फोटो) उनकी सहमति के बिना अपलोड न करें।", "Do not upload other people's personal data (phone, address, photos) without consent.")}</li>
        </ul>
        <h2>{L("3. मॉडरेशन", "3. Moderation")}</h2>
        <p>{L("एडमिन शिकायतों को सत्यापित, डुप्लिकेट चिह्नित, अस्वीकृत या अतिरिक्त जानकारी हेतु वापस कर सकते हैं। सामुदायिक पोस्ट प्रकाशन से पहले अनुमोदन के अधीन हैं। नियमों के उल्लंघन पर खाता निष्क्रिय किया जा सकता है।", "Admins may verify, mark duplicate, reject or return complaints for more information. Community posts are subject to approval before publishing. Accounts may be deactivated for violations.")}</p>
        <h2>{L("4. सामग्री और लाइसेंस", "4. Content and licence")}</h2>
        <p>{L("आप अपलोड की गई फोटो/दस्तावेज़ के स्वामी बने रहते हैं और हमें उन्हें शिकायत निवारण के उद्देश्य से उपयोग/साझा करने की अनुमति देते हैं।", "You retain ownership of uploaded photos/documents and grant us permission to use/share them for the purpose of grievance redressal.")}</p>
        <h2>{L("5. दायित्व की सीमा", "5. Limitation of liability")}</h2>
        <p>{L("मंच 'जैसा है' आधार पर प्रदान किया जाता है। किसी सूचना की सटीकता के लिए हम यथासंभव प्रयास करते हैं, परंतु आधिकारिक कार्रवाई हेतु संबंधित सरकारी स्रोतों की पुष्टि करें।", "The platform is provided 'as is'. We make reasonable efforts for accuracy but please confirm with official government sources for official actions.")}</p>
        <h2>{L("6. परिवर्तन", "6. Changes")}</h2>
        <p>{L("ये शर्तें समय-समय पर अद्यतन की जा सकती हैं; महत्वपूर्ण परिवर्तन सूचना केंद्र में प्रकाशित किए जाएँगे।", "These terms may be updated from time to time; material changes will be published in the notice centre.")}</p>
      </div>
    </div>
  );
}
