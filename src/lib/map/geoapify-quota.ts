import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

/** Shared PostgreSQL quota check. Fail closed if the migration is not installed. */
export async function consumeGeoapifyQuota(
  supabase: SupabaseClient,
  tripId: string,
  kind: 'search' | 'map_route' | 'navigation',
): Promise<'allowed' | 'limited' | 'unavailable'> {
  const { data, error } = await supabase.rpc('take_geoapify_quota', {
    p_trip_id: tripId,
    p_kind: kind,
  });
  if (error || typeof data !== 'boolean') return 'unavailable';
  return data ? 'allowed' : 'limited';
}
