import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const root = process.cwd();
const read = (p) => readFileSync(join(root, p), 'utf8');

const sql = 'supabase/migrations/202611090006_m7_geoapify_quota.sql';
const provider = 'src/lib/map/geoapify.ts';
const quota = 'src/lib/map/geoapify-quota.ts';
const api = 'src/lib/map/api-errors.ts';
const endpoints = [
  'src/app/api/maps/search/route.ts',
  'src/app/api/maps/route/route.ts',
  'src/app/api/navigation/route/route.ts',
];

test('Geoapify update files live in main project paths', () => {
  for (const path of [sql, provider, quota, api, ...endpoints, 'README_M7_GEOAPIFY.md']) {
    assert.ok(existsSync(join(root, path)), path);
  }
});

test('All mapping APIs use server-only provider, authentication and shared quota', () => {
  const providerSource = read(provider);
  assert.match(providerSource, /import 'server-only'/);
  assert.match(providerSource, /process\.env\.GEOAPIFY_API_KEY/);
  assert.match(providerSource, /https:\/\/api\.geoapify\.com\/v1/);
  assert.doesNotMatch(providerSource, /NEXT_PUBLIC_GEOAPIFY|apiKey\s*=\s*['"][a-z0-9]{12}/i);
  for (const endpoint of endpoints) {
    const source = read(endpoint);
    assert.match(source, /geoapifyConfigured\(\)/);
    assert.match(source, /auth\.getClaims\(\)/);
    assert.match(source, /from\('trips'\)/);
    assert.match(source, /consumeGeoapifyQuota\(/);
    assert.doesNotMatch(source, /nominatim\.openstreetmap\.org|router\.project-osrm\.org|allowPublicRequest\(/);
  }
});

test('Search and routing preserve UI response shapes', () => {
  assert.match(read(endpoints[0]), /\{ results \}/);
  assert.match(read(endpoints[1]), /distanceMeters: result\.distanceMeters/);
  assert.match(read(endpoints[1]), /durationSeconds: result\.durationSeconds/);
  assert.match(read(endpoints[1]), /count: stops\.length/);
  assert.match(read(endpoints[2]), /return NextResponse\.json\(result,/);
  assert.match(read(provider), /format', 'json'/);
  assert.match(read(provider), /waypoints'/);
  assert.match(read(provider), /extractSteps\(/);
});

test('Distributed quotas are private, atomic, and auth-scoped', () => {
  const migration = read(sql);
  assert.match(migration, /create table if not exists private\.geoapify_quota_buckets/i);
  assert.match(migration, /pg_advisory_xact_lock\(/i);
  assert.match(migration, /private\.is_trip_member\(p_trip_id\)/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /grant execute on function public\.take_geoapify_quota\(uuid, text\) to authenticated/i);
  assert.match(migration, /revoke all on private\.geoapify_quota_buckets from public, anon, authenticated/i);
  assert.doesNotMatch(migration, /service_role|sb_secret_|GEOAPIFY_API_KEY/i);
  assert.match(read(quota), /\.rpc\('take_geoapify_quota_server'/);
});

test('No automatic GPS tracking or upstream calls are added by this update', () => {
  for (const endpoint of endpoints) {
    const source = read(endpoint);
    assert.doesNotMatch(source, /setInterval|watchPosition|service_role/);
    assert.match(source, /'Cache-Control': 'no-store'|noStore/);
  }
  assert.match(read('src/components/trip-navigation.tsx'), /onClick=\{calculateRoute\}/);
});
