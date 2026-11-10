# M7 — Public launch runbook (GO/NO-GO)

**Current status: NO-GO for unrestricted public traffic.** M1–M6 are development/test milestones. Building successfully on Codespaces does not establish production security or third-party-service suitability. Do not pay for hosting or deploy publicly until you approve that action.

## Recommended topology

```
Visitor browser over HTTPS
  |-- Next.js 16 app on hosting service (example: Vercel)
  |     |-- Supabase SSR Auth + database (existing project's RLS)
  |     |-- /api/maps/search -> production-capable geocoder [NOT YET]
  |     |-- /api/maps/route + /api/navigation/route -> production router [NOT YET]
  |-- map tiles -> licensed/allowed OSM-derived tile service [VERIFY]
```

Development: Mac -> GitHub Codespaces -> Supabase. Public: visitor -> HTTPS hosting -> Supabase. **Codespaces forwarded URLs are not production domains** and may require GitHub authentication. Supabase Free and Vercel Hobby have limits and eligibility restrictions; costs and plan limits can change.

## Stage A — Source control and automated checks

1. From the Codespace main root, run `npm run m7:verify` and address every error. Run `npm audit --omit=dev` and review severity; track remediation and dependency patching. Compare Next.js, React, Supabase and Leaflet versions to current security advisories before deployment.
2. Ensure `package-lock.json` is committed and corresponds to `package.json`. Verify `git ls-files -- .env .env.local .env.production` prints **nothing**; never paste credentials in GitHub issues or chats.
3. Run `git status`, inspect **every** pending addition, and only then commit. Extracted milestone directories and ZIPs must not be tracked. Protect `main` and require the CI workflow.
4. Add branch protection and review GitHub Actions permissions. CI deliberately does not connect to Supabase or deploy; integration tests need separate isolated test users and a non-production database.

## Stage B — External service replacements (hard blocker)

1. `/api/maps/search` still targets the public Nominatim demo; `/api/maps/route` and `/api/navigation/route` still target `router.project-osrm.org`. These are development-oriented shared endpoints without app-specific production SLAs/quotas. M7 makes them respond **503 in production** until replaced.
2. Select a geocoding provider and a routing provider with explicit public-application permissions and expected traffic capacity. Options: licensed OSM-based SaaS (check current free allowances/terms) or managed/self-hosted services. Do **not** simply remove the M7 production guard.
3. Introduce configurable server-side provider endpoints, secret handling, shared/distributed rate limits (not an in-memory Map per serverless instance), bounded retries/timeouts, observability, and cost caps. Preserve member authorization before provider requests. Re-test live-GPS-to-third-party privacy disclosures.
4. Assess `tile.openstreetmap.org` interactive tile usage, attribution, request identification, cache behavior and projected traffic. Consider an OSM-derived tile host if public traffic is meaningful. **Do not prefetch/offline-download the public tiles.**
5. Document service outage behavior and remove any text implying certified turn-by-turn safety or guaranteed road accuracy.

## Stage C — Supabase production readiness (hard blocker)

1. Prefer separate staging and production projects and apply M1–M5 migrations in order **once** to the intended database; inspect RLS/SECURITY DEFINER grants, use least privilege, and ensure all trip tables and any replicated tables have appropriate RLS.
2. Test with **three authenticated accounts** and one anonymous visitor: Owner, Editor, Viewer, Outsider. Verify anonymous/outsider cannot read/modify another trip via browser or direct REST/RPC; Viewer cannot write; Editor cannot invite/change roles; Owner cannot lose sole-owner status; revoked/expired invites fail; email-specific links only work for matching confirmed email.
3. Run Supabase **Security Advisor** and **Performance Advisor**; review SSL enforcement, network restrictions, MFA/2FA for admins, unused credentials, confirmation expiry, Auth rate limits, CAPTCHA/abuse protection, realtime publication permissions and backups.
4. Verify account recovery, invite redemption, email confirmation and sign-out across devices. Configure a suitable **custom SMTP** service for production delivery and monitor failed messages; the free/default email service is rate limited. Do not require an email-template editing upgrade merely to deploy—the default confirmation flow can work when Site URL is correct, but must be tested.
5. Define retention, deletion, user-export/support processes, backups and a tested restore. Production data must not be casually copied into Codespaces/dev databases.

