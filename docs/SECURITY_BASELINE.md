# Security Baseline - Trip Planner M0

## Never expose secrets

- Browser values (`NEXT_PUBLIC_*`) are public by design.
- Browser Google Maps keys are not secrets; restrict by allowed referrers AND APIs.
- Google Routes / Places server-side keys must not be bundled into the browser.
- Supabase service_role / secret keys must never be exposed client-side.
- Do not log credentials, tokens, GPS positions, or private itinerary fields.
- Keep `.env.local` and credentials out of Git and downloadable archives.

## Auth and authorization gates for M1

- Supabase Auth provides identity; never trust a submitted user ID or role.
- RLS must limit trip reads to active members.
- Owner/Editor can mutate shared trip data; Viewer cannot.
- Only Owner can manage membership and ownership.
- Trip joins and linked stop/event/transport data must be verified to be in the same trip.
- Private navigation sessions and GPS data may be accessed only by the same account.
- Realtime authorization must follow the same membership and privacy boundaries.
- Membership removal revokes subsequent access.
- Progress changes must use single atomic, idempotent server-side operations.

## M0 safe local operation

- No Supabase client or Google Maps SDK is initialized.
- No paid provider calls exist in this scaffold.
- `/api/health` exposes only hardcoded nonsecret M0 status.
- `robots` metadata disables indexing for the scaffold; this does not secure it.
- Security headers are a baseline, not a substitute for authentication or CSP review.
- Local HTTP on localhost is for development only; deployment requires HTTPS.

## Before deployment (separate approval required)

- Verify all RLS grants and policies via automated negative tests.
- Add CSRF/replay/abuse protections as appropriate to mutations and invitations.
- Review Google Maps Platform terms and caching limits.
- Add restrictive Content Security Policy compatible with the chosen integrations.
- Add rate limits for expensive endpoints and email/invitation abuse.
- Set API budgets and alerts and restrict all keys.
- Validate error logging, backup strategy, and access revocation.
