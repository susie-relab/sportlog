// Two ways in:
//  - Cron (Vercel, see vercel.json) with a CRON_SECRET Bearer token: syncs every connected user.
//  - A signed-in user's own request (Profile page "Sync now"): syncs just that one user.
import { syncStravaForUser, StravaConnectionRow } from '@/lib/strava';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cronSecret = process.env.CRON_SECRET;

  if (!supabaseUrl || !serviceKey) {
    return Response.json({ error: 'Strava sync is not configured (missing env vars).' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization') || '';
  const isCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`;
  const adminHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  try {
    let connections: StravaConnectionRow[];

    if (isCron) {
      const res = await fetch(`${supabaseUrl}/rest/v1/strava_connections?select=*`, { headers: adminHeaders });
      if (!res.ok) return Response.json({ error: 'Failed to list connections' }, { status: 200 });
      connections = await res.json();
    } else {
      // A specific user syncing on demand — verify who they are via their own token.
      if (!anonKey || !authHeader) return Response.json({ error: 'Not signed in.' }, { status: 401 });
      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authHeader } });
      if (!userRes.ok) return Response.json({ error: 'Not signed in.' }, { status: 401 });
      const user = await userRes.json();

      const res = await fetch(`${supabaseUrl}/rest/v1/strava_connections?select=*&user_id=eq.${user.id}`, { headers: adminHeaders });
      if (!res.ok) return Response.json({ error: 'Failed to load connection' }, { status: 200 });
      connections = await res.json();
      if (connections.length === 0) return Response.json({ error: 'Strava is not connected.' }, { status: 404 });
    }

    let totalImported = 0, totalFlagged = 0;
    const errors: string[] = [];
    for (const conn of connections) {
      const result = await syncStravaForUser(supabaseUrl, serviceKey, conn);
      totalImported += result.imported;
      totalFlagged += result.flagged;
      if (result.error) errors.push(`${conn.user_id}: ${result.error}`);
    }

    return Response.json({ usersSynced: connections.length, imported: totalImported, flagged: totalFlagged, errors });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: 'Strava sync run failed', message }, { status: 200 });
  }
}
