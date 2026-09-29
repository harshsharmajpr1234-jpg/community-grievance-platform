"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, qs } from "@/lib/client-api";
import {
  AREA_TYPES,
  COMMUNITY_POST_STATUSES,
  COMMUNITY_POST_TYPES,
  COMMUNITY_TYPE_LABELS,
  COMPLAINT_PRIORITIES,
  NOTICE_CATEGORIES,
  NOTICE_CATEGORY_LABELS,
  NOTICE_STATUSES,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
} from "@/shared/constants";
import { formatDate } from "@/shared/i18n";
import type { AreaDto, Paged } from "@/shared/types";
import { Alert, EmptyState, Field, PageHeader, Pagination, Spinner } from "../ui";

export type ContentType = "notices" | "development" | "services" | "community" | "areas" | "categories";
type Row = Record<string, unknown> & { id: string };
type FieldType = "text" | "textarea" | "select" | "date" | "datetime" | "number" | "checkbox" | "url" | "urllist" | "doclist";
type FieldDef = { name: string; label: string; type: FieldType; options?: [string, string][]; optionsFrom?: "areas"; required?: boolean; hint?: string; full?: boolean; min?: number; max?: number };
type Column = { key: string; label: string; kind?: "date" | "bool" | "text" | "percent" };

const CONFIG: Record<ContentType, { title: string; subtitle: string; fields: FieldDef[]; columns: Column[]; filters?: { name: string; label: string; options: [string, string][] }[]; deleteLabel: string }> = {
  notices: {
    title: "Notices",
    subtitle: "Publish important public notices. Only PUBLISHED notices within their date range are visible to residents.",
    fields: [
      { name: "title", label: "Title (English)", type: "text", required: true },
      { name: "titleHi", label: "शीर्षक (हिन्दी)", type: "text" },
      { name: "description", label: "Description (English)", type: "textarea", required: true, full: true },
      { name: "descriptionHi", label: "विवरण (हिन्दी)", type: "textarea", full: true },
      { name: "category", label: "Category", type: "select", options: NOTICE_CATEGORIES.map((c) => [c, NOTICE_CATEGORY_LABELS[c].en]), required: true },
      { name: "priority", label: "Priority", type: "select", options: COMPLAINT_PRIORITIES.map((p) => [p, p]) },
      { name: "status", label: "Status", type: "select", options: NOTICE_STATUSES.map((s) => [s, s]) },
      { name: "areaId", label: "Locality (optional)", type: "select", optionsFrom: "areas" },
      { name: "publishDate", label: "Publish date", type: "datetime" },
      { name: "expiryDate", label: "Expiry date", type: "datetime" },
      { name: "imageUrl", label: "Image URL", type: "url" },
      { name: "attachmentUrl", label: "Attachment URL (PDF)", type: "url" },
      { name: "isPinned", label: "Pin to top", type: "checkbox" },
    ],
    columns: [{ key: "title", label: "Title" }, { key: "category", label: "Category" }, { key: "status", label: "Status" }, { key: "priority", label: "Priority" }, { key: "publishDate", label: "Publish", kind: "date" }, { key: "expiryDate", label: "Expiry", kind: "date" }],
    filters: [{ name: "status", label: "Status", options: NOTICE_STATUSES.map((s) => [s, s]) }, { name: "category", label: "Category", options: NOTICE_CATEGORIES.map((c) => [c, NOTICE_CATEGORY_LABELS[c].en]) }],
    deleteLabel: "Delete notice",
  },
  development: {
    title: "Development Works",
    subtitle: "Only enter information verified by an authorised admin. Never publish unverified project claims.",
    fields: [
      { name: "name", label: "Project name (English)", type: "text", required: true },
      { name: "nameHi", label: "परियोजना नाम (हिन्दी)", type: "text" },
      { name: "description", label: "Description", type: "textarea", required: true, full: true },
      { name: "location", label: "Location", type: "text" },
      { name: "areaId", label: "Locality", type: "select", optionsFrom: "areas" },
      { name: "department", label: "Department / agency", type: "text" },
      { name: "status", label: "Status", type: "select", options: PROJECT_STATUSES.map((s) => [s, PROJECT_STATUS_LABELS[s].en]) },
      { name: "progress", label: "Progress %", type: "number", min: 0, max: 100 },
      { name: "startDate", label: "Start date", type: "date" },
      { name: "expectedCompletion", label: "Expected completion", type: "date" },
      { name: "photos", label: "Photo URLs (one per line)", type: "urllist", full: true },
      { name: "documents", label: "Documents (Name | URL, one per line)", type: "doclist", full: true },
      { name: "sourceNote", label: "Source / verification note", type: "text", full: true, hint: "e.g. 'Verified with ward office letter dated …'" },
      { name: "updateMessage", label: "Progress update message (creates a history entry)", type: "textarea", full: true },
      { name: "isPublished", label: "Published (visible to public)", type: "checkbox" },
    ],
    columns: [{ key: "name", label: "Project" }, { key: "status", label: "Status" }, { key: "progress", label: "Progress", kind: "percent" }, { key: "department", label: "Agency" }, { key: "isPublished", label: "Published", kind: "bool" }, { key: "updatedAt", label: "Updated", kind: "date" }],
    filters: [{ name: "status", label: "Status", options: PROJECT_STATUSES.map((s) => [s, s]) }],
    deleteLabel: "Delete project",
  },
  services: {
    title: "Services Directory",
    subtitle: "Government/public service information. Mark official government entries clearly; verify phone numbers before publishing.",
    fields: [
      { name: "name", label: "Service name (English)", type: "text", required: true },
      { name: "nameHi", label: "सेवा नाम (हिन्दी)", type: "text" },
      { name: "department", label: "Department", type: "text", required: true },
      { name: "category", label: "Category", type: "select", options: SERVICE_CATEGORIES.map((c) => [c, SERVICE_CATEGORY_LABELS[c].en]), required: true },
      { name: "description", label: "Description", type: "textarea", full: true },
      { name: "phone", label: "Phone", type: "text" },
      { name: "website", label: "Official website", type: "url" },
      { name: "address", label: "Office address", type: "text", full: true },
      { name: "workingHours", label: "Working hours", type: "text" },
      { name: "sortOrder", label: "Sort order", type: "number", min: 0 },
      { name: "notes", label: "Notes", type: "textarea", full: true },
      { name: "isOfficial", label: "Official government entry", type: "checkbox" },
      { name: "isEmergency", label: "Emergency contact", type: "checkbox" },
      { name: "isActive", label: "Active", type: "checkbox" },
    ],
    columns: [{ key: "name", label: "Service" }, { key: "department", label: "Department" }, { key: "category", label: "Category" }, { key: "phone", label: "Phone" }, { key: "isOfficial", label: "Official", kind: "bool" }, { key: "isActive", label: "Active", kind: "bool" }],
    filters: [{ name: "category", label: "Category", options: SERVICE_CATEGORIES.map((c) => [c, SERVICE_CATEGORY_LABELS[c].en]) }],
    deleteLabel: "Delete service",
  },
  community: {
    title: "Community Posts",
    subtitle: "Resident submissions require approval. Reject unverified accusations or defamatory content.",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "type", label: "Type", type: "select", options: COMMUNITY_POST_TYPES.map((t) => [t, COMMUNITY_TYPE_LABELS[t].en]), required: true },
      { name: "content", label: "Content", type: "textarea", required: true, full: true },
      { name: "eventDate", label: "Event date", type: "datetime" },
      { name: "location", label: "Location", type: "text" },
      { name: "areaId", label: "Locality", type: "select", optionsFrom: "areas" },
      { name: "imageUrl", label: "Image URL", type: "url" },
      { name: "status", label: "Moderation status", type: "select", options: COMMUNITY_POST_STATUSES.map((s) => [s, s]) },
      { name: "reviewNote", label: "Review note (internal)", type: "text", full: true },
    ],
    columns: [{ key: "title", label: "Title" }, { key: "type", label: "Type" }, { key: "status", label: "Status" }, { key: "authorName", label: "Author" }, { key: "createdAt", label: "Created", kind: "date" }],
    filters: [{ name: "status", label: "Status", options: COMMUNITY_POST_STATUSES.map((s) => [s, s]) }],
    deleteLabel: "Delete post",
  },
  areas: {
    title: "Localities",
    subtitle: "Hierarchy: City → Zone → Locality/Colony → Street/Area. Complaints and notices can be tied to any level.",
    fields: [
      { name: "name", label: "Name (English)", type: "text", required: true },
      { name: "nameHi", label: "नाम (हिन्दी)", type: "text" },
      { name: "type", label: "Level", type: "select", options: AREA_TYPES.map((t) => [t, t]), required: true },
      { name: "parentId", label: "Parent area", type: "select", optionsFrom: "areas" },
      { name: "sortOrder", label: "Sort order", type: "number", min: 0 },
      { name: "isActive", label: "Active", type: "checkbox" },
    ],
    columns: [{ key: "name", label: "Name" }, { key: "nameHi", label: "हिन्दी" }, { key: "type", label: "Level" }, { key: "parentName", label: "Parent" }, { key: "isActive", label: "Active", kind: "bool" }],
    deleteLabel: "Delete area",
  },
  categories: {
    title: "Complaint Categories",
    subtitle: "Categories shown on the complaint form. Deleting deactivates a category (existing complaints keep it).",
    fields: [
      { name: "slug", label: "Slug (a-z, 0-9, -)", type: "text", required: true },
      { name: "nameEn", label: "Name (English)", type: "text", required: true },
      { name: "nameHi", label: "नाम (हिन्दी)", type: "text", required: true },
      { name: "icon", label: "Icon (emoji)", type: "text" },
      { name: "defaultDepartment", label: "Default department", type: "text" },
      { name: "sortOrder", label: "Sort order", type: "number", min: 0 },
      { name: "isActive", label: "Active", type: "checkbox" },
    ],
    columns: [{ key: "icon", label: "" }, { key: "nameEn", label: "Name" }, { key: "nameHi", label: "हिन्दी" }, { key: "slug", label: "Slug" }, { key: "defaultDepartment", label: "Default dept." }, { key: "isActive", label: "Active", kind: "bool" }],
    deleteLabel: "Deactivate category",
  },
};

