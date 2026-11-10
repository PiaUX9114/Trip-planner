# M7 — Privacy pages, terms, and deletion-request intake

Public support/privacy email: **mariaplg@icloud.com** (visible to every site visitor).

## What this update does

- `/privacy` — privacy notice draft consistent with the current app's architecture.
- `/terms` — terms draft including collaboration and navigation safety.
- `/account` — signed-in account page; users can submit **one pending deletion request**.
- Links from the global footer, signup page, and My Trips dashboard.
- Supabase migration with a narrowly scoped RLS table; no elevated RPC needed.

**This is not an immediate self-service account-deletion feature.** The request is recorded in the Supabase database for manual review. No emails/notifications are sent automatically and no records are deleted upon submission. The operator must check the request queue and respond to users.

## Install in Codespaces

1. Upload `trip-planner-m7-privacy-account.zip` alongside `package.json`.
2. From the project root run:

   ```bash
   unzip -q -o trip-planner-m7-privacy-account.zip
   npm run check
   npm run build
   ```

   This is a root-relative overlay ZIP. **No `cp` step** and **no extra extracted folder** are required. It contains no secret credentials, and it preserves `.env.local`.
3. Review `supabase/migrations/202611100003_m7_deletion_requests.sql`, then apply it **once** through Supabase SQL Editor in the intended project.
4. Restart `npm run dev`; check `/privacy`, `/terms`, and signed-in `/account`.
5. Test with two separate accounts: account A requests deletion; it can see its own pending request; account B cannot see A's request, edit its status, or submit an A request. Verify anonymous calls cannot read/write the table.
6. Commit and push the change. Check the protected Vercel deployment after GitHub Actions finishes.

## Operational processing checklist (manual)

1. Check the new table regularly using an admin-only Supabase SQL Editor query:

   ```sql
   select r.user_id, u.email, r.requested_at, r.status
   from public.account_deletion_requests r
   join auth.users u on u.id = r.user_id
   order by r.requested_at asc;
   ```

   This query exposes private information **only to the trusted database administrator**. Never expose the result to a public webpage or log.
2. Contact the requester using a verified channel; confirm whether they want deletion, an export, or correction. Document and follow any legally required response deadlines before public launch.
3. Review all `public.trips.owner_id` records; the FK uses `on delete restrict`. Deleting an Owner account without resolving owned trips will fail. Choose a reviewed ownership-transfer procedure or delete affected trips **after warning collaborators**. Deleting an owned trip deletes its stops, memberships, and invitations because of foreign-key cascades.
4. Review `public.trip_invitations.created_by` records; this FK also uses `on delete restrict`, including invitations for trips the requester does not own. Revoke/remove affected invitations with appropriate owner coordination before removing the Auth user.
5. Consider shared itinerary content created by the departing person, external provider logs, backups, and legally required retention. These are not automatically purged by the code in this update.
6. After authorizing the deletion, delete the Auth user through Supabase's trusted administrative workflow; do not use the project's secret key in a browser. Verify cleanup in related tables and consider existing JWT expiry. A deleted user may retain an already-issued access token until it expires.
7. Contact the requester once the process is completed or explain any retention exceptions. Do **not** promise completion just because the request row has been inserted.

## Public-launch legal/content gates

- **Confirm the operator's legal name, location/jurisdiction, and who responds to requests.** Only the public contact email is known so far.
- Have the privacy and terms drafts reviewed by a qualified advisor for intended jurisdictions and the service's actual provider configuration; no legal compliance certification is implied.
- Verify actual log/backup retention periods at Vercel, Supabase, Geoapify, and email provider; amend the notice with accurate figures and legal grounds if required.
- Test the deletion request procedure end to end with a disposable test user and a test trip (including invitations); confirm account access removal and the treatment of shared content.
- Set a monitored inbox and a recurring queue review; no automatic notification is implemented.
- Check public navigation disclaimers, emergency usage, data-sharing claims, age rules, and consent/acceptance requirements.
- The homepage still contains historical M1 placeholder messaging in the reconstructed development baseline. Refresh that text before public release.
- Keep Vercel Authentication enabled until all gates are satisfied.

## SQL security notes

`public.account_deletion_requests` is readable and insertable only by its owning authenticated user. Only the `user_id` column is insertable; RLS matches it to `auth.uid()`. Users cannot update or delete requests, and the table has no public/anonymous grants. Actual account deletion remains an admin operation outside exposed app routes.

No new server-only secrets or npm packages are required.
