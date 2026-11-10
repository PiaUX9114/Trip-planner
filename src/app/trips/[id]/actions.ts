'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase/require-user';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const categories = new Set(['place', 'lodging', 'food', 'activity', 'transport', 'other']);

function tripIdFrom(form: FormData) {
  const id = String(form.get('trip_id') ?? '');
  if (!uuidPattern.test(id)) redirect('/trips');
  return id;
}

function stopIdFrom(form: FormData, tripId: string) {
  const id = String(form.get('stop_id') ?? '');
  if (!uuidPattern.test(id)) redirect(`/trips/${tripId}?notice=invalid-stop`);
  return id;
}

function validDate(value: string) {
  if (!datePattern.test(value)) return false;
  const asDate = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(asDate.getTime()) && asDate.toISOString().slice(0, 10) === value;
}

function stopFields(form: FormData) {
  const day = String(form.get('day_date') ?? '');
  const title = String(form.get('title') ?? '').trim();
  const category = String(form.get('category') ?? 'place');
  const address = String(form.get('address') ?? '').trim();
  const notes = String(form.get('notes') ?? '').trim();
  const time = String(form.get('time_local') ?? '');
  if (!validDate(day) || title.length < 1 || title.length > 120 ||
      !categories.has(category) || address.length > 240 || notes.length > 2000 ||
      (time !== '' && !timePattern.test(time))) return null;
  return {
    p_day_date: day,
    p_title: title,
    p_category: category,
    p_address: address,
    p_notes: notes,
    p_time_local: time || null,
  };
}

function done(tripId: string, notice: string) {
  revalidatePath(`/trips/${tripId}`);
  redirect(`/trips/${tripId}?notice=${notice}#itinerary`);
}

export async function addStopAction(form: FormData) {
  const tripId = tripIdFrom(form);
  const fields = stopFields(form);
  if (!fields) redirect(`/trips/${tripId}?notice=invalid-stop#add-stop`);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('add_trip_stop', { p_trip_id: tripId, ...fields });
  if (error) {
    console.error('M2 add stop failed (code):', error.code ?? 'unknown');
    redirect(`/trips/${tripId}?notice=save-error#add-stop`);
  }
  done(tripId, 'added');
}

export async function updateStopAction(form: FormData) {
  const tripId = tripIdFrom(form);
  const stopId = stopIdFrom(form, tripId);
  const fields = stopFields(form);
  if (!fields) redirect(`/trips/${tripId}?notice=invalid-stop#itinerary`);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('update_trip_stop', {
    p_trip_id: tripId, p_stop_id: stopId, ...fields,
  });
  if (error) {
    console.error('M2 update stop failed (code):', error.code ?? 'unknown');
    redirect(`/trips/${tripId}?notice=save-error#itinerary`);
  }
  done(tripId, 'updated');
}

export async function deleteStopAction(form: FormData) {
  const tripId = tripIdFrom(form);
  const stopId = stopIdFrom(form, tripId);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('delete_trip_stop', {
    p_trip_id: tripId, p_stop_id: stopId,
  });
  if (error) {
    console.error('M2 delete stop failed (code):', error.code ?? 'unknown');
    redirect(`/trips/${tripId}?notice=save-error#itinerary`);
  }
  done(tripId, 'deleted');
}

export async function moveStopAction(form: FormData) {
  const tripId = tripIdFrom(form);
  const stopId = stopIdFrom(form, tripId);
  const direction = Number(form.get('direction'));
  if (direction !== 1 && direction !== -1) redirect(`/trips/${tripId}?notice=invalid-stop#itinerary`);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('move_trip_stop', {
    p_trip_id: tripId, p_stop_id: stopId, p_direction: direction,
  });
  if (error) {
    console.error('M2 move stop failed (code):', error.code ?? 'unknown');
    redirect(`/trips/${tripId}?notice=save-error#itinerary`);
  }
  done(tripId, 'reordered');
}
