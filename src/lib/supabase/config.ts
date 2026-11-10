/** Only public project identifiers belong in NEXT_PUBLIC variables. */
export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://') &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_'),
  );
}

export function supabasePublicConfig(): { url: string; publishableKey: string } {
  if (!supabaseConfigured()) {
    throw new Error('Supabase public configuration is missing. See docs/M1_MAC_SETUP.md.');
  }
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  };
}
