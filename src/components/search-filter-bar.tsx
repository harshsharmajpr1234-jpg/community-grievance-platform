"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "./i18n-provider";

type Option = { value: string; label: string };

/** GET-based search + select filters that update the URL (server components re-render). */
export function SearchFilterBar({ placeholder, selects = [] }: { placeholder: string; selects?: { name: string; label: string; options: Option[] }[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const { t } = useI18n();
  function apply(form: HTMLFormElement) {
    const fd = new FormData(form);
    const params = new URLSearchParams();
    fd.forEach((v, k) => {
      if (typeof v === "string" && v) params.set(k, v);
    });
    router.push(`?${params.toString()}`);
  }
  return (
    <form
      className="card mb-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
      role="search"
    >
      <div className={`grid gap-3 ${selects.length ? "sm:grid-cols-2" : ""}`}>
        <div>
          <label className="label" htmlFor="q">{t("common_search")}</label>
          <input id="q" name="q" className="input" defaultValue={sp.get("q") ?? ""} placeholder={placeholder} />
        </div>
        {selects.map((s) => (
          <div key={s.name}>
            <label className="label" htmlFor={s.name}>{s.label}</label>
            <select id={s.name} name={s.name} className="input" defaultValue={sp.get(s.name) ?? ""} onChange={(e) => apply(e.currentTarget.form!)}>
              <option value="">{t("common_all")}</option>
              {s.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}
      </div>
      <button className="btn-primary">{t("common_search")}</button>
    </form>
  );
}
