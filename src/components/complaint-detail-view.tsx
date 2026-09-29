"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "@/lib/client-api";
import { CLOSED_STATUSES, STATUS_LABELS, type ComplaintStatus, type Lang } from "@/shared/constants";
import { formatDate } from "@/shared/i18n";
import { buildTimeline } from "@/shared/timeline";
import type { ComplaintDetailDto, ComplaintUpdateDto } from "@/shared/types";
import { useI18n } from "./i18n-provider";
import { Alert, DemoTag, Field, PriorityBadge, StatusBadge } from "./ui";

export function StatusTimeline({ updates, status, lang }: { updates: ComplaintUpdateDto[]; status: ComplaintStatus; lang: Lang }) {
  const steps = buildTimeline(updates, status);
  return (
    <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6 sm:grid sm:grid-cols-4 sm:gap-4 sm:space-y-0 sm:border-l-0 sm:pl-0 lg:grid-cols-8" aria-label={lang === "hi" ? "स्थिति टाइमलाइन" : "Status timeline"}>
      {steps.map((s, i) => {
        const label = STATUS_LABELS[s.status];
        const icon = s.state === "done" ? "✓" : s.state === "current" ? "●" : "○";
        const color = s.state === "done" ? "bg-leaf-600 text-white" : s.state === "current" ? "bg-civic-600 text-white ring-4 ring-civic-100" : "bg-white text-slate-400 border border-slate-300";
        return (
          <li key={`${s.status}-${i}`} className="relative sm:text-center">
            <span className={`absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold sm:static sm:mx-auto sm:mb-2 sm:h-8 sm:w-8 ${color}`} aria-hidden>
              {icon}
            </span>
            <p className={`text-sm font-semibold ${s.state === "pending" ? "text-slate-400" : "text-slate-900"}`}>{lang === "hi" ? label.hi : label.en}</p>
            <p className="text-xs text-slate-500">{s.at ? formatDate(s.at, lang, true) : "—"}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function ComplaintDetailView({ detail: initial }: { detail: ComplaintDetailDto }) {
  const { lang, t, L } = useI18n();
  const [detail, setDetail] = useState(initial);
  const [msg, setMsg] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isClosed = CLOSED_STATUSES.includes(detail.status);
  const canFeedback = detail.isOwner && ["ACTION_TAKEN", "RESOLVED", "CLOSED"].includes(detail.status);

  async function refresh() {
    const fresh = await api<ComplaintDetailDto>(`/api/complaints/${detail.code}`);
    setDetail(fresh);
  }

  async function addInfo(e: FormEvent) {
    e.preventDefault();
    setBusy("info");
    setError(null);
    try {
      const fresh = await api<ComplaintDetailDto>(`/api/complaints/${detail.code}`, { method: "PATCH", json: { message: msg } });
      setDetail(fresh);
      setMsg("");
      setNotice(L("जानकारी जोड़ दी गई।", "Information added."));
    } catch (err) {
      setError(apiErrorMessage(lang, err));
    } finally {
      setBusy(null);
    }
  }

  async function feedback(isResolved: boolean) {
    setBusy(isResolved ? "yes" : "no");
    setError(null);
    try {
      const fresh = await api<ComplaintDetailDto>(`/api/complaints/${detail.code}/feedback`, { method: "POST", json: { isResolved, comment: comment || undefined } });
      setDetail(fresh);
      setComment("");
      setNotice(L("आपकी प्रतिक्रिया दर्ज कर ली गई है। धन्यवाद!", "Your feedback has been recorded. Thank you!"));
    } catch (err) {
      setError(apiErrorMessage(lang, err));
    } finally {
      setBusy(null);
    }
  }

  async function upload(file: File) {
    setBusy("upload");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api(`/api/complaints/${detail.id}/documents`, { method: "POST", body: fd });
      await refresh();
      setNotice(L("फ़ाइल अपलोड हो गई।", "File uploaded."));
    } catch (err) {
      setError(apiErrorMessage(lang, err));
    } finally {
      setBusy(null);
    }
  }

  const catName = detail.category ? (lang === "hi" ? detail.category.nameHi : detail.category.nameEn) : "—";
  const areaName = detail.area ? (lang === "hi" ? detail.area.nameHi || detail.area.name : detail.area.name) : "—";

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-bold text-civic-700">{detail.code}</span>
          <StatusBadge status={detail.status} lang={lang} />
          <PriorityBadge priority={detail.priority} lang={lang} />
          {detail.isDemo && <DemoTag lang={lang} />}
          {!detail.isPublic && <span className="chip bg-slate-100 text-slate-600 ring-slate-200">🔒 {L("निजी", "Private")}</span>}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">{detail.title}</h1>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
          <Item label={t("common_category")} value={`${detail.category?.icon ?? ""} ${catName}`} />
          <Item label={t("common_locality")} value={areaName} />
          <Item label={t("complaint_submitted_on")} value={formatDate(detail.createdAt, lang, true)} />
          <Item label={t("complaint_last_update")} value={formatDate(detail.lastUpdateAt, lang, true)} />
          <Item label={t("complaint_department")} value={detail.department || "—"} />
          {detail.forwardedTo && <Item label={L("अग्रेषित", "Forwarded to")} value={detail.forwardedTo} />}
          {detail.address && <Item label={t("complaint_address")} value={detail.address} />}
          {detail.resolvedAt && <Item label={L("समाधान दिनांक", "Resolved on")} value={formatDate(detail.resolvedAt, lang, true)} />}
        </dl>
        {detail.duplicateOf && (
          <Alert kind="warning">
            {L("यह शिकायत डुप्लिकेट चिह्नित है। मूल शिकायत:", "This complaint is marked as a duplicate. Original:")}{" "}
            <Link className="font-semibold underline" href={`/complaints/${detail.duplicateOf.code}`}>{detail.duplicateOf.code}</Link>
          </Alert>
        )}
        <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{detail.description}</p>
      </div>

      <div className="card">
        <h2 className="mb-4 font-bold text-slate-900">{t("complaint_timeline")}</h2>
        <StatusTimeline updates={detail.updates} status={detail.status} lang={lang} />
      </div>

      {detail.documents.length > 0 && (
        <div className="card">
          <h2 className="mb-3 font-bold text-slate-900">📎 {L("फोटो व दस्तावेज़", "Photos & documents")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {detail.documents.map((d) => (
              <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {d.kind === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.url} alt={d.originalName} loading="lazy" className="aspect-square w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="flex aspect-square items-center justify-center text-4xl" aria-hidden>{d.kind === "VIDEO" ? "🎬" : "📄"}</div>
                )}
                <p className="truncate px-2 py-1.5 text-xs text-slate-600">{d.originalName}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="mb-3 font-bold text-slate-900">{t("complaint_updates")}</h2>
        {detail.updates.length === 0 && <p className="text-sm text-slate-500">{t("common_no_results")}</p>}
        <ul className="space-y-3">
          {[...detail.updates].reverse().map((u) => (
            <li key={u.id} className={`rounded-xl border p-3 text-sm ${u.isPublic ? "border-slate-200 bg-white" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  {u.byUser ? L("निवासी", "Resident") : u.byAdmin ? u.byAdmin : L("सिस्टम", "System")} • {updateTypeLabel(u.type, lang)}
                  {!u.isPublic && <span className="ml-2 chip bg-amber-100 text-amber-800 ring-amber-200">{L("आंतरिक", "Internal")}</span>}
                </span>
                <time dateTime={new Date(u.createdAt).toISOString()}>{formatDate(u.createdAt, lang, true)}</time>
              </div>
              {u.newStatus && (
                <p className="mt-1.5 flex items-center gap-2 text-xs">
                  {u.oldStatus && <StatusBadge status={u.oldStatus} lang={lang} />}
                  {u.oldStatus && <span aria-hidden>→</span>}
                  <StatusBadge status={u.newStatus} lang={lang} />
                </p>
              )}
              {u.message && <p className="mt-1.5 whitespace-pre-wrap text-slate-700">{u.message}</p>}
            </li>
          ))}
        </ul>
      </div>

      {detail.isOwner && (
        <div className="card space-y-5 border-civic-100">
          <h2 className="font-bold text-slate-900">{L("आपकी कार्रवाई", "Your actions")}</h2>
          {error && <Alert kind="error">{error}</Alert>}
          {notice && !error && <Alert kind="success">{notice}</Alert>}

          {canFeedback && (
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-800">{L("क्या समस्या हल हो गई?", "Has the problem been resolved?")}</p>
              <textarea className="input mt-2" rows={2} placeholder={L("टिप्पणी (वैकल्पिक)", "Comment (optional)")} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn-green" disabled={busy !== null} onClick={() => feedback(true)}>
                  ✅ {t("complaint_feedback_resolved")}
                </button>
                <button type="button" className="btn-danger" disabled={busy !== null} onClick={() => feedback(false)}>
                  ⚠️ {t("complaint_feedback_exists")}
                </button>
              </div>
              {detail.feedback.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  {L("पिछली प्रतिक्रिया:", "Previous feedback:")} {detail.feedback[0].isResolved ? t("complaint_feedback_resolved") : t("complaint_feedback_exists")} ({formatDate(detail.feedback[0].createdAt, lang, true)})
                </p>
              )}
            </div>
          )}

          {!isClosed && (
            <form onSubmit={addInfo} className="space-y-3">
              <Field label={detail.status === "NEEDS_INFORMATION" ? L("एडमिन ने अतिरिक्त जानकारी माँगी है — यहाँ लिखें", "Admin requested more information — reply here") : L("अतिरिक्त जानकारी जोड़ें", "Add information")}>
                <textarea className="input" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} minLength={3} maxLength={2000} required />
              </Field>
              <div className="flex flex-wrap items-center gap-3">
                <button className="btn-primary" disabled={busy !== null || msg.trim().length < 3}>{busy === "info" ? t("common_loading") : t("common_submit")}</button>
                <label className="btn-secondary cursor-pointer">
                  📎 {L("फ़ाइल जोड़ें", "Add file")}
                  <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} disabled={busy !== null} />
                </label>
              </div>
            </form>
          )}
          {isClosed && !canFeedback && <p className="text-sm text-slate-500">{L("यह शिकायत बंद है। समस्या दोबारा होने पर नई शिकायत दर्ज करें।", "This complaint is closed. Register a new complaint if the problem recurs.")}</p>}
        </div>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-800">{value}</dd>
    </div>
  );
}

export function updateTypeLabel(type: ComplaintUpdateDto["type"], lang: Lang) {
  const m: Record<ComplaintUpdateDto["type"], [string, string]> = {
    STATUS_CHANGE: ["स्थिति परिवर्तन", "Status change"],
    INTERNAL_NOTE: ["आंतरिक नोट", "Internal note"],
    PUBLIC_UPDATE: ["सार्वजनिक अपडेट", "Public update"],
    INFO_REQUEST: ["जानकारी का अनुरोध", "Information request"],
    USER_RESPONSE: ["निवासी की जानकारी", "Resident response"],
    ASSIGNMENT: ["असाइनमेंट", "Assignment"],
    FORWARD: ["अग्रेषण", "Forwarded"],
    FEEDBACK: ["प्रतिक्रिया", "Feedback"],
    DUPLICATE: ["डुप्लिकेट", "Duplicate"],
  };
  const [hi, en] = m[type] ?? [type, type];
  return lang === "hi" ? hi : en;
}
