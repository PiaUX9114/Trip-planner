# Trip Planner M6 - Basic online driving navigation

M6 is an incremental addition to the already working M5 collaboration project in GitHub Codespaces. No new Supabase tables, migrations, external accounts, paid keys, or dependencies are needed beyond the Leaflet package already installed for M3.

## What's included

- A separate, protected trip navigation page at `/trips/[id]/navigate`.
- Day picker and pinned stops in itinerary order, using existing Supabase RLS.
- An explicit **Get driving route** button, powered by the public OSRM demo for lightweight development testing. It returns a road polyline, estimated travel distance/time and textual maneuvers, without realtime traffic.
- Optional device location obtained only after clicking **Enable my location** and granting browser permission (HTTPS required). Display a moving GPS dot, approximate upcoming maneuver and distance along the route. The user can stop tracking immediately. Tracking stops when the tab is hidden or left.
- A route can start from the user's device fix if it is recent and accurate enough; when the route is requested, that single GPS coordinate is sent to the public OSRM demo service. This is disclosed in the interface. GPS fixes are not stored in Supabase or shared with collaborators.
- **No automated rerouting** or background GPS requests. The user requests each route or recalculation explicitly.

## Install from the project root

1. Download `trip-planner-m6-navigation.zip` and drag it into Codespaces next to `package.json`.
2. Run:

   ```sh
   unzip -q -o trip-planner-m6-navigation.zip
   node scripts/m6-add-navigation-link.mjs
   npm run check
   npm run build
   ```

   **Do not use `cp`, and do not extract into another project folder.** The ZIP includes root-relative files (`src/...`, `scripts/...` and `tests/...`). The link script changes only the existing trip-page map heading to add an M6 navigation link, avoiding replacement of any of your earlier map or auth fixes. Running that script twice is safe.

3. Restart the one active Next.js server (`Control + C`, `npm run dev`) and open the forwarded **HTTPS** port 3000 URL in a full browser tab.
4. Open a trip, click **Open M6 navigation** in the map section. Pick a day with at least **two pinned stops** and click **Get driving route**. Check the route line and instructions.
5. Optionally select **Enable my location**, grant permission, and click **Recalculate driving route** to start from your position. Move a short distance safely as a passenger or on foot to watch the dot update; this is a driving route preview, not walk navigation. Click **Stop location**, then confirm it stops updating. Switch tabs to confirm foreground-only behavior.

## Free service limits

- OpenStreetMap tiles: interactive viewport only, visible attribution, no tile prefetch/offline downloads; see https://operations.osmfoundation.org/policies/tiles/.
- OSRM public demo: reasonable, low-rate non-commercial development/test use only; no SLA. Routing is throttled using the existing in-process limiter and never automatically polled. Limit 12 pinned stops/day; location-start route adds one waypoint. This demo is not suitable for production or safety-critical guidance.
- Browser GPS works only on HTTPS secure contexts and with device permission. Private Codespaces may require opening the page in its own browser tab rather than inside an embedded preview.
- No new SQL migration is included or needed.

## Important safety and privacy boundaries

- This is a *navigation assistant* with approximate progress only, not a certified turn-by-turn car navigation system. Do not look at or interact with the screen while driving. Always obey road signs and local laws.
- No audible prompts, background tracking, offline route/tile download, automatic rerouting, realtime traffic, road closures, or guaranteed route accuracy. Navigation requires an internet connection.
- The browser holds the current GPS reading in memory only. It is not written to trip tables, shared with members, or logged by the application. If the user explicitly requests a route from their live GPS start, that coordinate is forwarded to the third-party public OSRM service for route calculation.
- Browsers may grant persistent location permission even after stopping tracking. You can revoke it in browser/site settings. Stopping tracking only terminates this app's active watch.
- If the route service is down or the device is off the route, the interface shows a warning rather than claiming precise navigational instructions.

## Verification

Run `npm run check` and `npm run build` in your Codespace with your existing dependencies. The authoring sandbox validates structure/tests and TS/TSX syntax but cannot complete a full Next.js production build without the npm registry and the user's environment.
