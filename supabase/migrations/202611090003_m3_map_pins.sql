-- Trip Planner M3: optional, membership-protected map pins for itinerary stops.
-- Apply ONCE after M1 and M2 in the existing development Supabase project.
-- Does not delete trips, stops, users, or change previously assigned roles.
begin;

alter table public.trip_stops
  add column latitude double precision,
  add column longitude double precision,
  add column location_label text;

alter table public.trip_stops
  add constraint trip_stops_latitude_valid check (latitude is null or (latitude between -90 and 90)),
  add constraint trip_stops_longitude_valid check (longitude is null or (longitude between -180 and 180)),
  add constraint trip_stops_coordinates_together check ((latitude is null) = (longitude is null)),
  add constraint trip_stops_location_label_size check (location_label is null or char_length(location_label) <= 240);

-- Editing the address invalidates its old pin. If no address was entered,
-- a title change also invalidates the pin because the title may name the place.
create or replace function private.clear_changed_stop_location()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.address is distinct from new.address
    or (coalesce(old.address, '') = '' and old.title is distinct from new.title) then
    new.latitude := null;
    new.longitude := null;
    new.location_label := null;
  end if;
  return new;
end;
$$;

create trigger trip_stops_clear_changed_location
  before update of address, title on public.trip_stops
  for each row execute function private.clear_changed_stop_location();

-- Only owners/editors can save map pins; members continue to read via M2 RLS.
-- Neither the web browser nor the authenticated database role has direct UPDATE.
create or replace function public.pin_trip_stop(
  p_trip_id uuid,
  p_stop_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_label text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not private.can_edit_trip(p_trip_id) then
    raise exception 'Not authorized to edit this trip' using errcode = '42501';
  end if;
  if p_latitude is null or p_longitude is null
     or p_latitude not between -90 and 90 or p_longitude not between -180 and 180
     or p_label is null or char_length(btrim(p_label)) not between 1 and 240 then
    raise exception 'Invalid coordinates or location label' using errcode = '22023';
  end if;

  perform 1 from public.trips where id = p_trip_id for update;
  if not found then
    raise exception 'Trip not available' using errcode = '42501';
  end if;

  update public.trip_stops
  set latitude = p_latitude,
      longitude = p_longitude,
      location_label = btrim(p_label)
  where id = p_stop_id and trip_id = p_trip_id;

  if not found then
    raise exception 'Stop not available' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.pin_trip_stop(uuid,uuid,double precision,double precision,text)
  from public, anon;
grant execute on function public.pin_trip_stop(uuid,uuid,double precision,double precision,text)
  to authenticated;

comment on column public.trip_stops.location_label is 'User-selected public geocoder result; no private addresses should be sent to external geocoders.';
commit;
