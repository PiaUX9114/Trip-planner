import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/config';
import { geoapifyConfigured, searchGeoapify } from '@/lib/map/geoapify';
import { consumeGeoapifyQuota } from '@/lib/map/geoapify-quota';
import { geoapifyUnavailable, noStore, quotaError } from '@/lib/map/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  if (!supabaseConfigured()) return NextResponse.json({ error: 'Supabase not configured.' }, { status: 503, headers: noStore });
  if (!geoapifyConfigured()) return NextResponse.json({ error: 'Map service is not configured.' }, { status: 503, headers: noStore });
  const tripId = request.nextUrl.searchParams.get('trip') ?? '';
  const query = (request.nextUrl.searchParams.get('q') ?? '').trim();
  if (!uuidPattern.test(tripId)) return NextResponse.json({ error: 'Invalid trip identifier.' }, { status: 400, headers: noStore });
  if (query.length < 3 || query.length > 120) return NextResponse.json({ error: 'Enter a place or address (3–120 characters).' }, { status: 400, headers: noStore });

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  if (authError || !auth?.claims?.sub) return NextResponse.json({ error: 'Sign in first.' }, { status: 401, headers: noStore });
  const { data: trip, error: tripError } = await supabase.from('trips').select('id').eq('id', tripId).maybeSingle();
  if (tripError || !trip) return NextResponse.json({ error: 'Trip not found or access denied.' }, { status: 404, headers: noStore });

  const quota = quotaError(await consumeGeoapifyQuota(supabase, tripId, 'search'));
  if (quota) return quota;
  try {
    const results = await searchGeoapify(query);
    return NextResponse.json({ results }, { headers: noStore });
  } catch (error) {
    return geoapifyUnavailable(error);
  }
}
