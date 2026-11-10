import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
const files = [
  'src/app/trips/[id]/navigate/page.tsx',
  'src/app/api/navigation/route/route.ts',
  'src/components/trip-navigation.tsx',
  'src/components/navigation-map.tsx',
  'src/components/navigation-map.css',
  'src/lib/navigation/types.ts',
  'src/lib/navigation/route-progress.ts',
  'scripts/m6-add-navigation-link.mjs',
  'README_M6_NAVIGATION.md',
];
for (const file of files) {
  test(`M6 includes ${file}`, () => assert.ok(existsSync(join(root, file))));
}

test('Navigation is only available to signed-in trip members via RLS', () => {
  const page = read(files[0]);
  const api = read(files[1]);
  assert.match(page, /requireUser\(/);
  assert.match(page, /\.from\('trips'\)/);
  assert.match(api, /\.auth\.getClaims\(/);
  assert.match(api, /\.from\('trips'\)/);
  assert.match(api, /\.from\('trip_stops'\)/);
  assert.match(api, /\.eq\('trip_id', tripId\)/);
  assert.match(api, /\.eq\('day_date', dayDate\)/);
  assert.doesNotMatch(api, /service_role|sb_secret_/);
});

test('Driving directions are user-requested and quota-limited by Geoapify', () => {
  const api = read(files[1]);
  const panel = read(files[2]);
  assert.match(api, /consumeGeoapifyQuota\(supabase, tripId, 'navigation'\)/);
  assert.match(api, /routeGeoapify\(/);
  assert.match(api, /stops\.length > 12/);
  assert.match(api, /noStore/);
  assert.match(panel, /onClick=\{calculateRoute\}/);
  assert.match(panel, /method: 'POST'/);
  assert.match(panel, /Geoapify routing service/);
  assert.doesNotMatch(panel, /setInterval\(calculateRoute|setInterval\(.*fetch\(/);
});

test('GPS requests permission only after user action and can be stopped', () => {
  const panel = read(files[2]);
  assert.match(panel, /onClick=\{startLocation\}/);
  assert.match(panel, /navigator\.geolocation\.watchPosition/);
  assert.match(panel, /navigator\.geolocation\.clearWatch/);
  assert.match(panel, /document\.visibilityState !== 'hidden'/);
  assert.match(panel, /window\.isSecureContext/);
  assert.match(panel, /setGps\(null\)/);
  assert.match(panel, /setRoute\(null\)/);
});

test('M6 does not write or broadcast device GPS to Supabase', () => {
  const page = read(files[0]);
  const panel = read(files[2]);
  const api = read(files[1]);
  assert.doesNotMatch(panel, /\.from\('.*'\)\.(?:insert|update|upsert)/);
  assert.doesNotMatch(page, /\.from\('.*'\)\.(?:insert|update|upsert)/);
  assert.doesNotMatch(api, /\.from\('.*'\)\.(?:insert|update|upsert)/);
  assert.match(panel, /\.\.\.\(liveFix \? \{ start:/);
});

test('M6 guidance remains explicitly assistive, not background or auto-routed', () => {
  const panel = read(files[2]);
  assert.match(panel, /Navigation assistance only/);
  assert.match(panel, /No traffic, spoken guidance, background GPS, automatic rerouting/);
  assert.match(panel, /routeProgress/);
  assert.match(panel, /Recalculate driving route/);
});

test('M6 is root-relative and does not overwrite working M5 security or maps code', () => {
  const script = read(files[7]);
  const page = read('src/app/trips/[id]/page.tsx');
  assert.match(script, /Open M6 navigation/);
  assert.match(page, /Open M6 navigation/);
  assert.match(page, /<TripCollaboration /);
  assert.match(page, /<TripMap /);
  assert.match(page, /<TripCalendar /);
});
