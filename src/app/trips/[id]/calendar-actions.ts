'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase/require-user';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function validDate(value: string) {
  if (!datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function scheduleStopAction(form: FormData) {
  const tripId = String(form.get('trip_id') ?? '');
  const stopId = String(form.get('stop_id') ?? '');
  if (!uuidPattern.test(tripId)) redirect('/trips');
  const day = String(form.get('day_date') ?? '');
  const time = String(form.get('time_local') ?? '');
  const duration = Number(form.get('duration_minutes'));
  if (!uuidPattern.test(stopId) || !validDate(day) ||
      (time !== '' && !timePattern.test(time)) ||
      !Number.isInteger(duration) || duration < 15 || duration > 720 || duration % 15 !== 0) {
    redirect(`/trips/${tripId}?notice=calendar-invalid#calendar`);
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('schedule_trip_stop', {
    p_trip_id: tripId,
    p_stop_id: stopId,
    p_day_date: day,
    p_time_local: time || null,
    p_duration_minutes: duration,
  });
  if (error) {
    console.error('M4 schedule stop failed (code):', error.code ?? 'unknown');
    redirect(`/trips/${tripId}?notice=calendar-error#calendar`);
  }
  revalidatePath(`/trips/${tripId}`);
  redirect(`/trips/${tripId}?notice=calendar-updated#calendar`);
}
