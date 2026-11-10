# Architecture Decision Record - M0

## ADR-001: Next.js App Router with TypeScript
Status: Accepted. One responsive web-first installable PWA. Client-only code is reserved for maps/GPS and interactions.

## ADR-002: Tailwind v4
Status: Accepted. Minimal blue/white/gray design system; no external font downloads in M0.

## ADR-003: Supabase planned, not connected
Status: Accepted. PostgreSQL, RLS, authentication, and realtime to be integrated in later authorized milestones.

## ADR-004: Google Maps Platform planned, not connected
Status: Accepted. Browser Maps key and server service key will be handled separately. No billable calls in M0.

## ADR-005: Provider-neutral routing boundary
Status: Accepted. Offline routing remains a separate future capability; do not couple the entire app to permanent caching of Google route content.

## ADR-006: No secrets, cloud accounts, or deployment in M0
Status: Accepted. Only empty environment templates, local files, and no provider initialization.

## ADR-007: Dependency verification pending
Status: Open. npm registry DNS failed in the authoring environment. First connected machine must install, create lockfile, lint, typecheck, test, and build before technical M0 signoff.
