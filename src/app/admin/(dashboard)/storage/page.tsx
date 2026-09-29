"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/client-api";
import { useI18n } from "@/components/i18n-provider";
import type { StorageReport } from "@/server/storage";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function AdminStoragePage() {
  const { L } = useI18n();
  const [report, setReport] = useState<StorageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let ignore = false;
    api<StorageReport>("/api/admin/storage")
      .then((data) => {
        if (!ignore) {
          setReport(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setMsg({ type: "error", text: apiErrorMessage("hi", err) });
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function runCleanup() {
    try {
      setCleaning(true);
      setMsg(null);
      const res = await api<{ result: { processed: number; deleted: number; failed: number }; report: StorageReport }>("/api/admin/storage", {
        method: "POST",
      });
      setReport(res.report);
      setMsg({
        type: "success",
        text: `क्लीनअप प्रक्रिया पूर्ण: ${res.result.deleted} फ़ाइलें सफलतापूर्वक हटाई गईं, ${res.result.failed} विफल।`,
      });
    } catch (err: unknown) {
      setMsg({ type: "error", text: apiErrorMessage("hi", err) });
    } finally {
      setCleaning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {L("स्टोरेज एवं अटैचमेंट रिपोर्ट", "Storage & Attachment Report")}
          </h1>
          <p className="text-sm text-slate-600">
            {L(
              "MongoDB में केवल फ़ाइल मेटाडेटा रहता है। 90 दिन से पुरानी बंद शिकायतों के अटैचमेंट यहाँ से नियंत्रित होते हैं।",
              "MongoDB stores only file metadata. Attachments of closed complaints older than 90 days are managed here.",
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={runCleanup}
          disabled={cleaning || loading}
          className="btn-primary flex items-center justify-center gap-2"
        >
          {cleaning ? "🧹 क्लीनअप चालू है..." : "🧹 मैन्युअल क्लीनअप चलाएँ (Run Cleanup)"}
        </button>
      </div>

      {msg && (
        <div
          className={`rounded-xl p-4 text-sm font-medium ${
            msg.type === "success" ? "border border-emerald-200 bg-emerald-50 text-emerald-800" : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : report ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {L("कुल सक्रिय फ़ाइलें", "Total Active Files")}
            </p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{report.totalFiles}</p>
            <p className="mt-1 text-xs text-slate-500">MongoDB में रजिस्टर्ड अटैचमेंट</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {L("कुल प्रयुक्त स्टोरेज", "Total Used Storage")}
            </p>
            <p className="mt-2 text-3xl font-extrabold text-civic-700">{formatBytes(report.totalSizeBytes)}</p>
            <p className="mt-1 text-xs text-slate-500">ऑब्जेक्ट / डिस्क स्टोरेज में</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              {L("क्लीनअप हेतु लंबित (Closed > 90 Days)", "Pending Cleanup (Closed > 90 Days)")}
            </p>
            <p className="mt-2 text-3xl font-extrabold text-amber-900">{report.pendingCleanupCount}</p>
            <p className="mt-1 text-xs text-amber-700">90 दिन की रिटेंशन अवधि पूरी कर चुकी फ़ाइलें</p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              {L("सफलतापूर्वक हटाई गईं", "Successfully Deleted Files")}
            </p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-900">{report.successfullyDeletedCount}</p>
            <p className="mt-1 text-xs text-emerald-700">रिटेंशन पॉलिसी के तहत साफ़ की गईं</p>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 shadow-sm">
            <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
              {L("विफल विलोपन (Failed Deletions)", "Failed Deletions")}
            </p>
            <p className="mt-2 text-3xl font-extrabold text-rose-900">{report.failedDeletionsCount}</p>
            <p className="mt-1 text-xs text-rose-700">अगले रन में स्वतः पुनः प्रयास होगा</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {L("अंतिम क्लीनअप समय", "Last Cleanup Run")}
            </p>
            <p className="mt-2 text-lg font-bold text-slate-800">
              {report.lastCleanupRun ? new Date(report.lastCleanupRun).toLocaleString("hi-IN") : "अभी तक नहीं चला"}
            </p>
            <p className="mt-1 text-xs text-slate-500">स्वचालित या मैन्युअल रन</p>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">{L("सुरक्षा एवं रिटेंशन नीतियाँ", "Security & Retention Policies")}</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc list-inside">
          <li>
            <strong>90-दिवसीय रिटेंशन पॉलिसी (`ATTACHMENT_RETENTION_DAYS=90`)</strong>: शिकायत के बंद होने (Closed/Resolved) के 90 दिनों बाद ही अटैचमेंट फ़ाइलें हटाई जाती हैं।
          </li>
          <li>
            <strong>सक्रिय शिकायतों की सुरक्षा</strong>: खुली (Open / In Progress) शिकायतों के अटैचमेंट कभी डिलीट नहीं किए जाते।
          </li>
          <li>
            <strong>सुरक्षित विलोपन क्रम (Safe Order)</strong>: फ़ाइल को पहले ऑब्जेक्ट स्टोरेज / डिस्क से डिलीट किया जाता है। स्टोरेज विलोपन सफल होने पर ही MongoDB से मेटाडेटा अपडेट होता है।
          </li>
          <li>
            <strong>प्राइवेट एक्सेस (Private Stream Access)</strong>: अटैचमेंट फ़ाइलें सीधे सार्वजनिक नहीं होतीं, वे केवल ऑथेंटिकेटेड यूजर / एडमिन सत्र के माध्यम से ही एक्सेस की जा सकती हैं।
          </li>
        </ul>
      </div>
    </div>
  );
}
