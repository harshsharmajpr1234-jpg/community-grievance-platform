"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "./i18n-provider";

export function MobileNav({ loggedIn, unread }: { loggedIn: boolean; unread: number }) {
  const pathname = usePathname();
  const { L } = useI18n();
  const items = [
    { href: "/", label: L("होम", "Home"), icon: "🏠", match: (p: string) => p === "/" },
    { href: "/complaints", label: L("शिकायत", "Complaint"), icon: "📝", match: (p: string) => p === "/complaints" || (p.startsWith("/complaints/") && !p.startsWith("/complaints/track")) },
    { href: "/complaints/track", label: L("ट्रैक", "Track"), icon: "🔎", match: (p: string) => p.startsWith("/complaints/track") },
    { href: "/notices", label: L("सूचनाएँ", "Notices"), icon: "📢", match: (p: string) => p.startsWith("/notices") },
    { href: loggedIn ? "/dashboard" : "/login", label: L("डैशबोर्ड", "Dashboard"), icon: "📊", match: (p: string) => p.startsWith("/dashboard") || p.startsWith("/profile") || p.startsWith("/login") || p.startsWith("/notifications") || p.startsWith("/my-complaints") },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Bottom navigation">
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href}>
              <Link href={item.href} className={`relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${active ? "text-civic-700" : "text-slate-500"}`} aria-current={active ? "page" : undefined}>
                <span className="text-xl" aria-hidden>{item.icon}</span>
                {item.label}
                {item.href === "/profile" && unread > 0 && <span className="absolute right-4 top-2 h-2.5 w-2.5 rounded-full bg-rose-600" aria-label={`${unread} unread`} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
