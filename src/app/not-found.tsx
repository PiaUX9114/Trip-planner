import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 px-6">
      <p className="text-sm font-semibold text-blue-700">404</p>
      <h1 className="text-3xl font-bold text-slate-900">Page not found</h1>
      <p className="text-slate-600">Only the local M0 status page is available in this scaffold.</p>
      <Link href="/" className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white">Return to Trip Planner</Link>
    </main>
  );
}