const DEFAULTS: Record<ContentType, Record<string, unknown>> = {
  notices: { category: "PUBLIC_NOTICE", priority: "MEDIUM", status: "DRAFT", isPinned: false },
  development: { status: "PLANNED", progress: 0, isPublished: false, photos: [], documents: [] },
  services: { category: "MUNICIPAL", isOfficial: true, isEmergency: false, isActive: true, sortOrder: 0 },
  community: { type: "EVENT", status: "APPROVED" },
  areas: { type: "LOCALITY", isActive: true, sortOrder: 0 },
  categories: { isActive: true, sortOrder: 0 },
};

function toInput(type: FieldType, v: unknown): string | boolean {
  if (type === "checkbox") return Boolean(v);
  if (v === null || v === undefined) return "";
  if (type === "date") return new Date(v as string).toISOString().slice(0, 10);
  if (type === "datetime") {
    const d = new Date(v as string);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  if (type === "urllist") return Array.isArray(v) ? (v as string[]).join("\n") : "";
  if (type === "doclist") return Array.isArray(v) ? (v as { name: string; url: string }[]).map((d) => `${d.name} | ${d.url}`).join("\n") : "";
  return String(v);
}

function fromInput(type: FieldType, v: string | boolean): unknown {
  if (type === "checkbox") return Boolean(v);
  const s = String(v).trim();
  if (type === "number") return s === "" ? undefined : Number(s);
  if (type === "date" || type === "datetime") return s === "" ? "" : new Date(s).toISOString();
  if (type === "urllist") return s ? s.split("\n").map((l) => l.trim()).filter(Boolean) : [];
  if (type === "doclist") return s ? s.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p.length === 2 && p[1]).map(([name, url]) => ({ name, url })) : [];
  return s;
}

