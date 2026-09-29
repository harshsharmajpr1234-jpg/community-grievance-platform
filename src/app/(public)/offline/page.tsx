export default function OfflinePage() {
  return (
    <div className="card mx-auto max-w-md py-12 text-center">
      <p className="text-4xl" aria-hidden>📴</p>
      <h1 className="mt-3 text-xl font-bold">आप ऑफ़लाइन हैं / You are offline</h1>
      <p className="mt-2 text-sm text-slate-600">इंटरनेट कनेक्शन उपलब्ध होने पर पृष्ठ स्वतः लोड हो जाएगा। The page will load when you are back online.</p>
    </div>
  );
}
