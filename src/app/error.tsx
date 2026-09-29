"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="card max-w-lg w-full space-y-4 border-rose-200 bg-white shadow-xl">
        <span className="text-5xl" aria-hidden>⚠️</span>
        <h2 className="text-2xl font-extrabold text-slate-900">
          सर्वर त्रुटि / Server Error
        </h2>
        <p className="text-sm text-slate-600">
          पृष्ठ लोड करने में समस्या आई है। कृपया पुनः प्रयास करें।
        </p>
        <p className="text-xs text-slate-400 font-mono">
          {error.digest ? `Error Code: ${error.digest}` : error.message || "An unexpected error occurred."}
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-primary"
          >
            🔄 पुनः प्रयास करें (Retry)
          </button>
          <Link href="/" className="btn-secondary">
            🏠 मुख्य पृष्ठ (Home)
          </Link>
        </div>
      </div>
    </div>
  );
}
