# Trip Planner M5 — Collaboration (email invitations + shareable links)

This is an **incremental update** for your working M4 Codespaces project. It is not a standalone Next.js app. It does not replace your existing Supabase configuration, email confirmation settings, maps, calendar, sign-in code, or Next.js origin settings.

## What is included

- Owner-only invitations by **verified recipient email** or **shareable link**.
- Editor and Viewer invitation roles. A new member cannot become Owner through an invitation.
- Email invitations: one redemption, **only by the specific confirmed email address**, with a **7-day expiry**. Create a link, select **Open email app**, then **send it yourself** from the Mac email composer. **No automatic email delivery is included**; this deliberately avoids SMTP services, Supabase paid email template features, and service-role credentials.
- Shareable links: up to **10 distinct new members**, **7-day expiry**. Share privately using the **Copy link** button. Each traveler must log into Trip Planner with a confirmed email to join.
- New invitation links are shown **only when created**. Links cannot be recovered later; create a new one if needed.
- Owner can see invitation status, revoke links, change Editor/Viewer roles, and remove members. Owner cannot remove or demote themselves. Editors and Viewers can leave a trip.
- Both roles continue to see permitted itinerary, map, and calendar data through existing RLS. Editors may edit; Viewers are read-only.
- Shared changes refresh about **every 45 seconds** while a trip page is visible, and via a manual **Refresh shared updates** button. This is light polling, **not Supabase Realtime/push updates**.

## Install in the ROOT of your existing Codespaces repository

**Back up the working M4 version to GitHub before updating.** The existing M1–M4 SQL migrations must already be installed.

1. Download `trip-planner-m5-collaboration.zip` and upload it **beside `package.json`** in Codespaces.
2. Run these commands *from the main repository directory*:

   ```sh
   unzip -q -o trip-planner-m5-collaboration.zip
   npm run check
   npm run build
   ```

   **No `cp` command is needed.** All paths in the ZIP are already root-relative (`src/...`, `supabase/...`, `tests/...`). This ZIP does not create a duplicate nested project folder. The update does not contain `.env.local`, `next.config.mjs`, or `src/app/auth/actions.ts`.
3. In **Supabase → SQL Editor**, review and run **once** the file:

   `supabase/migrations/202611090005_m5_collaboration.sql`

   The migration adds one table and seven RPCs. It does not delete existing trips, stops, pins, or calendar events. It requires confirmed-email authentication for invited users.
4. Stop the previous dev server (`Control + C`) and run `npm run dev` once. Open the URL forwarded for port **3000**.
5. Open a trip and scroll to **Travel together**. As the Owner, create one email invitation and one shareable link, then try **Copy link** and **Open email app**.
6. Open an invitation in a second browser session signed in as a **different verified Trip Planner account**. Select **Accept invitation**, and confirm the shared trip appears under **My trips**. Try the invited Viewer account first; Viewer should be unable to edit stops. Have the Owner switch the member to Editor; refresh the invited session and verify editing becomes available.
7. Revoke a link and confirm it cannot be used by another user. Remove a member and verify the trip disappears from their dashboard after a refresh.

## Important limits and privacy

- **Codespaces port access**: private forwarded ports are usually only accessible to the Codespace owner. Other invitees may not be able to open your private Codespaces URL. Use a second browser session authorized to access the Codespace for development testing, or deploy the app to a secure HTTPS host before inviting other people. **Do not make an unfinished development port public by default.**
- Invitation URLs are bearer credentials. Share privately; they can appear in browser history or HTTP access logs. They expire after 7 days and may be revoked. Tokens are 32 random bytes and only a SHA-256 hash is stored in Postgres; raw tokens are never stored in the database. Keep logs private.
- If an invited person clicks the link before signing in, the invitation page opens the **Sign in / Create account** screen in a new tab. After signing in and confirming email, they should return to the invitation tab and refresh, then accept.
- Removing a member does not automatically revoke an invitation link they still possess. Revoke that link too if access must not be restored.
- Member email addresses are shown only to the trip Owner. Editor/Viewer accounts see member role and abbreviated ID.
- No automatic invitation emails, realtime database subscription, push notifications, owner transfer, or public deployment are implemented in M5.

## Security design

`public.trip_invitations` has RLS enabled and **no table grants** for browser roles. The M5 RPCs are `SECURITY DEFINER` with an empty `search_path` and explicit checks on `auth.uid()` and trip membership/ownership. Only Owners can create/revoke links or manage other members. Invitation redemption checks the signed-in user's **confirmed email** and, for email invitations, exact recipient match. Redemption holds a PostgreSQL row lock before incrementing the usage counter.

Only a publishable Supabase key is required in `.env.local`; no `service_role` or `sb_secret_` values should be in browser environment variables.

## Verification

M5 security-contract tests run with `npm run test`. The authoring environment can verify the source files and TypeScript syntax, but a complete `npm install`, Next.js production build, and two-account Supabase E2E test must run in Codespaces because the authoring environment has no npm registry access or credentials for your Supabase project.
