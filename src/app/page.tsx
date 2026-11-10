import Link from 'next/link';
import { supabaseConfigured } from '@/lib/supabase/config';

export default function HomePage() {
  const configured = supabaseConfigured();
  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 font-bold text-white">TP</span><span className="text-lg font-bold text-slate-900">Trip Planner</span></Link>
          <Link href={configured?'/trips':'/login'} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-blue-700">{configured?'My trips':'Setup'}</Link>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:py-24">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">M1 · Accounts and Trips</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">Every journey begins with a plan.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">Create a trip, save your travel dates, and build a shared plan. Maps and itinerary editing are coming next.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/trips" className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">Open my trips →</Link>
            <Link href="/login" className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800">Sign in / Create account</Link>
          </div>
          {!configured && <p role="status" className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Supabase connection not configured. See docs/M1_MAC_SETUP.md.</p>}
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Your planning workspace</p>
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="font-semibold text-slate-900">Create your first trip</p><p className="mt-1 text-sm text-slate-600">Trip name · Dates · Time zone</p></div>
            <div className="rounded-xl border border-slate-200 p-4"><p className="font-semibold text-slate-900">Invite your travel group</p><p className="mt-1 text-sm text-slate-500">M1 next increment</p></div>
            <div className="rounded-xl border border-slate-200 p-4"><p className="font-semibold text-slate-900">Plan stops and routes</p><p className="mt-1 text-sm text-slate-500">Upcoming milestones M2–M3</p></div>
          </div>
          <p className="mt-6 text-xs text-slate-500">Local development only. No deployment, billing, or map API requests initiated by this scaffold.</p>
        </div>
      </section>
    </main>
  );
}
