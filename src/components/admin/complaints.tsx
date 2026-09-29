"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { api, qs } from "@/lib/client-api";
import { COMPLAINT_PRIORITIES, COMPLAINT_STATUSES, PRIORITY_LABELS, STATUS_LABELS, type ComplaintPriority, type ComplaintStatus } from "@/shared/constants";
import { formatDate } from "@/shared/i18n";
import type { AreaDto, CategoryDto, ComplaintDetailDto, ComplaintDto, Paged } from "@/shared/types";
import { StatusTimeline, updateTypeLabel } from "../complaint-detail-view";
import { Alert, EmptyState, Field, Pagination, PriorityBadge, Spinner, StatusBadge } from "../ui";

type AdminLite = { id: string; name: string; role: string; department: string | null };

/* ------------------------------------------------------------------ */
/* List                                                                 */
/* ------------------------------------------------------------------ */
export function AdminComplaintsList({ admins }: { admins: AdminLite[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [meta, setMeta] = useState<{ categories: CategoryDto[]; areas: AreaDto[] } | null>(null);
  const [data, setData] = useState<Paged<ComplaintDto> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grouped">("grouped");

  const filters = {
    q: sp.get("q") ?? "",
    status: sp.get("status") ?? "",
    categoryId: sp.get("categoryId") ?? "",
    areaId: sp.get("areaId") ?? "",
    priority: sp.get("priority") ?? "",
    assignedAdminId: sp.get("assignedAdminId") ?? "",
    from: sp.get("from") ?? "",
    to: sp.get("to") ?? "",
    page: Number(sp.get("page") ?? 1),
  };

  useEffect(() => {
    api<{ categories: CategoryDto[]; areas: AreaDto[] }>("/api/meta").then(setMeta).catch(() => {});
  }, []);

  const searchParamsStr = sp.toString();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    api<Paged<ComplaintDto>>(`/api/admin/complaints${qs({ ...filters, pageSize: 50 })}`).then(setData).catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsStr]);

  function setCategoryFilter(catId: string) {
    const params = new URLSearchParams(sp.toString());
    if (catId) {
      params.set("categoryId", catId);
    } else {
      params.delete("categoryId");
    }
    params.set("page", "1");
    router.push(`/admin/complaints?${params.toString()}`);
  }

  function apply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    fd.forEach((v, k) => typeof v === "string" && v && params.set(k, v));
    router.push(`/admin/complaints?${params.toString()}`);
  }

  const pageHref = (p: number) => {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(p));
    return `/admin/complaints?${params.toString()}`;
  };

  // Group complaints by Category for Category-Wise View
  const groupedComplaints = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { category: CategoryDto | null; items: ComplaintDto[] }>();
    
    data.items.forEach((item) => {
      const catKey = item.category?.id || "uncategorized";
      if (!map.has(catKey)) {
        map.set(catKey, { category: item.category || null, items: [] });
      }
      map.get(catKey)!.items.push(item);
    });
    return Array.from(map.values());
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Category-Wise Quick Filter Bar */}
      {meta?.categories && meta.categories.length > 0 && (
        <div className="card space-y-2.5 bg-gradient-to-r from-civic-900 to-navy-900 text-white">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-sm flex items-center gap-1.5 text-amber-300">
              🏷️ श्रेणी अनुसार फ़िल्टर (Category Filter)
            </h2>
            <div className="flex items-center gap-1 bg-white/10 p-1 rounded-lg text-xs">
              <button
                type="button"
                className={`px-2.5 py-1 rounded font-semibold transition ${viewMode === "grouped" ? "bg-amber-400 text-slate-900 shadow" : "text-white hover:bg-white/10"}`}
                onClick={() => setViewMode("grouped")}
              >
                🗂️ श्रेणीबद्ध देखें (Grouped)
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 rounded font-semibold transition ${viewMode === "list" ? "bg-amber-400 text-slate-900 shadow" : "text-white hover:bg-white/10"}`}
                onClick={() => setViewMode("list")}
              >
                📋 सूची देखें (List)
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                !filters.categoryId
                  ? "bg-amber-400 text-slate-900 ring-2 ring-amber-300"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
              onClick={() => setCategoryFilter("")}
            >
              <span>🌐</span> सभी श्रेणियाँ (All)
            </button>
            {meta.categories.map((c) => {
              const active = filters.categoryId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition flex items-center gap-1.5 ${
                    active
                      ? "bg-amber-400 text-slate-900 ring-2 ring-amber-300 font-bold"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                  onClick={() => setCategoryFilter(c.id)}
                >
                  <span>{c.icon || "📌"}</span>
                  <span>{c.nameHi || c.nameEn}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Advanced Filter Form */}
      <form onSubmit={apply} className="card grid gap-3 md:grid-cols-4">
        <div className="md:col-span-4">
          <label className="label" htmlFor="q">Search (ID, title, resident name, mobile)</label>
          <input id="q" name="q" className="input" defaultValue={filters.q} placeholder="JSM-2026-000001 / street light / 98…" />
        </div>
        <Sel name="status" label="Status" value={filters.status} options={COMPLAINT_STATUSES.map((s) => [s, STATUS_LABELS[s].en])} />
        <Sel name="wardNumber" label="Ward" value={sp.get("wardNumber") ?? ""} options={[["12", "Ward 12"], ["13", "Ward 13"], ["14", "Ward 14"]]} />
        <Sel name="categoryId" label="Category" value={filters.categoryId} options={(meta?.categories ?? []).map((c) => [c.id, c.nameEn])} />
        <Sel name="areaId" label="Locality" value={filters.areaId} options={(meta?.areas ?? []).filter((a) => a.type !== "CITY").map((a) => [a.id, a.name])} />
        <Sel name="priority" label="Priority" value={filters.priority} options={COMPLAINT_PRIORITIES.map((p) => [p, PRIORITY_LABELS[p].en])} />
        <Sel name="assignedAdminId" label="Assigned admin" value={filters.assignedAdminId} options={admins.map((a) => [a.id, a.name])} />
        <div><label className="label" htmlFor="from">From</label><input id="from" name="from" type="date" className="input" defaultValue={filters.from} /></div>
        <div><label className="label" htmlFor="to">To</label><input id="to" name="to" type="date" className="input" defaultValue={filters.to} /></div>
        <div className="flex items-end gap-2 md:col-span-4">
          <button className="btn-primary flex-1">Apply Filters</button>
          <Link href="/admin/complaints" className="btn-ghost">Reset Filters</Link>
        </div>
      </form>

      {error && <Alert kind="error">{error}</Alert>}
      {!data ? (
        <Spinner />
      ) : data.items.length === 0 ? (
        <EmptyState title="कोई शिकायत उपलब्ध नहीं है।" hint="No complaints match these filters yet." />
      ) : viewMode === "grouped" ? (
        /* CATEGORY-WISE GROUPED VIEW */
        <div className="space-y-4">
          {groupedComplaints.map((group: { category: CategoryDto | null; items: ComplaintDto[] }) => (
            <div key={group.category?.id || "uncategorized"} className="card border-civic-200 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <h3 className="font-extrabold text-base text-civic-900 flex items-center gap-2">
                  <span className="text-xl">{group.category?.icon || "📌"}</span>
                  <span>{group.category ? `${group.category.nameHi} / ${group.category.nameEn}` : "अन्य (Uncategorized)"}</span>
                </h3>
                <span className="chip bg-civic-100 text-civic-800 font-bold text-xs">
                  {group.items.length} शिकायतें
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {group.items.map((c: ComplaintDto) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-slate-50 px-2 rounded-lg transition">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/complaints/${c.code}`} className="font-mono text-xs font-bold text-civic-700 hover:underline">
                          {c.code}
                        </Link>
                        <StatusBadge status={c.status} lang="en" />
                        <PriorityBadge priority={c.priority} lang="en" />
                        {c.wardNumber && <span className="chip bg-slate-100 text-slate-700 text-[11px]">Ward {c.wardNumber}</span>}
                      </div>
                      <Link href={`/admin/complaints/${c.code}`} className="block font-semibold text-slate-900 text-sm hover:underline">
                        {c.title}
                      </Link>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                        <span>📍 {c.areaSource === "VERIFIED_AREA" ? c.area?.name || "—" : `✍️ ${c.manualAreaName || "Custom Area"}`}</span>
                        <span>👤 {c.userName || "Resident"} ({c.userMobile || "Confidential"})</span>
                        <span>📅 {formatDate(c.createdAt, "en", true)}</span>
                      </div>
                    </div>
                    <Link href={`/admin/complaints/${c.code}`} className="btn-secondary btn-sm whitespace-nowrap">
                      विवरण देखें ➔
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* STANDARD TABLE LIST VIEW */
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Category</th>
                <th>Ward & Locality</th>
                <th>Resident</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td>
                    <Link href={`/admin/complaints/${c.code}`} className="font-mono text-xs font-bold text-civic-700 hover:underline">
                      {c.code}
                    </Link>
                  </td>
                  <td className="max-w-[260px]">
                    <Link href={`/admin/complaints/${c.code}`} className="line-clamp-2 font-medium text-slate-900 hover:underline">
                      {c.title}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap font-medium text-xs">
                    {c.category ? `${c.category.icon || "📌"} ${c.category.nameHi || c.category.nameEn}` : "—"}
                  </td>
                  <td className="text-xs">
                    <span className="font-semibold text-slate-800">{c.wardNumber ? `Ward ${c.wardNumber}` : "—"}</span>
                    <span className="block text-slate-500">{c.areaSource === "VERIFIED_AREA" ? c.area?.name || "—" : `✍️ ${c.manualAreaName || "Custom Area"}`}</span>
                  </td>
                  <td>
                    {c.userName ?? "—"}
                    {c.userMobile && <span className="block font-mono text-xs text-slate-500">{c.userMobile}</span>}
                  </td>
                  <td><PriorityBadge priority={c.priority} lang="en" /></td>
                  <td><StatusBadge status={c.status} lang="en" /></td>
                  <td className="whitespace-nowrap text-xs">{formatDate(c.createdAt, "en", true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && <p className="mt-2 text-xs text-slate-500">{data.pagination.total} complaints found</p>}
      {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} hrefFor={pageHref} lang="en" />}
    </div>
  );
}

