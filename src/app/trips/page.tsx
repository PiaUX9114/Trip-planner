import Link from 'next/link';
import { requireUser } from '@/lib/supabase/require-user';
import { signOutAction } from '@/app/auth/actions';

export const dynamic = 'force-dynamic';

type Trip = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  timezone: string;
};

export default async function TripsPage() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from('trips')
    .select('id,name,start_date,end_date,timezone')
    .order('created_at', { ascending: false });
  const trips = (data ?? []) as Trip[];

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 sm:py-12">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <Link href="/" className="text-xl font-bold tracking-tight text-slate-900">Trip <span className="text-blue-600">Planner</span></Link>
        <div className="flex items-center gap-3">
          <Link href="/account" className="text-sm font-semibold text-blue-700 hover:underline">Account</Link>
          <form action={signOutAction}><button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-white">Sign out</button></form>
        </div>
      </header>
      <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Your workspace</p><h1 className="mt-2 text-3xl font-bold text-slate-900">My trips</h1><p className="mt-2 text-slate-600">Plan together. Travel your way.</p></div>
        <Link href="/trips/new" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">+ New trip</Link>
      </div>
      {error ? (
        <section role="alert" className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          The trips database is not ready or could not be reached. Apply the M1 SQL migration from docs/M1_MAC_SETUP.md, then refresh. No trips were changed.
        </section>
      ) : trips.length ? (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Your trips">
          {trips.map((trip) => (
            <Link key={trip.id} href={`/trips/${trip.id}`} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md">
              <div className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-2xl" aria-hidden="true">✈</div>
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-700">{trip.name}</h2>
              <p className="mt-2 text-sm text-slate-600">{trip.start_date} to {trip.end_date}</p>
              <p className="mt-2 text-xs text-slate-400">{trip.timezone}</p>
              <div className="mt-6 text-sm font-semibold text-blue-700">Open trip →</div>
            </Link>
          ))}
        </section>
      ) : (
        <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-xl font-semibold text-slate-900">Your next adventure starts here</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Create your first trip. It will be saved to your private, access-controlled workspace.</p>
          <Link href="/trips/new" className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">Create a trip</Link>
        </section>
      )}
    </main>
  );
}
