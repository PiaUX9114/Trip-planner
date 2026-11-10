# Trip Planner M7 — Public launch readiness (not yet a public launch)

M7 adds a safe release checklist, build/CI automation, a liveness endpoint and a **fail-closed production guard** for the free public geocoding/routing demo services used in M3/M6. It intentionally does **not** turn on public hosting, paid plans, SMTP, production database access, or public navigation. No new Supabase migration is required.

## Install on your working M6 Codespace

1. Save a Git commit/restore point for M6 before applying the update.
2. Upload `trip-planner-m7-release-readiness.zip` beside your **main project** `package.json` (the project folder that contains `src`, not a nested milestone folder).
3. In that root directory run:

   ```sh
   unzip -q -o trip-planner-m7-release-readiness.zip
   node scripts/m7-install.mjs
   npm run check
   npm run build
   npm run m7:preflight
   ```

   The ZIP has **root-relative** paths. No `cp` is needed. It does not include `.env.local`, `next.config.mjs`, `src/app/auth/actions.ts`, database migrations, or trip page/map components. The installer makes small, idempotent patches to the **three existing map/routing API routes**, `package.json`, `.gitignore`, and the historical M1 environment test if it is still present.
4. If you need to restart development, stop the old process with Control+C, then use `npm run dev` on the single port 3000 server.

## What M7 contains

- `.github/workflows/ci.yml`: GitHub Actions Node 22 workflow: install from lockfile, test, lint, typecheck, build; **no deploy**.
- `.github/dependabot.yml`: weekly dependency update PRs.
- `scripts/m7-install.mjs`: idempotent root install; also repairs the old test that incorrectly rejected a local `.env.local` file. It does not delete your credentials.
- `scripts/m7-preflight.mjs`: offline checks that never print configuration values. In `--production` mode it rejects known launch blockers.
- `src/lib/map/release-policy.ts` and route patches: block calls to Nominatim and OSRM public demo servers in `NODE_ENV=production`. Developer mode retains the existing manual workflows.
- `/api/health`: low-information public liveness check (`status`, `service`, and release label, no keys/database contents).
- Release, security/privacy, and acceptance checklists under `docs/`.

## Commands

```sh
npm run m7:verify       # check + build + preflight
npm run m7:preflight    # descriptive local review; known blockers are reported
npm run m7:release-gate # strict production blocker check; NOT expected to pass yet
```

**Important distinction:** Passing `npm run check` and `npm run build` validates source/build only. It does **not** verify actual RLS isolation, GPS accuracy, provider licensing, email deliverability, backup restoration or a public deployment. A production-mode build may succeed while the three demo map/routing APIs intentionally return HTTP 503.

## Public hosting proposal

Use **GitHub repository + Vercel for the Next.js web app + Supabase for Auth/Postgres**. GitHub Codespaces stays your development environment, **not** the hosting solution. Vercel Hobby is for personal/noncommercial use; check eligibility and current plan terms before choosing a plan. A domain is optional for a test deployment; public traffic needs provider/operational review.

1. Commit **source + `package-lock.json`**, excluding local `.env.*` files, test ZIPs and credentials. Protect the main branch and require passing CI.
2. Connect your repository to Vercel; select **Next.js**, root directory, Node.js 22, and build command `npm run build`. Do not enable production deployment until the launch gate is cleared. Keep preview/test deployment access restricted if your hosting plan supports it.
3. Configure **Production** environment variables in the hosting dashboard: `NEXT_PUBLIC_SUPABASE_URL` (project root, no `/rest/v1`), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public/publishable key only), and `NEXT_PUBLIC_SITE_URL` (actual HTTPS website origin). Do not add a service role/secret key to the browser. Configure each environment separately; public variables are bundled at build time.
4. In Supabase **Authentication → URL Configuration**, set the Site URL to the final HTTPS origin and add exact allowed redirect URLs; do not leave the production Site URL set to localhost or Codespaces. Validate confirmation/sign-in/invites in a clean browser.
5. Do not direct public users to the app until you have production-grade place-search/routing providers, shared quota and abuse controls, a reviewed privacy notice, support/contact details, email delivery, security/RLS testing and operational monitoring. The public OSM tiles also need an explicit usage assessment.
6. When ready, create a release tag, deploy a tested commit, run smoke tests, and rehearse rollback.

**Next reading:** `docs/M7_PUBLIC_LAUNCH_RUNBOOK.md`, `docs/M7_SECURITY_AND_PRIVACY.md` and `docs/M7_ACCEPTANCE_MATRIX.md`.

## Source references (revalidate before launch)

- Next.js production checklist: https://nextjs.org/docs/app/guides/production-checklist
- Next.js Server Actions trusted origins: https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
- Supabase deployment checklist: https://supabase.com/docs/guides/deployment/going-into-prod
- Supabase Auth redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Vercel project/settings/variables: https://vercel.com/docs/project-configuration/project-settings
- Vercel Hobby plan commercial-use restriction: https://vercel.com/docs/plans/hobby
- OSM tiles: https://operations.osmfoundation.org/policies/tiles/
- Public Nominatim: https://operations.osmfoundation.org/policies/nominatim/
