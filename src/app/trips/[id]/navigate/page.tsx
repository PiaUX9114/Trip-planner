import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/supabase/require-user';
import TripNavigation from '@/components/trip-navigation';
import type { NavigationStop } from '@/lib/navigation/types';

export const dynamic = 'force-dynamic';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NavigateTrip({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const { supabase } = await requireUser();
  const { data: trip, error: tripError } = await supabase.from('trips')
    .select('id,name,start_date,end_date,timezone').eq('id', id).maybeSingle();
  if (tripError || !trip) notFound();
  const { data: stops, error: stopsError } = await supabase.from('trip_stops')
    .select('id,title,day_date,sort_order,latitude,longitude').eq('trip_id', id)
    .order('day_date', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
      <Link href={`/trips/${id}#map`} className="text-sm font-semibold text-blue-700 hover:underline">Back to trip map and itinerary</Link>
      <div className="mt-7">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">M6 / Foreground navigation</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Driving route: {trip.name}</h1>
        <p className="mt-2 text-sm text-slate-600">{trip.start_date} to {trip.end_date} | Time zone: {trip.timezone}</p>
      </div>
      {stopsError ? (
        <div role="alert" className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Could not load pinned stops. Check the M3 database migration and trip access.
        </div>
      ) : (
        <TripNavigation tripId={id} startDate={trip.start_date} stops={(stops ?? []) as NavigationStop[]} />
      )}
    </main>
  );
}
