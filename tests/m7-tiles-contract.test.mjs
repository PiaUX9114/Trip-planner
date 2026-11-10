import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const get = (path) => readFileSync(path, 'utf8');
const tileRoute = 'src/app/api/tiles/[z]/[x]/[y]/route.ts';
const tileQuota = 'supabase/migrations/202611090007_m7_geoapify_tile_quota.sql';

test('Geoapify tile endpoint and quota migration exist', () => {
  assert.ok(existsSync(tileRoute));
  assert.ok(existsSync(tileQuota));
  const route = get(tileRoute);
  const sql = get(tileQuota);
  assert.match(route, /geoapifyConfigured\(\)/);
  assert.match(route, /auth\.getClaims\(\)/);
  assert.match(route, /take_geoapify_tile_quota/);
  assert.match(route, /https:\/\/maps\.geoapify\.com\/v1\/tile\/osm-carto/);
  assert.match(route, /process\.env\.GEOAPIFY_API_KEY/);
  assert.doesNotMatch(route, /NEXT_PUBLIC_GEOAPIFY/);
  assert.match(sql, /security definer/i);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /to authenticated/);
  assert.doesNotMatch(sql, /to anon/);
});

test('Both map components use the same origin tile endpoint with proper attribution', () => {
  for (const f of ['src/components/leaflet-canvas.tsx','src/components/navigation-map.tsx']) {
    const source = get(f);
    assert.match(source, /\/api\/tiles\/\{z\}\/\{x\}\/\{y\}/);
    assert.match(source, /Geoapify/);
    assert.match(source, /OpenStreetMap/);
    assert.doesNotMatch(source, /tile\.openstreetmap\.org/);
  }
});
