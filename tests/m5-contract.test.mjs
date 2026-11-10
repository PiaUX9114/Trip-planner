import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (name) => readFileSync(join(root, name), 'utf8');
const sqlPath = 'supabase/migrations/202611090005_m5_collaboration.sql';
const actionPath = 'src/app/trips/[id]/collaboration-actions.ts';
const creatorPath = 'src/components/invitation-creator.tsx';
const collabPath = 'src/components/trip-collaboration.tsx';
const acceptPath = 'src/app/invite/[token]/page.tsx';
const pagePath = 'src/app/trips/[id]/page.tsx';

for (const file of [sqlPath, actionPath, creatorPath, collabPath, acceptPath,
  'src/components/trip-auto-refresh.tsx', 'README_M5_COLLABORATION.md']) {
  test(`M5 includes ${file}`, () => assert.ok(existsSync(join(root, file))));
}

test('M5 invitation secrets are generated server-side and stored only as hashes', () => {
  const actions = read(actionPath);
  const sql = read(sqlPath);
  assert.match(actions, /randomBytes\(32\)\.toString\('hex'\)/);
  assert.match(actions, /createHash\('sha256'\)/);
  assert.match(actions, /p_token_hash: tokenHash/);
  assert.match(sql, /token_hash text not null unique/);
  assert.match(sql, /revoke all on public\.trip_invitations from public, anon, authenticated/);
  assert.doesNotMatch(sql, /grant (?:select|insert|update|delete|all) on public\.trip_invitations to authenticated/i);
  assert.doesNotMatch(actions, /service_role|sb_secret_/);
});

test('M5 invitation issuance requires owner and forbids owner invites', () => {
  const sql = read(sqlPath);
  assert.match(sql, /create function public\.create_trip_invitation/);
  assert.match(sql, /not private\.is_trip_owner\(p_trip_id\)/);
  assert.match(sql, /p_role not in \('editor', 'viewer'\)/);
  assert.match(sql, /role <> 'owner'/);
  assert.match(sql, /p_kind not in \('email', 'link'\)/);
  assert.match(sql, /interval '7 days'/);
});

test('M5 invite acceptance checks verified email, expiration, and available uses under lock', () => {
  const sql = read(sqlPath);
  assert.match(sql, /create function public\.accept_trip_invitation/);
  assert.match(sql, /u\.email_confirmed_at is not null/);
  assert.match(sql, /v_verified_email <> v_inv\.invited_email/);
  assert.match(sql, /where token_hash = p_token_hash for update/);
  assert.match(sql, /v_inv\.expires_at <= now\(\)/);
  assert.match(sql, /v_inv\.used_count >= v_inv\.max_uses/);
  assert.match(sql, /on conflict \(trip_id, user_id\) do nothing/);
  assert.match(sql, /if v_inserted_count = 1 then/);
});

test('M5 role changes and member removal cannot alter or remove an owner', () => {
  const sql = read(sqlPath);
  assert.match(sql, /create function public\.set_trip_member_role/);
  assert.match(sql, /create function public\.remove_trip_member/);
  assert.match(sql, /where trip_id = p_trip_id and user_id = p_user_id and role <> 'owner'/g);
  assert.match(sql, /not private\.is_trip_owner\(p_trip_id\) and \(select auth\.uid\(\)\) <> p_user_id/);
});

test('M5 membership email addresses only exposed to owner through RPC', () => {
  const sql = read(sqlPath);
  assert.match(sql, /case when private\.is_trip_owner\(p_trip_id\) then u\.email::text else null::text end/);
  assert.match(sql, /create function public\.list_trip_members/);
  assert.match(sql, /create function public\.list_trip_invitations/);
  assert.doesNotMatch(sql, /returns table\s*\([^)]*token_hash/s);
});

test('M5 RPC permissions are revoked from anonymous and granted to authenticated users', () => {
  const sql = read(sqlPath);
  const funcs = [
    'create_trip_invitation', 'accept_trip_invitation', 'list_trip_members',
    'list_trip_invitations', 'revoke_trip_invitation', 'set_trip_member_role', 'remove_trip_member',
  ];
  for (const fn of funcs) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${fn}\\(`));
    assert.match(sql, new RegExp(`grant execute on function public\\.${fn}\\(`));
  }
  assert.match(sql, /security definer set search_path = ''/);
});

test('M5 invitation UI has both methods and provides manual email delivery', () => {
  const creator = read(creatorPath);
  assert.match(creator, /name="kind" value="email"/);
  assert.match(creator, /name="kind" value="link"/);
  assert.match(creator, /mailto:/);
  assert.match(creator, /navigator\.clipboard\.writeText/);
});

test('M5 acceptance supports login in a new tab without changing existing auth code', () => {
  const acceptance = read(acceptPath);
  const actions = read(actionPath);
  assert.match(acceptance, /target="_blank" rel="noopener noreferrer"/);
  assert.match(acceptance, /action=\{acceptTripInvitationAction\}/);
  assert.match(actions, /\.rpc\('accept_trip_invitation'/);
  assert.match(acceptance, /referrer: 'no-referrer'/);
});

test('M5 page integrates roles and member lists without disrupting itinerary, map and calendar', () => {
  const page = read(pagePath);
  assert.match(page, /supabase\.rpc\('list_trip_members'/);
  assert.match(page, /supabase\.rpc\('list_trip_invitations'/);
  assert.match(page, /<TripCollaboration /);
  assert.match(page, /<TripAutoRefresh \/>/);
  assert.match(page, /<TripCalendar/);
  assert.match(page, /<TripMap/);
  assert.match(page, /<StopCard/);
});

test('M5 offers live refresh and role-limited controls', () => {
  const collab = read(collabPath);
  const refresh = read('src/components/trip-auto-refresh.tsx');
  assert.match(collab, /owner && member\.role !== 'owner'/);
  assert.match(collab, /!owner && member\.user_id === userId/);
  assert.match(collab, /<InvitationCreator tripId=\{tripId\}/);
  assert.match(refresh, /document\.visibilityState === 'visible'/);
  assert.match(refresh, /45_000/);
});
