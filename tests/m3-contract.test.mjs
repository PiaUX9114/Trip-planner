import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (name) => readFileSync(join(root, name), 'utf8');
const sql = read('supabase/migrations/202611090003_m3_map_pins.sql');
const page = read('src/app/trips/[id]/page.tsx');
const component = read('src/components/trip-map.tsx');
const canvas = read('src/components/leaflet-canvas.tsx');
const search = read('src/app/api/maps/search/route.ts');
const route = read('src/app/api/maps/route/route.ts');
const actions = read('src/app/trips/[id]/map-actions.ts');

test('M3 new sources and setup guide exist', () => {
  for (const name of [
    'src/components/map-types.ts', 'src/components/trip-map.tsx',
    'src/components/leaflet-canvas.tsx', 'src/components/trip-map.css',
    'src/app/api/maps/search/route.ts', 'src/app/api/maps/route/route.ts',
    'src/app/trips/[id]/map-actions.ts',
    'src/lib/map/public-api.ts', 'docs/M3_SETUP.md',
    'supabase/migrations/202611090003_m3_map_pins.sql',
  ]) assert.ok(existsSync(join(root, name)), `Missing ${name}`);
});

test('M3 migration adds optional coordinates and does not destroy M1/M2 data', () => {
  assert.match(sql, /alter table public\.trip_stops/i);
  for (const name of ['latitude', 'longitude', 'location_label']) assert.match(sql, new RegExp(`\\b${name}\\b`));
  assert.doesNotMatch(sql, /drop (?:table|schema|column|function)/i);
  assert.doesNotMatch(sql, /create table public\.trips\b/i);
  assert.match(sql, /^begin;/im);
  assert.match(sql, /^commit;/im);
});

test('RLS stays in place; coordinates can only be written by authorized RPC', () => {
  assert.match(sql, /security definer/i);
  assert.match(sql, /private\.can_edit_trip\(p_trip_id\)/);
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /revoke all on function public\.pin_trip_stop[\s\S]*from public, anon/);
  assert.match(sql, /grant execute on function public\.pin_trip_stop[\s\S]*to authenticated/);
  assert.doesNotMatch(sql, /grant update on public\.trip_stops/i);
});

test('Coordinates are validated and stale pins cleared when stop address changes', () => {
  assert.match(sql, /latitude between -90 and 90/i);
  assert.match(sql, /longitude between -180 and 180/i);
  assert.match(sql, /before update of address, title/i);
  assert.match(sql, /new\.latitude := null/);
});

test('M2 stop saving and day ordering remain available in the M3 page', () => {
  for (const text of ['Add a stop', 'Itinerary by day', 'moveStopAction', 'updateStopAction', 'deleteStopAction']) {
    assert.ok(page.includes(text), `M2 functionality missing: ${text}`);
  }
  assert.match(page, /<TripMap/);
  assert.match(page, /mapFieldsError/);
});

test('Map uses real OpenStreetMap raster tiles and visible attribution', () => {
  assert.match(canvas, /https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
  assert.match(canvas, /OpenStreetMap/);
  assert.match(canvas, /divIcon/);
  assert.match(canvas, /number = stops\.indexOf\(stop\) \+ 1/);
  assert.match(canvas, /textContent =/);
  assert.doesNotMatch(canvas, /innerHTML\s*=/);
});

test('Search happens only on explicit submit, with no autocomplete', () => {
  assert.match(component, /onSubmit=\{searchPlace\}/);
  assert.match(component, /onClick=\{showDrivingRoute\}/);
  assert.doesNotMatch(component, /setInterval|setTimeout/);
  assert.doesNotMatch(component, /geolocation\.watchPosition/);
});

test('Authenticated geocoding limits query length, checks RLS trip and rate', () => {
  assert.match(search, /auth\.getClaims\(\)/);
  assert.match(search, /from\('trips'\)/);
  assert.match(search, /query\.length < 3/);
  assert.match(search, /allowPublicRequest\('nominatim'\)/);
  assert.match(search, /https:\/\/nominatim\.openstreetmap\.org\/search/);
});

test('Routing reads saved stops from Supabase rather than trusting client coordinates', () => {
  assert.match(route, /from\('trip_stops'\)/);
  assert.match(route, /from\('trips'\)/);
  assert.match(route, /\.order\('sort_order'/);
  assert.match(route, /stops\.length > 12/);
  assert.match(route, /allowPublicRequest\('osrm'\)/);
  assert.match(route, /router\.project-osrm\.org/);
});

test('Map pin action uses existing auth and role-protected RPC', () => {
  assert.match(actions, /'use server'/);
  assert.match(actions, /requireUser\(\)/);
  assert.match(actions, /\.rpc\('pin_trip_stop'/);
  assert.match(actions, /Number\.isFinite/);
});

test('Public API does not include paid Google mapping services or keys', () => {
  const all = search + route + component + canvas;
  assert.doesNotMatch(all, /maps\.googleapis\.com|google\.maps\.Map|GOOGLE_MAPS_API_KEY/);
});
