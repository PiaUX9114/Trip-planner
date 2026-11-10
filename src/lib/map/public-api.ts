import 'server-only';

// In-process throttling for ONE Codespaces dev instance. Do not deploy as a
// multi-instance production rate limiter. Public endpoints are best effort.
const lastRequest: Record<'nominatim' | 'osrm', number> = { nominatim: 0, osrm: 0 };
export function allowPublicRequest(service: 'nominatim' | 'osrm'): boolean {
  const now = Date.now();
  if (now - lastRequest[service] < 1100) return false;
  lastRequest[service] = now;
  return true;
}

export const publicApiHeaders = {
  'User-Agent': 'TripPlannerM3-Development/0.3 (+https://github.com/codespaces)',
  'Accept': 'application/json',
};
