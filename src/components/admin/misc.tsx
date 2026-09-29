"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { api, qs } from "@/lib/client-api";
import { ADMIN_ROLES, ROLE_LABELS, type AdminRole } from "@/shared/constants";
import { formatDate } from "@/shared/i18n";
import type { Paged } from "@/shared/types";
import type { SafeAdmin } from "@/server/services/admin";
import type { SystemSettings } from "@/server/services/settings";
import { Alert, EmptyState, Field, Pagination, Spinner } from "../ui";

/* ------------------------------ Residents ------------------------------ */
type UserRow = { id: string; name: string | null; mobile: string; email: string | null; area: { name: string } | null; isActive: boolean; language: string; deletionRequestedAt: string | null; lastLoginAt: string | null; createdAt: string; complaintCount: number };

export function UsersTable({ canManage }: { canManage: boolean }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<UserRow> | null>(null);
  const load = useCallback(() => {
    api<Paged<UserRow>>(`/api/admin/users${qs({ q, page, pageSize: 20 })}`).then(setData).catch(() => {});
  }, [q, page]);
  useEffect(load, [load]);
  async function toggle(u: UserRow) {
    await api(`/api/admin/users/${u.id}`, { method: "PATCH", json: { isActive: !u.isActive } });
    load();
  }
  return (
    <div>
      <div className="card mb-4"><label className="label" htmlFor="uq">Search by name, mobile or email</label><input id="uq" className="input" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
      {!data ? <Spinner /> : data.items.length === 0 ? <EmptyState title="No residents found." /> : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Name</th><th>Mobile</th><th>Email</th><th>Locality</th><th>Complaints</th><th>Lang</th><th>Joined</th><th>Status</th>{canManage && <th></th>}</tr></thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium text-slate-900">{u.name ?? "—"}{u.deletionRequestedAt && <span className="ml-2 chip bg-rose-50 text-rose-700 ring-rose-200">Deletion requested</span>}</td>
                  <td className="font-mono text-xs">{u.mobile}</td>
                  <td>{u.email ?? "—"}</td>
                  <td>{u.area?.name ?? "—"}</td>
                  <td>{u.complaintCount}</td>
                  <td>{u.language}</td>
                  <td className="text-xs">{formatDate(u.createdAt, "en")}</td>
                  <td>{u.isActive ? <span className="chip bg-leaf-50 text-leaf-700 ring-leaf-100">Active</span> : <span className="chip bg-slate-100 text-slate-600 ring-slate-200">Disabled</span>}</td>
                  {canManage && <td><button type="button" className="btn-secondary btn-sm" onClick={() => toggle(u)}>{u.isActive ? "Disable" : "Enable"}</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} lang="en" />}
    </div>
  );
}

