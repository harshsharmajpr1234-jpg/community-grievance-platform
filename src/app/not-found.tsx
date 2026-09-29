import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="card max-w-md text-center">
        <p className="text-5xl" aria-hidden>🧭</p>
        <h1 className="mt-3 text-2xl font-bold">पृष्ठ नहीं मिला / Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">यह पृष्ठ उपलब्ध नहीं है। The page you are looking for does not exist.</p>
        <Link href="/" className="btn-primary mt-5">होम पर जाएँ / Go home</Link>
      </div>
    </div>
  );
}
