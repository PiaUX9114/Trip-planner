import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

test('M7 source, CI, release docs and runner files are root-relative', () => {
  for (const file of [
    'README_M7_RELEASE_READINESS.md',
    'docs/M7_PUBLIC_LAUNCH_RUNBOOK.md',
    'docs/M7_SECURITY_AND_PRIVACY.md',
    'docs/M7_ACCEPTANCE_MATRIX.md',
    'scripts/m7-install.mjs', 'scripts/m7-preflight.mjs',
    '.github/workflows/ci.yml', '.github/dependabot.yml',
    'src/lib/map/release-policy.ts',
  ]) assert.ok(existsSync(join(root, file)), file);
});

test('all three map endpoints require Geoapify configuration and shared quotas', () => {
  for (const path of [
    'src/app/api/maps/search/route.ts',
    'src/app/api/maps/route/route.ts',
    'src/app/api/navigation/route/route.ts',
  ]) {
    const content = read(path);
    assert.match(content, /geoapifyConfigured\(\)/, path);
    assert.match(content, /consumeGeoapifyQuota\(/, path);
    assert.match(content, /status: 503/, path);
    assert.doesNotMatch(content, /router\.project-osrm\.org|nominatim\.openstreetmap\.org/, path);
  }
});

test('CI does not deploy, run production migrations or publish user secrets', () => {
  const flow = read('.github/workflows/ci.yml');
  assert.match(flow, /npm ci/);
  assert.match(flow, /npm run build/);
  assert.doesNotMatch(flow, /vercel deploy|supabase db push|npm publish|service_role|sb_secret_/i);
  assert.match(read('.gitignore'), /trip-planner-m\*\.zip/);
});

test('M7 health probe returns no Supabase configuration or keys', () => {
  const source = read('src/app/api/health/route.ts');
  assert.match(source, /release: 'm7-candidate'/);
  assert.doesNotMatch(source, /SUPABASE_URL|PUBLISHABLE_KEY|service_role|sb_secret_/);
});

test('preflight has a strict production mode and checks production provider configuration', () => {
  const source = read('scripts/m7-preflight.mjs');
  assert.match(source, /--production/);
  assert.match(source, /GEOAPIFY_API_KEY/);
  assert.match(source, /process\.exitCode = 1/);
  assert.doesNotMatch(source, /fetch\(/);
});
