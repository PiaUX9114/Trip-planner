# Architecture Baseline - Trip Planner

## Approved direction

- Next.js App Router + TypeScript + Tailwind CSS for one responsive PWA.
- Supabase Auth, PostgreSQL, RLS, and Realtime for shared persistent data (M1 and M5).
- Google Maps JavaScript, Places API (New), and Routes API for online map workflows (M3).
- Personal GPS, ETA, and camera state remain separate from shared itinerary state (M6).

## Logical boundaries

### Presentation (`src/app/`, future `src/components/`)
Responsive desktop planner and mobile map-first route/drawer. Views must not directly assume billing-enabled provider access.

### Domain (`src/domain/` planned)
Trip, membership, stop, transport leg, calendar event, shared navigation, progress, and personal session contracts.

### Data access (`src/server/` planned)
Authenticated trip reads, validated commands, transactional progress, and policy-safe access to Supabase.

### Map services (`src/services/maps/` planned)
Provider-neutral adapters for place search/details, route previews, map display and navigation guidance. Google interfaces must comply with usage and storage terms.

### Realtime (`src/services/realtime/` planned)
Post-commit shared state notifications. Database state is authoritative; messages are signals to refresh/reconcile.

## No integrations implemented in M0

Only the project structure and a local-only static status UI exist. Planned paths above are architecture, not created or active services.

## PWA caveats

The web manifest/icons establish metadata, not offline readiness. No service worker is registered in M0. Real offline routing needs a separate appropriately licensed PWA-compatible provider and feasibility study.

## Future storage concepts

`profiles`, `trips`, `trip_members`, `trip_invitations`, `trip_sections`, `stops`, `transport_legs`, `calendar_events`, `trip_navigation`, `activity_events`, and `personal_nav_sessions` are conceptual tables; no database or migration is installed in M0.
