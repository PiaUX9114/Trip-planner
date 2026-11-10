'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { pinStopAction } from '@/app/trips/[id]/map-actions';
import type { MapStop, RoutePreview } from './map-types';

const LeafletCanvas = dynamic(() => import('./leaflet-canvas'), {
  ssr: false,
  loading: () => <div className="flex h-[340px] items-center justify-center rounded-xl bg-slate-100 text-slate-600 sm:h-[460px]">Loading map…</div>,
});

type SearchResult = { label: string; latitude: number; longitude: number };
type SearchPayload = { error?: string; results?: SearchResult[] };

type Props = {
  tripId: string;
  startDate: string;
  initialDay?: string;
  initialStopId?: string;
  resolveNext?: boolean;
  stops: MapStop[];
  editable: boolean;
};

function isPinned(stop: MapStop) {
  return stop.latitude !== null && stop.longitude !== null;
}

function suggestedQuery(stop: MapStop) {
  // The itinerary's name is the search starting point; an optional location narrows the match.
  const title = stop.title.trim();
  const address = stop.address.trim();
  return (address && !title.toLowerCase().includes(address.toLowerCase())
    ? `${title}, ${address}` : title).slice(0, 120);
}

function nextMissingStop(stops: MapStop[], currentId: string) {
  const index = stops.findIndex((stop) => stop.id === currentId);
  if (index === -1) return undefined;
  const remainingInOrder = [...stops.slice(index + 1), ...stops.slice(0, index)];
  return remainingInOrder.find((stop) => !isPinned(stop));
}

