import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = (p) => readFileSync(p, 'utf8');
const privacy = 'src/app/privacy/page.tsx';
const terms = 'src/app/terms/page.tsx';
const account = 'src/app/account/page.tsx';
const action = 'src/app/account/actions.ts';
const migration = 'supabase/migrations/202611100003_m7_deletion_requests.sql';

test('privacy and terms are public page files and provide the chosen contact address', () => {
  for (const p of [privacy, terms, 'src/lib/legal/site-info.ts']) assert.ok(existsSync(p), p);
  assert.match(read('src/lib/legal/site-info.ts'), /mariaplg@icloud\.com/);
  assert.match(read(privacy), /SUPPORT_EMAIL/);
  assert.match(read(terms), /SUPPORT_EMAIL/);
});

test('privacy text clearly describes GPS, providers and the manual deletion process', () => {
  const text = read(privacy);
  assert.match(text, /Geoapify/);
  assert.match(text, /Vercel/);
  assert.match(text, /Supabase/);
  assert.match(text, /does not instantly delete/);
  assert.match(text, /GPS/);
});

test('terms include collaboration roles and navigation safety', () => {
  assert.match(read(terms), /Viewers/);
  assert.match(read(terms), /Do not interact with the app while operating a vehicle/);
});

test('signup requires explicit Terms agreement but existing account sign-in does not', () => {
  const login = read('src/app/login/page.tsx');
  const auth = read('src/app/auth/actions.ts');
  assert.match(login, /name="terms_accept"/);
  assert.match(auth, /export async function signUpAction[\s\S]*?formData\.get\('terms_accept'\)/);
  assert.doesNotMatch(auth.split('export async function signUpAction')[0], /terms_accept/);
});

test('deletion requests require verified session and cannot delete account immediately', () => {
  const code = read(action);
  assert.match(code, /'use server'/);
  assert.match(code, /requireUser\(\)/);
  assert.match(code, /user_id: userId/);
  assert.match(code, /confirm/);
  assert.doesNotMatch(code, /deleteUser\(|\.delete\(|createQuotaAdminClient|SUPABASE_SECRET_KEY/);
});

test('request account page is authenticated and shows current request status', () => {
  assert.match(read(account), /requireUser\(\)/);
  assert.match(read(account), /account_deletion_requests/);
  assert.match(read(account), /requestAccountDeletionAction/);
  assert.match(read(account), /does <strong>not<\/strong> immediately delete/);
});

test('deletion request table enforces RLS and privileges; no public or anonymous writes', () => {
  const sql = read(migration);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /for select to authenticated using \(user_id = \(select auth\.uid\(\)\)\)/i);
  assert.match(sql, /for insert to authenticated/i);
  assert.match(sql, /with check \(user_id = \(select auth\.uid\(\)\) and status = 'pending'\)/i);
  assert.match(sql, /revoke all on table public\.account_deletion_requests from public, anon, authenticated/i);
  assert.match(sql, /grant insert \(user_id\) on public\.account_deletion_requests to authenticated/i);
  assert.doesNotMatch(sql, /grant (all|update|delete) .* authenticated/i);
});

test('global footer and signup link to legal pages; dashboard links to account', () => {
  assert.match(read('src/app/layout.tsx'), /href="\/privacy"/);
  assert.match(read('src/app/layout.tsx'), /href="\/terms"/);
  assert.match(read('src/app/login/page.tsx'), /href="\/privacy"/);
  assert.match(read('src/app/trips/page.tsx'), /href="\/account"/);
});

test('ZIP changes do not add new public service credentials', () => {
  for (const path of [privacy, terms, account, action]) assert.doesNotMatch(read(path), /NEXT_PUBLIC_SUPABASE_SECRET_KEY|SUPABASE_SECRET_KEY|GEOAPIFY_API_KEY/);
});
