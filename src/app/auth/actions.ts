'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/config';

function credentials(formData: FormData) {
  return {
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
  };
}

export async function signInAction(formData: FormData) {
  if (!supabaseConfigured()) redirect('/login?notice=setup');
  const { email, password } = credentials(formData);
  if (!email.includes('@') || password.length === 0) redirect('/login?notice=invalid');

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect('/login?notice=signin-error');

  revalidatePath('/', 'layout');
  redirect('/trips');
}

export async function signUpAction(formData: FormData) {
  if (!supabaseConfigured()) redirect('/login?notice=setup');
  if (formData.get('terms_accept') !== 'yes') redirect('/login?notice=terms-required');
  const { email, password } = credentials(formData);
  if (!email.includes('@') || password.length < 8) redirect('/login?notice=invalid');

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) redirect('/login?notice=signup-error');

  if (!data.session) redirect('/login?notice=check-email');
  revalidatePath('/', 'layout');
  redirect('/trips');
}

export async function signOutAction() {
  if (supabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath('/', 'layout');
  redirect('/login?notice=signed-out');
}