/* ------------------------------ Admin team ------------------------------ */
export function AdminsManager({ canManage, selfId }: { canManage: boolean; selfId: string }) {
  const [items, setItems] = useState<SafeAdmin[] | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "COMPLAINT_ADMIN" as AdminRole, department: "" });
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [showNew, setShowNew] = useState(false);
  const load = useCallback(() => {
    api<{ items: SafeAdmin[] }>("/api/admin/admins").then((r) => setItems(r.items)).catch((e) => setMsg({ kind: "error", text: (e as Error).message }));
  }, []);
  useEffect(load, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api("/api/admin/admins", { method: "POST", json: { ...form, department: form.department || undefined } });
      setMsg({ kind: "success", text: "Admin created. They must change the password on first login." });
      setForm({ name: "", email: "", password: "", role: "COMPLAINT_ADMIN", department: "" });
      setShowNew(false);
      load();
    } catch (err) {
      setMsg({ kind: "error", text: (err as Error).message });
    }
  }
  async function patch(id: string, body: Record<string, unknown>) {
    setMsg(null);
    try {
      await api(`/api/admin/admins/${id}`, { method: "PATCH", json: body });
      load();
    } catch (err) {
      setMsg({ kind: "error", text: (err as Error).message });
    }
  }
  return (
    <div>
      {msg && <div className="mb-3"><Alert kind={msg.kind}>{msg.text}</Alert></div>}
      {canManage && (
        <div className="mb-4">
          {!showNew ? <button type="button" className="btn-primary btn-sm" onClick={() => setShowNew(true)}>＋ Add admin</button> : (
            <form onSubmit={create} className="card grid gap-3 md:grid-cols-5">
              <Field label="Name" required><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Email" required><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="Temporary password" required hint="Min 10 chars, upper/lower/digit"><input className="input" type="text" required minLength={10} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
              <Field label="Role" required><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}>{ADMIN_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></Field>
              <Field label="Department"><input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
              <div className="flex gap-2 md:col-span-5"><button className="btn-primary btn-sm">Create</button><button type="button" className="btn-ghost btn-sm" onClick={() => setShowNew(false)}>Cancel</button></div>
            </form>
          )}
        </div>
      )}
      {!items ? <Spinner /> : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>2FA</th><th>Last login</th><th>Status</th>{canManage && <th></th>}</tr></thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium text-slate-900">{a.name}{a.id === selfId && <span className="ml-1 text-xs text-slate-400">(you)</span>}</td>
                  <td>{a.email}</td>
                  <td>{canManage && a.id !== selfId ? <select className="input py-1" value={a.role} onChange={(e) => patch(a.id, { role: e.target.value })}>{ADMIN_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select> : ROLE_LABELS[a.role]}</td>
                  <td>{a.department ?? "—"}</td>
                  <td>{a.twoFactorEnabled ? "✅" : "—"}</td>
                  <td className="text-xs">{a.lastLoginAt ? formatDate(a.lastLoginAt, "en", true) : "never"}</td>
                  <td>{a.isActive ? <span className="chip bg-leaf-50 text-leaf-700 ring-leaf-100">Active</span> : <span className="chip bg-slate-100 text-slate-600 ring-slate-200">Disabled</span>}{a.mustChangePassword && <span className="ml-1 chip bg-amber-50 text-amber-700 ring-amber-200">pwd reset</span>}</td>
                  {canManage && (
                    <td className="whitespace-nowrap">
                      {a.id !== selfId && <button type="button" className="btn-secondary btn-sm mr-1" onClick={() => patch(a.id, { isActive: !a.isActive })}>{a.isActive ? "Disable" : "Enable"}</button>}
                      <button type="button" className="btn-ghost btn-sm" onClick={() => { const p = prompt("New temporary password (min 10 chars, upper/lower/digit):"); if (p) patch(a.id, { resetPassword: p }); }}>Reset pwd</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="card mt-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-800">Role permissions</p>
        <ul className="mt-1 grid gap-1 md:grid-cols-2">
          <li><b>SUPER_ADMIN</b> — full access incl. critical settings and admin accounts</li>
          <li><b>COMPLAINT_ADMIN</b> — complaints, residents, reports. No content or settings access</li>
          <li><b>CONTENT_ADMIN</b> — notices, development works, services, community, localities</li>
          <li><b>MODERATOR</b> — verify/review complaints and moderate community posts</li>
          <li><b>VIEWER</b> — read-only analytics and audit logs</li>
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------ Audit logs ------------------------------ */
type AuditRow = { id: string; adminEmail: string | null; adminName: string | null; action: string; entityType: string; entityId: string | null; oldValue: unknown; newValue: unknown; ipAddress: string | null; createdAt: string };

export function AuditLogTable() {
  const [q, setQ] = useState("");
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<AuditRow> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    api<Paged<AuditRow>>(`/api/admin/audit-logs${qs({ q, entityType, page, pageSize: 25 })}`).then(setData).catch(() => {});
  }, [q, entityType, page]);
  return (
    <div>
      <div className="card mb-4 grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2"><label className="label" htmlFor="aq">Search (action, entity id, admin email)</label><input id="aq" className="input" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
        <div><label className="label" htmlFor="et">Entity</label><select id="et" className="input" value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }}><option value="">All</option>{["complaint", "notice", "development_project", "government_service", "community_post", "area", "complaint_category", "admin", "user", "system_settings"].map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
      </div>
      {!data ? <Spinner /> : data.items.length === 0 ? <EmptyState title="No audit entries." /> : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Entity</th><th>IP</th><th>Change</th></tr></thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-xs">{formatDate(r.createdAt, "en", true)}</td>
                  <td>{r.adminName ?? "—"}<span className="block text-xs text-slate-500">{r.adminEmail}</span></td>
                  <td className="font-mono text-xs">{r.action}</td>
                  <td className="text-xs">{r.entityType}<span className="block font-mono text-slate-500">{r.entityId}</span></td>
                  <td className="font-mono text-xs">{r.ipAddress ?? "—"}</td>
                  <td>
                    <button type="button" className="text-xs text-civic-700 underline" onClick={() => setOpenId(openId === r.id ? null : r.id)}>{openId === r.id ? "hide" : "view"}</button>
                    {openId === r.id && (
                      <div className="mt-1 grid gap-2 md:grid-cols-2">
                        <pre className="max-h-48 overflow-auto rounded bg-slate-50 p-2 text-[11px]">old: {JSON.stringify(r.oldValue, null, 1)}</pre>
                        <pre className="max-h-48 overflow-auto rounded bg-slate-50 p-2 text-[11px]">new: {JSON.stringify(r.newValue, null, 1)}</pre>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} lang="en" />}
      <p className="mt-2 text-xs text-slate-500">Audit logs are append-only; there is no API to edit or delete them.</p>
    </div>
  );
}

/* ------------------------------ Settings ------------------------------ */
type Integrations = { email: { configured: boolean; provider: string }; push: { configured: boolean; provider: string }; storage: { configured: boolean; provider: string }; telegram: { configured: boolean; provider: string } };

export function SettingsForm({ isSuper }: { isSuper: boolean }) {
  const [s, setS] = useState<SystemSettings | null>(null);
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ settings: SystemSettings; integrations: Integrations }>("/api/admin/settings").then((r) => { setS(r.settings); setIntegrations(r.integrations); }).catch((e) => setMsg({ kind: "error", text: (e as Error).message }));
  }, []);
  if (!s) return <Spinner />;
  const set = <K extends keyof SystemSettings>(k: K, v: SystemSettings[K]) => setS({ ...s, [k]: v });
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!s) return;
    setBusy(true);
    setMsg(null);
    const general = { organizationName: s.organizationName, organizationNameHi: s.organizationNameHi, logoUrl: s.logoUrl ?? "", contactNumber: s.contactNumber ?? "", contactEmail: s.contactEmail ?? "", website: s.website ?? "", notifyAdminsOnNewComplaint: s.notifyAdminsOnNewComplaint, notifyUsersByEmail: s.notifyUsersByEmail, systemAnnouncement: s.systemAnnouncement ?? "", systemAnnouncementHi: s.systemAnnouncementHi ?? "" };
    const critical = isSuper ? { maintenanceMode: s.maintenanceMode, require2fa: s.require2fa, imageMaxMb: s.imageMaxMb, documentMaxMb: s.documentMaxMb, defaultAreaId: s.defaultAreaId ?? "" } : {};
    try {
      const r = await api<{ settings: SystemSettings }>("/api/admin/settings", { method: "PATCH", json: { ...general, ...critical } });
      setS(r.settings);
      setMsg({ kind: "success", text: "Settings saved." });
    } catch (err) {
      setMsg({ kind: "error", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }
  const renderToggle = (k: keyof SystemSettings, label: string, disabled?: boolean) => (
    <label className={`flex items-center gap-2 text-sm ${disabled ? "opacity-60" : ""}`}>
      <input type="checkbox" disabled={disabled} checked={Boolean(s[k])} onChange={(e) => set(k, e.target.checked as never)} /> {label}
    </label>
  );
  return (
    <form onSubmit={save} className="space-y-5">
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="card grid gap-4 md:grid-cols-2">
        <h2 className="font-bold text-slate-900 md:col-span-2">Organisation</h2>
        <Field label="Organisation name"><input className="input" value={s.organizationName} onChange={(e) => set("organizationName", e.target.value)} /></Field>
        <Field label="संगठन का नाम (हिन्दी)"><input className="input" value={s.organizationNameHi} onChange={(e) => set("organizationNameHi", e.target.value)} /></Field>
        <Field label="Logo URL"><input className="input" type="url" value={s.logoUrl ?? ""} onChange={(e) => set("logoUrl", e.target.value)} /></Field>
        <Field label="Contact number"><input className="input" value={s.contactNumber ?? ""} onChange={(e) => set("contactNumber", e.target.value)} /></Field>
        <Field label="Contact email"><input className="input" type="email" value={s.contactEmail ?? ""} onChange={(e) => set("contactEmail", e.target.value)} /></Field>
        <Field label="Website"><input className="input" type="url" value={s.website ?? ""} onChange={(e) => set("website", e.target.value)} /></Field>
        <Field label="System announcement (English)"><input className="input" value={s.systemAnnouncement ?? ""} onChange={(e) => set("systemAnnouncement", e.target.value)} maxLength={500} /></Field>
        <Field label="सिस्टम घोषणा (हिन्दी)"><input className="input" value={s.systemAnnouncementHi ?? ""} onChange={(e) => set("systemAnnouncementHi", e.target.value)} maxLength={500} /></Field>
      </div>
      <div className="card space-y-2">
        <h2 className="font-bold text-slate-900">Notifications</h2>
        {renderToggle("notifyAdminsOnNewComplaint", "Notify admins when a new complaint is submitted")}
        {renderToggle("notifyUsersByEmail", "Send email to residents on complaint updates (requires email provider)")}
      </div>
      <div className={`card space-y-3 ${!isSuper ? "opacity-80" : ""}`}>
        <h2 className="font-bold text-slate-900">Critical settings {!isSuper && <span className="text-xs font-normal text-slate-500">(SUPER_ADMIN only)</span>}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Image max (MB)"><input className="input" type="number" min={1} max={50} disabled={!isSuper} value={s.imageMaxMb} onChange={(e) => set("imageMaxMb", Number(e.target.value))} /></Field>
          <Field label="Document max (MB)"><input className="input" type="number" min={1} max={50} disabled={!isSuper} value={s.documentMaxMb} onChange={(e) => set("documentMaxMb", Number(e.target.value))} /></Field>
        </div>
        {renderToggle("maintenanceMode", "Maintenance mode banner on public site", !isSuper)}
        {renderToggle("require2fa", "Require two-factor authentication for all admins", !isSuper)}
      </div>
      {integrations && (
        <div className="card">
          <h2 className="font-bold text-slate-900">Integrations (from environment variables)</h2>
          <ul className="mt-2 grid gap-2 text-sm md:grid-cols-2">
            {(["email", "push", "storage", "telegram"] as const).map((k) => (
              <li key={k} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"><span className="capitalize">{k}</span><span className={integrations[k].configured ? "text-leaf-700" : "text-slate-500"}>{integrations[k].configured ? "configured" : "not configured"} · {integrations[k].provider}</span></li>
            ))}
          </ul>
        </div>
      )}
      <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
    </form>
  );
}

/* ------------------------------ Account / 2FA ------------------------------ */
export function TwoFactorPanel({ enabled }: { enabled: boolean }) {
  const sp = useSearchParams();
  const [isEnabled, setEnabled] = useState(enabled);
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState("");
  // Surface the "2FA required" notice on first render when redirected with
  // ?setup2fa=1, via a lazy initializer instead of a synchronizing effect.
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(() =>
    sp.get("setup2fa") === "1" && !enabled
      ? { kind: "error", text: "Your organisation requires 2FA. Please set it up now." }
      : null,
  );
  async function start() {
    setMsg(null);
    try {
      setSetup(await api<{ secret: string; uri: string }>("/api/admin/2fa", { method: "POST", json: { action: "SETUP" } }));
    } catch (err) {
      setMsg({ kind: "error", text: (err as Error).message });
    }
  }
  async function confirm(action: "ENABLE" | "DISABLE") {
    setMsg(null);
    try {
      const r = await api<{ enabled: boolean }>("/api/admin/2fa", { method: "POST", json: { action, code } });
      setEnabled(r.enabled);
      setSetup(null);
      setCode("");
      setMsg({ kind: "success", text: r.enabled ? "Two-factor authentication enabled." : "Two-factor authentication disabled." });
    } catch (err) {
      setMsg({ kind: "error", text: (err as Error).message });
    }
  }
  return (
    <div className="card">
      <h2 className="font-bold text-slate-900">Two-factor authentication (TOTP)</h2>
      <p className="mt-1 text-sm text-slate-600">Status: {isEnabled ? <span className="font-semibold text-leaf-700">enabled</span> : <span className="font-semibold text-amber-700">not enabled</span>}</p>
      {msg && <div className="mt-3"><Alert kind={msg.kind}>{msg.text}</Alert></div>}
      {!isEnabled && !setup && <button type="button" className="btn-primary btn-sm mt-3" onClick={start}>Set up 2FA</button>}
      {setup && (
        <div className="mt-3 space-y-3 text-sm">
          <p>1. Add this secret to Google Authenticator / Authy (or scan the URI):</p>
          <p className="break-all rounded-lg bg-slate-50 p-3 font-mono text-xs">{setup.secret}</p>
          <p className="break-all rounded-lg bg-slate-50 p-3 font-mono text-[11px] text-slate-600">{setup.uri}</p>
          <p>2. Enter the 6-digit code to confirm:</p>
          <div className="flex gap-2"><input className="input max-w-[160px] tracking-widest" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /><button type="button" className="btn-green" onClick={() => confirm("ENABLE")} disabled={code.length !== 6}>Enable</button></div>
        </div>
      )}
      {isEnabled && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <input className="input max-w-[160px] tracking-widest" placeholder="123456" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <button type="button" className="btn-danger btn-sm" onClick={() => confirm("DISABLE")} disabled={code.length !== 6}>Disable 2FA</button>
        </div>
      )}
    </div>
  );
}