## Stage D — Hosting and domain (requires explicit approval)

1. Push an approved, fully reviewed commit to a GitHub repository. Consider Vercel for managed Next.js hosting; choose a plan permitted for your use case. **Vercel Hobby is restricted to non-commercial personal projects**; verify fees before selecting a paid plan. Alternatives can host Node.js 22/Next.js with equivalent environment and TLS controls.
2. Import GitHub repo in hosting dashboard; root dir `.`; framework Next.js; Node.js 22; install `npm ci`; build `npm run build`. Arrange preview access protection where available. Use the app host's generated HTTPS subdomain first; a paid domain is optional.
3. Set environment variables by environment (Production vs Preview):
   - `NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...` (not secret/service role)
   - `NEXT_PUBLIC_SITE_URL=https://<your-production-domain>`
   - Any future *server-only* map provider credentials, after provider replacement; never prefix these with `NEXT_PUBLIC_`.
4. Supabase → Authentication → URL Configuration: Site URL must equal production origin; add production callback paths/allowed redirects and exact approved staging/preview origins. Avoid broad `**` for production if not needed. Confirm default email links and M5 invite links use your actual HTTPS domain.
5. Review `next.config.mjs` `serverActions.allowedOrigins` from your Codespaces workaround. Remove stale Codespaces hosts if not needed, and never allow `*`; Next.js normally accepts same-origin automatically. Test forms behind production proxy with CSRF protections intact.
6. HTTPS, security headers, `robots` visibility, PWA manifest/installability, geolocation prompts, privacy and terms URLs, public support contact, and logs/monitoring must be reviewed on the final domain. The existing root metadata marks the app `noindex`, so SEO indexing is not enabled automatically.

## Stage E — Launch, monitoring, rollback

1. Freeze an approved release tag and run the complete `docs/M7_ACCEPTANCE_MATRIX.md` in an isolated staging deployment. Conduct limited load tests **against your own deployment/providers**, never the public OSRM/Nominatim demo endpoints.
2. Run `NEXT_PUBLIC_SITE_URL=https://your-domain.example npm run m7:release-gate`. It will **fail until demo provider code is replaced**, as intended. Passing later is only an automated prerequisite, not final approval.
3. Set up error reporting with no raw location fixes, passwords, invitation tokens or email verification links in logs. Add uptime checks to `/api/health` (liveness only; it does not verify DB/provider health) and monitor auth/route errors, quotas and billing alarms.
4. Publish reviewed privacy notice and terms with truthful data flow and contact/deletion processes. Secure domain and administrator accounts with MFA.
5. Deploy the release only after explicit business/operator approval. Verify with a small closed group, then open access gradually. Have a rollback command/process and a tested backup/restore runbook; if DB schema changes are added later, roll back data changes carefully (not by arbitrary down migrations).

## GO/NO-GO record

| Gate | Current state |
| --- | --- |
| M1–M6 exercised in Codespaces | User-reported yes; independent public deployment testing not performed |
| Source tests + Next.js production build | Must rerun after M7 installation on your Codespace |
| Public search/routing provider with quotas | **NO-GO: demo integrations** |
| Production distributed rate limiting | **NO-GO: in-memory dev limiter** |
| Public tile license/operational review | Pending |
| Supabase RLS adversarial tests, backup recovery | Pending |
| Auth production SMTP and redirect verification | Pending |
| Privacy/terms, deletion/support, monitoring | Pending |
| Hosting/domain plan & cost approval | Pending |
| Public launch authorization | Not given |

Official references:
https://supabase.com/docs/guides/deployment/going-into-prod
https://supabase.com/docs/guides/security/production-checklist
https://supabase.com/docs/guides/auth/redirect-urls
https://vercel.com/docs/plans/hobby
https://vercel.com/docs/project-configuration/project-settings
https://operations.osmfoundation.org/policies/nominatim/
https://operations.osmfoundation.org/policies/tiles/
