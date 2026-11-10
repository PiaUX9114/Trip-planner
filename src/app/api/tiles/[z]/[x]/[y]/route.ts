import { createClient } from '@/lib/supabase/server';
import { geoapifyConfigured } from '@/lib/map/geoapify';
import { supabaseConfigured } from '@/lib/supabase/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TileParams = { params: Promise<{ z: string; x: string; y: string }> };
const noStore = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export async function GET(_request: Request, { params }: TileParams) {
  const { z: zText, x: xText, y: yText } = await params;
  const parts = [zText, xText, yText];
  if (parts.some((part) => !/^\d{1,10}$/.test(part))) {
    return new Response('Invalid tile coordinates.', { status: 400, headers: noStore });
  }
  const [z, x, y] = parts.map(Number);
  if (z > 19 || x >= 2 ** z || y >= 2 ** z) {
    return new Response('Tile out of range.', { status: 400, headers: noStore });
  }
  if (!supabaseConfigured() || !geoapifyConfigured()) {
    return new Response('Map service unavailable.', { status: 503, headers: noStore });
  }

  // Tiles are provided only to signed-in travelers, never as an open public API.
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  if (authError || !auth?.claims?.sub) {
    return new Response('Sign in to view the map.', { status: 401, headers: noStore });
  }

  // Fail closed if the shared PostgreSQL quota migration is absent.
  const { data: allowed, error: quotaError } = await supabase.rpc('take_geoapify_tile_quota');
  if (quotaError || typeof allowed !== 'boolean') {
    return new Response('Tile quota unavailable.', { status: 503, headers: noStore });
  }
  if (!allowed) return new Response('Tile quota exceeded.', { status: 429, headers: noStore });

  const url = new URL(`https://maps.geoapify.com/v1/tile/osm-carto/${z}/${x}/${y}.png`);
  url.searchParams.set('apiKey', process.env.GEOAPIFY_API_KEY!.trim());
  try {
    const upstream = await fetch(url, {
      headers: { Accept: 'image/png' },
      cache: 'force-cache',
      signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok || !upstream.headers.get('content-type')?.startsWith('image/png')) {
      return new Response('Map tile unavailable.', { status: 502, headers: noStore });
    }
    const bytes = await upstream.arrayBuffer();
    if (bytes.byteLength > 1_000_000) {
      return new Response('Map tile too large.', { status: 502, headers: noStore });
    }
    return new Response(bytes, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    // Never log the upstream URL: it includes the server-only API key.
    return new Response('Map tile unavailable.', { status: 502, headers: noStore });
  }
}
