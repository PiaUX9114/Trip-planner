# Trip Planner M4 — two-view trip calendar

This is an incremental overlay for the **already working M3 guided-pinning app**. It is not a standalone Next.js project. It changes no credentials, authentication code, mapping endpoints, or Codespaces origin settings.

## Features

- **Trip days**: each travel day, with scheduled and unscheduled itinerary stops.
- **Hourly week**: a seven-day, scrollable 24-hour grid, with previous/next-week navigation, time blocks, and unscheduled stops.
- **One shared itinerary**: select a stop in either calendar view, set its trip date, local start time, and duration, and save. The itinerary and map use the updated day immediately after the page refresh.
- **Permissions**: owners/editors may save; viewers may only read. The RPC checks roles in the database.
- **Cost**: no new services, payment requirements, or API keys.

## Install in the root of your EXISTING Codespaces repository

**Before installing:** commit or back up your working M3 files. The project should already contain the M1, M2 and M3 files.

1. Download `trip-planner-m4-two-views.zip` and upload it alongside `package.json` in Codespaces.
2. From the repository root run:

   ```sh
   unzip -q -o trip-planner-m4-two-views.zip
   npm run check
   ```

   This ZIP contains root-relative paths such as `src/components/trip-calendar.tsx` — no `cp -R` command is necessary, and no extracted duplicate app folder is created.

3. In Supabase **SQL Editor**, review and run **once**:

   `supabase/migrations/202611090004_m4_calendar.sql`

   This extends `trip_stops` with `duration_minutes` (existing stops default to 60 minutes) and creates a role-checked scheduling RPC. M1/M2/M3 migrations must already be applied.

4. Stop any duplicate Next.js dev servers and start one instance with `npm run dev` on port 3000. Open the Codespaces port 3000 preview, open a trip, and find **Trip calendar** below the itinerary.

5. Test: select **Trip days**, click **Schedule** on a stop, set a date/time and duration, save. Confirm the itinerary reflects the new date and time. Switch to **Hourly week** and locate the same stop on the grid. Confirm the stop's day in the map.

## Notes

- Both views use trip-local wall times; no external calendar account is needed. Durations can be 15–720 minutes in 15-minute increments. Events extending past midnight are labeled `+1 day` and displayed only to the end of their starting day in the hourly grid.
- The initial day-by-day overview displays up to 366 days of a trip, while the hourly week view navigates all days.
- M4 scheduling does not currently support drag-and-drop, recurrence, conflict alerts, or third-party calendar sync.
- If the migration has not been installed, M1–M3 features continue to work, and M4 scheduling is disabled with a warning.
- Full browser and deployed-build testing must be completed in your Codespaces environment; the authoring sandbox does not have npm registry access.
