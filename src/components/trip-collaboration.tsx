import InvitationCreator from '@/components/invitation-creator';
import { changeMemberRoleAction, removeMemberAction, revokeInvitationAction } from '@/app/trips/[id]/collaboration-actions';

type Role = 'owner' | 'editor' | 'viewer';
export type MemberRow = { user_id: string; role: Role; joined_at: string; email: string | null };
export type InviteRow = {
  id: string; kind: 'email' | 'link'; role: 'editor' | 'viewer'; invited_email: string | null;
  expires_at: string; max_uses: number; used_count: number; revoked_at: string | null; created_at: string; active: boolean;
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}

export default function TripCollaboration({
  tripId, userId, role, members, invitations, error,
}: {
  tripId: string;
  userId: string;
  role: Role;
  members: MemberRow[];
  invitations: InviteRow[];
  error: boolean;
}) {
  const owner = role === 'owner';
  return (
    <section id="collaboration" className="mt-6 scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Travel together</h2>
          <p className="mt-1 text-sm text-slate-600">Invite others to plan this trip. Editors can change stops and schedules; viewers can only read.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">{role} access</span>
      </div>
      {error ? (
        <p role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Collaboration needs the M5 SQL migration. Your existing itinerary, map, and calendar are still available.
        </p>
      ) : (
        <div className="mt-5 grid items-start gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Trip members ({members.length})</h3>
              <ul className="mt-3 space-y-3">
                {members.map((member) => (
                  <li key={member.user_id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="break-all text-sm font-semibold text-slate-900">
                          {member.email ?? `Traveler ${member.user_id.slice(0, 8)}`}{member.user_id === userId ? ' (you)' : ''}
                        </p>
                        <p className="mt-1 text-xs capitalize text-slate-500">{member.role} · Joined {dateLabel(member.joined_at)}</p>
                      </div>
                    </div>
                    {owner && member.role !== 'owner' && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <form action={changeMemberRoleAction} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="trip_id" value={tripId} />
                          <input type="hidden" name="user_id" value={member.user_id} />
                          <label htmlFor={`role-${member.user_id}`} className="sr-only">Change member role</label>
                          <select id={`role-${member.user_id}`} name="role" defaultValue={member.role}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">Save role</button>
                        </form>
                        <details className="text-sm">
                          <summary className="cursor-pointer font-semibold text-red-700">Remove</summary>
                          <form action={removeMemberAction} className="mt-2 rounded-md bg-red-50 p-3">
                            <input type="hidden" name="trip_id" value={tripId} />
                            <input type="hidden" name="user_id" value={member.user_id} />
                            <p className="mb-2 text-red-900">Remove access to this trip?</p>
                            <button type="submit" className="rounded bg-red-700 px-3 py-1.5 text-white">Confirm removal</button>
                          </form>
                        </details>
                      </div>
                    )}
                    {!owner && member.user_id === userId && member.role !== 'owner' && (
                      <details className="mt-3 text-sm">
                        <summary className="cursor-pointer font-semibold text-red-700">Leave trip</summary>
                        <form action={removeMemberAction} className="mt-2 rounded-md bg-red-50 p-3">
                          <input type="hidden" name="trip_id" value={tripId} />
                          <input type="hidden" name="user_id" value={member.user_id} />
                          <button type="submit" className="rounded bg-red-700 px-3 py-1.5 font-semibold text-white">Confirm leave</button>
                        </form>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="space-y-5">
            {owner ? <InvitationCreator tripId={tripId} /> : (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Only the trip owner can invite travelers or change permissions.</div>
            )}
            {owner && (
              <div>
                <h3 className="text-lg font-bold text-slate-900">Invitations</h3>
                <p className="mt-1 text-xs text-slate-500">Invitation links expire after 7 days. Email invitations have 1 use; shareable links have up to 10 uses.</p>
                {invitations.length === 0 ? <p className="mt-3 text-sm text-slate-600">No invitations yet.</p> : (
                  <ul className="mt-3 space-y-2">
                    {invitations.map((invite) => {
                      const active = invite.active;
                      return (
                        <li key={invite.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                          <p className="font-semibold capitalize text-slate-800">{invite.kind} · {invite.role} · {active ? 'Active' : 'Inactive'}</p>
                          {invite.invited_email && <p className="mt-1 break-all text-slate-600">{invite.invited_email}</p>}
                          <p className="mt-1 text-xs text-slate-500">Used {invite.used_count}/{invite.max_uses} · Expires {dateLabel(invite.expires_at)}</p>
                          {active && (
                            <form action={revokeInvitationAction} className="mt-2">
                              <input type="hidden" name="trip_id" value={tripId} />
                              <input type="hidden" name="invitation_id" value={invite.id} />
                              <button type="submit" className="text-xs font-semibold text-red-700 hover:underline">Revoke invitation</button>
                            </form>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
