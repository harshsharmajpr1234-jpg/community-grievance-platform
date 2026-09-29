"use client";

import { useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "@/lib/client-api";
import { COMMUNITY_POST_TYPES, COMMUNITY_TYPE_LABELS, type CommunityPostType } from "@/shared/constants";
import { useI18n } from "./i18n-provider";
import { Alert, Field } from "./ui";

export function CommunityPostForm({ loggedIn }: { loggedIn: boolean }) {
  const { lang, t, L } = useI18n();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", type: "EVENT" as CommunityPostType, eventDate: "", location: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/community", { method: "POST", json: { ...form, eventDate: form.eventDate || undefined, location: form.location || undefined } });
      setMsg({ kind: "success", text: L("धन्यवाद! आपकी पोस्ट समीक्षा के लिए भेज दी गई है। एडमिन अनुमोदन के बाद प्रकाशित होगी।", "Thank you! Your post has been sent for review and will be published after admin approval.") });
      setForm({ title: "", content: "", type: "EVENT", eventDate: "", location: "" });
    } catch (err) {
      setMsg({ kind: "error", text: apiErrorMessage(lang, err) });
    } finally {
      setBusy(false);
    }
  }

  if (!loggedIn) {
    return (
      <p className="card text-sm text-slate-600">
        {L("सामुदायिक कार्यक्रम या पहल साझा करने के लिए", "To share a community event or initiative,")}{" "}
        <a href="/login?next=/community" className="font-semibold text-civic-700 underline">{t("nav_login")}</a>.
      </p>
    );
  }
  return (
    <div className="card">
      <button type="button" className="flex w-full items-center justify-between text-left font-bold text-slate-900" onClick={() => setOpen(!open)} aria-expanded={open}>
        ➕ {L("सामुदायिक पोस्ट साझा करें", "Share a community post")} <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <form onSubmit={submit} className="mt-4 space-y-4">
          {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={L("प्रकार", "Type")} required>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CommunityPostType })}>
                {COMMUNITY_POST_TYPES.map((ty) => <option key={ty} value={ty}>{lang === "hi" ? COMMUNITY_TYPE_LABELS[ty].hi : COMMUNITY_TYPE_LABELS[ty].en}</option>)}
              </select>
            </Field>
            <Field label={L("कार्यक्रम दिनांक (वैकल्पिक)", "Event date (optional)")}>
              <input className="input" type="datetime-local" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
            </Field>
          </div>
          <Field label={L("शीर्षक", "Title")} required>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} minLength={3} maxLength={200} required />
          </Field>
          <Field label={L("विवरण", "Details")} required hint={L("कम से कम 10 अक्षर। असत्यापित आरोप या मानहानिकारक सामग्री स्वीकार नहीं की जाएगी।", "At least 10 characters. Unverified accusations or defamatory content will not be approved.")}>
            <textarea className="input" rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} minLength={10} maxLength={5000} required />
          </Field>
          <Field label={L("स्थान (वैकल्पिक)", "Location (optional)")}>
            <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={250} />
          </Field>
          <button className="btn-primary" disabled={busy}>{busy ? t("common_loading") : t("common_submit")}</button>
        </form>
      )}
    </div>
  );
}
