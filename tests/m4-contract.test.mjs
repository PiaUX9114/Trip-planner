import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
const calendarPath = 'src/components/trip-calendar.tsx';
const actionPath = 'src/app/trips/[id]/calendar-actions.ts';
const pagePath = 'src/app/trips/[id]/page.tsx';
const migrationPath = 'supabase/migrations/202611090004_m4_calendar.sql';

for (const path of [calendarPath, actionPath, pagePath, migrationPath]) {
  test(`M4 includes ${path}`, () => assert.ok(existsSync(join(root, path))));
}

test('Both calendar views exist and are selectable without changing saved data', () => {
  const calendar = read(calendarPath);
  assert.match(calendar, /useState<'days' \| 'week'>\('days'\)/);
  assert.match(calendar, />\s*Trip days\s*</);
  assert.match(calendar, />\s*Hourly week\s*</);
  assert.match(calendar, /setView\('days'\)/);
  assert.match(calendar, /setView\('week'\)/);
  assert.match(calendar, /aria-pressed=\{view === 'week'\}/);
});

test('Hourly calendar supports seven-day navigation and unscheduled stops', () => {
  const calendar = read(calendarPath);
  assert.match(calendar, /Array\.from\(\{ length: 7 \}/);
  assert.match(calendar, /Previous 7 days/);
  assert.match(calendar, /Next 7 days/);
  assert.match(calendar, /Time not set/);
  assert.match(calendar, /positionedEvents\(/);
  assert.match(calendar, /duration_minutes/);
});

test('Calendar uses the same stop records as itinerary and map', () => {
  const page = read(pagePath);
  assert.match(page, /const calendarStops: CalendarStop\[\] = stops\.map/);
  assert.match(page, /<TripCalendar/);
  assert.match(page, /<TripMap/);
  assert.match(page, /\.select\('id,duration_minutes'\)/);
  assert.match(page, /calendarFieldsError/);
  assert.match(page, /editable=\{editable && !calendarFieldsError\}/);
});

test('Schedule form sends validated trip, stop, date, time and duration', () => {
  const calendar = read(calendarPath);
  const action = read(actionPath);
  assert.match(calendar, /action=\{scheduleStopAction\}/);
  assert.match(calendar, /type="date" required min=\{startDate\} max=\{endDate\}/);
  assert.match(calendar, /type="time"/);
  assert.match(calendar, /type="number" min=\{15\} max=\{720\} step=\{15\}/);
  assert.match(action, /uuidPattern\.test\(tripId\)/);
  assert.match(action, /uuidPattern\.test\(stopId\)/);
  assert.match(action, /validDate\(day\)/);
  assert.match(action, /!Number\.isInteger\(duration\)/);
  assert.match(action, /\.rpc\('schedule_trip_stop'/);
  assert.match(action, /revalidatePath\(`/);
});

test('Calendar migration enforces membership and serialized stop-day changes', () => {
  const sql = read(migrationPath);
  assert.match(sql, /duration_minutes integer not null default 60/);
  assert.match(sql, /check \(duration_minutes between 15 and 720/);
  assert.match(sql, /security definer set search_path = ''/);
  assert.match(sql, /private\.can_edit_trip\(p_trip_id\)/);
  assert.match(sql, /from public\.trips t where t\.id = p_trip_id for update/);
  assert.match(sql, /update public\.trip_stops/);
  assert.match(sql, /revoke all on function public\.schedule_trip_stop/);
  assert.match(sql, /from public, anon/);
  assert.match(sql, /to authenticated/);
  assert.doesNotMatch(sql, /grant (?:insert|update|delete|all) on public\.trip_stops to authenticated/);
});

test('M4 leaves existing login, mapping providers and secrets untouched', () => {
  const calendar = read(calendarPath);
  assert.doesNotMatch(calendar, /fetch\(|navigator\.geolocation|google\.maps/i);
  assert.doesNotMatch(read(actionPath), /service_role|sb_secret_/);
});
