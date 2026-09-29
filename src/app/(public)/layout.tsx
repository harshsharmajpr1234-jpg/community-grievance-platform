import type { ReactNode } from "react";
import { MobileNav } from "@/components/mobile-nav";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getLang } from "@/lib/lang";
import { getUserSession } from "@/server/auth/session";
import { unreadCount } from "@/server/services/notifications";
import { getSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [session, settings, lang] = await Promise.all([getUserSession(), getSettings(), getLang()]);
  let unread = 0;
  if (session) {
    try {
      unread = await unreadCount({ userId: session.sub });
    } catch {
      unread = 0;
    }
  }
  const announcement = lang === "hi" ? settings.systemAnnouncementHi || settings.systemAnnouncement : settings.systemAnnouncement || settings.systemAnnouncementHi;
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader loggedIn={Boolean(session)} unread={unread} />
      {settings.maintenanceMode && (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900">
          {lang === "hi" ? "रखरखाव मोड सक्रिय है — कुछ सुविधाएँ अस्थायी रूप से उपलब्ध नहीं हो सकतीं।" : "Maintenance mode is active — some features may be temporarily unavailable."}
        </div>
      )}
      {announcement && <div className="bg-civic-700 px-4 py-2 text-center text-sm font-medium text-white">{announcement}</div>}
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 pt-6 sm:px-6">
        {children}
      </main>
      <SiteFooter contactNumber={settings.contactNumber} contactEmail={settings.contactEmail} />
      <MobileNav loggedIn={Boolean(session)} unread={unread} />
    </div>
  );
}
