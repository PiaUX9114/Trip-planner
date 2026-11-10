'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/require-user';

/** Records an authenticated request; this action never deletes users or trips. */
export async function requestAccountDeletionAction(formData: FormData) {
  const { supabase, userId } = await requireUser();
  if (formData.get('confirm') !== 'yes') redirect('/account?notice=confirm');

  // Never accept a user ID or email from the client: the session decides identity.
  const { error } = await supabase.from('account_deletion_requests').insert({ user_id: userId });
  if (error) {
    if (error.code === '23505') redirect('/account?notice=already-requested');
    redirect('/account?notice=request-error');
  }

  revalidatePath('/account');
  redirect('/account?notice=requested');
}
