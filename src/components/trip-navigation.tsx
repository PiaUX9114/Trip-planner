'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { NavigationRoute, NavigationStop } from '@/lib/navigation/types';
import { formatDistance, formatDuration, routeProgress, type LatLon } from '@/lib/navigation/route-progress';

const NavigationMap = dynamic(() => import('./navigation-map'), {
  ssr: false,
  loading: () => <div className="flex h-[340px] items-center justify-center rounded-xl bg-slate-100 text-slate-600 sm:h-[470px]">Loading map...</div>,
});

type GpsFix = { latitude: number; longitude: number; accuracy: number; timestamp: number };
type Props = {
  tripId: string;
  startDate: string;
  stops: NavigationStop[];
};

type RoutePayload = NavigationRoute & { error?: string };

export default function TripNavigation({ tripId, startDate, stops }: Props) {
  const days = useMemo(() => [...new Set(stops.map((stop) => stop.day_date))].sort(), [stops]);
  const [day, setDay] = useState(days[0] ?? startDate);
  const [gps, setGps] = useState<GpsFix | null>(null);
  const [clock, setClock] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [follow, setFollow] = useState(false);
  const [gpsNotice, setGpsNotice] = useState('Device location is off.');
  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const watchRef = useRef<number | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const dayStops = useMemo(() => stops.filter((stop) => stop.day_date === day &&
    stop.latitude !== null && stop.longitude !== null), [stops, day]);
  const allOnDay = stops.filter((stop) => stop.day_date === day);
  const location: LatLon | null = gps ? [gps.latitude, gps.longitude] : null;
  const liveFix = gps && clock - gps.timestamp < 60_000 && gps.accuracy <= 100 ? gps : null;

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState !== 'hidden' || watchRef.current === null) return;
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      requestRef.current?.abort();
      requestRef.current = null;
      setTracking(false);
      setGps(null);
      setFollow(false);
      setRoute(null);
      setGpsNotice('Location tracking stopped when the tab became hidden.');
    };
    document.addEventListener('visibilitychange', onHidden);
    const pulse = window.setInterval(() => setClock(Date.now()), 15_000);
    return () => {
      window.clearInterval(pulse);
      document.removeEventListener('visibilitychange', onHidden);
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, []);

  function startLocation() {
    if (watchRef.current !== null) return;
    if (!window.isSecureContext || !('geolocation' in navigator)) {
      setGpsNotice('Location requires an HTTPS browser tab and a device that supports geolocation.');
      return;
    }
    setGpsNotice('Requesting permission to use device location...');
    setTracking(true);
    setError('');
    try {
      watchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
          setGps({ latitude, longitude, accuracy, timestamp: position.timestamp });
          setClock(Date.now());
          setGpsNotice('Device location available. Your exact fix is not sent to routing until you request a route; centering the map may request nearby tiles.');
        },
        (issue) => {
          if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
          watchRef.current = null;
          setTracking(false);
          setGpsNotice(issue.code === 1 ? 'Location permission denied. Enable it in browser settings to try again.' :
            'Could not obtain a location fix. You can still preview the itinerary route.');
        },
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
      );
    } catch {
      setTracking(false);
      setGpsNotice('Location could not be started. Use the route preview without GPS.');
    }
  }

  function stopLocation() {
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    setTracking(false);
    setGps(null);
    setFollow(false);
    setRoute(null);
    setGpsNotice('Location sharing stopped; the current GPS fix was cleared.');
  }

  async function calculateRoute() {
    setError('');
    if (dayStops.length + (liveFix ? 1 : 0) < 2) {
      setError('Pin two stops on this day, or enable accurate device location and pin one stop.');
      return;
    }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setRoute(null);
    try {
      const response = await fetch('/api/navigation/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
        body: JSON.stringify({
          tripId, dayDate: day,
          ...(liveFix ? { start: { latitude: liveFix.latitude, longitude: liveFix.longitude } } : {}),
        }),
      });
      if (!(response.headers.get('content-type') ?? '').includes('application/json'))
        throw new Error(`Navigation service returned HTTP ${response.status} instead of JSON.`);
      const data = await response.json() as RoutePayload;
      if (!response.ok) throw new Error(data.error || `Navigation service error ${response.status}`);
      if (!Array.isArray(data.points) || data.points.length < 2 || !Array.isArray(data.steps))
        throw new Error('Navigation service returned an invalid route.');
      if (requestRef.current === controller) setRoute(data);
    } catch (problem) {
      if (!controller.signal.aborted && requestRef.current === controller)
        setError(problem instanceof Error ? problem.message : 'Could not calculate the driving route.');
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  }

  function chooseDay(nextDay: string) {
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setDay(nextDay);
    setRoute(null);
    setError('');
  }

  const stepPositions = useMemo(() => route?.steps.map((step) =>
    routeProgress(step.position, route.points)?.distanceAlongMeters ?? 0) ?? [], [route]);
  const progress = route && location ? routeProgress(location, route.points) : null;
  const fixFresh = gps && clock - gps.timestamp <= 60_000;
  const reliable = Boolean(progress && fixFresh && gps && gps.accuracy <= 100 &&
    progress.offRouteMeters <= Math.max(100, gps.accuracy * 2));
  const current = reliable && progress ? progress.distanceAlongMeters : 0;
  const nextIndex = route && reliable ? route.steps.findIndex((_, i) =>
    stepPositions[i] > current + 8 && i !== 0) : -1;
  const next = route && nextIndex >= 0 ? route.steps[nextIndex] : null;
  const distanceToTurn = nextIndex >= 0 ? Math.max(0, stepPositions[nextIndex] - current) : 0;
  const remaining = progress && reliable ? Math.max(0, progress.totalMeters - progress.distanceAlongMeters) : null;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(285px,1fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="nav-day" className="text-sm font-semibold text-slate-800">Travel day</label>
          <select id="nav-day" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={day} onChange={(event) => chooseDay(event.target.value)}>
            {days.length ? days.map((value) => <option key={value} value={value}>{value}</option>) :
              <option value={startDate}>{startDate}</option>}
          </select>
        </div>
        <p className="my-3 text-sm text-slate-600">
          {dayStops.length} pinned of {allOnDay.length} stops for this day, in itinerary order.
        </p>
        <NavigationMap stops={dayStops} route={route} location={location} follow={follow} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setFollow(!follow)} disabled={!gps}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-40">
            {follow ? 'Stop centering on me' : 'Center map on me'}
          </button>
          <span className="text-xs text-slate-600">Map data: OpenStreetMap contributors | Routing powered by <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer" className="underline">Geoapify</a></span>
        </div>
      </section>

      <section className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Your location</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Location is optional. Tracking starts only when you choose it and stops when you leave or hide this page.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={startLocation} disabled={tracking}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {tracking ? 'Location enabled' : 'Enable my location'}
            </button>
            <button type="button" onClick={stopLocation} disabled={!tracking && !gps}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold disabled:opacity-40">Stop location</button>
          </div>
          <p role="status" className="mt-3 text-sm text-slate-600">{gpsNotice}</p>
          {gps && <p className="mt-2 text-xs text-slate-600">Accuracy: about {Math.round(gps.accuracy)} m. {fixFresh ? 'Recent position.' : 'Position is stale.'}</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Driving directions</h2>
          <p className="mt-2 text-sm text-slate-600">
            Request a route through today&apos;s pinned stops. {liveFix
              ? 'Your current position will be sent to the Geoapify routing service only when you request the route.'
              : 'The preview starts at the first pinned stop (no current location sent).'}
          </p>
          <button type="button" disabled={loading || dayStops.length + (liveFix ? 1 : 0) < 2}
            onClick={calculateRoute}
            className="mt-4 w-full rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white disabled:opacity-45">
            {loading ? 'Calculating route...' : route ? 'Recalculate driving route' : 'Get driving route'}
          </button>
          {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {route && <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Route distance</p><p className="text-lg font-bold">{formatDistance(route.distanceMeters)}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Est. driving time</p><p className="text-lg font-bold">{formatDuration(route.durationSeconds)}</p></div>
            </div>
            {route.usesLiveStart && <p className="mt-2 text-xs text-slate-500">This route starts at your location when you requested it. It does not reroute automatically.</p>}
            {reliable && next ? <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4" role="status">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Upcoming maneuver (approximate)</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{next.instruction}</p>
              <p className="mt-1 text-sm text-slate-700">About {formatDistance(distanceToTurn)} ahead</p>
              {remaining !== null && <p className="mt-1 text-xs text-slate-600">Approx. distance remaining: {formatDistance(remaining)}</p>}
            </div> : <p role="status" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              {!gps ? 'Turn instructions are a preview. Enable GPS for approximate progress.' :
                !reliable ? 'Position is stale, inaccurate, or too far from this route. Recalculate when stopped and safe.' :
                  'You are near the end of this route.'}
            </p>}
            <details className="mt-4 rounded-lg border border-slate-200 p-3">
              <summary className="cursor-pointer font-semibold">All route instructions ({route.steps.length})</summary>
              <ol className="mt-3 max-h-72 list-decimal space-y-2 overflow-auto pl-5 text-sm text-slate-700">
                {route.steps.map((step, index) => <li key={`${index}-${step.type}`} className={index === nextIndex && reliable ? 'font-bold text-blue-700' : ''}>{step.instruction}</li>)}
              </ol>
            </details>
          </>}
        </div>
        <div role="note" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <strong>Navigation assistance only.</strong> Routes may be outdated, inaccurate, or unavailable. No traffic, spoken guidance, background GPS, automatic rerouting, or offline maps. Obey signs and laws; do not use the screen while driving.
        </div>
      </section>
    </div>
  );
}
