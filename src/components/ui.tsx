import Link from "next/link";
import type { ReactNode } from "react";
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS, type ComplaintPriority, type ComplaintStatus, type Lang } from "@/shared/constants";

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: string; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-civic-600">{eyebrow}</p>}
        <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[15px] text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ status, lang }: { status: ComplaintStatus; lang: Lang }) {
  const label = STATUS_LABELS[status] ?? { hi: status, en: status };
  return <span className={`chip ${STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>{lang === "hi" ? label.hi : label.en}</span>;
}

export function PriorityBadge({ priority, lang }: { priority: ComplaintPriority; lang: Lang }) {
  const label = PRIORITY_LABELS[priority] ?? { hi: priority, en: priority };
  return <span className={`chip ring-transparent ${PRIORITY_COLORS[priority] ?? "bg-slate-100 text-slate-700"}`}>{lang === "hi" ? label.hi : label.en}</span>;
}

export function DemoTag({ lang }: { lang: Lang }) {
  return <span className="chip bg-yellow-50 text-yellow-800 ring-yellow-200">{lang === "hi" ? "डेमो डेटा" : "Demo data"}</span>;
}

export function Alert({ kind = "info", children }: { kind?: "info" | "success" | "error" | "warning"; children: ReactNode }) {
  const styles = {
    info: "border-civic-200 bg-civic-50 text-civic-800",
    success: "border-leaf-100 bg-leaf-50 text-leaf-800",
    error: "border-rose-200 bg-rose-50 text-rose-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}

export function EmptyState({ title, hint, icon = "📭" }: { title: string; hint?: string; icon?: string }) {
  return (
    <div className="card flex flex-col items-center py-12 text-center">
      <div className="text-4xl" aria-hidden>
        {icon}
      </div>
      <p className="mt-3 font-semibold text-slate-800">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-slate-500" role="status" aria-live="polite">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-civic-200 border-t-civic-600" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function PageButton({ href, onClick, disabled, children }: { href?: string; onClick?: () => void; disabled: boolean; children: ReactNode }) {
  if (href !== undefined) {
    return (
      <Link aria-disabled={disabled} className={`btn-secondary btn-sm ${disabled ? "pointer-events-none opacity-50" : ""}`} href={href}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className="btn-secondary btn-sm" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

export function Pagination({
  page,
  totalPages,
  onPage,
  hrefFor,
  lang,
}: {
  page: number;
  totalPages: number;
  onPage?: (p: number) => void;
  hrefFor?: (p: number) => string;
  lang: Lang;
}) {
  if (totalPages <= 1) return null;
  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);
  const label = lang === "hi" ? `पृष्ठ ${page} / ${totalPages}` : `Page ${page} of ${totalPages}`;
  return (
    <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Pagination">
      <PageButton href={hrefFor ? hrefFor(prev) : undefined} onClick={hrefFor ? undefined : () => onPage?.(prev)} disabled={page <= 1}>
        ← {lang === "hi" ? "पिछला" : "Prev"}
      </PageButton>
      <span className="text-sm text-slate-600">{label}</span>
      <PageButton href={hrefFor ? hrefFor(next) : undefined} onClick={hrefFor ? undefined : () => onPage?.(next)} disabled={page >= totalPages}>
        {lang === "hi" ? "अगला" : "Next"} →
      </PageButton>
    </nav>
  );
}

export function Field({ label, hint, required, children, error }: { label: string; hint?: string; required?: boolean; children: ReactNode; error?: string }) {
  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-leaf-500 transition-all" style={{ width: `${v}%` }} />
    </div>
  );
}
