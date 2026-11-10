-- Trip Planner M4: shared duration-aware calendar scheduling for itinerary stops.
-- Apply once, after migrations M1, M2, M3, in the Trip Planner development project.
-- No external calendar service or paid API is required.
begin;

alter table public.trip_stops
  add column duration_minutes integer not null default 60
    check (duration_minutes between 15 and 720 and duration_minutes % 15 = 0);

-- App/itinerary/calendar read the same stop table. All calendar writes go
-- through a role-checked RPC, with the same serialized reorder semantics as M2.
create or replace function public.schedule_trip_stop(
  p_trip_id uuid,
  p_stop_id uuid,
  p_day_date date,
  p_time_local time without time zone,
  p_duration_minutes integer
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_start date;
  v_end date;
  v_old_day date;
  v_old_position integer;
  v_new_position integer;
begin
  if (select auth.uid()) is null or not private.can_edit_trip(p_trip_id) then
    raise exception 'Not authorized to edit this trip' using errcode = '42501';
  end if;

  select t.start_date, t.end_date into v_start, v_end
  from public.trips t where t.id = p_trip_id for update;
  if not found then
    raise exception 'Trip not available' using errcode = '42501';
  end if;

  if p_day_date is null or p_day_date < v_start or p_day_date > v_end
     or p_duration_minutes is null or p_duration_minutes < 15
     or p_duration_minutes > 720 or p_duration_minutes % 15 <> 0 then
    raise exception 'Invalid date or duration' using errcode = '22023';
  end if;

  select s.day_date, s.sort_order into v_old_day, v_old_position
  from public.trip_stops s
  where s.trip_id = p_trip_id and s.id = p_stop_id;
  if not found then
    raise exception 'Stop not available' using errcode = '42501';
  end if;

  v_new_position := v_old_position;
  if p_day_date <> v_old_day then
    update public.trip_stops
    set sort_order = sort_order - 1
    where trip_id = p_trip_id and day_date = v_old_day
      and id <> p_stop_id and sort_order > v_old_position;

    select coalesce(max(s.sort_order) + 1, 0) into v_new_position
    from public.trip_stops s
    where s.trip_id = p_trip_id and s.day_date = p_day_date;
  end if;

  update public.trip_stops
  set day_date = p_day_date,
      sort_order = v_new_position,
      time_local = p_time_local,
      duration_minutes = p_duration_minutes
  where trip_id = p_trip_id and id = p_stop_id;
end;
$$;

-- Only authenticated users may call the RPC; owner/editor checks are inside it.
revoke all on function public.schedule_trip_stop(uuid,uuid,date,time without time zone,integer)
  from public, anon;
grant execute on function public.schedule_trip_stop(uuid,uuid,date,time without time zone,integer)
  to authenticated;

comment on column public.trip_stops.duration_minutes is
  'Trip-local calendar duration, 15-minute increments. Start time is trip-local wall time.';
commit;
