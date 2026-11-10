import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = (name) => readFileSync(name, 'utf8');
const admin = 'src/lib/supabase/admin.ts';
const quotas = 'src/lib/map/geoapify-quota.ts';
const tiles = 'src/app/api/tiles/[z]/[x]/[y]/route.ts';
const migration = 'supabase/migrations/202611100001_m7_quota_server_functions.sql';
const lockdown = 'supabase/migrations/202611100002_m7_quota_lockdown.sql';

test('security patch installs root-relative source and migrations', () => {
  for (const name of [admin, quotas, tiles, migration, lockdown]) assert.ok(existsSync(name), name);
});

test('admin key is server-only, never browser-facing, and does not carry cookie auth', () => {
  const code = read(admin);
  assert.match(code, /import 'server-only'/);
  assert.match(code, /process\.env\.SUPABASE_SECRET_KEY/);
  assert.match(code, /persistSession: false/);
  assert.doesNotMatch(code, /NEXT_PUBLIC_SUPABASE_SECRET_KEY|service_role/);
});

test('both quota calls derive user from verified Supabase session then use admin RPC', () => {
  const q = read(quotas);
  const t = read(tiles);
  assert.match(q, /supabase\.auth\.getClaims\(\)/);
  assert.match(t, /supabase\.auth\.getClaims\(\)/);
  assert.match(q, /admin\.rpc\('take_geoapify_quota_server'/);
  assert.match(t, /admin\.rpc\('take_geoapify_tile_quota_server'/);
  assert.doesNotMatch(q, /supabase\.rpc\('take_geoapify_quota'/);
  assert.doesNotMatch(t, /supabase\.rpc\('take_geoapify_tile_quota'/);
});

test('new privileged RPCs validate membership and cannot be called by authenticated clients', () => {
  const sql = read(migration);
  assert.match(sql, /where m\.trip_id = p_trip_id and m\.user_id = v_user/i);
  assert.match(sql, /from auth\.users u where u\.id = v_user/i);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /to service_role;/i);
  assert.match(sql, /from public, anon, authenticated;/i);
  assert.doesNotMatch(sql, /auth\.uid\(\)/);
});

test('legacy RPC privileges are disabled only by explicit second-stage migration', () => {
  assert.match(read(lockdown), /revoke all on function public\.take_geoapify_quota\(uuid, text\)/i);
  assert.match(read(lockdown), /revoke all on function public\.take_geoapify_tile_quota\(\)/i);
  assert.doesNotMatch(read(migration), /revoke all on function public\.take_geoapify_quota\(uuid, text\)/i);
});
