/** Math for approximate position on an already fetched driving route. */
export type LatLon = [number, number];
export type Progress = { distanceAlongMeters: number; offRouteMeters: number; totalMeters: number };

const radians = Math.PI / 180;
export function metersBetween(a: LatLon, b: LatLon): number {
  const dLat = (b[0] - a[0]) * radians;
  const dLon = (b[1] - a[1]) * radians;
  const lat1 = a[0] * radians;
  const lat2 = b[0] * radians;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 12_742_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Project a GPS fix onto the nearest segment; not GPS map matching. */
export function routeProgress(point: LatLon, route: LatLon[]): Progress | null {
  if (route.length < 2) return null;
  let distanceAlongMeters = 0;
  let offRouteMeters = Number.POSITIVE_INFINITY;
  let totalMeters = 0;
  for (let i = 1; i < route.length; i += 1) {
    const a = route[i - 1];
    const b = route[i];
    const segment = metersBetween(a, b);
    const meanLat = ((a[0] + b[0]) / 2) * radians;
    const dx = (b[1] - a[1]) * 111_320 * Math.cos(meanLat);
    const dy = (b[0] - a[0]) * 111_320;
    const px = (point[1] - a[1]) * 111_320 * Math.cos(meanLat);
    const py = (point[0] - a[0]) * 111_320;
    const denom = dx * dx + dy * dy;
    const t = denom > 0 ? Math.max(0, Math.min(1, (px * dx + py * dy) / denom)) : 0;
    const projected: LatLon = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const distance = metersBetween(point, projected);
    if (distance < offRouteMeters) {
      offRouteMeters = distance;
      distanceAlongMeters = totalMeters + segment * t;
    }
    totalMeters += segment;
  }
  return { distanceAlongMeters, offRouteMeters, totalMeters };
}

export function formatDistance(meters: number) {
  if (!Number.isFinite(meters)) return 'Unknown';
  if (meters < 1000) return `${Math.max(0, Math.round(meters / 10) * 10)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return 'Unknown';
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds - hours * 3600) / 60);
  return `${hours} hr${minutes ? ` ${minutes} min` : ''}`;
}
