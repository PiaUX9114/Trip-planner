# Trip Planner M3 — Free maps (Mac + existing GitHub Codespaces)

M3 is an **incremental update** for your already-working M2 project. It adds:

- Interactive Leaflet map using OpenStreetMap standard raster tiles with attribution.
- One numbered marker per geocoded stop, selected by travel day.
- Manual place/address search (Nominatim public instance): no autocomplete, no background geocoding.
- Save a chosen search result as a stop pin, guarded by the same Owner/Editor rules as M2.
- On-demand driving-route preview through the public OSRM demo, with distance and approximate time.
- An explicit dotted-line *order guide* when driving directions have not been calculated.

**Important limits:** This is a small noncommercial **development demo** only, not a production routing backend. OpenStreetMap tile/geocoding services and OSRM demo are donation-funded/best-effort, can throttle or block, and do not guarantee availability. No offline map tile download, live GPS navigation, turn-by-turn instructions, optimization, or autocomplete is provided. External queries and pinned locations are sent to public services; don't search for private home or confidential addresses.

## 1. Back up working M2

Commit your working files in GitHub Codespaces first (including the important Next.js Server Actions host fix, but never `.env.local`). Do **not** delete your environment file.

## 2. Install M3 in your existing Codespace

Drag `trip-planner-m3-update.zip` into your existing project next to `package.json`.

From the project terminal (the folder containing `package.json`):

```sh
unzip -q -o trip-planner-m3-update.zip
cp -R trip-planner-m3-update/. .
npm install leaflet@1.9.4
npm install --save-dev @types/leaflet@1.9.22
npm run check
```

This ZIP **does not overwrite** `.env.local`, `next.config.mjs`, login/signup actions, `package.json`, M1 or M2 SQL migration, or existing M1 tests. The `npm install` commands add two new mapping dependencies and update your package lockfile.

If you previously fixed the M1 test that incorrectly required `.env.local` to be absent, that fix remains intact.

## 3. Apply one M3 SQL migration (only once)

Open your **existing Trip Planner development project** at Supabase Dashboard > SQL Editor > New query. In Codespaces open:

`supabase/migrations/202611090003_m3_map_pins.sql`

Copy the SQL into the editor and **review it before clicking Run**. Expected outcome: **Success. No rows returned.**

The M3 migration adds three nullable location columns, a stale-location invalidation trigger, and a role-checked `pin_trip_stop` RPC. Existing trip and stop rows are preserved. An M3 migration error means you should stop and inspect the message rather than re-running blindly.

## 4. Test the map

Open Codespaces port **3000**, sign in, open your existing trip, and scroll to **Interactive map and driving routes**.

1. Choose the correct day using **Map day**.
2. Select an existing stop in the right panel.
3. Enter a public landmark or city in the search field, and click **Search**. Choose an accurate result and click **Pin this location**.
4. Do the same for another stop **on that same day**. You should see numbered pins and a dotted line connecting them in itinerary order.
5. Click **Preview driving route** to request a real road route (not live navigation). A solid green road route and an approximate distance/time should appear if the OSRM public demo is available.
6. Refresh or sign out and back in: saved stop pins should still appear.
7. Change a stop's address in the M2 Edit form: its previous pin is invalidated so you can re-pin the new place.

The map works for viewers with **read-only** access, but only owners/editors can pin locations. If the M3 SQL is not yet installed, the M2 itinerary remains usable; the map area explains that the migration is needed.

## Free service usage policies and migration to production

- OSM standard raster tiles: use only viewport tiles, display © OpenStreetMap contributors, do not prefetch/cache for offline usage. https://operations.osmfoundation.org/policies/tiles/
- Nominatim public: max 1 request/second, identify the app, no search-as-you-type, cache where possible. The M3 development API uses an in-process throttle and 1-hour cache, suitable **only for a single Codespaces instance**. https://operations.osmfoundation.org/policies/nominatim/
- OSRM demo: reasonable noncommercial testing; max 1 request/second; no uptime guarantee. M3 only calls it after the user presses **Preview driving route**, routes at most 12 pinned stops per day, and caches results for 10 minutes in-process. https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server
- The public services receive location text or coordinates. They are not suitable for sensitive travel addresses. Production use needs an appropriately licensed provider or self-hosted geocoder, routing and tile servers, distributed throttling, contactable app identification and observability. No Google billing setup is necessary for this M3 development demo.

## Troubleshooting

- **Map requires M3 migration:** run `202611090003_m3_map_pins.sql` once in the project that holds your working M2 stops.
- **Module not found: leaflet / type definitions:** run the two `npm install` commands in the original project folder; not inside extracted `trip-planner-m3-update/`.
- **429 when searching or routing:** wait a few seconds, retry once. Public servers are rate-limited.
- **No locations found:** search by city + country or a well-known landmark, and avoid entering private home addresses.
- **No driving route:** ensure at least two stops on the **same day** are pinned; the demo may be unavailable or the roads disconnected.
- **Invalid Server Actions request:** keep your earlier `next.config.mjs` Codespaces host fix; this ZIP does not change that file.
- **Port 3000 in use:** stop your duplicate dev servers and use your existing forwarded port 3000 preview.

## Verification

M3 contract tests and TS/TSX parsing checks are verified by the packaging process. Full `npm run check`, `next build`, live Supabase migration, public API responses and browser rendering must be verified inside your connected Codespace/Supabase project.
