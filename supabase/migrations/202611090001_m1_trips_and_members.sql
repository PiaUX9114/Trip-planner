-- Trip Planner M1: account-owned trips and membership visibility.
-- Apply manually to the intended Supabase project after review. Do not run blindly.
-- No invitations, stops, maps, realtime publication, or paid integrations in this migration.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create type public.trip_member_role as enum ('owner', 'editor', 'viewer');

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  start_date date not null,
  end_date date not null,
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_valid_dates check (start_date <= end_date)
);

create table public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.trip_member_role not null,
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create index trip_members_user_id_idx on public.trip_members(user_id);
create index trips_owner_id_idx on public.trips(owner_id);
create index trips_created_at_idx on public.trips(created_at desc);

-- These security-definer helpers read membership without recursive RLS evaluation.
-- They are not exposed through the public REST schema.
create or replace function private.is_trip_member(p_trip_id uuid)
returns boolean language sql stable security definer
set search_path = '' as $$
  select exists (
    select 1 from public.trip_members m
    where m.trip_id = p_trip_id and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.can_edit_trip(p_trip_id uuid)
returns boolean language sql stable security definer
set search_path = '' as $$
  select exists (
    select 1 from public.trip_members m
    where m.trip_id = p_trip_id and m.user_id = (select auth.uid())
      and m.role in ('owner', 'editor')
  );
$$;

create or replace function private.is_trip_owner(p_trip_id uuid)
returns boolean language sql stable security definer
set search_path = '' as $$
  select exists (
    select 1 from public.trip_members m
    where m.trip_id = p_trip_id and m.user_id = (select auth.uid())
      and m.role = 'owner'
  );
$$;

revoke all on function private.is_trip_member(uuid) from public, anon;
revoke all on function private.can_edit_trip(uuid) from public, anon;
revoke all on function private.is_trip_owner(uuid) from public, anon;
grant execute on function private.is_trip_member(uuid) to authenticated;
grant execute on function private.can_edit_trip(uuid) to authenticated;
grant execute on function private.is_trip_owner(uuid) to authenticated;

alter table public.trips enable row level security;
alter table public.trip_members enable row level security;

create policy trips_read_members on public.trips
  for select to authenticated
  using (owner_id = (select auth.uid()) or private.is_trip_member(id));

create policy trips_edit_members on public.trips
  for update to authenticated
  using (private.can_edit_trip(id))
  with check (private.can_edit_trip(id));

create policy members_read_members on public.trip_members
  for select to authenticated
  using (private.is_trip_member(trip_id));

-- Explicit table privileges: no direct INSERT/DELETE or membership changes from browser.
revoke all on public.trips from public, anon, authenticated;
revoke all on public.trip_members from public, anon, authenticated;
grant select on public.trips to authenticated;
grant update (name, start_date, end_date, timezone) on public.trips to authenticated;
grant select on public.trip_members to authenticated;

create or replace function private.touch_trip()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.revision := old.revision + 1;
  return new;
end;
$$;

create trigger trips_touch_before_update
before update on public.trips
for each row execute function private.touch_trip();

-- Atomically create trip + its single initial Owner membership.
-- The owner is ALWAYS the authenticated caller, never a client-supplied user ID.
create or replace function public.create_trip(
  p_name text,
  p_start_date date,
  p_end_date date,
  p_timezone text default 'UTC'
)
returns uuid language plpgsql security definer
set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_trip_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 100 then
    raise exception 'Invalid trip name' using errcode = '22023';
  end if;
  if p_start_date is null or p_end_date is null or p_start_date > p_end_date then
    raise exception 'Invalid travel dates' using errcode = '22023';
  end if;
  if p_timezone is null or not exists (
    select 1 from pg_catalog.pg_timezone_names where name = p_timezone
  ) then
    raise exception 'Invalid time zone' using errcode = '22023';
  end if;

  insert into public.trips (owner_id, name, start_date, end_date, timezone)
  values (v_user_id, btrim(p_name), p_start_date, p_end_date, p_timezone)
  returning id into v_trip_id;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip_id, v_user_id, 'owner');

  return v_trip_id;
end;
$$;

revoke all on function public.create_trip(text, date, date, text) from public, anon;
grant execute on function public.create_trip(text, date, date, text) to authenticated;

comment on function public.create_trip(text, date, date, text) is
  'Creates trip and owner membership atomically for authenticated caller only.';
