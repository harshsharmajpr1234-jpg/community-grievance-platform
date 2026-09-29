import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { getLang } from "@/lib/lang";
import { bi } from "@/shared/i18n";

export const metadata: Metadata = { title: "Help & FAQ" };

export default async function HelpPage() {
  const lang = await getLang();
  const L = (hi: string, en: string) => bi(lang, hi, en);
  const faqs = [
    { q: L("खाता कैसे बनाएँ?", "How do I create an account?"), a: L("'रजिस्टर' पर नाम, मोबाइल नंबर, पासवर्ड और क्षेत्र भरें, फिर 'लॉगिन' से प्रवेश करें। पासवर्ड कम से कम 10 अक्षरों का हो और उसमें बड़े/छोटे अक्षर व अंक हों।", "Open 'Register', fill name, mobile number, password and locality, then sign in via 'Login'. Passwords need at least 10 characters with upper/lower case letters and a digit.") },
    { q: L("पासवर्ड भूल गए तो क्या करें?", "What if I forget my password?"), a: L("'पासवर्ड भूल गए?' पर अपना पंजीकृत ईमेल दर्ज करें — आपको एक सुरक्षित रीसेट लिंक भेजा जाएगा (केवल एक बार उपयोग योग्य)।", "Open 'Forgot password?' and enter your registered email — you will receive a secure, single-use reset link.") },
    { q: L("शिकायत कैसे दर्ज करें?", "How do I register a complaint?"), a: L("लॉगिन करके 'जनसमस्या दर्ज करें' पर जाएँ, श्रेणી और विवरण भरें, फोटो जोड़ें और जमा करें। आपको DPF-वर्ष-संख्या प्रारूप में शिकायत आईडी मिलेगी।", "Login, open 'Submit Complaint', fill category and details, add photos and submit. You will receive a Complaint ID in the format DPF-YEAR-NUMBER.") },
    { q: L("शिकायत की स्थिति कैसे देखें?", "How do I track a complaint?"), a: L("'शिकायत की स्थिति देखें' पर शिकायत आईडी और वही मोबाइल नंबर दर्ज करें, या लॉगिन करके 'मेरी शिकायतें' देखें।", "Open 'Track Complaint' and enter the Complaint ID with the same mobile number, or login and open 'My Complaints'.") },
    { q: L("स्थितियों का क्या अर्थ है?", "What do the statuses mean?"), a: L("दर्ज → सत्यापित → सौंपी गई → अग्रेषित → कार्य प्रगति पर → कार्रवाई की गई → समाधान। अन्य: अस्वीकृत, डुप्लिकेट, जानकारी आवश्यक, बंद।", "Submitted → Verified → Assigned → Forwarded → In Progress → Action Taken → Resolved. Others: Rejected, Duplicate, Needs Information, Closed.") },
    { q: L("'जानकारी आवश्यक' होने पर क्या करें?", "What if the status is 'Needs Information'?"), a: L("शिकायत विवरण पृष्ठ पर 'अतिरिक्त जानकारी जोड़ें' का उपयोग करें या नई फोटो अपलोड करें।", "Use 'Add information' on the complaint detail page or upload new photos.") },
    { q: L("कौन-सी फ़ाइलें अपलोड कर सकते हैं?", "Which files can I upload?"), a: L("JPG, JPEG, PNG, WEBP फोटो और PDF दस्तावेज़। आकार सीमा फ़ॉर्म में दिखाई जाती है।", "JPG, JPEG, PNG, WEBP photos and PDF documents. Size limits are shown on the form.") },
    { q: L("क्या मेरा नंबर सार्वजनिक होगा?", "Will my number be public?"), a: L("नहीं। केवल शिकायत का शीर्षक, श्रेणी, क्षेत्र और स्थिति सार्वजनिक होती है।", "No. Only the complaint title, category, locality and status are public.") },
    { q: L("डुप्लिकेट शिकायत का क्या होता है?", "What happens with duplicate complaints?"), a: L("जमा करते समय समान शिकायतें सुझाई जाती हैं। यदि एडमिन डुप्लिकेट चिह्नित करता है, तो मूल शिकायत का लिंक दिखाया जाता है — आपकी शिकायत हटाई नहीं जाती।", "Similar complaints are suggested while submitting. If an admin marks a duplicate, a link to the original is shown — your complaint is not deleted.") },
    { q: L("समाधान के बाद मुझे क्या करना है?", "What should I do after resolution?"), a: L("शिकायत पृष्ठ पर 'समस्या हल हो गई' या 'समस्या अभी भी है' चुनें। 'अभी भी है' चुनने पर शिकायत पुनः खोली जाती है।", "On the complaint page choose 'Problem Resolved' or 'Problem Still Exists'. Choosing 'still exists' reopens the complaint.") },
  ];
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={L("सहायता", "Help")} title={L("सहायता व अक्सर पूछे जाने वाले प्रश्न", "Help & Frequently Asked Questions")} />
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <details key={i} className="card group">
            <summary className="cursor-pointer list-none font-semibold text-slate-900 marker:content-none">
              <span className="mr-2 text-civic-600" aria-hidden>?</span>
              {f.q}
            </summary>
            <p className="mt-3 text-sm leading-6 text-slate-600">{f.a}</p>
          </details>
        ))}
      </div>
      <div className="card mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{L("और सहायता चाहिए?", "Need more help?")}</p>
        <Link href="/contact" className="btn-secondary btn-sm">{L("संपर्क करें", "Contact us")}</Link>
      </div>
    </div>
  );
}
