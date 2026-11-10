# M7 Geoapify quota security hardening (staged rollout)

**Purpose:** Prevent logged-in users from calling quota-consuming PostgreSQL RPCs directly. Keep mapping working by moving quota calls to a **server-only** Supabase secret-key client. No trip or user data is migrated and no existing quota counters are reset.

## Before installing

- Keep Vercel Deployment Protection enabled. Back up or commit your working code.
- In Codespaces `.env.local` and in **Vercel Project -> Settings -> Environment Variables**, add `SUPABASE_SECRET_KEY` (the Supabase `sb_secret_...` key). Configure it for environments you will test. Do **not** prefix with `NEXT_PUBLIC_`. Never share or commit it.
- Your existing public Supabase URL/key and `GEOAPIFY_API_KEY` stay unchanged.
- Apply **Stage A SQL before the new code**; this maintains backward compatibility.

## Stage A - new server-only quota functions

In Supabase Dashboard -> SQL Editor, review and execute ONCE:

`supabase/migrations/202611100001_m7_quota_server_functions.sql`

It adds `public.take_geoapify_quota_server(uuid,uuid,text)` and `public.take_geoapify_tile_quota_server(uuid)`, granting `EXECUTE` only to `service_role`. Both use the existing private atomic quota buckets and preserve current limits. The first checks trip membership explicitly, and the second checks the user exists. The Next.js route validates the caller using `supabase.auth.getClaims()` before invoking either RPC. The previous functions are **still callable** until Stage B.

Check grants with this read-only SQL:

```sql
select
  has_function_privilege('authenticated','public.take_geoapify_quota_server(uuid,uuid,text)','EXECUTE') as auth_can_charge_route,
  has_function_privilege('service_role','public.take_geoapify_quota_server(uuid,uuid,text)','EXECUTE') as backend_can_charge_route,
  has_function_privilege('authenticated','public.take_geoapify_tile_quota_server(uuid)','EXECUTE') as auth_can_charge_tiles,
  has_function_privilege('service_role','public.take_geoapify_tile_quota_server(uuid)','EXECUTE') as backend_can_charge_tiles;
```

Expected: `false, true, false, true`.

## Install code

Upload `trip-planner-m7-quota-security.zip` **next to `package.json`** in your Codespaces editor and, from `/workspaces/Trip-planner`, run:

```sh
unzip -q -o trip-planner-m7-quota-security.zip
npm run check
npm run build
```

This ZIP is **root-relative**; no `cp` command and no nested project folder. It contains no key files. Existing trip management, route response formats, Leaflet components, and itinerary logic remain unchanged.

Test locally: logged-in place search, itinerary route preview, navigation route, and map background tiles. Without the secret key or Stage A SQL, calls fail closed (503) rather than falling back to public quota RPCs.

Commit and push the patch, then redeploy the **protected Vercel staging** app. The Vercel secret must exist in the deployment environment at build/run time. Test the same four map features after deployment.

## Stage B - revoke direct access to old functions

**Only after all four features work in Codespaces and Vercel**, review and run ONCE:

`supabase/migrations/202611100002_m7_quota_lockdown.sql`

This revokes direct access to the old `public.take_geoapify_quota(uuid,text)` and `public.take_geoapify_tile_quota()` functions. The new server-only functions remain callable by `service_role`.

Read-only confirmation:

```sql
select
  has_function_privilege('authenticated','public.take_geoapify_quota(uuid,text)','EXECUTE') as old_route_auth,
  has_function_privilege('authenticated','public.take_geoapify_tile_quota()','EXECUTE') as old_tiles_auth,
  has_function_privilege('service_role','public.take_geoapify_quota_server(uuid,uuid,text)','EXECUTE') as new_route_service,
  has_function_privilege('service_role','public.take_geoapify_tile_quota_server(uuid)','EXECUTE') as new_tiles_service;
```

Expected: `false, false, true, true`. Run map tests again. Supabase Security Advisor may still flag **other** intentional `SECURITY DEFINER` functions; this patch addresses only these two.

## Rollback

If the new backend fails **before Stage B**, restore the previous application release and investigate; the old quota functions still work. If Stage B was applied, restoring the old release additionally requires restoring `authenticated` EXECUTE on the **two legacy quota functions**, which reopens direct-counter abuse. Do so only as a temporary emergency rollback while Vercel protection remains enabled.

Do not run `supabase db reset`, edit other RLS policies, or expose the secret key. For public launch, review auth abuse, edge rate limiting, provider credit monitoring, mobile testing, and the rest of the Security Advisor findings separately.
