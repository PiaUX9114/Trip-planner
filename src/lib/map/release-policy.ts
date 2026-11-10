/**
 * M7 launch safeguard. The free public Nominatim and OSRM demo instances are
 * development-only dependencies. Keep these requests disabled on production
 * until the API handlers use a production-capable provider with its own quota,
 * terms, observability and distributed rate limiting.
 *
 * Do not bypass this flag for a public launch. Replace the integrations first.
 */
export function publicDemoDisabled(): boolean {
  return process.env.NODE_ENV === 'production';
}
