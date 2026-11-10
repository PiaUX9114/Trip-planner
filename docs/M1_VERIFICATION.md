# M1 local verification notes

## Included increment

- Next.js App Router email/password signup + sign-in + sign-out.
- Supabase SSR cookie clients and a Next.js 16 `proxy.ts` for token refresh.
- Email-token confirmation route.
- Protected trip dashboard, create-trip form, and trip detail placeholder.
- SQL migration with trip / membership RLS and atomic owner creation RPC.
- A Mac + existing Codespaces runbook.

## Verification levels

1. `npm run test`: dependency-free file/contract checks (executed in this packaging environment).
2. `npm run lint`, `npm run typecheck`, `npm run build`: require installed npm dependencies, **not available** in this environment.
3. Database migration, live signup, login, RLS and ownership tests: require developer-run Supabase setup; **not executed** here.

Do not interpret a passing structural test as proof of running authentication, migration correctness, or security. Before user-facing rollout, perform multi-account RLS tests and security review.
