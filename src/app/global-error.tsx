"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="hi">
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50 font-sans">
          <div className="max-w-lg w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-xl space-y-4">
            <span className="text-5xl" aria-hidden>🚨</span>
            <h1 className="text-2xl font-bold text-slate-900">
              जन समस्या निवारण मंच
            </h1>
            <p className="text-sm text-slate-600">
              सिस्टम में कुछ तकनीकी समस्या आई है। कृपया पुनः प्रयास करें।
            </p>
            {error.digest && (
              <p className="text-xs text-slate-400 font-mono">
                Error Reference: {error.digest}
              </p>
            )}
            <button
              type="button"
              onClick={() => reset()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition"
            >
              🔄 Refresh Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
