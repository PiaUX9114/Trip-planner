import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const path = (name) => join(root, name);
const read = (name) => readFileSync(path(name), 'utf8');
const migrationPath = 'supabase/migrations/202611090002_m2_trip_stops.sql';

const requiredFiles = [
  'src/app/trips/[id]/page.tsx',
  'src/app/trips/[id]/actions.ts',
  migrationPath,
  'docs/M2_SETUP.md',
];

test('M2 itinerary files are present', () => {
  for (const file of requiredFiles) {
    assert.ok(existsSync(path(file)), `Missing M2 file: ${file}`);
  }
});

test('M2 schema supports per-day ordering and stop details', () => {
  const sql = read(migrationPath);
  assert.match(sql, /create table public\.trip_stops/i);
  assert.match(sql, /trip_id uuid not null references public\.trips\(id\) on delete cascade/i);
  for (const column of ['day_date', 'sort_order', 'title', 'category', 'address', 'notes', 'time_local']) {
    assert.match(sql, new RegExp(`\\b${column}\\b`));
  }
  assert.match(sql, /create index trip_stops_day_order_idx/i);
});

test('M2 restricts SELECT by RLS to authenticated trip members', () => {
  const sql = read(migrationPath);
  assert.match(sql, /alter table public\.trip_stops enable row level security/i);
  assert.match(sql, /for select to authenticated[\s\S]*private\.is_trip_member\(trip_id\)/i);
  assert.match(sql, /revoke all on public\.trip_stops from public, anon, authenticated/i);
  assert.match(sql, /grant select on public\.trip_stops to authenticated/i);
  assert.doesNotMatch(sql, /grant (insert|update|delete|all) on public\.trip_stops to authenticated/i);
});

test('all stop mutations are authenticated role-checked security definer RPCs', () => {
  const sql = read(migrationPath);
  for (const name of ['add_trip_stop', 'update_trip_stop', 'delete_trip_stop', 'move_trip_stop']) {
    const at = sql.indexOf(`create or replace function public.${name}`);
    assert.ok(at !== -1, `Missing RPC: ${name}`);
    const end = sql.indexOf('$$;', at);
    assert.ok(end > at, `Missing RPC body terminator: ${name}`);
    const body = sql.slice(at, end);
    assert.match(body, /security definer/i);
    assert.match(body, /auth\.uid\(\)/i);
    assert.match(body, /private\.can_edit_trip\(p_trip_id\)/i);
    assert.match(body, /for update/i);
    assert.match(sql, new RegExp(`grant execute on function public\\.${name}\\(`));
    assert.match(sql, new RegExp(`revoke all on function public\\.${name}\\(`));
  }
});

test('day edit and delete close gaps, move swaps neighbors', () => {
  const sql = read(migrationPath);
  assert.match(sql, /v_new_position := v_old_position/i);
  assert.match(sql, /p_day_date <> v_old_day/i);
  assert.match(sql, /set sort_order = sort_order - 1/i);
  assert.match(sql, /v_neighbor_id/i);
  assert.match(sql, /when id = p_stop_id then v_neighbor_position/i);
  assert.match(sql, /p_direction not in \(-1, 1\)/i);
});

test('M2 Next.js actions use the trusted Supabase server client and SQL RPCs', () => {
  const actions = read('src/app/trips/[id]/actions.ts');
  assert.match(actions, /'use server'/);
  assert.match(actions, /requireUser\(\)/);
  assert.match(actions, /revalidatePath\(/);
  for (const name of ['add_trip_stop', 'update_trip_stop', 'delete_trip_stop', 'move_trip_stop']) {
    assert.ok(actions.includes(`.rpc('${name}'`));
  }
  assert.doesNotMatch(actions, /\.from\('trip_stops'\)\.(insert|update|delete)/);
});

test('itinerary UI shows stops, date/category/time fields, and edit controls', () => {
  const page = read('src/app/trips/[id]/page.tsx');
  for (const item of ['Add a stop', 'Edit stop', 'Delete', 'Move', 'Itinerary by day', 'type="date"', 'type="time"', 'stop.notes']) {
    assert.ok(page.includes(item), `Missing itinerary UI element: ${item}`);
  }
  assert.match(page, /editable=\{editable\}/);
  assert.match(page, /membership\?\.role === 'owner' \|\| membership\?\.role === 'editor'/);
});

test('M2 migration is incremental, not a replacement for working M1 schema', () => {
  const sql = read(migrationPath);
  assert.doesNotMatch(sql, /drop (?:table|schema|type|function)/i);
  assert.doesNotMatch(sql, /create table public\.trips\b/i);
  assert.doesNotMatch(sql, /create table public\.trip_members\b/i);
  assert.match(sql, /^begin;/im);
  assert.match(sql, /^commit;/im);
});
