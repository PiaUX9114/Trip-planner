-- Trip Planner M2: private itinerary stops, scheduled days, and atomic ordering.
-- Apply once AFTER the M1 migration to the intended Supabase development project.
-- No Google Maps or paid API integration is used in this migration.

begin;

create table public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_date date not null,
  sort_order integer not null check (sort_order >= 0),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  category text not null default 'place'
    check (category in ('place', 'lodging', 'food', 'activity', 'transport', 'other')),
  address text not null default '' check (char_length(address) <= 240),
  notes text not null default '' check (char_length(notes) <= 2000),
  time_local time without time zone,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trip_stops_day_order_idx
  on public.trip_stops(trip_id, day_date, sort_order, id);

create or replace function private.touch_trip_stop()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trip_stops_touch_before_update
  before update on public.trip_stops
  for each row execute function private.touch_trip_stop();

alter table public.trip_stops enable row level security;

create policy stops_read_trip_members on public.trip_stops
  for select to authenticated
  using (private.is_trip_member(trip_id));

-- Writes are exclusively through RPCs that verify owner/editor membership.
-- A viewer can read, but cannot add, edit, move, or delete a stop.
revoke all on public.trip_stops from public, anon, authenticated;
grant select on public.trip_stops to authenticated;

create or replace function public.add_trip_stop(
  p_trip_id uuid,
  p_day_date date,
  p_title text,
  p_category text default 'place',
  p_address text default '',
  p_notes text default '',
  p_time_local time without time zone default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_start date;
  v_end date;
  v_position integer;
  v_new_id uuid;
begin
  if (select auth.uid()) is null or not private.can_edit_trip(p_trip_id) then
    raise exception 'Not authorized to edit this trip' using errcode = '42501';
  end if;

  -- Lock the trip to serialize all itinerary mutations, including reorder.
  select t.start_date, t.end_date into v_start, v_end
  from public.trips t where t.id = p_trip_id for update;
  if not found then
    raise exception 'Trip not available' using errcode = '42501';
  end if;

  if p_day_date is null or p_day_date < v_start or p_day_date > v_end then
    raise exception 'Stop date must be within trip dates' using errcode = '22023';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 120
    or p_category is null or p_category not in ('place','lodging','food','activity','transport','other')
    or char_length(coalesce(p_address, '')) > 240
    or char_length(coalesce(p_notes, '')) > 2000 then
    raise exception 'Invalid stop details' using errcode = '22023';
  end if;

  select coalesce(max(s.sort_order) + 1, 0) into v_position
  from public.trip_stops s
  where s.trip_id = p_trip_id and s.day_date = p_day_date;

  insert into public.trip_stops
    (trip_id, day_date, sort_order, title, category, address, notes, time_local)
  values
    (p_trip_id, p_day_date, v_position, btrim(p_title), p_category,
     btrim(coalesce(p_address, '')), btrim(coalesce(p_notes, '')), p_time_local)
  returning id into v_new_id;

  return v_new_id;
end;
$$;

create or replace function public.update_trip_stop(
  p_trip_id uuid,
  p_stop_id uuid,
  p_day_date date,
  p_title text,
  p_category text,
  p_address text,
  p_notes text,
  p_time_local time without time zone
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

  if p_day_date is null or p_day_date < v_start or p_day_date > v_end then
    raise exception 'Stop date must be within trip dates' using errcode = '22023';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 120
    or p_category is null or p_category not in ('place','lodging','food','activity','transport','other')
    or char_length(coalesce(p_address, '')) > 240
    or char_length(coalesce(p_notes, '')) > 2000 then
    raise exception 'Invalid stop details' using errcode = '22023';
  end if;

  select s.day_date, s.sort_order into v_old_day, v_old_position
  from public.trip_stops s
  where s.id = p_stop_id and s.trip_id = p_trip_id;
  if not found then
    raise exception 'Stop not available' using errcode = '42501';
  end if;

  v_new_position := v_old_position;
  if p_day_date <> v_old_day then
    -- Close the gap on the original day and append to the destination day.
    update public.trip_stops
    set sort_order = sort_order - 1
    where trip_id = p_trip_id and day_date = v_old_day
      and id <> p_stop_id and sort_order > v_old_position;

    select coalesce(max(s.sort_order) + 1, 0) into v_new_position
    from public.trip_stops s
    where s.trip_id = p_trip_id and s.day_date = p_day_date;
  end if;

  update public.trip_stops
  set day_date = p_day_date, sort_order = v_new_position,
      title = btrim(p_title), category = p_category,
      address = btrim(coalesce(p_address, '')),
      notes = btrim(coalesce(p_notes, '')),
      time_local = p_time_local
  where id = p_stop_id and trip_id = p_trip_id;
end;
$$;

create or replace function public.delete_trip_stop(
  p_trip_id uuid,
  p_stop_id uuid
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_old_day date;
  v_old_position integer;
begin
  if (select auth.uid()) is null or not private.can_edit_trip(p_trip_id) then
    raise exception 'Not authorized to edit this trip' using errcode = '42501';
  end if;

  perform 1 from public.trips where id = p_trip_id for update;
  if not found then
    raise exception 'Trip not available' using errcode = '42501';
  end if;

  select s.day_date, s.sort_order into v_old_day, v_old_position
  from public.trip_stops s
  where s.id = p_stop_id and s.trip_id = p_trip_id;
  if not found then
    raise exception 'Stop not available' using errcode = '42501';
  end if;

  delete from public.trip_stops where id = p_stop_id and trip_id = p_trip_id;
  update public.trip_stops set sort_order = sort_order - 1
  where trip_id = p_trip_id and day_date = v_old_day and sort_order > v_old_position;
end;
$$;

create or replace function public.move_trip_stop(
  p_trip_id uuid,
  p_stop_id uuid,
  p_direction integer
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_day date;
  v_position integer;
  v_neighbor_id uuid;
  v_neighbor_position integer;
begin
  if (select auth.uid()) is null or not private.can_edit_trip(p_trip_id) then
    raise exception 'Not authorized to edit this trip' using errcode = '42501';
  end if;
  if p_direction is null or p_direction not in (-1, 1) then
    raise exception 'Direction must be -1 or 1' using errcode = '22023';
  end if;

  perform 1 from public.trips where id = p_trip_id for update;
  if not found then
    raise exception 'Trip not available' using errcode = '42501';
  end if;

  select s.day_date, s.sort_order into v_day, v_position
  from public.trip_stops s
  where s.id = p_stop_id and s.trip_id = p_trip_id;
  if not found then
    raise exception 'Stop not available' using errcode = '42501';
  end if;

  if p_direction = -1 then
    select s.id, s.sort_order into v_neighbor_id, v_neighbor_position
    from public.trip_stops s
    where s.trip_id = p_trip_id and s.day_date = v_day
      and (s.sort_order, s.id) < (v_position, p_stop_id)
    order by s.sort_order desc, s.id desc limit 1;
  else
    select s.id, s.sort_order into v_neighbor_id, v_neighbor_position
    from public.trip_stops s
    where s.trip_id = p_trip_id and s.day_date = v_day
      and (s.sort_order, s.id) > (v_position, p_stop_id)
    order by s.sort_order asc, s.id asc limit 1;
  end if;

  -- Top/bottom movement is harmless and idempotent.
  if v_neighbor_id is null then return; end if;

  update public.trip_stops
  set sort_order = case
      when id = p_stop_id then v_neighbor_position
      else v_position
    end
  where trip_id = p_trip_id and id in (p_stop_id, v_neighbor_id);
end;
$$;

-- Do not permit anonymous or PUBLIC execution of write RPCs.
revoke all on function public.add_trip_stop(uuid,date,text,text,text,text,time without time zone) from public, anon;
revoke all on function public.update_trip_stop(uuid,uuid,date,text,text,text,text,time without time zone) from public, anon;
revoke all on function public.delete_trip_stop(uuid,uuid) from public, anon;
revoke all on function public.move_trip_stop(uuid,uuid,integer) from public, anon;
grant execute on function public.add_trip_stop(uuid,date,text,text,text,text,time without time zone) to authenticated;
grant execute on function public.update_trip_stop(uuid,uuid,date,text,text,text,text,time without time zone) to authenticated;
grant execute on function public.delete_trip_stop(uuid,uuid) to authenticated;
grant execute on function public.move_trip_stop(uuid,uuid,integer) to authenticated;

comment on table public.trip_stops is 'M2 itinerary entries; membership-restricted reads and role-checked RPC writes.';

commit;
