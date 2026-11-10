# M7 Geoapify release follow-up

- Server host: configure `GEOAPIFY_API_KEY` in Vercel **server environment** and redeploy. Do not expose it as a `NEXT_PUBLIC_` variable.
- Database: apply `202611090006_m7_geoapify_quota.sql` in Supabase and verify authenticated `take_geoapify_quota` calls. No user PII is added to quotas beyond the Supabase user UUID.
- Production remaining: replace public OSM raster tile URL on both maps, monitor Geoapify free-plan credit usage, audit RLS, set up backups/alerting and email delivery, and confirm mobile safety disclosures.
- The `m7:preflight` check is static. It cannot verify a real database migration, API key validity, or production map tile agreement.
- Provider guides: https://apidocs.geoapify.com/docs/routing/ and https://apidocs.geoapify.com/docs/geocoding/
