'use client';

import { useActionState, useState, useSyncExternalStore } from 'react';
import { createInvitationAction, type InvitationResult } from '@/app/trips/[id]/collaboration-actions';

const initialState: InvitationResult = { status: 'idle', message: '' };

// Read the browser origin safely after hydration; no effect-triggered setState.
function subscribeOrigin() { return () => {}; }
function browserOrigin() { return window.location.origin; }
function serverOrigin() { return ''; }

export default function InvitationCreator({ tripId }: { tripId: string }) {
  const [state, formAction, pending] = useActionState(createInvitationAction, initialState);
  const [kind, setKind] = useState<'email' | 'link'>('email');
  const [copied, setCopied] = useState(false);

  // The token is delivered as the result of a client-side Server Action, never
  // through page props or a public JSON endpoint.
  const origin = useSyncExternalStore(subscribeOrigin, browserOrigin, serverOrigin);
  const inviteUrl = state.status === 'success' && state.token && origin
    ? `${origin}/invite/${state.token}` : '';
  const subject = encodeURIComponent('Join my Trip Planner trip');
  const body = encodeURIComponent(`I invited you to help plan our trip. Open this link and sign in with your email:\n\n${inviteUrl}\n\nThe invitation expires in seven days.`);
  const mailLink = state.kind === 'email' && state.email && inviteUrl
    ? `mailto:${state.email}?subject=${subject}&body=${body}` : '';

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
      <h3 className="text-lg font-bold text-slate-900">Invite a traveler</h3>
      <p className="mt-1 text-sm text-slate-600">Email invitations are limited to the named recipient. Shareable links let up to 10 signed-in travelers join.</p>
      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="trip_id" value={tripId} />
        <fieldset className="flex flex-wrap gap-4 text-sm text-slate-800">
          <legend className="mb-2 font-semibold">Invitation method</legend>
          <label className="flex items-center gap-2"><input type="radio" name="kind" value="email" checked={kind === 'email'} onChange={() => { setKind('email'); setCopied(false); }} /> By email</label>
          <label className="flex items-center gap-2"><input type="radio" name="kind" value="link" checked={kind === 'link'} onChange={() => { setKind('link'); setCopied(false); }} /> Shareable link</label>
        </fieldset>
        {kind === 'email' && (
          <div>
            <label htmlFor="invite-email" className="mb-1 block text-sm font-semibold text-slate-700">Recipient email address</label>
            <input id="invite-email" name="email" type="email" autoComplete="off" maxLength={254} required
              placeholder="traveler@example.com"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5" />
          </div>
        )}
        <div>
          <label htmlFor="invite-role" className="mb-1 block text-sm font-semibold text-slate-700">Access level</label>
          <select id="invite-role" name="role" defaultValue="editor"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">
            <option value="editor">Editor — add and change itinerary, calendar, and pins</option>
            <option value="viewer">Viewer — read-only access</option>
          </select>
        </div>
        <button type="submit" disabled={pending}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {pending ? 'Creating…' : 'Create invitation'}
        </button>
      </form>
      {state.status === 'error' && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">{state.message}</p>}
      {state.status === 'success' && (
        <div role="status" className="mt-4 rounded-lg border border-green-200 bg-white p-4">
          <p className="text-sm font-semibold text-green-900">{state.message}</p>
          {inviteUrl ? (
            <>
              <label className="mt-3 block text-xs font-semibold text-slate-600" htmlFor="created-link">Private invitation link</label>
              <input id="created-link" value={inviteUrl} readOnly onFocus={(e) => e.currentTarget.select()}
                className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 p-2 text-xs" />
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={async () => {
                  try { await navigator.clipboard.writeText(inviteUrl); setCopied(true); }
                  catch { setCopied(false); }
                }} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                  {copied ? 'Copied' : 'Copy link'}
                </button>
                {mailLink && <a href={mailLink} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">Open email app</a>}
              </div>
            </>
          ) : <p className="mt-2 text-sm text-slate-600">Open this page in your browser to copy the invitation link.</p>}
          <p className="mt-3 text-xs leading-5 text-slate-600">Expires after seven days. Do not post invitation links publicly. Existing links cannot be retrieved later; create a new one if lost.</p>
        </div>
      )}
    </div>
  );
}
