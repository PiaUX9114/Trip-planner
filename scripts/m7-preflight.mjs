/**
 * Offline release review: no network requests, no credentials printed.
 * Development mode reports warnings; --production fails closed on known
 * launch blockers. Manual security and policy signoff is still required.
 */
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const prod = process.argv.includes('--production');
const base = process.cwd();
const warnings = [];
const blockers = [];
const ok = [];
const read = (path) => existsSync(resolve(base, path)) ? readFileSync(resolve(base, path), 'utf8') : '';
function check(yes, name, severity = 'block') {
  if (yes) ok.push(name);
  else (severity === 'block' ? blockers : warnings).push(name);
}
function tracked(path) {
  try { return execFileSync('git', ['ls-files', '--', path], { cwd: base, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return null; }
}
const pkg = JSON.parse(read('package.json') || '{}');
check(Boolean(pkg.scripts?.check && pkg.scripts?.build), 'Check and build commands exist');
check(Boolean(read('src/app/api/health/route.ts').includes('release: \'m7-candidate\'')), 'Updated liveness endpoint present');
check(Boolean(read('.github/workflows/ci.yml').includes('npm ci')), 'GitHub Actions CI configured');
check(Boolean(pkg.dependencies?.leaflet && pkg.devDependencies?.['@types/leaflet']), 'Leaflet dependencies declared in package.json');
check(existsSync(resolve(base, 'package-lock.json')), 'npm package-lock.json exists');
const lock = tracked('package-lock.json');
if (lock === '') check(false, 'Commit package-lock.json to GitHub', 'block');
if (lock === null) warnings.push('Git status unavailable; confirm package-lock.json is committed.');
for (const file of ['.env.local', '.env', '.env.production']) {
  const found = tracked(file);
  if (found) blockers.push(`${file} is tracked by Git; remove it from Git history and rotate exposed secrets`);
}
const config = read('next.config.mjs');
if (/allowedOrigins\s*:\s*\[\s*['"]\*/.test(config)) blockers.push('Server Actions allowedOrigins appears to allow all hosts');
const auth = read('src/app/auth/actions.ts');
if (/Supabase signup error:|[?&]debug=/.test(auth)) warnings.push('Remove temporary signup diagnostics from src/app/auth/actions.ts before release');
const guarded = [
  'src/app/api/maps/search/route.ts',
  'src/app/api/maps/route/route.ts',
  'src/app/api/navigation/route/route.ts',
];
for (const route of guarded) {
  check(read(route).includes('geoapifyConfigured()') && read(route).includes('consumeGeoapifyQuota('), `${route} uses configured Geoapify and shared quota (fails closed)`);
}
const inUse = [
  'src/app/api/maps/search/route.ts',
  'src/app/api/maps/route/route.ts',
  'src/app/api/navigation/route/route.ts',
].map(read).join('\n');
if (/nominatim\.openstreetmap\.org|router\.project-osrm\.org/.test(inUse))
  blockers.push('Public Nominatim/OSRM demonstration endpoints are still present in map or navigation API handlers');
check(Boolean(read('src/lib/map/geoapify.ts').includes('api.geoapify.com/v1/')), 'Server-only Geoapify integration is installed');
check(Boolean(read('supabase/migrations/202611090006_m7_geoapify_quota.sql').includes('pg_advisory_xact_lock')), 'Shared Geoapify quota migration file is present');
if (prod && !process.env.GEOAPIFY_API_KEY) blockers.push('Set server-only GEOAPIFY_API_KEY in the production host');
warnings.push('Verify M7 Geoapify SQL migration was applied in Supabase; the preflight cannot inspect a live database.');
const allSources = [read('src/components/leaflet-canvas.tsx'), read('src/components/navigation-map.tsx')].join('\n');
if (allSources.includes('tile.openstreetmap.org'))
  warnings.push('Public OSM raster tiles remain; select an approved production tile provider with adequate capacity and attribution before launch.');
const url = process.env.NEXT_PUBLIC_SITE_URL;
if (prod && (!url || !/^https:\/\/[^/]+\.[^/]+\/?$/.test(url)))
  blockers.push('Set NEXT_PUBLIC_SITE_URL to the exact HTTPS production origin (no path)');
if (prod) {
  warnings.push('Manual signoff still required: Supabase RLS isolation, Auth redirect/site URL, custom SMTP, privacy/terms, data deletion, backups, abuse controls, monitoring, mobile/PWA, and rollback.');
}
console.log(`M7 ${prod ? 'PRODUCTION LAUNCH GATE' : 'LOCAL PREFLIGHT'}`);
for (const message of ok) console.log(`PASS  ${message}`);
for (const message of warnings) console.log(`WARN  ${message}`);
for (const message of blockers) console.log(`${prod ? 'BLOCK' : 'PRE-LAUNCH BLOCK'}  ${message}`);
console.log(`Review: ${ok.length} passing checks, ${warnings.length} warnings, ${blockers.length} known blockers.`);
if (prod && blockers.length) {
  console.error('NOT APPROVED FOR PUBLIC LAUNCH. See docs/M7_PUBLIC_LAUNCH_RUNBOOK.md.');
  process.exitCode = 1;
}
