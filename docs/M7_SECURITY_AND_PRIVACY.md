# M7 — Security, privacy and data handling review

This is an engineering review checklist, **not** a finished legal privacy notice or a security audit. Confirm implementation against actual deployment and policy requirements before inviting public users.

## Assets and trust boundaries

- User account sessions, confirmation links and password-reset flow: Supabase Auth via server-side cookie sessions; sensitive cookies must not be logged or sent to third parties.
- Private trip details, dates, itinerary stops and pin coordinates: Supabase tables with RLS; check table policies and all SECURITY DEFINER RPCs with multiple accounts.
- Invitation URLs: bearer secrets. The M5 database stores SHA-256 hashes; **the link itself remains sensitive**. Short expiry, revocation and role constraints need adversarial tests. Do not include tokens in analytics/referrer URLs or support screenshots. Invitation page specifies `referrer: 'no-referrer'`; verify deployed headers and external link behavior.
- Precise GPS: browser watch after user permission only. M6 clears position on tab hide or Stop; live-start coordinates are sent to OSRM only on an explicit route request. Location is not written to Supabase by M6. Verify SDKs, logs, host/CDN and map tile requests for any incidental disclosure.
- Operational secrets: keep privileged Supabase admin keys and routing provider keys server-only; never place them in `NEXT_PUBLIC_*` or Git. Existing Supabase publishable key is expected to be public but relies on robust RLS.

## Production threat review

| Threat | Mitigation / test |
| --- | --- |
| Broken object-level authorization | Direct API/RPC calls across Owner/Editor/Viewer/Outsider identities; inspect RLS and SECURITY DEFINER grants |
| Privilege escalation via invite/role APIs | Use owner-only functions; confirmed-email checks; no owner demotion; expired/used/revoked token handling |
| Invitation-token leak in URLs/logs | Avoid third-party analytics on invite pages, safe referrer policy, short TTL, revoke, exclude tokens from logs |
| Signup abuse and email exhaustion | Supabase rate limits, CAPTCHA, anti-automation, SMTP monitoring, email verification |
| Routing/geocoding provider abuse and cost blowups | Production provider terms, central rate limiting, per-user quotas, budget/alerts, timeouts and caching |
| GPS privacy and navigation safety | Consent prompt; foreground-only collection; no background storage; third-party disclosure; safety notice and offline/error states |
| XSS/CSRF/clickjacking | React escapes text; no unsafe HTML; Next Server Actions same-origin checks; review trustedOrigins; test response headers and forms |
| Account compromise | MFA for project administrators, least privilege, user-session invalidation, password recovery |
| Data loss | Database backup and tested restoration, documented deletion/retention, migrations with review |
| Availability | Provider outage/error handling, uptime checks, slow connection tests, rollback plan, incident contact |

## Privacy notice draft inputs (complete before publishing)

1. Operator/legal entity name and contact address: **[TO BE PROVIDED]**.
2. What data is collected: email and authentication records; trips, members, scheduled stops, addresses/pins and invitations; approximate request/log metadata; optional foreground GPS while enabled.
3. Why/how data is used: account access, collaborative trip planning, geocoding/routing and diagnostics; clarify actual legal basis where applicable.
4. Processors and geography: Supabase hosting/Auth, deployment/CDN provider, map tile host, geocoding/routing provider, email delivery provider; actual vendor list depends on final deployment.
5. GPS and third-party services: route endpoints may send selected stop coordinates, and an explicitly requested live GPS start to routing provider; map tiles disclose viewport/network requests to tile provider. Verify provider retention policies.
6. Cookies and analytics: session cookies for auth; document whether any additional analytics/telemetry/cookies are enabled in production.
7. Retention and deletion: **[DEFINE AND IMPLEMENT]**. The app currently lacks a demonstrated self-service account and trip data deletion/export workflow; address before launch.
8. Security, rights, complaints, age/minor policies and jurisdictions: **[TO BE REVIEWED]** with qualified policy/legal input as appropriate.

Do **not** simply publish the above draft as a legal notice. It contains unresolved placeholders and requires confirmation against production architecture.
