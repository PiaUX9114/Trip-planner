'use client';

import { useEffect, useState } from 'react';
import { scheduleStopAction } from '@/app/trips/[id]/calendar-actions';

export type CalendarStop = {
  id: string;
  title: string;
  category: string;
  day_date: string;
  sort_order: number;
  time_local: string | null;
  duration_minutes: number;
};

type Props = {
  tripId: string;
  startDate: string;
  endDate: string;
  timezone: string;
  stops: CalendarStop[];
  editable: boolean;
};

const MINUTES_IN_DAY = 1440;
const PIXELS_PER_HOUR = 44;

function addDays(date: string, delta: number) {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + delta);
  return day.toISOString().slice(0, 10);
}

function dayDifference(start: string, end: string) {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000);
}

function dateLabel(date: string, compact = false) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: compact ? 'short' : 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function minutesSinceMidnight(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function displayTime(totalMinutes: number) {
  const normalized = totalMinutes % MINUTES_IN_DAY;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const suffix = hour < 12 ? 'AM' : 'PM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}${totalMinutes >= MINUTES_IN_DAY ? ' +1 day' : ''}`;
}

function timeRange(stop: CalendarStop) {
  if (!stop.time_local) return 'Time not set';
  const from = minutesSinceMidnight(stop.time_local);
  return `${displayTime(from)}–${displayTime(from + stop.duration_minutes)}`;
}

type Positioned = { stop: CalendarStop; start: number; end: number; lane: number; lanes: number };

// Assign overlapping events their own columns so simultaneous stops remain clickable.
function positionedEvents(stops: CalendarStop[]): Positioned[] {
  const scheduled = stops.filter((stop) => stop.time_local !== null)
    .map((stop) => ({ stop, start: minutesSinceMidnight(stop.time_local!), end: 0, lane: 0, lanes: 1 }))
    .map((event) => ({ ...event, end: event.start + event.stop.duration_minutes }))
    .sort((a, b) => a.start - b.start || a.stop.sort_order - b.stop.sort_order);

  const result: Positioned[] = [];
  let index = 0;
  while (index < scheduled.length) {
    const cluster: typeof scheduled = [];
    let maximumEnd = scheduled[index].end;
    while (index < scheduled.length && scheduled[index].start < maximumEnd) {
      cluster.push(scheduled[index]);
      maximumEnd = Math.max(maximumEnd, scheduled[index].end);
      index++;
    }
    const laneEnds: number[] = [];
    const assigned = cluster.map((event) => {
      let lane = laneEnds.findIndex((end) => end <= event.start);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(event.end); }
      else laneEnds[lane] = event.end;
      return { ...event, lane };
    });
    result.push(...assigned.map((event) => ({ ...event, lanes: laneEnds.length })));
  }
  return result;
}

