// Strava redirects here after the user approves (or denies) access. Exchanges the code for
// tokens, stores the connection, runs an immediate first sync, then bounces back to Profile.
import { STRAVA_TOKEN_URL, StravaTokens, syncStravaForUser } from '@/lib/strava';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const appUrl = process.env.APP_URL || 'https://sportlogrun.app.nz';

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const userId = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) return Response.redirect(`${appUrl}/profile?strava=denied`, 302);
  if (!code || !userId) return Response.redirect(`${appUrl}/profile?strava=error`, 302);
  if (!supabaseUrl || !serviceKey || !clientId || !clientSecret) {
    return Response.json({ error: 'Strava sync is not configured (missing env vars).' }, { status: 503 });
  }

  try {
    const tokenRes = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, grant_type: 'authorization_code' }),
    });
    if (!tokenRes.ok) return Response.redirect(`${appUrl}/profile?strava=error`, 302);
    const tokenData = (await tokenRes.json()) as StravaTokens & { athlete: { id: number } };

    const adminHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' };
    await fetch(`${supabaseUrl}/rest/v1/strava_connections`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        user_id: userId,
        strava_athlete_id: tokenData.athlete.id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
      }),
    });

    // Kick off an immediate first import so the user sees activities right away.
    await syncStravaForUser(supabaseUrl, serviceKey, {
      user_id: userId, strava_athlete_id: tokenData.athlete.id,
      access_token: tokenData.access_token, refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at, last_synced_at: null,
    });

    return Response.redirect(`${appUrl}/profile?strava=connected`, 302);
  } catch {
    return Response.redirect(`${appUrl}/profile?strava=error`, 302);
  }
}
