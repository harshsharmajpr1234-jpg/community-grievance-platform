import Link from "next/link";
import { BarList, StatCard, TrendChart } from "@/components/admin/charts";
import { PageHeader, PriorityBadge } from "@/components/ui";
import { dashboardStats } from "@/server/services/admin";
import { STATUS_LABELS } from "@/shared/constants";
import { formatDate } from "@/shared/i18n";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const s = await dashboardStats();
  const t = s.totals;
  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Live figures computed from the platform database." actions={<Link href="/admin/complaints?status=SUBMITTED" className="btn-primary btn-sm">Review new complaints ({t.new})</Link>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Total Complaints" value={t.total} hint={`${t.newThisWeek} this week`} />
        <StatCard label="Submitted (New)" value={t.new} tone="text-sky-700" />
        <StatCard label="Verified" value={t.verified} tone="text-indigo-700" />
        <StatCard label="Assigned" value={t.assigned} tone="text-violet-700" />
        <StatCard label="Forwarded" value={t.forwarded} tone="text-cyan-700" />
        <StatCard label="In Progress" value={t.inProgress} tone="text-amber-700" />
        <StatCard label="Action Taken" value={t.actionTaken} tone="text-lime-700" />
        <StatCard label="Resolved" value={t.resolved} tone="text-leaf-700" hint={`${t.resolvedPercent}% of total`} />
        <StatCard label="Closed" value={t.closed} tone="text-slate-700" />
        <StatCard label="Rejected" value={t.rejected} tone="text-rose-700" />
        <StatCard label="Duplicate" value={t.duplicate} tone="text-slate-600" />
        <StatCard label="Needs Info" value={t.needsInfo} tone="text-orange-700" />
      </div>

      {/* Ward-Wise Summary Section */}
      <div className="mt-6">
        <h2 className="mb-3 font-extrabold text-base text-civic-900 flex items-center gap-2">
          <span>🏛️</span> वार्ड अनुसार शिकायत आँकड़े (Ward-Wise Breakdown)
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {s.byWard.map((w) => (
            <Link
              key={w.ward}
              href={`/admin/complaints?wardNumber=${w.ward}`}
              className="card border-civic-200 bg-white hover:bg-slate-50/80 transition p-4 space-y-3 group shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-lg text-civic-900 group-hover:text-civic-700">
                  वार्ड {w.ward} ({w.label})
                </h3>
                <span className="chip bg-civic-100 text-civic-800 font-bold text-xs">
                  {w.total} कुल शिकायतें
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="rounded-lg bg-sky-50 p-2">
                  <span className="block text-xs font-semibold text-sky-800">लंबित (Pending)</span>
                  <span className="block font-extrabold text-base text-sky-900">{w.pending}</span>
                </div>
                <div className="rounded-lg bg-amber-50 p-2">
                  <span className="block text-xs font-semibold text-amber-800">प्रगति पर (In Progress)</span>
                  <span className="block font-extrabold text-base text-amber-900">{w.inProgress}</span>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2">
                  <span className="block text-xs font-semibold text-emerald-800">हल (Resolved)</span>
                  <span className="block font-extrabold text-base text-emerald-900">{w.resolved}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 font-bold text-slate-900">Monthly trend (last 12 months)</h2>
          <TrendChart data={s.monthly} />
        </div>
        <div className="card">
          <h2 className="mb-3 font-bold text-slate-900">By status</h2>
          <BarList items={s.byStatus.map((b) => ({ label: STATUS_LABELS[b.status]?.en ?? b.status, value: b.n }))} color="bg-indigo-500" />
        </div>
        <div className="card">
          <h2 className="mb-3 font-bold text-slate-900">By category</h2>
          <BarList items={s.byCategory.map((b) => ({ label: `${b.nameEn} / ${b.nameHi}`, value: b.n }))} />
        </div>
        <div className="card">
          <h2 className="mb-3 font-bold text-slate-900">By locality</h2>
          <BarList items={s.byArea.map((b) => ({ label: b.name, value: b.n }))} color="bg-leaf-500" />
        </div>
        <div className="card">
          <h2 className="mb-3 font-bold text-slate-900">🆕 New complaints</h2>
          {s.recentNew.length === 0 && <p className="text-sm text-slate-500">No new complaints awaiting verification.</p>}
          <ul className="divide-y divide-slate-100">
            {s.recentNew.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/complaints/${c.code}`} className="block py-2.5 hover:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-civic-700">{c.code}</span>
                    <PriorityBadge priority={c.priority} lang="en" />
                  </div>
                  <p className="truncate text-sm font-medium text-slate-800">{c.title}</p>
                  <p className="text-xs text-slate-500">{c.category?.nameEn ?? "—"} • {c.area?.name ?? "—"} • {formatDate(c.createdAt, "en", true)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
