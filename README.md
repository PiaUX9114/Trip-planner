# Trip Planner — M1 Accounts and Trips (local developer increment)

This is the **M1 first increment**, based on the approved M0 Next.js 16 / React 19 / TypeScript / Tailwind starter.

## What's new

- Email/password sign-up, sign-in, sign-out.
- Email confirmation callback via Supabase SSR.
- Protected `/trips` dashboard and `/trips/new` create-trip form.
- Protected trip detail placeholder `/trips/[id]`.
- Supabase SQL migration for trips, Owner membership, strict row-level security and atomic `create_trip`.

**Not yet implemented:** invitations, owner/editor/viewer management UI, itinerary stops, maps, calendar, live navigation, realtime collaboration, offline routing. No service was deployed and no Supabase database was modified by creating this archive.

## Mac / Codespaces instructions

**Start here:** [docs/M1_MAC_SETUP.md](docs/M1_MAC_SETUP.md). It explains how to upgrade the existing Codespaces project while preserving your `.env.local`, install dependencies, and separately review/apply the SQL migration.

## Local commands

```bash
npm install
npm run dev
npm run test
npm run check
npm run build
```

Your `.env.local` should contain only your project URL and Supabase **publishable** key. Do not commit secrets or expose server credentials.

## Source outline

- `src/lib/supabase`: SSR browser/server clients, verified-session refresh, config.
- `src/app/auth/actions.ts`: signup / sign-in / sign-out.
- `src/app/auth/confirm/route.ts`: OTP email confirmation.
- `src/app/login`: account UI.
- `src/app/trips`: dashboard, new trip, detail placeholder.
- `supabase/migrations`: reviewed SQL migration, not automatically applied.
- `tests`: dependency-free structural guards only.

## Known verification limitation

This packaging environment cannot download npm dependencies, so the full Next.js build and live database authentication workflows have **not** been run here. Do not treat M1 as complete until the Mac/Codespaces checks and an authorized Supabase test pass.
