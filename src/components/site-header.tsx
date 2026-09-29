"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "./i18n-provider";
import { BRAND } from "@/shared/constants";

const PUBLIC_NAV = [
  { href: "/", key: "nav_home" },
  { href: "/about", key: "nav_about" },
  { href: "/complaints", key: "nav_complaints" },
  { href: "/notices", key: "nav_notices" },
  { href: "/help", key: "nav_help" },
  { href: "/contact", key: "nav_contact" },
  { href: "/admin/login", key: "nav_admin" },
] as const;

const LOGGED_IN_NAV = [
  { href: "/", key: "nav_home" },
  { href: "/dashboard", key: "nav_dashboard" },
  { href: "/dashboard#my-complaints", key: "nav_my_complaints" },
  { href: "/complaints/track", key: "nav_track" },
  { href: "/notifications", key: "nav_notifications" },
  { href: "/profile", key: "nav_profile" },
  { href: "/admin/login", key: "nav_admin" },
] as const;

export function SiteHeader({ loggedIn, unread }: { loggedIn: boolean; unread: number }) {
  const { lang, setLang, t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const navItems = loggedIn ? LOGGED_IN_NAV : PUBLIC_NAV;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label={BRAND.name} onClick={() => setOpen(false)}>
          <Logo />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[15px] font-extrabold tracking-tight text-civic-800 sm:text-base">
              {lang === "hi" ? BRAND.nameHi : BRAND.name}
            </span>
            <span className="block truncate text-[11px] font-semibold text-leaf-700 sm:text-xs">
              {lang === "hi" ? BRAND.subtitleHi : BRAND.subtitle}
            </span>
          </span>
        </Link>

        {/* Primary Desktop Nav */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {navItems.map((item) => {
            const hrefStr: string = item.href;
            const active = hrefStr === "/" ? pathname === "/" : pathname === hrefStr || (hrefStr !== "/" && pathname.startsWith(hrefStr));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-civic-50 text-civic-700 font-bold" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <LangSwitch lang={lang} onChange={setLang} />

          <Link href="/admin/login" className="btn-secondary btn-sm hidden sm:inline-flex text-civic-800 border-civic-200 font-bold hover:bg-civic-50" aria-label="Admin Panel">
            🛡️ {t("nav_admin")}
          </Link>

          {loggedIn ? (
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="btn-secondary btn-sm relative hidden sm:inline-flex" aria-label={t("nav_dashboard")}>
                📊 {t("nav_dashboard")}
                {unread > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>
              <form action="/api/auth/logout" method="POST" className="hidden sm:inline-block">
                <button type="submit" className="btn-ghost btn-sm text-slate-600 hover:text-rose-600">
                  {t("nav_logout")}
                </button>
              </form>
            </div>
          ) : (
            <Link href="/login" className="btn-primary btn-sm hidden sm:inline-flex">
              {t("nav_login")}
            </Link>
          )}

          <button
            type="button"
            className="btn-ghost btn-sm lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label="Menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span aria-hidden className="text-xl leading-none">
              {open ? "✕" : "☰"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <>
          <div className="fixed inset-0 top-16 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
          <div id="mobile-menu" className="relative z-40 border-t border-slate-200 bg-white shadow-xl lg:hidden">
            <nav className="mx-auto grid max-w-7xl grid-cols-2 gap-1.5 px-4 py-4" aria-label="Mobile">
              <Link href="/" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" onClick={() => setOpen(false)}>
                {t("nav_home")}
              </Link>
              <Link href="/about" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" onClick={() => setOpen(false)}>
                {t("nav_about")}
              </Link>
              <Link href="/complaints" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" onClick={() => setOpen(false)}>
                {t("nav_complaints")}
              </Link>
              <Link href="/complaints/track" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" onClick={() => setOpen(false)}>
                {t("nav_track")}
              </Link>
              <Link href="/notices" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" onClick={() => setOpen(false)}>
                {t("nav_notices")}
              </Link>
              <Link href="/help" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" onClick={() => setOpen(false)}>
                {t("nav_help")}
              </Link>
              <Link href="/contact" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" onClick={() => setOpen(false)}>
                {t("nav_contact")}
              </Link>
              <Link href="/admin/login" className="rounded-lg px-3 py-2 text-sm font-bold text-civic-800 bg-civic-50 hover:bg-civic-100" onClick={() => setOpen(false)}>
                {t("nav_admin")}
              </Link>

              {loggedIn ? (
                <>
                  <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" onClick={() => setOpen(false)}>
                    {t("nav_dashboard")}
                  </Link>
                  <Link href="/profile" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" onClick={() => setOpen(false)}>
                    {t("nav_profile")}
                  </Link>
                  <form action="/api/auth/logout" method="POST" className="col-span-2 mt-2">
                    <button type="submit" className="w-full btn-secondary text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => setOpen(false)}>
                      🚪 {t("nav_logout")}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="col-span-1 mt-1 btn-secondary text-center" onClick={() => setOpen(false)}>
                    {t("nav_login")}
                  </Link>
                  <Link href="/register" className="col-span-1 mt-1 btn-primary text-center" onClick={() => setOpen(false)}>
                    {t("nav_register")}
                  </Link>
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}

export function LangSwitch({ lang, onChange }: { lang: "hi" | "en"; onChange: (l: "hi" | "en") => void }) {
  return (
    <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs font-semibold" role="group" aria-label="Language">
      <button
        type="button"
        onClick={() => onChange("hi")}
        aria-pressed={lang === "hi"}
        className={`rounded-md px-2 py-1.5 ${lang === "hi" ? "bg-civic-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
      >
        हिन्दी
      </button>
      <button
        type="button"
        onClick={() => onChange("en")}
        aria-pressed={lang === "en"}
        className={`rounded-md px-2 py-1.5 ${lang === "en" ? "bg-civic-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
      >
        English
      </button>
    </div>
  );
}

export function Logo({ size = 38, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/jansahayak-logo.png"
      alt={BRAND.name}
      width={size}
      height={size}
      className={`h-auto w-auto max-h-[40px] max-w-[40px] rounded-full object-contain shadow-sm ${className}`}
    />
  );
}
