import Link from 'next/link';
import { requireUser } from '@/lib/supabase/require-user';
import { createTripAction } from '../actions';

export const dynamic = 'force-dynamic';

const zones = [
  ['UTC', 'UTC'],
  ['America/Los_Angeles', 'Pacific time (Los Angeles)'],
  ['America/New_York', 'Eastern time (New York)'],
  ['Europe/London', 'London'],
  ['Europe/Paris', 'Paris'],
  ['Asia/Tokyo', 'Tokyo'],
  ['Asia/Seoul', 'Seoul'],
  ['Australia/Sydney', 'Sydney'],
] as const;

export default async function NewTripPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  await requireUser();
  const params = await searchParams;
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 sm:py-16">
      <Link href="/trips" className="text-sm font-semibold text-blue-700 hover:underline">← All trips</Link>
      <h1 className="mt-7 text-3xl font-bold tracking-tight text-slate-900">Create a trip</h1>
      <p className="mt-2 text-slate-600">Start with your travel dates. Stops and maps are added in the next milestone.</p>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {params.notice && <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="alert">{params.notice === 'invalid' ? 'Check the trip name, dates, and time zone.' : 'Could not save the trip. Confirm the database migration is installed and try again.'}</p>}
        <form action={createTripAction} className="space-y-5">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-semibold text-slate-700">Trip name</label>
            <input id="name" name="name" required maxLength={100} placeholder="Japan Adventure" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="start_date" className="mb-1 block text-sm font-semibold text-slate-700">Start date</label><input id="start_date" name="start_date" type="date" required className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" /></div>
            <div><label htmlFor="end_date" className="mb-1 block text-sm font-semibold text-slate-700">End date</label><input id="end_date" name="end_date" type="date" required className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" /></div>
          </div>
          <div>
            <label htmlFor="timezone" className="mb-1 block text-sm font-semibold text-slate-700">Trip time zone</label>
            <select id="timezone" name="timezone" defaultValue="Asia/Tokyo" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3">
              {zones.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <p className="mt-2 text-xs text-slate-500">This initial zone helps organize the trip. Individual stop time zones will be supported later.</p>
          </div>
          <button className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700" type="submit">Create trip</button>
        </form>
      </div>
    </main>
  );
}
