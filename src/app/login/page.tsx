import Link from 'next/link';
import { signInAction, signUpAction } from '@/app/auth/actions';
import { supabaseConfigured } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

const messages: Record<string, string> = {
  setup: 'Supabase is not configured yet. Add your public project URL and publishable key to .env.local.',
  invalid: 'Enter a valid email and a password of at least eight characters to create an account.',
  'signin-error': 'Could not sign in. Check your credentials and confirm your email if required.',
  'signup-error': 'Could not create an account. Check the email and password, then try again.',
  'check-email': 'Check your inbox for the confirmation email, then return to sign in.',
  'confirm-error': 'This confirmation link is invalid or expired. Try signing up or signing in again.',
  'signed-out': 'You have signed out.',
  'terms-required': 'Agree to the Terms of Service before creating an account.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const params = await searchParams;
  const configured = supabaseConfigured();
  const message = params.notice ? messages[params.notice] : null;

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 py-12 sm:py-20">
      <Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">← Trip Planner</Link>
      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <span className="inline-flex rounded-xl bg-blue-600 px-3 py-2 text-lg font-bold text-white" aria-hidden="true">TP</span>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">Your trips, one place.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Sign in or create an account to start planning.</p>
        {(!configured || message) && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
            {message ?? 'Supabase is not configured. See docs/M1_MAC_SETUP.md.'}
          </div>
        )}
        <form action={signInAction} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700" htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" required maxLength={254}
            className="-mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900" placeholder="you@example.com" />
          <label className="block text-sm font-medium text-slate-700" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" minLength={8} autoComplete="current-password" required
            className="-mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900" placeholder="At least 8 characters" />
          <label className="flex items-start gap-3 text-xs leading-5 text-slate-600">
            <input type="checkbox" name="terms_accept" value="yes" className="mt-1" />
            <span>For account creation: I agree to the <Link href="/terms" className="text-blue-700 underline">Terms of Service</Link> and acknowledge the <Link href="/privacy" className="text-blue-700 underline">Privacy Policy</Link>.</span>
          </label>
          <button disabled={!configured} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-40" type="submit">Sign in</button>
          <button disabled={!configured} formAction={signUpAction} className="w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40" type="submit">Create account</button>
        </form>
        <p className="mt-4 text-xs leading-5 text-slate-500">Use at least eight characters. If email confirmation is enabled, follow the email link. The agreement checkbox is required for new accounts, not for signing in.</p>
      </div>
    </main>
  );
}
