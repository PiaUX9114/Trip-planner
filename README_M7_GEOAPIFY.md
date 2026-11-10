# Trip Planner M7 — Geoapify API integration (development update)

The current M7 app uses Geoapify for place search, daily driving previews, and user-requested GPS-assisted navigation routes. This replaces public Nominatim and OSRM demo APIs. It continues to use OSM raster map tiles, **which remain a separate public-launch issue**.

## Install into the existing M7 project

1. Upload `trip-planner-m7-geoapify.zip` alongside `package.json` in Codespaces.
2. From the root project directory, run:

```sh
unzip -q -o trip-planner-m7-geoapify.zip -d .
npm run check
npm run build
```

The ZIP has `src/`, `scripts/`, `supabase/`, and `tests/` at its ROOT, **not** a nested project folder. Do not use `cp` or unzip into a named folder. Existing `.env.local`, Supabase auth helpers, collaboration, itineraries, and calendar are not overwritten.

3. In Supabase **SQL Editor**, review and execute `supabase/migrations/202611090006_m7_geoapify_quota.sql` ONCE in the development project. Do not run `.mjs` files there.
4. Verify `.env.local` includes `GEOAPIFY_API_KEY=...` and the existing Supabase values. The value must not start with `NEXT_PUBLIC_` or be copied to this chat. If already added, leave it unchanged.
5. Restart `npm run dev` on port 3000. Confirm place search, route preview between two pinned stops, and navigation. Test quota response by trying requests repeatedly over time if needed; don't exhaust the free provider quota intentionally.
6. Run `npm run m7:preflight`. When correct, the Nominatim/OSRM blocker should be removed; other launch warnings can remain.

## Security / usage limits

- All provider requests are initiated by authenticated trip members and pass through server-side Next.js endpoints. The API key is read only from a server environment variable.
- A new `take_geoapify_quota` Supabase RPC uses transaction-level PostgreSQL locking for per-user and global counters **shared across server instances**. Without the migration, requests fail closed and return 503.
- The conservatively budgeted limits are three upstream requests per second globally, 2,400 estimated credit units per day globally, 120 credit units per member per UTC day, plus per-user minute limits. Map and navigation routes reserve twelve units each, and place search one unit. **These are app budgets, not a guarantee of billed credits.** Review the Geoapify dashboard's true credit accounting.
- GPS is not persisted or shared. Only when the user requests navigation with live location will current GPS coordinates be sent to Geoapify to calculate that route.
- Geoapify API failures return generic messages; credentials/URLs are not logged.
- Display attribution to Geoapify and OpenStreetMap contributors.

## Public-launch work still required

1. **Map tiles**: Leaflet still uses `tile.openstreetmap.org`, which is not a production tile SLA or general-purpose free CDN. Obtain an approved public tile provider, confirm their terms and attribution, and change BOTH `src/components/leaflet-canvas.tsx` and `src/components/navigation-map.tsx` accordingly.
2. Verify Supabase migration application, quotas under concurrency, and provider metrics/alerts. Apply web application firewall / edge-level anti-bot protection if publicly deployed.
3. Verify provider plan restrictions, limits and billing settings; free allowances may change. Geoapify credit cost for multi-waypoint routes can vary.
4. Remove any temporary signup diagnostics and `debug` query parameters left in `src/app/auth/actions.ts` from earlier troubleshooting.
5. Complete M7 security/privacy signoff, mobile/real-device navigation checks, backups, Auth production URLs, email delivery, user data deletion and launch operations.
6. Commit the new migration and files to GitHub; never commit `.env.local`.

This update is not a completed public deployment. It has no production credentials and performs no billable operations automatically.
