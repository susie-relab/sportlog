// Called by the client (Profile page) to get the Strava "Connect" URL to redirect to.
// Verifies the caller's Supabase session via their access token, then embeds their user id
// as the OAuth `state` param so the callback route knows which SportLog account to link.
import { STRAVA_AUTHORIZE_URL } from '@/lib/strava';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const clientId = process.env.STRAVA_CLIENT_ID;
  const appUrl = process.env.APP_URL || 'https://sportlogrun.app.nz';

  if (!supabaseUrl || !anonKey || !clientId) {
    return Response.json({ error: 'Strava sync is not configured (missing env vars).' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authHeader },
  });
  if (!userRes.ok) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  const user = await userRes.json();

  const redirectUri = `${appUrl}/api/strava/callback`;
  const url = `${STRAVA_AUTHORIZE_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&approval_prompt=auto&scope=activity:read_all&state=${user.id}`;

  return Response.json({ url });
}
