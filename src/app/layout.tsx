import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { I18nProvider } from "@/components/i18n-provider";
import { PwaRegister } from "@/components/pwa-register";
import { getLang } from "@/lib/lang";
import { env } from "@/lib/env";
import { BRAND } from "@/shared/constants";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: "जन समस्या निवारण मंच, वार्ड 12, 13 एवं 14 | Jan Samasya Nivaran Manch",
    template: "%s | Jan Samasya Nivaran Manch",
  },
  description: `${BRAND.nameHi}, ${BRAND.subtitleHi} — ${BRAND.tagline}. Non-partisan community grievance and public information platform for residents of Ward 12, 13 & 14 and surrounding areas.`,
  applicationName: BRAND.name,
  manifest: "/manifest.webmanifest",
  keywords: ["Jan Samasya Nivaran Manch", "जन समस्या निवारण मंच", "Ward 12", "Ward 13", "Ward 14", "वार्ड 12", "वार्ड 13", "वार्ड 14", "Jaipur", "जनसमस्या", "complaint", "community", "civic", "public services"],
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: "जन समस्या निवारण मंच, वार्ड 12, 13 एवं 14 | Jan Samasya Nivaran Manch",
    description: `${BRAND.tagline} — ${BRAND.subtitleHi}`,
    images: [{ url: "/images/hero.jpg", width: 1200, height: 630, alt: BRAND.name }],
    locale: "hi_IN",
  },
  twitter: { card: "summary_large_image", title: BRAND.name, description: BRAND.tagline, images: ["/images/hero.jpg"] },
  icons: { icon: "/icons/icon-512.png", apple: "/icons/icon-512.png" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang}>
      <body>
        <a href="#main" className="skip-link">
          {lang === "hi" ? "मुख्य सामग्री पर जाएँ" : "Skip to main content"}
        </a>
        <I18nProvider initialLang={lang}>{children}</I18nProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
