import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

test('M0 source files, docs and PWA manifest exist', () => {
  for (const file of [
    'package.json', 'src/app/page.tsx', 'src/app/layout.tsx',
    'src/app/globals.css', 'src/app/manifest.ts',
    'src/app/api/health/route.ts', 'next.config.mjs',
    'postcss.config.mjs', 'eslint.config.mjs',
    '.env.example', '.gitignore',
    'docs/M0_RUNBOOK.md', 'docs/SECURITY_BASELINE.md',
  ]) {
    assert.ok(existsSync(join(root, file)), `${file} is missing`);
  }
});

test('npm scripts and framework versions are explicit', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.private, true);
  for (const command of ['dev', 'build', 'start', 'lint', 'typecheck', 'test', 'check']) {
    assert.equal(typeof pkg.scripts[command], 'string');
  }
  assert.match(pkg.dependencies.next, /^16\./);
  assert.match(pkg.dependencies.react, /^19\./);
  assert.match(pkg.dependencies['react-dom'], /^19\./);
});

test('M0 example env has no credential values', () => {
  const env = read('.env.example');
  const pairs = env.split(/\r?\n/).filter((line) => line && !line.startsWith('#'));
  assert.ok(pairs.length >= 4);
  for (const pair of pairs) {
    const match = pair.match(/^([A-Z0-9_]+)=(.*)$/);
    assert.ok(match, `Unexpected env line: ${pair}`);
    assert.equal(match[2], '', `${match[1]} must be blank`);
  }
  assert.ok(!pairs.some((line) => line.includes('SERVICE_ROLE')));
});

test('Git ignores secrets while keeping the example file', () => {
  const ignore = read('.gitignore');
  assert.match(ignore, /^\.env\.\*$/m);
  assert.match(ignore, /^!\.env\.example$/m);
  assert.match(ignore, /^node_modules\/$/m);
});

test('health endpoint exposes no secrets or service configuration', () => {
  const health = read('src/app/api/health/route.ts');
  assert.match(health, /release: 'm7-candidate'/);
  assert.doesNotMatch(health, /process\.env|GOOGLE_MAPS_SERVER_KEY|service_role/i);
});

test('M1 home describes only current or planned features', () => {
  const page = read('src/app/page.tsx');
  assert.match(page, /Accounts and Trips/);
  assert.match(page, /M1 next increment/);
  assert.match(page, /not configured/i);
});

test('PWA placeholder icons use required PNG dimensions', () => {
  const requirements = new Map([
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['icon-maskable-512.png', 512],
    ['apple-touch-icon.png', 180],
  ]);
  for (const [name, expected] of requirements) {
    const data = readFileSync(join(root, 'public', 'icons', name));
    assert.equal(data.toString('hex', 0, 8), '89504e470d0a1a0a');
    assert.equal(data.readUInt32BE(16), expected);
    assert.equal(data.readUInt32BE(20), expected);
  }
});
