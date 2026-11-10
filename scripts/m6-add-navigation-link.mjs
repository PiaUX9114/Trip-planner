import { readFileSync, writeFileSync } from 'node:fs';

const page = 'src/app/trips/[id]/page.tsx';
const source = readFileSync(page, 'utf8');
const marker = '<h2 className="text-xl font-bold text-slate-900">Interactive map and driving routes</h2>';
const link = `\n          <Link href={\`/trips/\${trip.id}/navigate\`} className="inline-flex rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Open M6 navigation</Link>`;
if (source.includes('Open M6 navigation')) {
  process.stdout.write('Navigation link already installed.\n');
} else if (!source.includes(marker)) {
  process.stderr.write('Navigation link not installed: expected M5 map heading not found. Open /trips/YOUR-TRIP-ID/navigate directly or inspect the trip page.\n');
  process.exitCode = 1;
} else {
  writeFileSync(page, source.replace(marker, marker + link));
  process.stdout.write('M6 navigation link added to trip page.\n');
}
