import Link from 'next/link';
import { requireUser } from '@/lib/supabase/require-user';
import { SUPPORT_EMAIL } from '@/lib/legal/site-info';
import { requestAccountDeletionAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Account & Deletion Requests | Trip Planner' };

const notices: Record<string, string> = {
  requested: 'Your deletion request has been recorded. It is pending manual review; your account has not been deleted.',
  'already-requested': 'You already have a deletion request on file.',
  confirm: 'Please confirm that you understand this is a request for review.',
  'request-error': 'The request could not be saved. Confirm that the M7 deletion-request migration is installed, or contact support.',
};

type RequestRow = { requested_at: string; status: 'pending' | 'in_review' };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { supabase, userId } = await requireUser();
  const params = await searchParams;
  const [{ data, error }, { count: ownedTripCount }] = await Promise.all([
    supabase.from('account_deletion_requests')
      .select('requested_at,status').eq('user_id', userId).maybeSingle(),
    supabase.from('trips').select('id', { head: true, count: 'exact' }).eq('owner_id', userId),
  ]);
  const existing = data as RequestRow | null;
  const notice = params.notice && notices[params.notice];

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 sm:py-16">
      <Link href="/trips" className="text-sm font-semibold text-blue-700 hover:underline">← My trips</Link>
      <h1 className="mt-7 text-3xl font-bold text-slate-900">Account & privacy</h1>
      <p className="mt-3 leading-7 text-slate-600">Manage requests relating to your Trip Planner account. For access, correction, or privacy questions, email <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-blue-700 underline">{SUPPORT_EMAIL}</a>.</p>
      {notice && <p role="status" className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{notice}</p>}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Request account deletion</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">Submitting a request does <strong>not</strong> immediately delete your account or trips. Support will need to review ownership, invitations, and shared content before taking irreversible steps.</p>
        {(ownedTripCount ?? 0) > 0 && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            You own {ownedTripCount} {ownedTripCount === 1 ? 'trip' : 'trips'}. These shared plans may need to be transferred or deleted, with consideration for collaborators, before your account can be removed.
          </p>
        )}
        {error ? (
          <div role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Account-deletion requests are not configured yet. Apply migration 202611100003 or contact support.
          </div>
        ) : existing ? (
          <div role="status" className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            Request {existing.status === 'in_review' ? 'under review' : 'pending'} since {new Date(existing.requested_at).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}.
            <p className="mt-2">If you need an update, contact <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>.</p>
          </div>
        ) : (
          <form action={requestAccountDeletionAction} className="mt-5 space-y-4">
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
              <input type="checkbox" name="confirm" value="yes" required className="mt-1.5" />
              <span>I understand this starts a manual deletion review. It does not automatically delete my account or other travelers&apos; shared trips.</span>
            </label>
            <button type="submit" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700">Submit deletion request</button>
          </form>
        )}
      </section>
      <p className="mt-6 text-sm text-slate-600">Read the <Link href="/privacy" className="text-blue-700 underline">Privacy Policy</Link> and <Link href="/terms" className="text-blue-700 underline">Terms of Service</Link>.</p>
    </main>
  );
}
