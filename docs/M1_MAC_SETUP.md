# M1 setup from a Mac — safe local development

This package is a **local source-code increment**, not a deployment. No cloud changes occur unless you deliberately run the SQL migration against your Supabase project. It does not contain or need your password, database password, Google key, or secret key.

## A. Bring the new M1 files into your existing Codespace

1. Download `trip-planner-m1.zip` on your Mac.
2. Open the **GitHub Codespaces** editor for your existing `trip-planner` repository in Chrome or Safari.
3. Upload `trip-planner-m1.zip` into the project root using Explorer (or drag the file into its Explorer area).
4. In the Codespaces terminal, while inside the project directory containing `package.json`, run:

   ```bash
   unzip -q trip-planner-m1.zip
   cp -R trip-planner-m1/. .
   rm -rf trip-planner-m1 trip-planner-m1.zip
   npm install
   npm run check
   npm run dev
   ```

   IMPORTANT: The archive has **no `.env.local`**. Your existing local credentials file is not replaced. Before copying, you can inspect changes with `diff -qr . trip-planner-m1` (this will also show harmless generated files). Don't run `git clean -fdx` or force-reset your repository.

5. Open the Codespaces forwarded **port 3000** preview. You should see the new M1 landing page.

If `npm run check` fails, stop and review the error rather than starting database configuration.

## B. Verify your local environment file

Your project-root `.env.local` should contain only the following **public** Supabase client values for this milestone:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

- Copy these values privately from your Supabase dashboard.
- Never paste them into ChatGPT, screenshots, or a GitHub issue.
- Never put a `sb_secret_...`, service-role key, or database password into `NEXT_PUBLIC_` variables.
- Keep `.env.local` uncommitted. It is ignored by the provided `.gitignore`.
- Restart the Next.js server after changes to `.env.local`.

## C. Apply database migration (requires your explicit action)

This changes your **Supabase cloud database**, though the normal free project does not require paid services. Review first.

1. Open your Supabase project dashboard.
2. Navigate to **SQL Editor**.
3. Read `supabase/migrations/202611090001_m1_trips_and_members.sql` in Codespaces.
4. Copy its contents into the SQL Editor and execute **once**, only after you are satisfied with the schema and policies.
5. Refresh `/trips` in the Codespaces preview. If you skip the migration, the app will show a safe database-not-ready message.

The migration creates `trips`, `trip_members`, RLS policies, helper functions, and a secure `create_trip` RPC. It does **not** create users, alter auth settings, turn on any paid service, or deploy the app. Do not execute it against production without review and backups. For the free development project, verify the intended project is selected.

## D. Set up email confirmation for the Codespaces preview

In Supabase **Authentication → URL Configuration**, set the **Site URL** to your forwarded Codespaces HTTPS preview URL for port 3000, e.g. `https://YOUR-CODESPACE-3000.app.github.dev` (use your actual URL). Add the same exact URL to the redirect allow list if prompted.

In **Authentication → Email Templates → Confirm signup**, edit the confirmation link to point to the app's secure OTP verification handler:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
```

This is a template configuration, not code execution. Supabase's default email confirmation template may otherwise return a callback the server cannot exchange into cookie auth. Built-in email delivery has rate limits: do not repeatedly create test accounts. For development without a public deployed URL, Codespaces port access may need to be compatible with the emailed browser session. Never make a Codespaces port public to work around auth without understanding the exposure.

## E. Safe manual checks

1. Visit `/login`, create a test account, confirm email if required.
2. Sign in and visit `/trips`.
3. Create a trip with dates and a time zone; verify it appears on the dashboard.
4. Sign out and sign back in; the trip should still appear.
5. Directly visit `/trips/<random-valid-uuid>`; it should return a not-found screen.
6. In the Supabase Table Editor, verify one trip and one Owner membership were created.

**Authorization hardening before inviting anyone:** A second test account must be unable to read or modify the first account's trip, and Viewers must be unable to write. Invitations are not implemented in this increment, so role-change testing requires a later controlled fixture.

## F. Current implementation boundaries

- Implemented locally: email/password auth UI/actions, email confirmation callback, protected trip dashboard, secure trip creation RPC, owner membership, read-only trip detail placeholder, RLS definitions.
- Not implemented: trip invitation UI/email, role-management operations, stop editing, Maps, Places, Routes, navigation, realtime subscriptions, offline routing.
- This project has **not** been deployed or linked to any cloud account by this package alone.
- This environment could not access npm, so a Next.js build and live Supabase tests have NOT been verified here. Run them in Codespaces and review the output.
