/** Public liveness endpoint. No DB query or keys are returned. */
export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json(
    { status: 'ok', service: 'trip-planner', release: 'm7-candidate' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
