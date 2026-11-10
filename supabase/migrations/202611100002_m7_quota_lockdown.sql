-- Stage B: run ONLY AFTER the new backend is deployed and map tests succeed.
-- Remove direct Auth-user execution of the former quota RPCs.
begin;
revoke all on function public.take_geoapify_quota(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.take_geoapify_tile_quota()
  from public, anon, authenticated, service_role;
commit;
notify pgrst, 'reload schema';
