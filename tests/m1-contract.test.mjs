import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const migration = 'supabase/migrations/202611090001_m1_trips_and_members.sql';

test('M1 required source files and runbook exist', () => {
  for (const file of [
    'src/proxy.ts', 'src/lib/supabase/config.ts',
    'src/lib/supabase/server.ts', 'src/lib/supabase/browser.ts',
    'src/lib/supabase/update-session.ts', 'src/lib/supabase/require-user.ts',
    'src/app/auth/actions.ts', 'src/app/auth/confirm/route.ts',
    'src/app/login/page.tsx', 'src/app/trips/page.tsx',
    'src/app/trips/new/page.tsx', 'src/app/trips/actions.ts',
    'src/app/trips/[id]/page.tsx', migration,
    'docs/M1_MAC_SETUP.md', 'docs/M1_VERIFICATION.md',
  ]) assert.ok(existsSync(join(root, file)), `Missing ${file}`);
});

test('uses current Supabase SSR packages and Next.js 16 proxy', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies['@supabase/ssr'], '0.12.7');
  assert.match(pkg.dependencies['@supabase/supabase-js'], /^2\./);
  assert.match(read('src/proxy.ts'), /export async function proxy/);
  assert.match(read('src/lib/supabase/update-session.ts'), /getClaims\(\)/);
  assert.doesNotMatch(read('src/lib/supabase/update-session.ts'), /getSession\(/);
});

test('trip creation only uses server RPC and validated signed-in identity', () => {
  const action = read('src/app/trips/actions.ts');
  const sql = read(migration);
  assert.match(action, /requireUser\(\)/);
  assert.match(action, /\.rpc\('create_trip'/);
  assert.match(sql, /v_user_id uuid := \(select auth\.uid\(\)\)/);
  assert.match(sql, /insert into public\.trip_members/);
  assert.match(sql, /security definer/i);
});

test('RLS and permissions are present for private trip data', () => {
  const sql = read(migration);
  assert.match(sql, /alter table public\.trips enable row level security/i);
  assert.match(sql, /alter table public\.trip_members enable row level security/i);
  assert.match(sql, /for select to authenticated/i);
  assert.match(sql, /private\.is_trip_member/);
  assert.match(sql, /private\.can_edit_trip/);
  assert.match(sql, /revoke all on public\.trip_members from public, anon, authenticated/i);
  assert.doesNotMatch(sql, /grant (?:all|insert|delete) on public\.trip_members to authenticated/i);
});

test('owner and viewer roles are not writable by the browser', () => {
  const sql = read(migration);
  assert.match(sql, /trip_member_role as enum \('owner', 'editor', 'viewer'\)/);
  assert.match(sql, /grant select on public\.trip_members to authenticated/);
  assert.doesNotMatch(sql, /grant update.*trip_members.*authenticated/);
  assert.doesNotMatch(sql, /grant insert.*trip_members.*authenticated/);
});

test('env secrets are excluded from archive and tracked files', () => {
  const env = read('.env.example');
  const ignore = read('.gitignore');
  assert.match(ignore, /^\.env\.\*$/m);
  assert.match(ignore, /^!\.env\.example$/m);
  assert.match(env, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=/);
});
