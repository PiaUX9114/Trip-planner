import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/supabase/require-user';
import { addStopAction, updateStopAction, deleteStopAction, moveStopAction } from './actions';
import TripMap from '@/components/trip-map';
import TripCalendar, { type CalendarStop } from '@/components/trip-calendar';
import type { MapStop } from '@/components/map-types';
import TripCollaboration, { type MemberRow, type InviteRow } from '@/components/trip-collaboration';
import TripAutoRefresh from '@/components/trip-auto-refresh';

export const dynamic = 'force-dynamic';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const categoryOptions = [
  ['place', 'Destination / place'],
  ['activity', 'Activity'],
  ['food', 'Food / restaurant'],
  ['lodging', 'Hotel / lodging'],
  ['transport', 'Transportation'],
  ['other', 'Other'],
] as const;

const categoryNames: Record<string, string> = {
  place: 'Place', activity: 'Activity', food: 'Food',
  lodging: 'Lodging', transport: 'Transport', other: 'Other',
};

const notices: Record<string, string> = {
  added: 'Stop added to your itinerary.',
  updated: 'Stop changes saved.',
  deleted: 'Stop removed.',
  reordered: 'Itinerary order updated.',
  'invalid-stop': 'Check the stop name, date, time, and field lengths.',
  'save-error': 'Could not save the change. Check that the M2 database migration is installed and you have edit access.',
  'map-saved': 'Location pin saved. The map now shows this stop.',
  'map-invalid': 'Select a valid public place result before saving its pin.',
  'map-error': 'Could not save map pin. Check that the M3 database migration is installed and you have edit access.',
  'calendar-updated': 'Calendar schedule saved. Itinerary and map day are updated.',
  'calendar-invalid': 'Check your calendar date, start time and duration (15–720 minutes, in 15-minute steps).',
  'calendar-error': 'Could not update the calendar. Check that the M4 migration is installed and you have edit access.',
  'invite-joined': 'You joined this trip. Your access is now active.',
  'invite-revoked': 'Invitation revoked.',
  'role-updated': 'Member role updated.',
  'member-removed': 'Member access removed.',
  'collab-invalid': 'Check the member or invitation details.',
  'collab-error': 'Could not update collaboration. Check your owner permissions and the M5 migration.',
};

type Trip = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  timezone: string;
  owner_id: string;
};

type Stop = {
  id: string;
  day_date: string;
  sort_order: number;
  title: string;
  category: string;
  address: string;
  notes: string;
  time_local: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_label?: string | null;
};

function readableDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function dayNumber(startDate: string, dayDate: string) {
  const diff = Date.parse(`${dayDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`);
  return 1 + Math.round(diff / 86_400_000);
}

