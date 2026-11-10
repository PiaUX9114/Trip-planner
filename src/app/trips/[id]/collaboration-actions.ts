'use server';

import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase/require-user';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tokenPattern = /^[0-9a-f]{64}$/;
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type InvitationResult = {
  status: 'idle' | 'success' | 'error';
  message: string;
  token?: string;
  kind?: 'email' | 'link';
  email?: string;
  role?: 'editor' | 'viewer';
};

function tripIdFrom(form: FormData) {
  const id = String(form.get('trip_id') ?? '');
  if (!uuidPattern.test(id)) redirect('/trips');
  return id;
}

function done(tripId: string, notice: string) {
  revalidatePath('/trips');
  revalidatePath(`/trips/${tripId}`);
  redirect(`/trips/${tripId}?notice=${notice}#collaboration`);
}

/** Create exactly one secret token, returned to its creator only once. */
export async function createInvitationAction(
  _previous: InvitationResult,
  form: FormData,
): Promise<InvitationResult> {
  const tripId = String(form.get('trip_id') ?? '');
  const kind = String(form.get('kind') ?? '');
  const role = String(form.get('role') ?? '');
  const email = String(form.get('email') ?? '').trim().toLowerCase();

  if (!uuidPattern.test(tripId) || !['email', 'link'].includes(kind)
    || !['editor', 'viewer'].includes(role)) {
    return { status: 'error', message: 'Select an invitation type and member role.' };
  }
  if (kind === 'email' && (email.length > 254 || !emailPattern.test(email))) {
    return { status: 'error', message: 'Enter a valid recipient email address.' };
  }

  // Raw invitation tokens stay out of the database and server logs.
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('create_trip_invitation', {
    p_trip_id: tripId,
    p_token_hash: tokenHash,
    p_kind: kind,
    p_role: role,
    p_email: kind === 'email' ? email : null,
  });

  if (error) {
    console.error('M5 create invitation failed (code):', error.code ?? 'unknown');
    return {
      status: 'error',
      message: 'Could not create invitation. Check that M5 SQL is installed and you are the trip owner.',
    };
  }
  revalidatePath(`/trips/${tripId}`);
  return {
    status: 'success', message: 'Invitation created. Share this link now; it is shown only once.',
    token,
    kind: kind as 'email' | 'link',
    role: role as 'editor' | 'viewer',
    email: kind === 'email' ? email : undefined,
  };
}

export async function revokeInvitationAction(form: FormData) {
  const tripId = tripIdFrom(form);
  const inviteId = String(form.get('invitation_id') ?? '');
  if (!uuidPattern.test(inviteId)) done(tripId, 'collab-invalid');
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('revoke_trip_invitation', {
    p_trip_id: tripId, p_invitation_id: inviteId,
  });
  if (error) {
    console.error('M5 revoke invitation failed (code):', error.code ?? 'unknown');
    done(tripId, 'collab-error');
  }
  done(tripId, 'invite-revoked');
}

export async function changeMemberRoleAction(form: FormData) {
  const tripId = tripIdFrom(form);
  const userId = String(form.get('user_id') ?? '');
  const role = String(form.get('role') ?? '');
  if (!uuidPattern.test(userId) || !['editor', 'viewer'].includes(role)) done(tripId, 'collab-invalid');
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('set_trip_member_role', {
    p_trip_id: tripId, p_user_id: userId, p_role: role,
  });
  if (error) {
    console.error('M5 change role failed (code):', error.code ?? 'unknown');
    done(tripId, 'collab-error');
  }
  done(tripId, 'role-updated');
}

export async function removeMemberAction(form: FormData) {
  const tripId = tripIdFrom(form);
  const userId = String(form.get('user_id') ?? '');
  if (!uuidPattern.test(userId)) done(tripId, 'collab-invalid');
  const { userId: me, supabase } = await requireUser();
  const { error } = await supabase.rpc('remove_trip_member', {
    p_trip_id: tripId, p_user_id: userId,
  });
  if (error) {
    console.error('M5 remove member failed (code):', error.code ?? 'unknown');
    done(tripId, 'collab-error');
  }
  if (me === userId) {
    revalidatePath('/trips');
    redirect('/trips?notice=left-trip');
  }
  done(tripId, 'member-removed');
}

/** Redeem a high-entropy link after signup/signin with a verified email. */
export async function acceptTripInvitationAction(form: FormData) {
  const token = String(form.get('token') ?? '');
  if (!tokenPattern.test(token)) redirect('/trips');
  const { supabase } = await requireUser();
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const { data, error } = await supabase.rpc('accept_trip_invitation', {
    p_token_hash: tokenHash,
  });
  if (error || typeof data !== 'string' || !uuidPattern.test(data)) {
    console.error('M5 accept invitation failed (code):', error?.code ?? 'unknown');
    redirect(`/invite/${token}?notice=invite-error`);
  }
  revalidatePath('/trips');
  revalidatePath(`/trips/${data}`);
  redirect(`/trips/${data}?notice=invite-joined#collaboration`);
}
