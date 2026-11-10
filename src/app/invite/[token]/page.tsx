import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/config';
import { acceptTripInvitationAction } from '@/app/trips/[id]/collaboration-actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Trip Invitation | Trip Planner', robots: { index: false, follow: false }, referrer: 'no-referrer' };
const tokenPattern = /^[0-9a-f]{64}$/;

export default async function AcceptInvitePage({
  params, searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { token } = await params;
  if (!tokenPattern.test(token)) notFound();
  if (!supabaseConfigured()) redirect('/login?notice=setup');
  const { notice } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const signedIn = Boolean(!error && data?.claims?.sub);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-12">
      <Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">Trip Planner</Link>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Trip collaboration · M5</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">You have a trip invitation</h1>
        <p className="mt-3 leading-6 text-slate-600">Join a shared itinerary, map, and calendar. The person who invited you controls your Editor or Viewer role.</p>
        {notice === 'invite-error' && (
          <p role="alert" className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Invitation cannot be accepted. It may have expired, reached its limit, or been sent to another email. Ask the trip owner for a new link if needed.
          </p>
        )}
        {!signedIn ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-slate-700">Sign in or create an account in a new tab, then return here and refresh this invitation page.</p>
            <Link href="/login" target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              Sign in / Create account
            </Link>
            <p className="text-xs text-slate-500">For an email-specific invitation, use the same confirmed email address that received the link.</p>
          </div>
        ) : (
          <form action={acceptTripInvitationAction} className="mt-6">
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">Accept invitation</button>
            <p className="mt-3 text-xs text-slate-500">Your email must be confirmed. By accepting, you will become a member of this trip.</p>
          </form>
        )}
      </section>
    </main>
  );
}
