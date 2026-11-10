-- Stage A: install service-role-only Geoapify quota RPCs WITHOUT removing old grants.
-- Apply in Supabase SQL Editor BEFORE deploying the new Next.js code.
-- No existing quota buckets are reset; both versions use the same locks and counters.
-- API calls made with the server-only sb_secret_ key run as service_role.
begin;

create or replace function public.take_geoapify_quota_server(p_user_id uuid, p_trip_id uuid, p_kind text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := p_user_id;
  v_now timestamptz := clock_timestamp();
  v_second timestamptz := date_trunc('second', v_now);
  v_minute timestamptz := date_trunc('minute', v_now);
  v_day timestamptz := date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';
  v_cost integer;
  v_user_minute_limit integer;
  v_user_day_limit integer := 120;
  v_global_day_limit integer := 2400;
  v_scope text;
  v_n integer;
begin
  if v_user is null or p_trip_id is null or not exists (
    select 1 from public.trip_members m
    where m.trip_id = p_trip_id and m.user_id = v_user
  ) then
    return false;
  end if;
  -- Conservatively charge up to 12 credit-units per route. This is an
  -- application-side budget; inspect actual costs in the Geoapify dashboard.
  if p_kind = 'search' then
    v_cost := 1;
    v_user_minute_limit := 10;
  elsif p_kind = 'map_route' or p_kind = 'navigation' then
    v_cost := 12;
    v_user_minute_limit := 6;
  else
    return false;
  end if;

  -- Transaction-wide advisory lock makes all four counters atomic across
  -- Vercel serverless instances. Never rely on a JavaScript global counter.
  perform pg_advisory_xact_lock(7831, 99112);

  select used into v_n from private.geoapify_quota_buckets
    where scope = 'global:second' and bucket_start = v_second;
  if coalesce(v_n, 0) >= 3 then return false; end if;

  select used into v_n from private.geoapify_quota_buckets
    where scope = 'global:day' and bucket_start = v_day;
  if coalesce(v_n, 0) + v_cost > v_global_day_limit then return false; end if;

  v_scope := 'user:' || v_user::text || ':' || p_kind || ':minute';
  select used into v_n from private.geoapify_quota_buckets
    where scope = v_scope and bucket_start = v_minute;
  if coalesce(v_n, 0) >= v_user_minute_limit then return false; end if;

  v_scope := 'user:' || v_user::text || ':day';
  select used into v_n from private.geoapify_quota_buckets
    where scope = v_scope and bucket_start = v_day;
  if coalesce(v_n, 0) + v_cost > v_user_day_limit then return false; end if;

  insert into private.geoapify_quota_buckets(scope, bucket_start, used)
    values ('global:second', v_second, 1)
    on conflict(scope, bucket_start) do update set used = private.geoapify_quota_buckets.used + 1;
  insert into private.geoapify_quota_buckets(scope, bucket_start, used)
    values ('global:day', v_day, v_cost)
    on conflict(scope, bucket_start) do update set used = private.geoapify_quota_buckets.used + excluded.used;
  insert into private.geoapify_quota_buckets(scope, bucket_start, used)
    values ('user:' || v_user::text || ':' || p_kind || ':minute', v_minute, 1)
    on conflict(scope, bucket_start) do update set used = private.geoapify_quota_buckets.used + 1;
  insert into private.geoapify_quota_buckets(scope, bucket_start, used)
    values ('user:' || v_user::text || ':day', v_day, v_cost)
    on conflict(scope, bucket_start) do update set used = private.geoapify_quota_buckets.used + excluded.used;

  return true;
end;
$$;

create or replace function public.take_geoapify_tile_quota_server(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := p_user_id;
  v_now timestamptz := clock_timestamp();
  v_second timestamptz := date_trunc('second', v_now);
  v_minute timestamptz := date_trunc('minute', v_now);
  v_day timestamptz := date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';
  v_n integer;
  v_scope text;
begin
  if v_user is null or not exists (
    select 1 from auth.users u where u.id = v_user
  ) then return false; end if;

  perform pg_advisory_xact_lock(7831, 99113);

  select used into v_n from private.geoapify_quota_buckets
    where scope = 'tiles:global:second' and bucket_start = v_second;
  if coalesce(v_n, 0) >= 20 then return false; end if;

  select used into v_n from private.geoapify_quota_buckets
    where scope = 'tiles:global:day' and bucket_start = v_day;
  if coalesce(v_n, 0) >= 2000 then return false; end if;

  v_scope := 'tiles:user:' || v_user::text || ':minute';
  select used into v_n from private.geoapify_quota_buckets
    where scope = v_scope and bucket_start = v_minute;
  if coalesce(v_n, 0) >= 120 then return false; end if;

  v_scope := 'tiles:user:' || v_user::text || ':day';
  select used into v_n from private.geoapify_quota_buckets
    where scope = v_scope and bucket_start = v_day;
  if coalesce(v_n, 0) >= 400 then return false; end if;

  insert into private.geoapify_quota_buckets(scope, bucket_start, used)
    values ('tiles:global:second', v_second, 1)
    on conflict (scope, bucket_start) do update
      set used = private.geoapify_quota_buckets.used + 1;
  insert into private.geoapify_quota_buckets(scope, bucket_start, used)
    values ('tiles:global:day', v_day, 1)
    on conflict (scope, bucket_start) do update
      set used = private.geoapify_quota_buckets.used + 1;
  insert into private.geoapify_quota_buckets(scope, bucket_start, used)
    values ('tiles:user:' || v_user::text || ':minute', v_minute, 1)
    on conflict (scope, bucket_start) do update
      set used = private.geoapify_quota_buckets.used + 1;
  insert into private.geoapify_quota_buckets(scope, bucket_start, used)
    values ('tiles:user:' || v_user::text || ':day', v_day, 1)
    on conflict (scope, bucket_start) do update
      set used = private.geoapify_quota_buckets.used + 1;

  return true;
end;
$$;

-- PostgreSQL defaults may grant EXECUTE to PUBLIC; remove every untrusted role explicitly.
revoke all on function public.take_geoapify_quota_server(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.take_geoapify_tile_quota_server(uuid)
  from public, anon, authenticated;
grant execute on function public.take_geoapify_quota_server(uuid, uuid, text) to service_role;
grant execute on function public.take_geoapify_tile_quota_server(uuid) to service_role;

-- Existing authenticated-access quota functions remain available until Stage B.
commit;
notify pgrst, 'reload schema';