function Sel({ name, label, value, options }: { name: string; label: string; value: string; options: [string, string][] }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <select id={name} name={name} className="input" defaultValue={value}>
        <option value="">All</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail + actions                                                     */
/* ------------------------------------------------------------------ */
type ActionKind = "VERIFY" | "STATUS" | "ASSIGN" | "FORWARD" | "NOTE" | "PUBLIC_UPDATE" | "REQUEST_INFO" | "DUPLICATE" | "RESOLVE" | "PRIORITY" | "VISIBILITY";

const ACTIONS: { kind: ActionKind; label: string; icon: string; permission: string; style?: string }[] = [
  { kind: "VERIFY", label: "Verify", icon: "✅", permission: "complaints.verify", style: "btn-green" },
  { kind: "ASSIGN", label: "Assign", icon: "👤", permission: "complaints.assign" },
  { kind: "FORWARD", label: "Forward", icon: "📤", permission: "complaints.forward" },
  { kind: "STATUS", label: "Change status", icon: "🔄", permission: "complaints.update_status" },
  { kind: "PUBLIC_UPDATE", label: "Public update", icon: "📣", permission: "complaints.public_update" },
  { kind: "NOTE", label: "Internal note", icon: "🗒️", permission: "complaints.note" },
  { kind: "REQUEST_INFO", label: "Request info", icon: "❓", permission: "complaints.request_info" },
  { kind: "DUPLICATE", label: "Mark duplicate", icon: "🔁", permission: "complaints.duplicate" },
  { kind: "RESOLVE", label: "Resolve", icon: "🏁", permission: "complaints.resolve", style: "btn-green" },
  { kind: "PRIORITY", label: "Priority", icon: "⚡", permission: "complaints.update_status" },
  { kind: "VISIBILITY", label: "Visibility", icon: "👁️", permission: "complaints.update_status" },
];

function maskMobile(mobile: string): string {
  return mobile.length >= 10 ? `${mobile.slice(0, 2)}XXXXXX${mobile.slice(-2)}` : "XXXXXXXXXX";
}

export function AdminComplaintDetail({ initial, admins, permissions }: { initial: ComplaintDetailDto; admins: AdminLite[]; permissions: string[] }) {
  const canSeeSensitive = permissions.includes("complaints.view_sensitive");
  const [d, setD] = useState(initial);
  const [action, setAction] = useState<ActionKind | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  async function run(e: FormEvent) {
    e.preventDefault();
    if (!action) return;
    setBusy(true);
    setMsg(null);
    try {
      const payload: Record<string, unknown> = { action, ...form };
      if (action === "STATUS") payload.isPublic = form.isPublic !== "false";
      if (action === "VISIBILITY") payload.isPublic = form.isPublic === "true";
      const fresh = await api<ComplaintDetailDto>(`/api/admin/complaints/${d.code}`, { method: "PATCH", json: payload });
      setD(fresh);
      setAction(null);
      setForm({});
      setMsg({ kind: "success", text: "Action recorded. Resident notified where applicable." });
      router.refresh();
    } catch (err) {
      setMsg({ kind: "error", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const available = ACTIONS.filter((a) => permissions.includes(a.permission));

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <div className="space-y-5 xl:col-span-2">
        <div className="card">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-civic-700">{d.code}</span>
            <StatusBadge status={d.status} lang="en" />
            <PriorityBadge priority={d.priority} lang="en" />
            {!d.isPublic && <span className="chip bg-slate-100 text-slate-600 ring-slate-200">🔒 Private</span>}
            {d.isDemo && <span className="chip bg-yellow-50 text-yellow-800 ring-yellow-200">DEMO</span>}
            <Link href={`/complaints/${d.code}`} target="_blank" className="ml-auto text-xs text-civic-700 underline">Public view ↗</Link>
          </div>
          <h1 className="mt-2 text-xl font-bold text-slate-900">{d.title}</h1>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{d.description}</p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm divide-y divide-slate-200">
              <tbody className="divide-y divide-slate-100">
                <TR label="Category (श्रेणी)" value={d.category ? `${d.category.icon || "📌"} ${d.category.nameHi || d.category.nameEn}` : "—"} />
                <TR label="Ward Number (वार्ड)" value={d.wardNumber ? `Ward ${d.wardNumber}` : "—"} />
                <TR label="Locality / Area (क्षेत्र)" value={d.areaSource === "VERIFIED_AREA" ? (d.area ? `✅ ${d.area.name}` : "—") : `✍️ ${d.manualAreaName || "Custom Area"}`} />
                <TR label="Complete Address (पूरा पता)" value={d.address ?? "—"} />
                <TR label="Landmark (पहचान)" value={d.landmark ?? "—"} />
                <TR label="GPS Location (स्थान)" value={d.latitude ? `${d.latitude}, ${d.longitude}` : "—"} />
                <TR label="Department (विभाग)" value={d.department ?? "—"} />
                <TR label="Forwarded To (आगे प्रेषित)" value={d.forwardedTo ?? "—"} />
                <TR label="Assigned Admin (प्रशासक)" value={d.assignedAdmin ? `${d.assignedAdmin.name}${d.assignedAdmin.department ? ` (${d.assignedAdmin.department})` : ""}` : "—"} />
                <TR label="Contact Preference (संपर्क)" value={d.contactPreference ?? "—"} />
                <TR label="Submitted Date (दर्ज तिथि)" value={formatDate(d.createdAt, "en", true)} />
                <TR label="Last Update (अंतिम अपडेट)" value={formatDate(d.lastUpdateAt, "en", true)} />
                {d.resolvedAt && <TR label="Resolved Date (समाधान तिथि)" value={formatDate(d.resolvedAt, "en", true)} />}
                {d.duplicateOf && <TR label="Duplicate Of (मूल शिकायत)" value={d.duplicateOf.code} />}
              </tbody>
            </table>
          </div>
          {d.latitude && d.longitude && (
            <a className="mt-3 inline-block text-sm text-civic-700 underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${d.latitude}&mlon=${d.longitude}#map=17/${d.latitude}/${d.longitude}`}>Open location on map ↗</a>
          )}
        </div>

        {d.resident && (
          <div className="card border-amber-200 bg-amber-50/40 space-y-3">
            <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span>👤</span> Resident Details (Confidential / गोपनीय नागरिक जानकारी)
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm divide-y divide-slate-200">
                <tbody className="divide-y divide-slate-100">
                  <TR label="Name (नाम)" value={d.resident.name ?? "—"} />
                  <TR label="Mobile (मोबाइल)" value={canSeeSensitive ? `+91 ${d.resident.mobile}` : `${maskMobile(d.resident.mobile)} (masked)`} isMono />
                  <TR label="Email (ईमेल)" value={canSeeSensitive ? (d.resident.email ?? "—") : d.resident.email ? "(hidden)" : "—"} />
                  <TR label="Address (पता)" value={canSeeSensitive ? (d.resident.address ?? "—") : d.resident.address ? "(hidden)" : "—"} />
                </tbody>
              </table>
            </div>
            {!canSeeSensitive && <p className="text-xs text-slate-500">Your role does not include sensitive-data access; contact details are masked.</p>}
          </div>
        )}

        <div className="card">
          <h2 className="mb-3 font-bold text-slate-900">Timeline</h2>
          <StatusTimeline updates={d.updates} status={d.status} lang="en" />
        </div>

        {d.documents.length > 0 && (
          <div className="card">
            <h2 className="mb-3 font-bold text-slate-900">Files ({d.documents.length})</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {d.documents.map((f) => (
                <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {f.kind === "IMAGE" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.url} alt={f.originalName} className="aspect-square w-full object-cover" loading="lazy" />
                  ) : <div className="flex aspect-square items-center justify-center text-3xl">{f.kind === "VIDEO" ? "🎬" : "📄"}</div>}
                  <p className="truncate px-2 py-1 text-xs">{f.originalName}{!f.isPublic && " 🔒"}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <h2 className="mb-3 font-bold text-slate-900">History & notes</h2>
          <ul className="space-y-2">
            {[...d.updates].reverse().map((u) => (
              <li key={u.id} className={`rounded-lg border p-3 text-sm ${u.isPublic ? "border-slate-200" : "border-amber-200 bg-amber-50"}`}>
                <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{u.byUser ? "Resident" : u.byAdmin ?? "System"} • {updateTypeLabel(u.type, "en")}{!u.isPublic && " • internal"}</span>
                  <span>{formatDate(u.createdAt, "en", true)}</span>
                </div>
                {u.newStatus && <p className="mt-1 flex items-center gap-1 text-xs">{u.oldStatus && <><StatusBadge status={u.oldStatus} lang="en" /> →</>} <StatusBadge status={u.newStatus} lang="en" /></p>}
                {u.message && <p className="mt-1 whitespace-pre-wrap text-slate-700">{u.message}</p>}
              </li>
            ))}
          </ul>
          {d.feedback.length > 0 && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-semibold">Resident feedback</p>
              {d.feedback.map((f) => <p key={f.id} className="text-slate-700">{f.isResolved ? "✅ Problem resolved" : "⚠️ Problem still exists"}{f.rating ? ` • ${f.rating}/5` : ""}{f.comment ? ` — ${f.comment}` : ""} <span className="text-xs text-slate-500">({formatDate(f.createdAt, "en", true)})</span></p>)}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <div className="card">
          <h2 className="font-bold text-slate-900">Actions</h2>
          {msg && <div className="mt-2"><Alert kind={msg.kind}>{msg.text}</Alert></div>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {available.map((a) => (
              <button key={a.kind} type="button" onClick={() => { setAction(a.kind); setForm({}); setMsg(null); }} className={`${action === a.kind ? "btn-primary" : a.style ?? "btn-secondary"} btn-sm justify-start`}>
                <span aria-hidden>{a.icon}</span> {a.label}
              </button>
            ))}
            {available.length === 0 && <p className="col-span-2 text-sm text-slate-500">Your role has read-only access.</p>}
          </div>

          {action && (
            <form onSubmit={run} className="mt-4 space-y-3 border-t border-slate-200 pt-4">
              <p className="text-sm font-semibold text-slate-800">{ACTIONS.find((a) => a.kind === action)?.label}</p>
              {action === "STATUS" && (
                <>
                  <Field label="New status" required>
                    <select className="input" required value={form.status ?? ""} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="">Select…</option>
                      {COMPLAINT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s].en} / {STATUS_LABELS[s].hi}</option>)}
                    </select>
                  </Field>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublic !== "false"} onChange={(e) => setForm({ ...form, isPublic: e.target.checked ? "true" : "false" })} /> Show this update to the resident</label>
                </>
              )}
              {action === "ASSIGN" && (
                <>
                  <Field label="Assign to admin">
                    <select className="input" value={form.adminId ?? ""} onChange={(e) => setForm({ ...form, adminId: e.target.value })}>
                      <option value="">— none —</option>
                      {admins.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.role}{a.department ? `, ${a.department}` : ""})</option>)}
                    </select>
                  </Field>
                  <Field label="Department"><input className="input" value={form.department ?? d.department ?? ""} onChange={(e) => setForm({ ...form, department: e.target.value })} maxLength={150} /></Field>
                </>
              )}
              {action === "FORWARD" && <Field label="Forwarded to (department / officer)" required><input className="input" required value={form.forwardedTo ?? ""} onChange={(e) => setForm({ ...form, forwardedTo: e.target.value })} maxLength={200} /></Field>}
              {action === "DUPLICATE" && <Field label="Original complaint ID" required><input className="input font-mono uppercase" required placeholder="DPF-2026-000001" value={form.duplicateOfCode ?? ""} onChange={(e) => setForm({ ...form, duplicateOfCode: e.target.value.toUpperCase() })} /></Field>}
              {action === "PRIORITY" && (
                <Field label="Priority" required>
                  <select className="input" required value={form.priority ?? ""} onChange={(e) => setForm({ ...form, priority: e.target.value as ComplaintPriority })}>
                    <option value="">Select…</option>
                    {COMPLAINT_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p].en}</option>)}
                  </select>
                </Field>
              )}
              {action === "VISIBILITY" && (
                <Field label="Public visibility" required>
                  <select className="input" required value={form.isPublic ?? ""} onChange={(e) => setForm({ ...form, isPublic: e.target.value })}>
                    <option value="">Select…</option>
                    <option value="true">Public (title/status visible to everyone)</option>
                    <option value="false">Private (owner and admins only)</option>
                  </select>
                </Field>
              )}
              {action !== "PRIORITY" && action !== "VISIBILITY" && (
                <Field label={action === "NOTE" ? "Internal note (not visible to resident)" : action === "PUBLIC_UPDATE" || action === "REQUEST_INFO" ? "Message to resident" : "Message (optional)"} required={["NOTE", "PUBLIC_UPDATE", "REQUEST_INFO"].includes(action)}>
                  <textarea className="input" rows={3} required={["NOTE", "PUBLIC_UPDATE", "REQUEST_INFO"].includes(action)} value={form.message ?? ""} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={2000} />
                </Field>
              )}
              <div className="flex gap-2">
                <button className="btn-primary flex-1" disabled={busy}>{busy ? "Saving…" : "Apply"}</button>
                <button type="button" className="btn-ghost" onClick={() => setAction(null)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
        <div className="card text-xs text-slate-500">
          Every action creates a history record, an audit log entry (with your IP) and — for public changes — a notification to the resident. Status flow: {(["SUBMITTED", "VERIFIED", "ASSIGNED", "FORWARDED", "IN_PROGRESS", "ACTION_TAKEN", "RESOLVED"] as ComplaintStatus[]).map((s) => STATUS_LABELS[s].en).join(" → ")}.
        </div>
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div><dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt><dd className="font-medium text-slate-800">{v}</dd></div>
  );
}

function TR({ label, value, isMono }: { label: string; value: React.ReactNode; isMono?: boolean }) {
  return (
    <tr className="hover:bg-slate-50/80 transition">
      <td className="w-1/3 sm:w-1/4 bg-slate-50/70 px-3.5 py-2.5 font-semibold text-xs text-slate-600 uppercase tracking-wider border-r border-slate-100">
        {label}
      </td>
      <td className={`px-3.5 py-2.5 text-sm text-slate-900 break-words ${isMono ? "font-mono font-bold text-civic-800" : ""}`}>
        {value}
      </td>
    </tr>
  );
}
