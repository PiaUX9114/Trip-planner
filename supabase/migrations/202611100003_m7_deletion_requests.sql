-- M7: Self-service ACCOUNT DELETION REQUEST intake (not destructive deletion).
-- Review in the development project and apply exactly once.
-- Existing trips.owner_id and trip_invitations.created_by use ON DELETE RESTRICT;
-- manual review is required before deleting any auth.users record.

create table public.account_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'in_review'))
);

create index account_deletion_requests_requested_at_idx
  on public.account_deletion_requests (requested_at desc);

alter table public.account_deletion_requests enable row level security;

-- A signed-in user may request deletion only for their own account.
create policy deletion_requests_select_self on public.account_deletion_requests
  for select to authenticated using (user_id = (select auth.uid()));

create policy deletion_requests_insert_self on public.account_deletion_requests
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');

-- Require both grants and RLS. Clients may not change status or delete requests.
revoke all on table public.account_deletion_requests from public, anon, authenticated;
grant select (user_id, requested_at, status) on public.account_deletion_requests to authenticated;
grant insert (user_id) on public.account_deletion_requests to authenticated;

comment on table public.account_deletion_requests is
  'Authenticated user-initiated deletion requests; processed manually after reviewing shared trips. Not an automatic deletion system.';
