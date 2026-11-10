import 'server-only';

/**
 * Server-only placeholders for future integrations. The values are never logged
 * or returned by public endpoints. M0 does not initialize any API clients.
 */
export function getProviderAvailability() {
  return {
    supabaseConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    mapsBrowserConfigured: Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY),
    mapsServerConfigured: Boolean(process.env.GOOGLE_MAPS_SERVER_KEY),
  } as const;
}