export default function TripCalendar({ tripId, startDate, endDate, timezone, stops, editable }: Props) {
  const [view, setView] = useState<'days' | 'week'>('days');
  const [weekIndex, setWeekIndex] = useState(0);
  const [selectedStopId, setSelectedStopId] = useState('');
  const selected = stops.find((stop) => stop.id === selectedStopId) ?? null;
  const totalDays = Math.max(1, dayDifference(startDate, endDate) + 1);
  const dayCount = Math.min(totalDays, 366);
  const allDays = Array.from({ length: dayCount }, (_, index) => addDays(startDate, index));
  const firstWeekDay = addDays(startDate, weekIndex * 7);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(firstWeekDay, index))
    .filter((day) => day <= endDate);
  const hasNextWeek = addDays(firstWeekDay, 7) <= endDate;
  const weekStops = stops.filter((stop) => weekDays.includes(stop.day_date));

  // An effect may synchronize the DOM; it must not synchronously call setState.
  useEffect(() => {
    if (selectedStopId) {
      document.getElementById('calendar-editor')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedStopId]);

  function chooseStop(id: string) {
    setSelectedStopId(id);
  }

  return (
    <div className="mt-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Calendar view" className="flex rounded-xl border border-slate-300 bg-slate-100 p-1">
          <button type="button" onClick={() => setView('days')} aria-pressed={view === 'days'}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === 'days' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            Trip days
          </button>
          <button type="button" onClick={() => setView('week')} aria-pressed={view === 'week'}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === 'week' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            Hourly week
          </button>
        </div>
        <p className="text-xs text-slate-600">Times shown in {timezone} · Changes update itinerary and map</p>
      </div>

      {editable && selected && (
        <section id="calendar-editor" aria-label={`Schedule ${selected.title}`} key={selected.id}
          className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900">Schedule: {selected.title}</h3>
              <p className="mt-1 text-xs text-slate-600">Leave the start time empty to keep this stop unscheduled.</p>
            </div>
            <button type="button" onClick={() => setSelectedStopId('')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">Close</button>
          </div>
          <form action={scheduleStopAction} className="mt-4 grid items-end gap-3 sm:grid-cols-[minmax(150px,1fr)_minmax(130px,1fr)_minmax(130px,1fr)_auto]">
            <input type="hidden" name="trip_id" value={tripId} />
            <input type="hidden" name="stop_id" value={selected.id} />
            <div>
              <label htmlFor="calendar-day" className="mb-1 block text-xs font-semibold text-slate-700">Travel date</label>
              <input id="calendar-day" name="day_date" type="date" required min={startDate} max={endDate}
                defaultValue={selected.day_date} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
            </div>
            <div>
              <label htmlFor="calendar-time" className="mb-1 block text-xs font-semibold text-slate-700">Start time</label>
              <input id="calendar-time" name="time_local" type="time" defaultValue={selected.time_local?.slice(0, 5) ?? ''}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
            </div>
            <div>
              <label htmlFor="calendar-duration" className="mb-1 block text-xs font-semibold text-slate-700">Duration (minutes)</label>
              <input id="calendar-duration" name="duration_minutes" type="number" min={15} max={720} step={15}
                required defaultValue={selected.duration_minutes} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
            </div>
            <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
              Save schedule
            </button>
          </form>
        </section>
      )}

      {view === 'days' ? (
        <div className="grid gap-3 md:grid-cols-2">
          {allDays.map((day, index) => {
            const dayStops = stops.filter((stop) => stop.day_date === day)
              .sort((a, b) => {
                if (!a.time_local && b.time_local) return -1;
                if (a.time_local && !b.time_local) return 1;
                return (a.time_local ?? '').localeCompare(b.time_local ?? '') || a.sort_order - b.sort_order;
              });
            return (
              <section key={day} aria-label={`Day ${index + 1}: ${dateLabel(day)}`}
                className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-bold text-slate-900">
                  <span className="text-blue-700">Day {index + 1}</span> · {dateLabel(day)}
                </h3>
                <div className="mt-3 space-y-2">
                  {dayStops.length === 0 ? (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">No stops planned.</p>
                  ) : dayStops.map((stop) => (
                    <div key={stop.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-slate-900">{stop.title}</p>
                        <p className="mt-0.5 text-xs text-slate-600">{timeRange(stop)}</p>
                      </div>
                      {editable && <button type="button" onClick={() => chooseStop(stop.id)}
                        className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-50">
                        Schedule
                      </button>}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
          {totalDays > dayCount && (
            <p className="text-sm text-amber-800">Showing the first {dayCount} trip days. Use the itinerary to edit later dates.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">
              {dateLabel(weekDays[0])} – {dateLabel(weekDays[weekDays.length - 1])}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setWeekIndex((value) => Math.max(0, value - 1))}
                disabled={weekIndex === 0} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">Previous 7 days</button>
              <button type="button" onClick={() => setWeekIndex((value) => value + 1)}
                disabled={!hasNextWeek} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">Next 7 days</button>
            </div>
          </div>
          {weekStops.some((stop) => !stop.time_local) && (
            <section aria-label="Unscheduled stops this week" className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <h3 className="text-sm font-bold text-amber-950">Time not set</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {weekStops.filter((stop) => !stop.time_local).map((stop) => (
                  <button key={stop.id} type="button" disabled={!editable} onClick={() => chooseStop(stop.id)}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-left text-xs text-amber-950 disabled:cursor-default">
                    {dateLabel(stop.day_date, true)} · {stop.title}
                  </button>
                ))}
              </div>
            </section>
          )}
          <div className="max-h-[650px] overflow-auto rounded-xl border border-slate-200 bg-white" aria-label="Hourly week calendar">
            <div style={{ minWidth: `${Math.max(680, weekDays.length * 170 + 76)}px` }}>
              <div className="sticky top-0 z-20 grid border-b border-slate-200 bg-white"
                style={{ gridTemplateColumns: `76px repeat(${weekDays.length}, minmax(0, 1fr))` }}>
                <div className="p-3 text-xs font-semibold text-slate-500">Time</div>
                {weekDays.map((day) => <div key={day} className="border-l border-slate-200 p-3 text-center text-xs font-bold text-slate-800">{dateLabel(day, true)}</div>)}
              </div>
              <div className="grid" style={{ gridTemplateColumns: `76px repeat(${weekDays.length}, minmax(0, 1fr))` }}>
                <div className="relative" style={{ height: `${24 * PIXELS_PER_HOUR}px` }}>
                  {Array.from({ length: 24 }, (_, hour) => (
                    <span key={hour} className="absolute right-2 text-xs text-slate-500"
                      style={{ top: `${hour * PIXELS_PER_HOUR + 3}px` }}>{displayTime(hour * 60)}</span>
                  ))}
                </div>
                {weekDays.map((day) => (
                  <div key={day} className="relative border-l border-slate-200"
                    style={{ height: `${24 * PIXELS_PER_HOUR}px`, backgroundImage: `repeating-linear-gradient(to bottom, #fff 0px, #fff ${PIXELS_PER_HOUR - 1}px, #e2e8f0 ${PIXELS_PER_HOUR - 1}px, #e2e8f0 ${PIXELS_PER_HOUR}px)` }}>
                    {positionedEvents(weekStops.filter((stop) => stop.day_date === day)).map(({ stop, start, end, lane, lanes }) => (
                      <button key={stop.id} type="button" disabled={!editable} onClick={() => chooseStop(stop.id)}
                        title={`${stop.title}: ${timeRange(stop)}`}
                        aria-label={`${stop.title}, ${timeRange(stop)}${editable ? ', edit schedule' : ''}`}
                        className="absolute overflow-hidden rounded-md border border-blue-300 bg-blue-100 px-1.5 py-1 text-left text-xs text-blue-950 shadow-sm hover:bg-blue-200 focus:z-10 disabled:cursor-default"
                        style={{
                          top: `${start * PIXELS_PER_HOUR / 60}px`,
                          height: `${Math.max(23, Math.min(MINUTES_IN_DAY - start, end - start) * PIXELS_PER_HOUR / 60)}px`,
                          left: `${lane * 100 / lanes + 1}%`,
                          width: `${Math.max(0, 100 / lanes - 2)}%`,
                        }}>
                        <span className="block truncate font-bold">{stop.title}</span>
                        <span className="block truncate">{displayTime(start)}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500">Scroll for earlier or later hours. Select a stop to change its date, time, or duration.</p>
        </div>
      )}
      <p className="text-xs text-slate-600">Calendar and itinerary use the same saved stops. Changing a date also changes which map day shows the stop.</p>
    </div>
  );
}
