"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { api } from "@/lib/client-api";
import { useI18n } from "../i18n-provider";
import type { DictKey } from "@/shared/i18n";
import { ROLE_LABELS } from "@/shared/constants";
import type { Permission } from "@/shared/rbac";
import type { SafeAdmin } from "@/server/services/admin";
import { Logo } from "../site-header";

type NavItem = { href: string; labelKey: DictKey; icon: string; permission?: Permission; badge?: number };

export function AdminShell({ admin, counts, unread, children }: { admin: SafeAdmin; counts: { pendingPosts: number; newComplaints: number }; unread: number; children: ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Close the mobile drawer on navigation via render-time state adjustment
  // (React-endorsed pattern that avoids a cascading effect render).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  const can = (p?: Permission) => !p || admin.permissions.includes(p);
  const allNav: NavItem[] = [
    { href: "/admin", labelKey: "admin_nav_dashboard", icon: "📊", permission: "analytics.view" },
    { href: "/admin/complaints", labelKey: "admin_nav_complaints", icon: "📝", permission: "complaints.view", badge: counts.newComplaints },
    { href: "/admin/content/notices", labelKey: "admin_nav_notices", icon: "📢", permission: "notices.manage" },
    { href: "/admin/content/development", labelKey: "admin_nav_development", icon: "🏗️", permission: "development.manage" },
    { href: "/admin/content/services", labelKey: "admin_nav_services", icon: "🏛️", permission: "services.manage" },
    { href: "/admin/content/community", labelKey: "admin_nav_community", icon: "🤝", permission: "community.manage", badge: counts.pendingPosts },
    { href: "/admin/content/areas", labelKey: "admin_nav_areas", icon: "📍", permission: "areas.manage" },
    { href: "/admin/content/categories", labelKey: "admin_nav_categories", icon: "🏷️", permission: "settings.manage" },
    { href: "/admin/users", labelKey: "admin_nav_users", icon: "👥", permission: "users.view" },
    { href: "/admin/admins", labelKey: "admin_nav_admins", icon: "🛡️", permission: "admins.view" },
    { href: "/admin/audit-logs", labelKey: "admin_nav_audit", icon: "🧾", permission: "audit.view" },
    { href: "/admin/settings", labelKey: "admin_nav_settings", icon: "⚙️", permission: "settings.view" },
    { href: "/admin/storage", labelKey: "admin_nav_storage", icon: "💾", permission: "settings.view" },
    { href: "/admin/notifications", labelKey: "admin_nav_notifications", icon: "🔔", permission: "notifications.view", badge: unread },
    { href: "/admin/account", labelKey: "admin_nav_account", icon: "🔐" },
  ];
  const nav = allNav.filter((i) => can(i.permission));

  async function logout() {
    await api("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const sidebar = (
    <nav className="flex h-full flex-col" aria-label="Admin navigation">
      <div className="flex items-center gap-2 px-4 py-4">
        <Logo size={36} />
        <div className="leading-tight">
          <p className="text-sm font-extrabold text-white">JSNM Admin</p>
          <p className="text-[11px] text-blue-200">Jan Samasya Nivaran Manch</p>
        </div>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {nav.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? "bg-white/15 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"}`} aria-current={active ? "page" : undefined}>
                <span className="flex items-center gap-2.5"><span aria-hidden>{item.icon}</span>{t(item.labelKey)}</span>
                {item.badge ? <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-slate-900">{item.badge}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-white/10 p-3">
        <p className="truncate text-sm font-semibold text-white">{admin.name}</p>
        <p className="truncate text-xs text-blue-200">{ROLE_LABELS[admin.role]} • {admin.email}</p>
        <div className="mt-2 flex gap-2">
          <Link href="/" className="flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-center text-xs font-semibold text-white hover:bg-white/20">Public site</Link>
          <button type="button" onClick={logout} className="flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-xs font-semibold text-white hover:bg-white/20">Logout</button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden bg-civic-900 lg:sticky lg:top-0 lg:block lg:h-screen">{sidebar}</aside>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost btn-sm lg:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>☰</button>
            <p className="text-sm font-semibold text-slate-700">Admin Panel</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/notifications" className="btn-ghost btn-sm relative" aria-label="Notifications">
              🔔{unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{unread}</span>}
            </Link>
            <span className="hidden text-xs text-slate-500 sm:inline">{ROLE_LABELS[admin.role]}</span>
          </div>
        </header>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 bg-civic-900 shadow-xl">
              <button type="button" className="absolute right-2 top-3 rounded-lg px-2 py-1 text-white" aria-label="Close menu" onClick={() => setOpen(false)}>✕</button>
              {sidebar}
            </aside>
          </div>
        )}
        <main id="main" className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
