'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase/require-user';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function pinStopAction(form: FormData) {
  const tripId = String(form.get('trip_id') ?? '');
  if (!uuidPattern.test(tripId)) redirect('/trips');
  const stopId = String(form.get('stop_id') ?? '');
  const latitude = Number(form.get('latitude'));
  const longitude = Number(form.get('longitude'));
  const label = String(form.get('label') ?? '').trim();
  const mapDay = String(form.get('map_day') ?? '');
  const returnDay = /^\d{4}-\d{2}-\d{2}$/.test(mapDay) ? `&mapDay=${mapDay}` : '';

  if (!uuidPattern.test(stopId) || !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 ||
      label.length < 1 || label.length > 240) {
    redirect(`/trips/${tripId}?notice=map-invalid${returnDay}#map`);
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('pin_trip_stop', {
    p_trip_id: tripId,
    p_stop_id: stopId,
    p_latitude: latitude,
    p_longitude: longitude,
    p_label: label,
  });
  if (error) {
    console.error('M3 pin stop failed (code):', error.code ?? 'unknown');
    redirect(`/trips/${tripId}?notice=map-error${returnDay}#map`);
  }
  revalidatePath(`/trips/${tripId}`);
  redirect(`/trips/${tripId}?notice=map-saved${returnDay}#map`);
}
