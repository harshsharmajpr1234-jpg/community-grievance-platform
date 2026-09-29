"use client";

import { useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "@/lib/client-api";
import type { ComplaintDetailDto } from "@/shared/types";
import { ComplaintDetailView } from "./complaint-detail-view";
import { useI18n } from "./i18n-provider";
import { Alert, Field } from "./ui";

export function TrackForm({ initialCode }: { initialCode?: string }) {
  const { lang, t, L } = useI18n();
  const [code, setCode] = useState(initialCode ?? "");
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ComplaintDetailDto | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDetail(null);
    try {
      setDetail(await api<ComplaintDetailDto>("/api/complaints/track", { method: "POST", json: { code: code.trim().toUpperCase(), mobile } }));
    } catch (err) {
      setError(apiErrorMessage(lang, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="card grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate>
        <Field label={t("complaint_id")} required hint="DPF-2026-000001">
          <input className="input font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="DPF-2026-000001" pattern="DPF-\d{4}-\d{6}" required autoComplete="off" />
        </Field>
        <Field label={L("पंजीकृत मोबाइल नंबर", "Registered mobile number")} required>
          <input className="input" type="tel" inputMode="numeric" maxLength={10} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} required />
        </Field>
        <button className="btn-primary" disabled={busy || mobile.length !== 10 || code.length < 10}>
          {busy ? t("common_loading") : `🔎 ${t("common_search")}`}
        </button>
      </form>
      {error && <Alert kind="error">{error}</Alert>}
      {detail && <ComplaintDetailView detail={detail} />}
    </div>
  );
}
