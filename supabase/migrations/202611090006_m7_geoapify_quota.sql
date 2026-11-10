-- M7 Geoapify: distributed, PostgreSQL-backed quotas for authenticated trip members.
-- Apply ONCE in the existing Trip Planner development Supabase project.
-- This migration does NOT store search text, addresses, GPS or provider API keys.
begin;

create table if not exists private.geoapify_quota_buckets (
  scope text not null,
  bucket_start timestamptz not null,
  used integer not null default 0 check (used >= 0),
  primary key (scope, bucket_start)
);

revoke all on private.geoapify_quota_buckets from public, anon, authenticated;

create or replace function public.take_geoapify_quota(p_trip_id uuid, p_kind text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
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
  if v_user is null or p_trip_id is null or not private.is_trip_member(p_trip_id) then
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

revoke all on function public.take_geoapify_quota(uuid, text) from public, anon;
grant execute on function public.take_geoapify_quota(uuid, text) to authenticated;

-- Database administrators can prune bucket history periodically with:
-- delete from private.geoapify_quota_buckets where bucket_start < now() - interval '7 days';
commit;
