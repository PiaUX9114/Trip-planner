import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/config';
import { geoapifyConfigured, routeGeoapify } from '@/lib/map/geoapify';
import { consumeGeoapifyQuota } from '@/lib/map/geoapify-quota';
import { geoapifyUnavailable, noStore, quotaError } from '@/lib/map/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

type StopRow = { id: string; title: string; latitude: number | null; longitude: number | null };
function coordinateOk(lat: number, lon: number) {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

export async function POST(request: NextRequest) {
  if (!supabaseConfigured()) return NextResponse.json({ error: 'Supabase not configured.' }, { status: 503, headers: noStore });
  if (!geoapifyConfigured()) return NextResponse.json({ error: 'Map service is not configured.' }, { status: 503, headers: noStore });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: noStore }); }
  if (!raw || typeof raw !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: noStore });
  const body = raw as { tripId?: unknown; dayDate?: unknown; start?: unknown };
  const tripId = typeof body.tripId === 'string' ? body.tripId : '';
  const dayDate = typeof body.dayDate === 'string' ? body.dayDate : '';
  if (!uuidPattern.test(tripId) || !datePattern.test(dayDate))
    return NextResponse.json({ error: 'Invalid trip or date.' }, { status: 400, headers: noStore });

  let liveStart: { latitude: number; longitude: number } | null = null;
  if (body.start !== undefined && body.start !== null) {
    if (typeof body.start !== 'object') return NextResponse.json({ error: 'Invalid start position.' }, { status: 400, headers: noStore });
    const position = body.start as { latitude?: unknown; longitude?: unknown };
    if (typeof position.latitude !== 'number' || typeof position.longitude !== 'number' || !coordinateOk(position.latitude, position.longitude))
      return NextResponse.json({ error: 'Invalid start position.' }, { status: 400, headers: noStore });
    liveStart = { latitude: position.latitude, longitude: position.longitude };
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  if (authError || !auth?.claims?.sub) return NextResponse.json({ error: 'Sign in first.' }, { status: 401, headers: noStore });
  const { data: trip, error: tripError } = await supabase.from('trips').select('id,start_date,end_date').eq('id', tripId).maybeSingle();
  if (tripError || !trip) return NextResponse.json({ error: 'Trip not found or access denied.' }, { status: 404, headers: noStore });
  if (dayDate < trip.start_date || dayDate > trip.end_date)
    return NextResponse.json({ error: 'Day is outside trip dates.' }, { status: 400, headers: noStore });

  const { data, error } = await supabase.from('trip_stops')
    .select('id,title,latitude,longitude').eq('trip_id', tripId).eq('day_date', dayDate)
    .order('sort_order', { ascending: true }).order('id', { ascending: true });
  if (error) return NextResponse.json({ error: 'Could not load trip stops.' }, { status: 503, headers: noStore });
  const stops = ((data ?? []) as StopRow[]).filter((stop) =>
    typeof stop.latitude === 'number' && typeof stop.longitude === 'number' && coordinateOk(stop.latitude, stop.longitude))
    .map((stop) => ({ title: stop.title, latitude: stop.latitude as number, longitude: stop.longitude as number }));
  if (stops.length > 12) return NextResponse.json({ error: 'Use at most 12 pinned stops per day.' }, { status: 400, headers: noStore });
  if (stops.length + (liveStart ? 1 : 0) < 2)
    return NextResponse.json({ error: 'Pin two stops, or enable your location and pin one stop.' }, { status: 400, headers: noStore });

  const quota = quotaError(await consumeGeoapifyQuota(supabase, tripId, 'navigation'));
  if (quota) return quota;
  try {
    // Live GPS, if enabled, is sent only for this user-requested route;
    // it is not stored or broadcast to collaborators.
    const result = await routeGeoapify(liveStart ? [liveStart, ...stops] : stops, stops, Boolean(liveStart));
    if (!result) return NextResponse.json({ error: 'No driving route found for this trip day.' }, { status: 422, headers: noStore });
    return NextResponse.json(result, { headers: noStore });
  } catch (error) {
    return geoapifyUnavailable(error);
  }
}
