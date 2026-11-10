-- M7 Geoapify map tile quota: shared limits across hosting instances.
-- Requires M7 migration 202611090006_m7_geoapify_quota.sql.
-- 2,000 tiles/day * 0.25 credit = 500 credits/day, leaving 2,500
-- out of 3,000 free daily credits for geocoding and routing.
begin;

create or replace function public.take_geoapify_tile_quota()
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
  v_n integer;
  v_scope text;
begin
  if v_user is null then return false; end if;

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

revoke all on function public.take_geoapify_tile_quota() from public, anon;
grant execute on function public.take_geoapify_tile_quota() to authenticated;
commit;
