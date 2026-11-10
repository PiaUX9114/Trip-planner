import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Elevated client exclusively for backend quota RPCs; never import in client components. */
export function createQuotaAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url?.startsWith('https://') || !key?.startsWith('sb_secret_')) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
