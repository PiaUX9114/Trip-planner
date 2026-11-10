# Milestone M0 - Setup and Handoff

## Deliverables created

- [x] App Router + TypeScript project structure.
- [x] Tailwind v4 / PostCSS configuration.
- [x] ESLint flat config and npm quality scripts.
- [x] Static foundation status UI.
- [x] Web manifest and placeholder 192/512/maskable icons.
- [x] Local-only public health endpoint with no secrets.
- [x] Empty environment template and credential ignore patterns.
- [x] Security and architecture decisions.
- [x] Dependency-free structural tests.
- [ ] Dependency installation and full Next.js build (npm registry unavailable in authoring environment).
- [ ] Lockfile generation and verification (requires successful npm install).
- [ ] Supabase and Google Cloud configuration (NOT authorized; no cloud resources created).
- [ ] Deployment (NOT authorized).

## Steps for next connected local development machine

1. Review the Node.js version; use Node 22+.
2. Run `npm install` intentionally; inspect audit output and generated lockfile.
3. Copy `.env.example` to `.env.local` with all variables blank for M0.
4. Run `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`.
5. Run `npm run dev`; verify the status page at `http://localhost:3000`.
6. Inspect `/manifest.webmanifest`, icon URLs, and `/api/health`.
7. Confirm `.env.local` is excluded from version control (`git check-ignore .env.local`).
8. Review browser console and check the page at mobile/desktop widths.
9. Commit `package-lock.json` to lock dependency versions after successful install.

## M0 completion gate

M0 can be marked technically verified only after installation, lint, type-check, test, and production build all pass in a network-enabled environment. No Supabase or Google Maps service use is needed for this gate.

## M1 preconditions and explicit approvals

- Decide development/staging Supabase environment ownership and cost ceiling.
- Approve creating/connectable cloud projects before configuration.
- Review trip/member schema, RLS policies, transaction approach, invitations.
- Define migration and backup strategy before production data.
- Avoid including privileged/service-role credentials in browser bundles.

## MVP sequence

M0 foundation > M1 accounts/trips/RLS > M2 itinerary > M3 Maps/Routes > M4 calendar > M5 collaboration/progress > M6 mobile guidance > M7 validation.

## Known limitations

- No npm packages bundled and no package lock yet due network restriction.
- PWA manifest/icons are present, but no service worker/offline caching is implemented.
- No live API/client integration is initialized.
- No application functionality is implied by the static roadmap screen.
- Project security depends on implementing RLS and protected endpoints in M1.