function StopFields({
  trip, stop, prefix,
}: {
  trip: Trip;
  stop?: Stop;
  prefix: string;
}) {
  return (
    <>
      <div>
        <label htmlFor={`${prefix}-title`} className="mb-1 block text-sm font-semibold text-slate-700">Stop name</label>
        <input id={`${prefix}-title`} name="title" required maxLength={120}
          defaultValue={stop?.title} placeholder="Golden Gate Bridge"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${prefix}-day`} className="mb-1 block text-sm font-semibold text-slate-700">Travel day</label>
          <input id={`${prefix}-day`} type="date" name="day_date" required
            min={trip.start_date} max={trip.end_date} defaultValue={stop?.day_date ?? trip.start_date}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5" />
        </div>
        <div>
          <label htmlFor={`${prefix}-time`} className="mb-1 block text-sm font-semibold text-slate-700">Time (optional)</label>
          <input id={`${prefix}-time`} type="time" name="time_local"
            defaultValue={stop?.time_local?.slice(0, 5) ?? ''}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5" />
        </div>
      </div>
      <div>
        <label htmlFor={`${prefix}-category`} className="mb-1 block text-sm font-semibold text-slate-700">Category</label>
        <select id={`${prefix}-category`} name="category" defaultValue={stop?.category ?? 'place'}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">
          {categoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`${prefix}-address`} className="mb-1 block text-sm font-semibold text-slate-700">Address / location (optional)</label>
        <input id={`${prefix}-address`} name="address" maxLength={240}
          defaultValue={stop?.address} placeholder="San Francisco, California"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5" />
      </div>
      <div>
        <label htmlFor={`${prefix}-notes`} className="mb-1 block text-sm font-semibold text-slate-700">Notes (optional)</label>
        <textarea id={`${prefix}-notes`} name="notes" maxLength={2000}
          defaultValue={stop?.notes} rows={3} placeholder="Tickets, reservations, ideas..."
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5" />
      </div>
    </>
  );
}

function StopCard({
  trip, stop, index, count, editable,
}: {
  trip: Trip;
  stop: Stop;
  index: number;
  count: number;
  editable: boolean;
}) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Stop {index + 1} / {categoryNames[stop.category] ?? 'Other'}
          </p>
          <h4 className="mt-1 break-words text-lg font-bold text-slate-900">{stop.title}</h4>
          {(stop.time_local || stop.address) && (
            <p className="mt-1 break-words text-sm text-slate-600">
              {stop.time_local ? `Time: ${stop.time_local.slice(0, 5)}` : ''}
              {stop.time_local && stop.address ? ' | ' : ''}
              {stop.address || ''}
            </p>
          )}
          {stop.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">{stop.notes}</p>}
          <Link href={`/trips/${trip.id}?mapDay=${encodeURIComponent(stop.day_date)}&mapStop=${stop.id}&resolve=1#map`}
            className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:underline">
            Find this stop on the map
          </Link>
        </div>
        {editable && (
          <div className="flex gap-1" aria-label={`Change order of ${stop.title}`}>
            <form action={moveStopAction}>
              <input type="hidden" name="trip_id" value={trip.id} />
              <input type="hidden" name="stop_id" value={stop.id} />
              <input type="hidden" name="direction" value="-1" />
              <button type="submit" disabled={index === 0} aria-label={`Move ${stop.title} earlier`}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30">Up</button>
            </form>
            <form action={moveStopAction}>
              <input type="hidden" name="trip_id" value={trip.id} />
              <input type="hidden" name="stop_id" value={stop.id} />
              <input type="hidden" name="direction" value="1" />
              <button type="submit" disabled={index === count - 1} aria-label={`Move ${stop.title} later`}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30">Down</button>
            </form>
          </div>
        )}
      </div>
      {editable && (
        <div className="mt-4 flex flex-wrap items-start gap-3 border-t border-slate-100 pt-3">
          <details className="group min-w-0 flex-1 basis-full sm:basis-auto">
            <summary className="w-fit cursor-pointer text-sm font-semibold text-blue-700 hover:underline">Edit stop</summary>
            <form action={updateStopAction} className="mt-4 space-y-4 rounded-xl bg-slate-50 p-4">
              <input type="hidden" name="trip_id" value={trip.id} />
              <input type="hidden" name="stop_id" value={stop.id} />
              <StopFields trip={trip} stop={stop} prefix={`edit-${stop.id}`} />
              <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Save changes</button>
            </form>
          </details>
          <details className="min-w-0">
            <summary className="cursor-pointer text-sm font-semibold text-red-700 hover:underline">Delete</summary>
            <form action={deleteStopAction} className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
              <input type="hidden" name="trip_id" value={trip.id} />
              <input type="hidden" name="stop_id" value={stop.id} />
              <p className="mb-2 text-red-900">Delete this stop permanently?</p>
              <button type="submit" className="rounded-lg bg-red-700 px-3 py-2 font-semibold text-white hover:bg-red-800">Yes, delete stop</button>
            </form>
          </details>
        </div>
      )}
    </li>
  );
}

