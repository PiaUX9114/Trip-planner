'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/require-user';

const allowedZones = new Set([
  'UTC', 'America/Los_Angeles', 'America/New_York',
  'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Seoul', 'Australia/Sydney',
]);

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function createTripAction(formData: FormData) {
  const { supabase } = await requireUser();
  const name = String(formData.get('name') ?? '').trim();
  const start = String(formData.get('start_date') ?? '');
  const end = String(formData.get('end_date') ?? '');
  const timezone = String(formData.get('timezone') ?? 'UTC');

  if (!name || name.length > 100 || !validDate(start) || !validDate(end) || start > end || !allowedZones.has(timezone)) {
    redirect('/trips/new?notice=invalid');
  }

  // SECURITY DEFINER RPC atomically creates trip + owner membership.
  // Never let the browser directly choose its own owner_id or role.
  const { data: newTripId, error } = await supabase.rpc('create_trip', {
    p_name: name,
    p_start_date: start,
    p_end_date: end,
    p_timezone: timezone,
  });
  if (error || typeof newTripId !== 'string') redirect('/trips/new?notice=save-error');

  revalidatePath('/trips');
  redirect(`/trips/${newTripId}`);
}
