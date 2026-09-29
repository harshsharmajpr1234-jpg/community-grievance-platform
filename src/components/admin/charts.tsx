"use client";

/** Dependency-free charts (CSS bars + SVG line) used by the admin dashboard. */
export function BarList({ items, color = "bg-civic-500", emptyText = "No data" }: { items: { label: string; value: number }[]; color?: string; emptyText?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="text-sm text-slate-500">{emptyText}</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex justify-between text-sm"><span className="truncate pr-2 text-slate-700">{i.label}</span><span className="font-semibold text-slate-900">{i.value}</span></div>
          <div className="h-2.5 rounded-full bg-slate-100" role="img" aria-label={`${i.label}: ${i.value}`}>
            <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TrendChart({ data }: { data: { month: string; n: number; resolved: number }[] }) {
  if (data.length === 0) return <p className="text-sm text-slate-500">No data for the last 12 months</p>;
  const W = 640, H = 220, P = 32;
  const max = Math.max(1, ...data.map((d) => d.n));
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, data.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const path = (key: "n" | "resolved") => data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d[key])}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Monthly complaint trend">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={P} x2={W - P} y1={y(max * f)} y2={y(max * f)} stroke="#e2e8f0" />
            <text x={4} y={y(max * f) + 4} fontSize="10" fill="#64748b">{Math.round(max * f)}</text>
          </g>
        ))}
        <path d={`${path("n")} L${x(data.length - 1)},${H - P} L${x(0)},${H - P} Z`} fill="#bfdbfe" opacity="0.5" />
        <path d={path("n")} fill="none" stroke="#1d4ed8" strokeWidth="2.5" />
        <path d={path("resolved")} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeDasharray="5 4" />
        {data.map((d, i) => (
          <g key={d.month}>
            <circle cx={x(i)} cy={y(d.n)} r="3.5" fill="#1d4ed8" />
            <circle cx={x(i)} cy={y(d.resolved)} r="3" fill="#16a34a" />
            <text x={x(i)} y={H - 10} fontSize="10" textAnchor="middle" fill="#64748b">{d.month.slice(2).replace("-", "/")}</text>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-civic-600" /> Submitted</span>
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-leaf-600" /> Resolved</span>
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint, tone = "text-slate-900" }: { label: string; value: string | number; hint?: string; tone?: string }) {
  return (
    <div className="card">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${tone}`}>{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
