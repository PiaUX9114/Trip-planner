import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createQuotaAdminClient } from '@/lib/supabase/admin';

/** Shared quota check: verify the real caller with Supabase Auth before privileged RPC. */
export async function consumeGeoapifyQuota(
  supabase: SupabaseClient,
  tripId: string,
  kind: 'search' | 'map_route' | 'navigation',
): Promise<'allowed' | 'limited' | 'unavailable'> {
  // Never accept a user ID supplied in an HTTP body or query parameter.
  // getClaims() validates the JWT signature (and is cheaper than a network user lookup).
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  if (authError || !auth?.claims?.sub) return 'unavailable';

  const admin = createQuotaAdminClient();
  if (!admin) return 'unavailable';

  // SQL rechecks actual trip membership and uses shared atomic quota buckets.
  const { data, error } = await admin.rpc('take_geoapify_quota_server', {
    p_user_id: auth.claims.sub,
    p_trip_id: tripId,
    p_kind: kind,
  });
  if (error || typeof data !== 'boolean') return 'unavailable';
  return data ? 'allowed' : 'limited';
}
