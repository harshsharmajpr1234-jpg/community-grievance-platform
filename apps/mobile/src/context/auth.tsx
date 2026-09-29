import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setToken } from "../api/client";

export type User = { id: string; name: string | null; mobileMasked: string; email: string | null; language: string };
type AuthValue = { user: User | null; loading: boolean; lang: "hi" | "en"; setLang: (l: "hi" | "en") => void; refresh: () => Promise<void>; login: (token: string, user: User) => Promise<void>; logout: () => Promise<void> };

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLangState] = useState<"hi" | "en">("hi");

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ user: User }>("/api/auth/me");
      setUser(r.user);
      if (r.user.language === "en" || r.user.language === "hi") setLangState(r.user.language);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const setLang = (l: "hi" | "en") => {
    setLangState(l);
    if (user) api("/api/auth/me", { method: "PATCH", json: { language: l } }).catch(() => {});
  };
  const login = async (token: string, u: User) => {
    await setToken(token);
    setUser(u);
  };
  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    await setToken(null);
    setUser(null);
  };
  return <Ctx.Provider value={{ user, loading, lang, setLang, refresh, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}

export const L = (lang: "hi" | "en", hi: string, en: string) => (lang === "hi" ? hi : en);