export default async function TripDetailPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; mapDay?: string; mapStop?: string; resolve?: string }>;
}) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const { supabase, userId } = await requireUser();

  const { data: tripData, error: tripError } = await supabase.from('trips')
    .select('id,name,start_date,end_date,timezone,owner_id')
    .eq('id', id).maybeSingle();
  // M1 RLS intentionally makes missing and unauthorized trips indistinguishable.
  if (tripError || !tripData) notFound();
  const trip = tripData as Trip;

  const { data: membership } = await supabase.from('trip_members')
    .select('role').eq('trip_id', id).eq('user_id', userId).maybeSingle();
  const editable = membership?.role === 'owner' || membership?.role === 'editor';
  const isOwner = membership?.role === 'owner';

  // Only the M5 RPC returns member emails; direct auth.users access is never granted.
  const membersResponse = await supabase.rpc('list_trip_members', { p_trip_id: id });
  const invitationsResponse = isOwner
    ? await supabase.rpc('list_trip_invitations', { p_trip_id: id })
    : { data: [] as InviteRow[], error: null };
  const collaborationError = Boolean(membersResponse.error || invitationsResponse.error);
  const members = (membersResponse.data ?? []) as MemberRow[];
  const invitations = (invitationsResponse.data ?? []) as InviteRow[];

  const { data: stopsData, error: stopsError } = await supabase.from('trip_stops')
    .select('id,day_date,sort_order,title,category,address,notes,time_local')
    .eq('trip_id', id)
    .order('day_date', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  const stops = (stopsData ?? []) as Stop[];
  // M3 fields are fetched separately: M2 itinerary remains usable until M3 SQL runs.
  const { data: mappedData, error: mapFieldsError } = await supabase.from('trip_stops')
    .select('id,latitude,longitude,location_label').eq('trip_id', id);
  const pins = new Map<string, { latitude: number | null; longitude: number | null; location_label: string | null }>(
    (mappedData ?? []).map((pin) => [pin.id, pin] as const),
  );
  // Keep M2 itinerary usable even before the M4 calendar SQL is applied.
  const { data: calendarFields, error: calendarFieldsError } = await supabase.from('trip_stops')
    .select('id,duration_minutes').eq('trip_id', id);
  const durationById = new Map<string, number>(
    (calendarFields ?? []).map((item) => [item.id, item.duration_minutes] as const),
  );
  const calendarStops: CalendarStop[] = stops.map((stop) => ({
    id: stop.id, title: stop.title, category: stop.category, day_date: stop.day_date,
    sort_order: stop.sort_order, time_local: stop.time_local,
    duration_minutes: durationById.get(stop.id) ?? 60,
  }));
  const mapStops: MapStop[] = stops.map((stop) => {
    const pin = pins.get(stop.id);
    return { id: stop.id, day_date: stop.day_date, sort_order: stop.sort_order,
      title: stop.title, address: stop.address, latitude: pin?.latitude ?? null,
      longitude: pin?.longitude ?? null, location_label: pin?.location_label ?? null };
  });
  const byDay = new Map<string, Stop[]>();
  for (const stop of stops) {
    const list = byDay.get(stop.day_date) ?? [];
    list.push(stop);
    byDay.set(stop.day_date, list);
  }
  const { notice, mapDay, mapStop, resolve } = await searchParams;

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
      <Link href="/trips" className="text-sm font-semibold text-blue-700 hover:underline">Back to all trips</Link>
      <header className="mt-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Trip itinerary / M5</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{trip.name}</h1>
          <p className="mt-2 text-slate-600">{trip.start_date} to {trip.end_date} | {trip.timezone}</p>
          <a href="#collaboration" className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:underline">Manage trip collaboration</a>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TripAutoRefresh />
          <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold capitalize text-blue-700">
            {membership?.role ?? 'Member'} access
          </span>
        </div>
      </header>

      {notice && notices[notice] && (
        <p role="status" className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {notices[notice]}
        </p>
      )}
      {stopsError && (
        <p role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Could not load the itinerary. Apply the M2 SQL migration from docs/M2_SETUP.md, then reload. Your M1 trips are unchanged.
        </p>
      )}

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(275px,350px)_minmax(0,1fr)]">
        <aside id="add-stop" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-slate-900">Add a stop</h2>
          {editable ? (
            <>
              <p className="mt-2 text-sm leading-6 text-slate-600">Schedule a place, hotel, meal, or activity on any day of your trip.</p>
              <form action={addStopAction} className="mt-5 space-y-4">
                <input type="hidden" name="trip_id" value={trip.id} />
                <StopFields trip={trip} prefix="add" />
                <button type="submit" disabled={Boolean(stopsError)}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
                  Add to itinerary
                </button>
              </form>
            </>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-600">Your access is read-only. An owner or editor can add and change stops.</p>
          )}
        </aside>

        <section id="itinerary" className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Itinerary by day</h2>
              <p className="mt-1 text-sm text-slate-600">{stops.length} {stops.length === 1 ? 'stop' : 'stops'} planned</p>
            </div>
            <p className="text-xs text-slate-500">Use Up / Down to reorder within a day.</p>
          </div>
          {stopsError ? null : byDay.size === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <h3 className="text-lg font-semibold text-slate-800">No stops yet</h3>
              <p className="mt-2 text-sm text-slate-600">Use the Add a stop form to start your day-by-day plan.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-7">
              {Array.from(byDay.entries()).map(([date, dayStops]) => (
                <section key={date} aria-label={`Day ${dayNumber(trip.start_date, date)}`}>
                  <h3 className="mb-3 flex flex-wrap items-baseline gap-2 border-b border-slate-200 pb-2 text-lg font-bold text-slate-900">
                    <span>Day {dayNumber(trip.start_date, date)}</span>
                    <span className="text-sm font-normal text-slate-500">{readableDate(date)}</span>
                  </h3>
                  <ol className="space-y-3">
                    {dayStops.map((stop, index) => (
                      <StopCard key={stop.id} trip={trip} stop={stop} index={index} count={dayStops.length} editable={editable} />
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </section>
      </div>

      <section id="calendar" className="mt-6 scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Trip calendar</h2>
            <p className="mt-1 text-sm text-slate-600">Switch between a day-by-day plan and an hourly weekly schedule.</p>
          </div>
          <span className="text-xs font-semibold text-blue-700">M4 · synced to itinerary</span>
        </div>
        {stopsError ? (
          <p className="mt-3 text-sm text-amber-800">Load the itinerary to view your calendar.</p>
        ) : (
          <>
            {calendarFieldsError && (
              <p role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Calendar scheduling needs the M4 SQL migration. The itinerary and map remain available.
              </p>
            )}
            <TripCalendar tripId={trip.id} startDate={trip.start_date} endDate={trip.end_date}
              timezone={trip.timezone} stops={calendarStops} editable={editable && !calendarFieldsError} />
          </>
        )}
      </section>

      <section id="map" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-slate-900">Interactive map and driving routes</h2>
          <Link href={`/trips/${trip.id}/navigate`} className="inline-flex rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Open M6 navigation</Link>
          <span className="text-xs font-semibold text-teal-700">M3 · free OpenStreetMap</span>
        </div>
        {mapFieldsError ? (
          <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            The itinerary still works, but map pins need the M3 SQL migration. See docs/M3_SETUP.md.
          </p>
        ) : (
          <TripMap key={`${mapDay ?? ''}:${mapStop ?? ''}:${resolve ?? ''}:${notice ?? ''}`}
            tripId={trip.id} startDate={trip.start_date} initialDay={mapDay}
            initialStopId={mapStop} resolveNext={resolve === '1'}
            stops={mapStops} editable={editable} />
        )}
      </section>
      <TripCollaboration tripId={trip.id} userId={userId} role={membership?.role ?? 'viewer'}
        members={members} invitations={invitations} error={collaborationError} />
    </main>
  );
}
