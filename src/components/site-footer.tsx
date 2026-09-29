"use client";

import Link from "next/link";
import { useI18n } from "./i18n-provider";
import { BRAND } from "@/shared/constants";
import { Logo } from "./site-header";

export function SiteFooter({ contactNumber, contactEmail }: { contactNumber?: string; contactEmail?: string }) {
  const { t, L } = useI18n();
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white pb-24 lg:pb-8">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <Logo size={44} />
            <div>
              <p className="font-extrabold text-civic-800">{BRAND.name}</p>
              <p className="text-sm font-semibold text-leaf-700">{BRAND.subtitleHi} ({BRAND.subtitle})</p>
            </div>
          </div>
          <p className="mt-4 max-w-md text-sm text-slate-600">
            {L(
              "वार्ड 12, 13 एवं 14 के स्थानीय नागरिकों की समस्याओं को दर्ज करने, ट्रैक करने और उनके समाधान की प्रक्रिया को व्यवस्थित करने के लिए एक स्वतंत्र स्थानीय मंच।",
              "An independent local platform for residents of Ward 12, 13 & 14 to submit, track and manage community issues.",
            )}
          </p>

          {/* Government Disclaimer Note */}
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 max-w-md">
            <p className="font-bold flex items-center gap-1 mb-0.5">
              ℹ️ {L("महत्वपूर्ण सूचना / Disclaimer", "Important Notice / Disclaimer")}
            </p>
            <p>
              {L(
                "यह एक स्वतंत्र स्थानीय नागरिक मंच है। यह किसी सरकारी विभाग या सरकारी पोर्टल का आधिकारिक हिस्सा नहीं है।",
                "This is an independent local civic platform and is not an official website of any government department or government portal.",
              )}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-bold text-slate-900">{L("मुख्य लिंक", "Quick links")}</p>
          <ul className="space-y-2 text-sm text-slate-600">
            <li><Link className="hover:text-civic-700" href="/">{t("nav_home")}</Link></li>
            <li><Link className="hover:text-civic-700" href="/about">{t("nav_about")}</Link></li>
            <li><Link className="hover:text-civic-700" href="/complaints">{t("nav_submit")}</Link></li>
            <li><Link className="hover:text-civic-700" href="/complaints/track">{t("nav_track")}</Link></li>
            <li><Link className="hover:text-civic-700" href="/notices">{t("nav_notices")}</Link></li>
            <li><Link className="hover:text-civic-700" href="/help">{t("nav_help")}</Link></li>
            <li><Link className="font-bold text-civic-800 hover:text-civic-700" href="/admin/login">{t("nav_admin")}</Link></li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-bold text-slate-900">{L("संपर्क व नीतियाँ", "Contact & policies")}</p>
          <ul className="space-y-2 text-sm text-slate-600">
            {contactNumber && <li>📞 <a className="hover:text-civic-700 font-mono" href={`tel:${contactNumber}`}>{contactNumber}</a></li>}
            {contactEmail && <li>✉️ <a className="hover:text-civic-700" href={`mailto:${contactEmail}`}>{contactEmail}</a></li>}
            <li><Link className="hover:text-civic-700" href="/contact">{t("nav_contact")}</Link></li>
            <li><Link className="hover:text-civic-700" href="/privacy">{t("nav_privacy")}</Link></li>
            <li><Link className="hover:text-civic-700" href="/terms">{t("nav_terms")}</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-slate-900">{L("वेबसाइट डेवलपर", "Website Developer")}</p>
            <p className="mt-1 text-sm font-bold text-civic-800">Harsh Sharma</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li>
                {L("मोबाइल", "Mobile")}:{" "}
                <a className="font-semibold text-civic-700 hover:underline font-mono" href="tel:+919782852499">9782852499</a>
                {", "}
                <a className="font-semibold text-civic-700 hover:underline font-mono" href="tel:+916350535424">6350535424</a>
              </li>
              <li>
                {L("ईमेल", "Email")}:{" "}
                <a className="break-all font-semibold text-civic-700 hover:underline" href="mailto:harshsharma1234@gmail.com">harshsharma1234@gmail.com</a>
                {", "}
                <a className="break-all font-semibold text-civic-700 hover:underline" href="mailto:riteshsharmajpr1234@gmail.com">riteshsharmajpr1234@gmail.com</a>
              </li>
            </ul>
          </div>

          <div className="md:text-right">
            <p className="text-sm font-bold text-slate-900">{BRAND.nameHi}</p>
            <p className="text-sm font-semibold text-slate-600">{BRAND.subtitleHi}</p>
            <p className="mt-2 text-xs text-slate-500">
              © {new Date().getFullYear()} {BRAND.name}. {L("यह एक स्वतंत्र नागरिक मंच है।", "An independent civic platform.")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
