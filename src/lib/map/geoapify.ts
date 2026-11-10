import 'server-only';

import type { NavigationRoute, NavigationStep } from '@/lib/navigation/types';

type Coordinate = { latitude: number; longitude: number };
type RawPoint = { lat?: unknown; lon?: unknown };
type RawStep = { from_index?: unknown; instruction?: { text?: unknown; type?: unknown } };
type RawLeg = { steps?: RawStep[] };
type RawResult = {
  distance?: unknown;
  time?: unknown;
  geometry?: RawPoint[][];
  legs?: RawLeg[];
};

type GeoapifyRoutingResponse = { results?: RawResult[]; message?: unknown };

function isCoordinate(lat: unknown, lon: unknown): lat is number {
  return typeof lat === 'number' && typeof lon === 'number' &&
    Number.isFinite(lat) && Number.isFinite(lon) &&
    Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

export function geoapifyConfigured(): boolean {
  return Boolean(process.env.GEOAPIFY_API_KEY?.trim());
}

function buildUrl(path: 'geocode/search' | 'routing'): URL {
  const apiKey = process.env.GEOAPIFY_API_KEY?.trim();
  if (!apiKey) throw new Error('Geoapify is not configured');
  const url = new URL(`https://api.geoapify.com/v1/${path}`);
  url.searchParams.set('apiKey', apiKey);
  return url;
}

export class ProviderError extends Error {
  constructor(readonly status: number) { super('Geoapify provider error'); }
}

async function fetchGeoapify(url: URL): Promise<unknown> {
  // Keep the complete URL (which contains the API key) out of application logs.
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(14_000),
  });
  if (!response.ok) throw new ProviderError(response.status);
  return response.json();
}

export async function searchGeoapify(query: string): Promise<Array<{ label: string; latitude: number; longitude: number }>> {
  const url = buildUrl('geocode/search');
  url.searchParams.set('text', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');
  url.searchParams.set('lang', 'en');
  const raw = await fetchGeoapify(url) as { results?: Array<{ formatted?: unknown; lat?: unknown; lon?: unknown }> };
  if (!Array.isArray(raw?.results)) throw new ProviderError(502);
  return raw.results.filter((item) => isCoordinate(item.lat, item.lon) &&
    typeof item.formatted === 'string' && item.formatted.length > 0)
    .map((item) => ({
      label: String(item.formatted).slice(0, 240),
      latitude: Number(item.lat),
      longitude: Number(item.lon),
    }));
}

function geoapifyGeometry(raw: RawResult): Array<[number, number]> {
  if (!Array.isArray(raw.geometry)) return [];
  const result: Array<[number, number]> = [];
  let total = 0;
  // Geoapify format=json geometry is a list of legs of {lat,lon} objects.
  for (const segment of raw.geometry) {
    if (!Array.isArray(segment)) return [];
    total += segment.length;
    if (total > 100_000) return [];
    for (const point of segment) {
      if (!isCoordinate(point?.lat, point?.lon)) return [];
      const latlon: [number, number] = [point.lat, point.lon as number];
      if (result.length === 0 || result[result.length - 1][0] !== latlon[0] || result[result.length - 1][1] !== latlon[1]) {
        result.push(latlon);
      }
    }
  }
  if (result.length < 2) return [];
  const stride = Math.max(1, Math.ceil((result.length - 1) / 7999));
  return result.filter((_, i) => i % stride === 0 || i === result.length - 1);
}

function extractSteps(raw: RawResult, stops: Array<{ title: string }>, liveStart: boolean): NavigationStep[] {
  const result: NavigationStep[] = [];
  for (let legIndex = 0; legIndex < (raw.legs?.length ?? 0); legIndex += 1) {
    const leg = raw.legs?.[legIndex];
    const legGeometry = raw.geometry?.[legIndex];
    if (!leg || !Array.isArray(legGeometry)) continue;
    const destination = stops[liveStart ? legIndex : legIndex + 1]?.title ?? 'the next stop';
    for (const step of leg.steps ?? []) {
      const idx = step.from_index;
      if (typeof idx !== 'number' || !Number.isInteger(idx) || idx < 0 || idx >= legGeometry.length) continue;
      const point = legGeometry[idx];
      if (!isCoordinate(point?.lat, point?.lon)) continue;
      const instruction = typeof step.instruction?.text === 'string' && step.instruction.text.trim()
        ? step.instruction.text.trim().slice(0, 240)
        : `Continue toward ${destination}`;
      result.push({
        instruction,
        position: [point.lat, point.lon as number],
        type: typeof step.instruction?.type === 'string' ? step.instruction.type.slice(0, 40) : 'continue',
      });
      if (result.length >= 300) return result;
    }
  }
  return result;
}

export async function routeGeoapify(waypoints: Coordinate[], stops: Array<{ title: string }>, liveStart: boolean): Promise<NavigationRoute | null> {
  if (waypoints.length < 2 || waypoints.length > 13 || waypoints.some((p) => !isCoordinate(p.latitude, p.longitude))) {
    throw new ProviderError(400);
  }
  const url = buildUrl('routing');
  url.searchParams.set('waypoints', waypoints.map((p) => `${p.latitude},${p.longitude}`).join('|'));
  url.searchParams.set('mode', 'drive');
  url.searchParams.set('format', 'json');
  url.searchParams.set('lang', 'en');
  const data = await fetchGeoapify(url) as GeoapifyRoutingResponse;
  const route = data?.results?.[0];
  if (!route) return null;
  const points = geoapifyGeometry(route);
  if (points.length < 2) return null;
  const distance = Number(route.distance);
  const duration = Number(route.time);
  if (!Number.isFinite(distance) || !Number.isFinite(duration) || distance < 0 || duration < 0) return null;
  return {
    points,
    steps: extractSteps(route, stops, liveStart),
    distanceMeters: distance,
    durationSeconds: duration,
    waypointCount: stops.length,
    usesLiveStart: liveStart,
  };
}
