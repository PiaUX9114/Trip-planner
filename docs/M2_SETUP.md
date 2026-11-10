# Trip Planner M2 - Install the itinerary update (Mac + GitHub Codespaces)

This is an **incremental update** to your existing, working M1 project. It is **not** a standalone app. It does not replace `.env.local`, sign-in actions, `next.config.mjs`, `package.json`, or the M1 migration. It requires that M1 already works (registration/sign-in, create trip).

## 1. Back up your M1 progress

In Codespaces, use Git Source Control to commit your current working M1 changes, if possible. This is particularly useful because you already corrected your Codespaces hostname settings and Supabase URL. Do **not** commit `.env.local`; it contains your project configuration.

## 2. Install the update

Upload `trip-planner-m2-update.zip` into the existing project directory next to `package.json`. In a terminal inside that directory, run:

```sh
unzip -q -o trip-planner-m2-update.zip
cp -R trip-planner-m2-update/. .
npm run check
```

Your M1 source files remain in place; only `src/app/trips/[id]/page.tsx` is replaced, and new M2 files are added. Leave `next.config.mjs` untouched: your Codespaces Server Actions fix stays in place. No new npm dependencies are needed.

If `npm run check` fails in the old `m1-contract.test.mjs` security test because `.env.local` exists, retain the small fix you already made to that test. The M2 archive does not replace this test.

## 3. Apply the M2 database migration once

In the existing Supabase **Trip Planner development project**: open **SQL Editor > New query**. From Codespaces, open:

`supabase/migrations/202611090002_m2_trip_stops.sql`

Copy all its content, review it, and run it **once**. Expected: **Success. No rows returned.**

- This adds `public.trip_stops`, its index and RLS policy, plus four secured RPCs.
- It does **not** delete or replace your M1 trips or account data.
- Do not run a migration again if it already succeeded. If it fails, inspect the exact SQL error rather than blindly retrying.
- Data stays inside your Supabase development database; this does not deploy a site.

## 4. Try the itinerary

Return to the running Codespaces browser preview (port 3000). You can reload the page; if the development server stopped, start it from the main project folder:

```sh
npm run dev
```

Open **My Trips**, then click your test trip. On the trip detail page:

1. Add three stops to a date within your trip dates. Optionally set a time, category, address, and notes.
2. Move one stop **Up** or **Down** and refresh: its new order should persist.
3. Open **Edit stop**, change its title or travel day, and save. Moving to a new day appends the stop to that day's list.
4. Open **Delete**, then explicitly confirm deletion. Refresh: the stop remains deleted.
5. Sign out, sign back in, and verify that the stops persist.

## Access control

Only trip **owners and editors** can change stops; **viewers** can read them. The SQL performs these checks on the database side even if someone sends a forged request. Stops cannot be assigned to days outside the trip's start and end dates. Each itinerary mutation locks the trip row while updating ordering, so simultaneous changes serialize.

## Current limits / next milestone

- Reordering is by Up/Down controls **within the same day**. Use Edit to change a stop's day.
- Locations are manually entered text; no autocomplete, geocoding, map pins, or routing in M2.
- M2 does not add invitations, role management, realtime updates, or offline navigation.
- Dates and optional stop times are stored as local trip-day values; no automatic time-zone conversion occurs.

## Troubleshooting

- **Could not load itinerary**: M2 SQL migration not installed, wrong Supabase project, or a database access issue.
- **Could not save**: check that migration succeeded and you are signed in with Owner/Editor access. See server terminal error code (no keys required).
- **Invalid Server Actions**: do not overwrite your M1 `next.config.mjs` Codespaces hostname fix; use the same forwarded port 3000 URL as before.
- **Port 3000 in use**: stop duplicate dev servers before restarting.

## Verification scope

The M2 contract tests and TypeScript/TSX syntax checks were run in the authoring environment. Full Next.js build and live Supabase execution cannot be verified there because npm registry/database access is unavailable. The final `npm run check` and actual SQL migration must run in your connected Codespaces/Supabase project.
