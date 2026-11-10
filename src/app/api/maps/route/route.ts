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

type RouteStop = { latitude: number | null; longitude: number | null };

export async function POST(request: NextRequest) {
  if (!supabaseConfigured()) return NextResponse.json({ error: 'Supabase not configured.' }, { status: 503, headers: noStore });
  if (!geoapifyConfigured()) return NextResponse.json({ error: 'Map service is not configured.' }, { status: 503, headers: noStore });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: noStore }); }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: noStore });
  const values = body as { tripId?: unknown; dayDate?: unknown };
  const tripId = typeof values.tripId === 'string' ? values.tripId : '';
  const dayDate = typeof values.dayDate === 'string' ? values.dayDate : '';
  if (!uuidPattern.test(tripId) || !datePattern.test(dayDate))
    return NextResponse.json({ error: 'Invalid trip or date.' }, { status: 400, headers: noStore });

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  if (authError || !auth?.claims?.sub) return NextResponse.json({ error: 'Sign in first.' }, { status: 401, headers: noStore });
  const { data: trip, error: tripError } = await supabase.from('trips').select('id,start_date,end_date').eq('id', tripId).maybeSingle();
  if (tripError || !trip) return NextResponse.json({ error: 'Trip not found or access denied.' }, { status: 404, headers: noStore });
  if (dayDate < trip.start_date || dayDate > trip.end_date)
    return NextResponse.json({ error: 'Day is outside trip dates.' }, { status: 400, headers: noStore });

  const { data, error } = await supabase.from('trip_stops')
    .select('latitude,longitude').eq('trip_id', tripId).eq('day_date', dayDate)
    .order('sort_order', { ascending: true }).order('id', { ascending: true });
  if (error) return NextResponse.json({ error: 'Could not load stops.' }, { status: 503, headers: noStore });
  const stops = ((data ?? []) as RouteStop[]).filter((stop) =>
    stop.latitude !== null && stop.longitude !== null && Number.isFinite(stop.latitude) &&
    Number.isFinite(stop.longitude) && Math.abs(stop.latitude) <= 90 && Math.abs(stop.longitude) <= 180)
    .map((stop) => ({ latitude: stop.latitude as number, longitude: stop.longitude as number }));
  if (stops.length < 2) return NextResponse.json({ error: 'Pin at least two stops on this day.' }, { status: 400, headers: noStore });
  if (stops.length > 12) return NextResponse.json({ error: 'Route preview supports up to 12 pinned stops per day.' }, { status: 400, headers: noStore });

  const quota = quotaError(await consumeGeoapifyQuota(supabase, tripId, 'map_route'));
  if (quota) return quota;
  try {
    const result = await routeGeoapify(stops, [], false);
    if (!result) return NextResponse.json({ error: 'No driving route found for these stops.' }, { status: 422, headers: noStore });
    return NextResponse.json({ points: result.points, distanceMeters: result.distanceMeters,
      durationSeconds: result.durationSeconds, count: stops.length }, { headers: noStore });
  } catch (error) {
    return geoapifyUnavailable(error);
  }
}
