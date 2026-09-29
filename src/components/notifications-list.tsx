"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, apiErrorMessage, qs } from "@/lib/client-api";
import { formatDate } from "@/shared/i18n";
import type { NotificationDto, Paged } from "@/shared/types";
import { useI18n } from "./i18n-provider";
import { EmptyState, Pagination, Spinner } from "./ui";

export function NotificationsList({ endpoint = "/api/notifications", linkBase = "/complaints" }: { endpoint?: string; linkBase?: string }) {
  const { lang, t, L } = useI18n();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<(Paged<NotificationDto> & { unread: number }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Paged<NotificationDto> & { unread: number }>(`${endpoint}${qs({ page, pageSize: 20 })}`).then(setData).catch((e) => setError(apiErrorMessage(lang, e)));
  }, [endpoint, page, lang]);
  useEffect(load, [load]);

  async function markAll() {
    await api(endpoint, { method: "PATCH", json: {} });
    load();
  }

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!data) return <Spinner label={t("common_loading")} />;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-600">{L(`${data.unread} अपठित`, `${data.unread} unread`)}</p>
        {data.unread > 0 && (
          <button type="button" className="btn-ghost btn-sm" onClick={markAll}>
            {L("सभी पढ़ा हुआ चिह्नित करें", "Mark all as read")}
          </button>
        )}
      </div>
      {data.items.length === 0 ? (
        <EmptyState icon="🔔" title={L("कोई सूचना नहीं", "No notifications")} />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {data.items.map((n) => {
            const href = n.referenceType === "complaint" && n.referenceId ? `${linkBase}/${n.referenceId}` : n.referenceType === "community_post" ? "/community" : null;
            const body = (
              <div className="flex gap-3 px-4 py-3">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.isRead ? "bg-transparent" : "bg-civic-600"}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.isRead ? "font-medium text-slate-700" : "font-bold text-slate-900"}`}>{n.title}</p>
                  <p className="text-sm text-slate-600">{n.message}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{formatDate(n.createdAt, lang, true)}</p>
                </div>
              </div>
            );
            return <li key={n.id}>{href ? <Link href={href} className="block hover:bg-slate-50">{body}</Link> : body}</li>;
          })}
        </ul>
      )}
      <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} lang={lang} />
    </div>
  );
}
