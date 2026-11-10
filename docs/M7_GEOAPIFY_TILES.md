# Geoapify Tiles (M7)

Applies a server-proxied authenticated Geoapify raster background in both trip map and navigation map. No browser-exposed key, no OSM public raster server. Geoapify `osm-carto` tile credits + visible Geoapify / OSM attribution.

## Install

- Extract the ZIP into the existing Trip Planner root, next to `package.json`.
- Run `npm run check && npm run build`.
- Review and execute `supabase/migrations/202611090007_m7_geoapify_tile_quota.sql` **once** in the same existing Supabase project. Requires migration 0006 first.
- Keep `GEOAPIFY_API_KEY` in `.env.local` (server-side only). Restart with `npm run dev`.
- Test trip map, navigation map, zoom, pan, and Geoapify usage dashboard.

## Shared limits

The private Postgres quota enforces at most 2,000 billed tile requests/day, 20/sec globally, and 400 tiles/day per signed-in user. Tile cost 0.25 credits; the total tile budget is 500 credits/day, leaving room for the other Geoapify APIs. Provider limits and caching may vary. Supabase RPC must be live; a missing migration causes maps to fail closed. Browser caches tiles for a day; upstream Next.js fetch uses cache to reduce provider traffic.

## Public launch

This removes the OSM public tiles warning. It does not approve public release by itself. Verify provider usage/terms, Supabase RLS, auth/email configuration, quotas, tile endpoint abuse, privacy/terms, monitoring, and deployment settings. Do not publish server secrets.
