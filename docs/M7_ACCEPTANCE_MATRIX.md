# M7 — Release acceptance matrix

Use a **staging deployment** and fake trips only. Never load test public OpenStreetMap/Nominatim/OSRM demo infrastructure. Mark evidence (screenshot or ticket) and reviewer next to every case.

| ID | Test | Pass criteria |
| --- | --- | --- |
| A1 | CI checkout with `npm ci` | `package-lock.json` committed, clean CI test/lint/typecheck/build |
| A2 | Local production build | `npm run check`, `npm run build`, `npm run m7:preflight` finish; review warnings |
| A3 | Secrets | Git excludes `.env.local` and privileged keys; neither build logs nor browser JS contains secrets |
| A4 | Login/confirm | New user signup, confirmation email, sign-in, sign-out, recover, errors on production domain |
| A5 | User separation | Outsider and anonymous requests cannot read another trip/stop/pin/member/invite |
| A6 | Viewer restriction | Viewer can view but cannot add, edit, delete, reassign, invite, revoke or change roles |
| A7 | Editor restriction | Editor can edit stops/calendar/pins but cannot manage members or owner settings |
| A8 | Owner | Owner can invite/revoke/change roles/remove others; sole Owner cannot be deleted/demoted |
| A9 | Invite cases | Email-specific confirmed recipient, share links, revoked/expired/max-use, wrong email and replay |
| A10 | Itinerary | Add/move/edit/delete stops; stable ordering; persist after reload, multiple timezones |
| A11 | Calendar | Trip Days and Hourly Week agree and persist across refresh and across another collaborator |
| A12 | Maps | Pin/unpin correct address; trip stops align with pins; errors on unavailable provider |
| A13 | Navigation | Directions on day with 2+ pins, GPS opt-in/Stop/tab hide, poor GPS, no road/route error |
| A14 | Service safety | In production, public demo map/search/route APIs return 503 until production replacements are approved |
| A15 | Device testing | Safari macOS/iOS and Chrome Android/desktop; 320px+ layout, keyboard, screen reader, color contrast |
| A16 | PWA | Manifest/icons/installability/HTTPS; verify no claim of offline navigation/offline tile downloads |
| A17 | Error resilience | HTTP 400/401/403/404/422/429/503, offline/slow requests, aborted GPS/navigation, session expiry |
| A18 | Mail links | Supabase Site URL + redirect allowlist correct; fresh confirmation and invited friend flows |
| A19 | Security response | Headers, CSRF trusted origins, XSS review, SSL, RLS advisor, database grants, CAPTCHA/rate limit |
| A20 | Ops | Logs have no sensitive tokens/GPS, quota/billing alerts, liveness monitoring, backup restore, rollback rehearsal |
| A21 | Privacy and legal | Published accurate privacy notice/terms, operator contact, retention/deletion request processes |
| A22 | Launch gate | `npm run m7:release-gate` passes only after demo integrations removed and site HTTPS origin configured; human signs GO |

**Evidence template:** ID | test date | tester | pass/fail | evidence link | ticket/owner | retest date.

**Release rollback:** maintain last known-good deployment build/commit, keep migrations additive whenever possible, and validate restore process on a non-production copy. Do not assume redeploying code reverses database data or schema changes.
