import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { getLang } from "@/lib/lang";
import { bi } from "@/shared/i18n";

export const metadata: Metadata = { title: "Privacy Policy" };

export default async function PrivacyPage() {
  const lang = await getLang();
  const L = (hi: string, en: string) => bi(lang, hi, en);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={L("नीति", "Policy")} title={L("गोपनीयता नीति", "Privacy Policy")} subtitle={L("अंतिम अद्यतन: 2026", "Last updated: 2026")} />
      <div className="card prose-civic">
        <h2>{L("1. हम कौन-सी जानकारी एकत्र करते हैं", "1. Information we collect")}</h2>
        <ul>
          <li>{L("खाता: नाम, मोबाइल नंबर, वैकल्पिक ईमेल, क्षेत्र/कॉलोनी, वैकल्पिक पता। पासवर्ड केवल सुरक्षित हैश के रूप में संग्रहित होते हैं — कभी सादे पाठ में नहीं।", "Account: name, mobile number, optional email, locality, optional address. Passwords are stored only as secure hashes — never in plain text.")}</li>
          <li>{L("शिकायत: श्रेणी, शीर्षक, विवरण, स्थान, वैकल्पिक GPS, अपलोड की गई फोटो/PDF दस्तावेज़।", "Complaints: category, title, description, location, optional GPS, uploaded photos/PDF documents.")}</li>
          <li>{L("तकनीकी: IP पता और डिवाइस जानकारी — दुरुपयोग रोकने और सुरक्षा हेतु।", "Technical: IP address and device information — for abuse prevention and security.")}</li>
        </ul>
        <h2>{L("2. हम जानकारी का उपयोग कैसे करते हैं", "2. How we use information")}</h2>
        <ul>
          <li>{L("शिकायत दर्ज करने, सत्यापित करने, संबंधित विभाग तक पहुँचाने और स्थिति अपडेट देने के लिए।", "To register, verify, route complaints and send status updates.")}</li>
          <li>{L("महत्वपूर्ण सूचनाएँ और सामुदायिक घोषणाएँ भेजने के लिए (आप संपर्क वरीयता चुन सकते हैं)।", "To send important notices and community announcements (you can choose your contact preference).")}</li>
          <li>{L("गुमनाम सांख्यिकी (श्रेणी/क्षेत्र अनुसार शिकायतें) तैयार करने के लिए।", "To produce anonymised statistics (complaints by category/locality).")}</li>
        </ul>
        <h2>{L("3. क्या सार्वजनिक है और क्या नहीं", "3. What is public and what is not")}</h2>
        <p>{L("सार्वजनिक: शिकायत आईडी, शीर्षक, विवरण, श्रेणी, क्षेत्र/कॉलोनी, स्थिति और सार्वजनिक अपडेट। कभी सार्वजनिक नहीं: मोबाइल नंबर, ईमेल, पूरा पता, GPS निर्देशांक, निजी दस्तावेज़ और आंतरिक नोट।", "Public: complaint ID, title, description, category, locality, status and public updates. Never public: mobile number, email, full address, GPS coordinates, private documents and internal notes.")}</p>
        <h2>{L("4. डेटा साझा करना", "4. Data sharing")}</h2>
        <p>{L("शिकायत का समाधान कराने हेतु आवश्यक न्यूनतम जानकारी संबंधित विभाग/एजेंसी के साथ साझा की जा सकती है। हम आपका डेटा नहीं बेचते और किसी राजनीतिक उद्देश्य के लिए उपयोग नहीं करते।", "The minimum information needed to resolve a complaint may be shared with the concerned department/agency. We do not sell your data and do not use it for any political purpose.")}</p>
        <h2>{L("5. सुरक्षा", "5. Security")}</h2>
        <p>{L("HTTPS, bcrypt से हैश किए गए पासवर्ड, भूमिका आधारित पहुँच, दर सीमा, फ़ाइल सत्यापन और पूर्ण ऑडिट लॉग का उपयोग किया जाता है। केवल अधिकृत एडमिन ही संवेदनशील जानकारी देख सकते हैं।", "We use HTTPS, bcrypt-hashed passwords, role-based access, rate limiting, file validation and complete audit logs. Only authorised admins can view sensitive information.")}</p>
        <h2>{L("6. डेटा प्रतिधारण और हटाना", "6. Retention and deletion")}</h2>
        <p>{L("शिकायत रिकॉर्ड पारदर्शिता हेतु सुरक्षित रखे जाते हैं। आप प्रोफ़ाइल पृष्ठ से खाता हटाने का अनुरोध कर सकते हैं; व्यक्तिगत पहचान योग्य जानकारी 30 दिनों के भीतर हटाई/गुमनाम की जाती है, जबकि गुमनाम शिकायत इतिहास बना रह सकता है।", "Complaint records are retained for transparency. You may request account deletion from the profile page; personally identifiable information is removed/anonymised within 30 days while anonymised complaint history may remain.")}</p>
        <h2>{L("7. आपके अधिकार", "7. Your rights")}</h2>
        <p>{L("आप अपनी जानकारी देख सकते हैं, सुधार सकते हैं, भाषा/संपर्क वरीयता बदल सकते हैं और हटाने का अनुरोध कर सकते हैं। प्रश्नों के लिए संपर्क पृष्ठ देखें।", "You can view and correct your information, change language/contact preferences and request deletion. See the contact page for questions.")}</p>
      </div>
    </div>
  );
}
