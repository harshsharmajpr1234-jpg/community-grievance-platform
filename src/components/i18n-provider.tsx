"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Bi, Lang } from "@/shared/constants";
import { LANG_COOKIE, pick, t as translate, type DictKey } from "@/shared/i18n";

type I18nValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: DictKey) => string;
  L: (hi: string, en: string) => string;
  pick: (bi: Bi | null | undefined) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ initialLang, children }: { initialLang: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const router = useRouter();

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = next;
      // Persist preference for logged-in residents (ignored when logged out)
      fetch("/api/auth/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ language: next }) }).catch(() => {});
      router.refresh();
    },
    [router],
  );

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (key) => translate(lang, key),
      L: (hi, en) => (lang === "hi" ? hi : en),
      pick: (bi) => pick(lang, bi),
    }),
    [lang, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