export default function TripMap({ tripId, startDate, initialDay, initialStopId, resolveNext = false, stops, editable }: Props) {
  const days = useMemo(() => [...new Set([startDate, ...stops.map((stop) => stop.day_date)])].sort(), [stops, startDate]);
  const requestedStop = stops.find((stop) => stop.id === initialStopId);
  const initialDayValue = requestedStop?.day_date ?? (initialDay && days.includes(initialDay) ? initialDay
    : days.find((date) => stops.some((stop) => stop.day_date === date)) ?? startDate);
  const firstStop = requestedStop ?? stops.find((stop) => stop.day_date === initialDayValue);

  const [day, setDay] = useState(initialDayValue);
  const [selectedStopId, setSelectedStopId] = useState(firstStop?.id ?? '');
  const [query, setQuery] = useState(firstStop ? suggestedQuery(firstStop) : '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [routing, setRouting] = useState(false);
  const [error, setError] = useState('');
  const [route, setRoute] = useState<RoutePreview | null>(null);
  const [resolvingAll, setResolvingAll] = useState(resolveNext);
  const searchSerial = useRef(0);
  const resumedSearchStarted = useRef(false);

  const dayStops = useMemo(() => stops.filter((stop) => stop.day_date === day), [stops, day]);
  const selectedStop = dayStops.find((stop) => stop.id === selectedStopId);
  const pinnedCount = dayStops.filter(isPinned).length;
  const remaining = stops.filter((stop) => !isPinned(stop));
  const nextMissing = selectedStop ? nextMissingStop(stops, selectedStop.id) : undefined;

  const searchFor = useCallback(async (text: string) => {
    const searchText = text.trim();
    if (searchText.length < 3 || searchText.length > 120) {
      setError('This stop needs a more specific name or address (3–120 characters).');
      return;
    }
    const serial = ++searchSerial.current;
    setQuery(searchText);
    setSearching(true);
    setResults([]);
    setSearched(false);
    setError('');
    try {
      const response = await fetch(`/api/maps/search?trip=${encodeURIComponent(tripId)}&q=${encodeURIComponent(searchText)}`, {
        headers: { Accept: 'application/json' },
      });
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Place search returned HTTP ${response.status} instead of JSON. Check the Codespaces terminal.`);
      }
      const data = await response.json() as SearchPayload;
      if (!response.ok) throw new Error(data.error ?? `Place search failed (HTTP ${response.status}).`);
      if (!Array.isArray(data.results)) throw new Error('Place search returned an unexpected result.');
      if (searchSerial.current === serial) {
        setResults(data.results);
        setSearched(true);
      }
    } catch (reason) {
      if (searchSerial.current === serial) {
        setError(reason instanceof Error ? reason.message : 'Could not search.');
      }
    } finally {
      if (searchSerial.current === serial) setSearching(false);
    }
  }, [tripId]);

  // Only resume an explicit find-and-confirm workflow after the previous pin was saved.
  // Do not geocode every itinerary entry on page load (provider quota and privacy).
  useEffect(() => {
    if (!editable || !resolveNext || !resolvingAll || resumedSearchStarted.current) return;
    const stop = stops.find((item) => item.id === initialStopId);
    if (!stop || isPinned(stop)) return;
    // Defer state updates until after the effect body; cancel on cleanup.
    let canceled = false;
    queueMicrotask(() => {
      if (canceled || resumedSearchStarted.current) return;
      resumedSearchStarted.current = true;
      void searchFor(suggestedQuery(stop));
    });
    return () => { canceled = true; };
  }, [editable, resolveNext, resolvingAll, stops, initialStopId, searchFor]);

  const chooseStop = useCallback((id: string) => {
    const found = stops.find((stop) => stop.id === id);
    if (!found) return;
    ++searchSerial.current;
    setSearching(false);
    setResolvingAll(false);
    setDay(found.day_date);
    setSelectedStopId(id);
    setQuery(suggestedQuery(found));
    setResults([]);
    setSearched(false);
    setError('');
    setRoute(null);
  }, [stops, setDay, setSelectedStopId]);

  function chooseDay(nextDay: string) {
    const first = stops.find((stop) => stop.day_date === nextDay);
    ++searchSerial.current;
    setSearching(false);
    setResolvingAll(false);
    setDay(nextDay);
    setSelectedStopId(first?.id ?? '');
    setQuery(first ? suggestedQuery(first) : '');
    setResults([]);
    setSearched(false);
    setError('');
    setRoute(null);
  }

  function beginFindMissing() {
    const first = remaining[0];
    if (!first) return;
    ++searchSerial.current;
    setDay(first.day_date);
    setSelectedStopId(first.id);
    setRoute(null);
    setResolvingAll(true);
    void searchFor(suggestedQuery(first));
  }

  function searchPlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void searchFor(query);
  }

  async function showDrivingRoute() {
    setRouting(true); setError(''); setRoute(null);
    try {
      const response = await fetch('/api/maps/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ tripId, dayDate: day }),
      });
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Route preview returned HTTP ${response.status} instead of JSON. Check the Codespaces terminal.`);
      }
      const data = await response.json() as RoutePreview & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not calculate route.');
      setRoute(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not calculate route.');
    } finally { setRouting(false); }
  }

  return (
    <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(275px,340px)]">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-slate-700" htmlFor="map-day">Map day</label>
          <select id="map-day" value={day} onChange={(event) => chooseDay(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {days.map((date) => <option key={date} value={date}>{date}</option>)}
          </select>
          <span className="text-xs text-slate-500">{pinnedCount} of {dayStops.length} stops pinned · {remaining.length} missing across trip</span>
        </div>
        <LeafletCanvas stops={dayStops} selectedStopId={selectedStopId} onSelectStop={chooseStop} route={route} />
        <p className="text-xs leading-5 text-slate-600">
          Map © OpenStreetMap contributors. Dotted line = itinerary order, not roads.
          Solid green line = optional driving-route preview (Geoapify). Maps require internet. Routing and search powered by <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer" className="underline">Geoapify</a>.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={routing || pinnedCount < 2} onClick={showDrivingRoute}
            className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40">
            {routing ? 'Loading route…' : 'Preview driving route'}
          </button>
          {route && (
            <span className="text-sm text-slate-700">
              {(route.distanceMeters / 1000).toFixed(1)} km · approximately {Math.round(route.durationSeconds / 60)} min · {route.count} stops
            </span>
          )}
        </div>
        {dayStops.length > pinnedCount && <p className="text-xs text-amber-800">Road-route preview skips unpinned stops. Confirm their locations to include them.</p>}
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      </div>

      <aside className="min-w-0 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900">Stops on this day</h3>
          {editable && remaining.length > 0 && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <button type="button" disabled={searching} onClick={beginFindMissing}
                className="w-full rounded-lg bg-blue-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
                Find addresses for {remaining.length} unpinned {remaining.length === 1 ? 'stop' : 'stops'}
              </button>
              <p className="mt-2 text-xs text-blue-900">Starts with the stop name. Confirm each matching address to save its pin, then the next stop is searched. One search at a time; no background bulk search.</p>
            </div>
          )}
          {remaining.length === 0 && stops.length > 0 && <p className="mt-2 text-sm font-medium text-teal-700">All itinerary stops are pinned.</p>}
          {dayStops.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Add an itinerary stop first.</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {dayStops.map((stop, index) => (
                <li key={stop.id}>
                  <button type="button" onClick={() => chooseStop(stop.id)}
                    className={`w-full rounded-lg border p-3 text-left text-sm ${selectedStopId === stop.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <span className="font-semibold">{index + 1}. {stop.title}</span>
                    <span className="mt-1 block text-xs text-slate-600">{isPinned(stop) ? 'Pinned on map' : 'Not pinned · select a matching address below'}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
        {editable && selectedStop && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900">Find a location for {selectedStop.title}</h3>
            {resolvingAll && <p className="mt-1 text-xs font-semibold text-blue-800">Guided pinning: confirm this stop to continue to the next unpinned stop.</p>}
            <p className="mt-1 text-xs leading-5 text-slate-600">The search uses the itinerary name and optional address. Confirm each match before pinning. Searches use Geoapify through the Trip Planner server; avoid private addresses.</p>
            <form className="mt-3 flex flex-wrap gap-2" onSubmit={searchPlace}>
              <label htmlFor="place-query" className="sr-only">Place or address</label>
              <input id="place-query" value={query} onChange={(event) => setQuery(event.target.value)}
                maxLength={120} placeholder="Search city, landmark, street…"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
              <button type="submit" disabled={searching} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {searching ? 'Searching…' : 'Search'}
              </button>
            </form>
            {searched && results.length === 0 && <p className="mt-3 text-sm text-slate-600">No matching locations. Add a city or region and search again.</p>}
            {results.length > 0 && (
              <ol className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                {results.map((result, index) => (
                  <li key={`${result.latitude}:${result.longitude}:${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="break-words text-xs text-slate-700">{result.label}</p>
                    <form action={pinStopAction} className="mt-2">
                      <input type="hidden" name="trip_id" value={tripId} />
                      <input type="hidden" name="stop_id" value={selectedStop.id} />
                      <input type="hidden" name="map_day" value={day} />
                      <input type="hidden" name="latitude" value={result.latitude} />
                      <input type="hidden" name="longitude" value={result.longitude} />
                      <input type="hidden" name="label" value={result.label} />
                      <input type="hidden" name="resolve_flow" value={resolvingAll ? '1' : '0'} />
                      <input type="hidden" name="next_stop_id" value={resolvingAll ? (nextMissing?.id ?? '') : ''} />
                      <button type="submit" className="text-sm font-semibold text-blue-700 underline hover:text-blue-900">Use this address &amp; pin</button>
                    </form>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
        {!editable && <p className="text-sm text-slate-600">You have read-only access to pins and routes.</p>}
      </aside>
    </div>
  );
}
