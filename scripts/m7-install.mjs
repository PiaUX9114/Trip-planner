/**
 * Run once (or repeatedly) in the actual Trip Planner repository root.
 * Does not touch .env.local, next.config.mjs, migrations, existing app UI,
 * user credentials or Supabase resources.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const cwd = process.cwd();
const checkOnly = process.argv.includes('--check-only');
function must(relative) {
  const name = resolve(cwd, relative);
  if (!existsSync(name)) throw new Error(`Missing ${relative}. Run from your main Trip Planner folder after extracting M7.`);
  return name;
}
function main() {
  must('package.json');
  const marker = must('src/app/api/navigation/route/route.ts');
  if (!readFileSync(marker, 'utf8').includes('allowPublicRequest'))
    throw new Error('Unexpected M6 file. Stop before changing this project.');
  must('src/lib/map/release-policy.ts');
  const routes = [
    'src/app/api/maps/search/route.ts',
    'src/app/api/maps/route/route.ts',
    'src/app/api/navigation/route/route.ts',
  ];
  const changes = [];
  for (const relative of routes) {
    const path = must(relative);
    let body = readFileSync(path, 'utf8');
    if (!body.includes('publicDemoDisabled')) {
      const anchor = /^(\s*if \(!supabaseConfigured\(\)\) return NextResponse\.json\([^\n]+\);)\r?\n/m;
      if (!anchor.test(body)) throw new Error(`Cannot safely patch ${relative}; unchanged. Contact support with this message.`);
      body = body.replace(anchor, (match, line) => `${line}\n  if (publicDemoDisabled()) return NextResponse.json({ error: 'Public demo map services are disabled on production deployments until a supported provider is configured.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });\n`);
      body = "import { publicDemoDisabled } from '@/lib/map/release-policy';\n" + body;
      changes.push([path, body]);
    }
  }
  const pkgPath = must('package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.scripts ||= {};
  const scripts = {
    'm7:preflight': 'node scripts/m7-preflight.mjs',
    'm7:release-gate': 'node scripts/m7-preflight.mjs --production',
    'm7:verify': 'npm run check && npm run build && npm run m7:preflight',
  };
  let pkgChanged = false;
  for (const [key, value] of Object.entries(scripts)) {
    if (pkg.scripts[key] !== value) {
      pkg.scripts[key] = value;
      pkgChanged = true;
    }
  }
  if (pkgChanged) changes.push([pkgPath, JSON.stringify(pkg, null, 2) + '\n']);
  const gitignore = must('.gitignore');
  const ignoreText = readFileSync(gitignore, 'utf8');
  if (!ignoreText.includes('trip-planner-m*.zip'))
    changes.push([gitignore, ignoreText.trimEnd() + '\n\n# Local milestone archives are not source files.\ntrip-planner-m*.zip\n']);
  // Legacy M1 structural test mistakenly assumed that .env.local cannot exist.
  const legacy = must('tests/m1-contract.test.mjs');
  const oldTest = readFileSync(legacy, 'utf8');
  const fixedTest = oldTest.replace(/^\s*assert\.ok\(!existsSync\(join\(root, '\.env\.local'\)\)\);\s*$/m, '');
  if (fixedTest !== oldTest) changes.push([legacy, fixedTest]);
  // M0 health test still asserted that integrations are disconnected; the M7
  // endpoint deliberately returns a safe current release label instead.
  const scaffold = must('tests/scaffold.test.mjs');
  const scaffoldOld = readFileSync(scaffold, 'utf8');
  const scaffoldFixed = scaffoldOld.replace(
    'assert.match(health, /integrationsConnected: false/);',
    'assert.match(health, /release: \'m7-candidate\'/);',
  );
  if (scaffoldFixed !== scaffoldOld) changes.push([scaffold, scaffoldFixed]);
  if (checkOnly) {
    if (changes.length) {
      console.error('M7 installation incomplete. Run: node scripts/m7-install.mjs');
      process.exitCode = 1;
    } else console.log('M7 installation checks passed.');
    return;
  }
  for (const [path, content] of changes) writeFileSync(path, content);
  console.log(`M7 installed (${changes.length} files updated). Existing app, auth, map UI and secrets preserved.`);
  console.log('Next: npm run check && npm run build && npm run m7:preflight');
}
try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
