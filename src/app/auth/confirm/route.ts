import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/config';

/** Confirm signup email via Supabase OTP token hash, never an unverified callback URL. */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');

  if (supabaseConfigured() && tokenHash && type === 'email') {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
    if (!error) return NextResponse.redirect(new URL('/trips', request.url));
  }
  return NextResponse.redirect(new URL('/login?notice=confirm-error', request.url));
}