export function ContentManager({ type }: { type: ContentType }) {
  const cfg = CONFIG[type];
  const [data, setData] = useState<Paged<Row> | null>(null);
  const [areas, setAreas] = useState<AreaDto[]>([]);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    api<Paged<Row>>(`/api/admin/content/${type}${qs({ page, pageSize: 20, q, ...filters })}`).then(setData).catch((e) => setMsg({ kind: "error", text: (e as Error).message }));
  }, [type, page, q, filters]);
  useEffect(load, [load]);
  useEffect(() => {
    api<{ areas: AreaDto[] }>("/api/meta").then((m) => setAreas(m.areas)).catch(() => {});
  }, []);

  function open(row: Row | "new") {
    const src = row === "new" ? DEFAULTS[type] : row;
    const f: Record<string, string | boolean> = {};
    cfg.fields.forEach((fd) => (f[fd.name] = toInput(fd.type, src[fd.name])));
    setForm(f);
    setEditing(row);
    setMsg(null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const payload: Record<string, unknown> = {};
    cfg.fields.forEach((fd) => {
      const v = fromInput(fd.type, form[fd.name]);
      if (v !== undefined) payload[fd.name] = v;
    });
    try {
      if (editing === "new") await api(`/api/admin/content/${type}`, { method: "POST", json: payload });
      else if (editing) await api(`/api/admin/content/${type}/${editing.id}`, { method: "PATCH", json: payload });
      setEditing(null);
      setMsg({ kind: "success", text: "Saved." });
      load();
    } catch (err) {
      setMsg({ kind: "error", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: Row) {
    if (!confirm(`${cfg.deleteLabel}?`)) return;
    try {
      await api(`/api/admin/content/${type}/${row.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setMsg({ kind: "error", text: (err as Error).message });
    }
  }

  async function moderate(row: Row, status: "APPROVED" | "REJECTED") {
    try {
      await api(`/api/admin/content/community/${row.id}`, { method: "PATCH", json: { status } });
      load();
    } catch (err) {
      setMsg({ kind: "error", text: (err as Error).message });
    }
  }

  const areaOptions: [string, string][] = areas.map((a) => [a.id, `${a.type === "CITY" ? "" : a.type === "ZONE" ? "· " : a.type === "LOCALITY" ? "·· " : "··· "}${a.name}`]);
  const areaName = (id: unknown) => areas.find((a) => a.id === id)?.name ?? "";

  const renderCell = (row: Row, col: Column) => {
    const v = col.key === "parentName" ? areaName(row.parentId) : row[col.key];
    if (col.kind === "date") return v ? formatDate(v as string, "en", true) : "—";
    if (col.kind === "bool") return v ? "✅" : "—";
    if (col.kind === "percent") return `${v ?? 0}%`;
    return v === null || v === undefined || v === "" ? "—" : String(v);
  };

  return (
    <div>
      <PageHeader title={cfg.title} subtitle={cfg.subtitle} actions={<button type="button" className="btn-primary btn-sm" onClick={() => open("new")}>＋ New</button>} />
      {msg && <div className="mb-3"><Alert kind={msg.kind}>{msg.text}</Alert></div>}
      <div className="card mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="label" htmlFor="q">Search</label>
          <input id="q" className="input" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search…" />
        </div>
        {cfg.filters?.map((f) => (
          <div key={f.name} className="min-w-[160px]">
            <label className="label" htmlFor={`f-${f.name}`}>{f.label}</label>
            <select id={`f-${f.name}`} className="input" value={filters[f.name] ?? ""} onChange={(e) => { setFilters({ ...filters, [f.name]: e.target.value }); setPage(1); }}>
              <option value="">All</option>
              {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        ))}
      </div>

      {editing && (
        <form onSubmit={save} className="card mb-5 border-civic-200">
          <h2 className="mb-4 font-bold text-slate-900">{editing === "new" ? `New ${cfg.title.replace(/s$/, "").toLowerCase()}` : "Edit"}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {cfg.fields.map((fd) => {
              const options = fd.optionsFrom === "areas" ? areaOptions : fd.options ?? [];
              const common = { id: `fld-${fd.name}`, required: fd.required };
              return (
                <div key={fd.name} className={fd.full ? "md:col-span-2" : ""}>
                  {fd.type === "checkbox" ? (
                    <label className="flex items-center gap-2 pt-6 text-sm font-medium text-slate-700"><input type="checkbox" checked={Boolean(form[fd.name])} onChange={(e) => setForm({ ...form, [fd.name]: e.target.checked })} /> {fd.label}</label>
                  ) : (
                    <Field label={fd.label} required={fd.required} hint={fd.hint}>
                      {fd.type === "textarea" || fd.type === "urllist" || fd.type === "doclist" ? (
                        <textarea {...common} className="input" rows={fd.type === "textarea" ? 4 : 3} value={String(form[fd.name] ?? "")} onChange={(e) => setForm({ ...form, [fd.name]: e.target.value })} />
                      ) : fd.type === "select" ? (
                        <select {...common} className="input" value={String(form[fd.name] ?? "")} onChange={(e) => setForm({ ...form, [fd.name]: e.target.value })}>
                          {!fd.required && <option value="">—</option>}
                          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      ) : (
                        <input {...common} className="input" type={fd.type === "datetime" ? "datetime-local" : fd.type === "url" ? "url" : fd.type} min={fd.min} max={fd.max} value={String(form[fd.name] ?? "")} onChange={(e) => setForm({ ...form, [fd.name]: e.target.value })} />
                      )}
                    </Field>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex gap-2">
            <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      {!data ? <Spinner /> : data.items.length === 0 ? <EmptyState title="No records." /> : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr>{cfg.columns.map((c) => <th key={c.key}>{c.label}</th>)}<th className="text-right">Actions</th></tr></thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  {cfg.columns.map((c) => <td key={c.key} className={c.key === "title" || c.key === "name" ? "max-w-[280px] font-medium text-slate-900" : ""}>{renderCell(row, c)}{(c.key === "title" || c.key === "name") && row.isDemo ? <span className="ml-1 text-[10px] font-bold text-yellow-700">DEMO</span> : null}</td>)}
                  <td className="whitespace-nowrap text-right">
                    {type === "community" && row.status === "PENDING" && (
                      <>
                        <button type="button" className="btn-green btn-sm mr-1" onClick={() => moderate(row, "APPROVED")}>Approve</button>
                        <button type="button" className="btn-danger btn-sm mr-1" onClick={() => moderate(row, "REJECTED")}>Reject</button>
                      </>
                    )}
                    <button type="button" className="btn-secondary btn-sm mr-1" onClick={() => open(row)}>Edit</button>
                    <button type="button" className="btn-ghost btn-sm text-rose-600" onClick={() => remove(row)}>Delete</button>
                  </td>
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
