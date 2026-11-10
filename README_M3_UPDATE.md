# Trip Planner M3 free map update

Install into your **existing working M2 project**, not a new folder.

1. Upload `trip-planner-m3-update.zip` next to existing `package.json`.
2. `unzip -q -o trip-planner-m3-update.zip`
3. `cp -R trip-planner-m3-update/. .`
4. `npm install leaflet@1.9.4`
5. `npm install --save-dev @types/leaflet@1.9.22`
6. `npm run check`
7. Review and apply once `supabase/migrations/202611090003_m3_map_pins.sql` in the existing Supabase development project.
8. Open your trip and pin two stops on the same day to test an optional driving route.

Full instructions and limits: `docs/M3_SETUP.md`. No new Google API key or billing is needed.
