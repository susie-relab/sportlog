import { Activity, ExerciseType, RunType } from '@/types';

export const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
export const STRAVA_AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize';
export const STRAVA_ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities';

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date_local: string; // ISO with offset already applied
  distance: number; // metres
  moving_time: number; // seconds
  average_speed?: number;
  max_speed?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  total_elevation_gain?: number;
}

/** Best-effort mapping from Strava's sport_type to SportLog's exercise_type (+ an optional
 *  run_type / sub_type). Anything unrecognised falls back to 'solo_fitness' with the raw
 *  Strava sport type kept in the activity name so nothing is silently lost. */
export function mapStravaActivity(sportType: string): { exercise_type: ExerciseType; run_type?: RunType; sub_type?: string } {
  const RUN: Record<string, RunType | undefined> = {
    Run: undefined, TrailRun: 'trail', VirtualRun: 'treadmill',
  };
  const BIKE: Record<string, string | undefined> = {
    Ride: undefined, MountainBikeRide: 'mtb', GravelRide: 'mixed_terrain', VirtualRide: 'indoor_spin',
    EBikeRide: 'electric', EMountainBikeRide: 'electric', Velomobile: undefined, Handcycle: undefined,
  };
  const SNOW: Record<string, string> = {
    AlpineSki: 'skiing', BackcountrySki: 'skiing', NordicSki: 'skiing', RollerSki: 'skiing',
    Snowboard: 'snowboard', IceSkate: 'skating',
  };
  const WATER: Record<string, string> = {
    StandUpPaddling: 'sup', Surfing: 'surf', Kayaking: 'kayak', Canoeing: 'kayak',
    Rowing: 'rowing', Kitesurf: 'kitesurfing', Windsurf: 'windsurfing', Sail: 'sailing', Snorkeling: 'diving',
  };
  const GYM: Record<string, string> = {
    WeightTraining: 'strength', Crossfit: 'crossfit', Workout: 'hiit_workout',
    HighIntensityIntervalTraining: 'hiit_workout', StairStepper: 'stair_climber', Rowing_Indoor: 'row_indoor',
  };
  const SOLO_FITNESS: Record<string, string> = {
    RockClimbing: 'rock_climbing', Skateboard: 'skateboard', InlineSkate: 'rollerskate',
  };

  if (sportType in RUN) return { exercise_type: 'run', run_type: RUN[sportType] };
  if (sportType in BIKE) return { exercise_type: 'bike', sub_type: BIKE[sportType] };
  if (sportType === 'Swim') return { exercise_type: 'swim' };
  if (sportType === 'Hike') return { exercise_type: 'walk', sub_type: 'bush' };
  if (sportType === 'Walk') return { exercise_type: 'walk' };
  if (sportType === 'Yoga' || sportType === 'Pilates') return { exercise_type: 'stretch', sub_type: sportType === 'Pilates' ? 'pilates' : undefined };
  if (sportType in SNOW) return { exercise_type: 'snow', sub_type: SNOW[sportType] };
  if (sportType in WATER) return { exercise_type: 'water', sub_type: WATER[sportType] };
  if (sportType in GYM) return { exercise_type: 'hiit', sub_type: GYM[sportType] };
  if (sportType in SOLO_FITNESS) return { exercise_type: 'solo_fitness', sub_type: SOLO_FITNESS[sportType] };
  if (['Soccer', 'Tennis', 'Golf', 'Basketball', 'Badminton', 'TableTennis', 'Cricket', 'Rugby', 'Hockey'].includes(sportType)) {
    return { exercise_type: 'sport' };
  }
  return { exercise_type: 'solo_fitness' };
}

/** Converts a raw Strava activity into the fields SportLog's `activities` table expects,
 *  ready to insert (still needs user_id and strava_activity_id set by the caller). */
export function stravaToActivityFields(s: StravaActivity) {
  const mapped = mapStravaActivity(s.sport_type || s.type);
  const distanceKm = s.distance ? Math.round((s.distance / 1000) * 100) / 100 : null;
  const durationMinutes = Math.round(s.moving_time / 60);
  const paceMinKm = distanceKm && distanceKm > 0 ? Math.round((s.moving_time / 60 / distanceKm) * 1000) / 1000 : null;
  return {
    name: s.name || mapped.exercise_type,
    exercise_type: mapped.exercise_type,
    run_type: mapped.exercise_type === 'run' ? mapped.run_type || null : null,
    sub_type: mapped.sub_type || null,
    duration_minutes: durationMinutes,
    duration_seconds: s.moving_time % 60,
    distance_km: distanceKm,
    pace_min_km: paceMinKm,
    max_hr: s.max_heartrate ? Math.round(s.max_heartrate) : null,
    avg_hr: s.average_heartrate ? Math.round(s.average_heartrate) : null,
    elevation_gain_m: s.total_elevation_gain ? Math.round(s.total_elevation_gain) : null,
    date: s.start_date_local.slice(0, 10),
    effort: 5, // Strava has no direct effort/RPE equivalent — default to the midpoint
  };
}

/** A logged activity counts as a likely duplicate of an incoming Strava activity if it's
 *  the same day, the same broad exercise type, and (when both have a distance) within 10%. */
export function findDuplicateMatch(candidate: ReturnType<typeof stravaToActivityFields>, existing: Activity[]): Activity | undefined {
  return existing.find(a => {
    if (a.date !== candidate.date) return false;
    if (a.exercise_type !== candidate.exercise_type) return false;
    if (candidate.distance_km != null && a.distance_km != null) {
      return Math.abs(a.distance_km - candidate.distance_km) / Math.max(a.distance_km, candidate.distance_km) < 0.1;
    }
    return true; // same day + same type, and at least one has no distance to compare — still worth flagging
  });
}

export interface StravaConnectionRow {
  user_id: string;
  strava_athlete_id: number;
  strava_athlete_name?: string | null;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  last_synced_at: string | null;
}

/** Refreshes the access token if it's expired/near-expiry, persisting the new tokens.
 *  Strava access tokens live ~6h; refresh_token is long-lived until revoked. */
async function ensureFreshToken(
  supabaseUrl: string, adminHeaders: Record<string, string>, conn: StravaConnectionRow,
): Promise<StravaConnectionRow> {
  const nowSec = Math.floor(Date.now() / 1000);
  if (conn.expires_at > nowSec + 120) return conn; // still valid for at least 2 more minutes

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: conn.refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`Strava token refresh failed (${res.status})`);
  const tokens: StravaTokens = await res.json();

  const updated: StravaConnectionRow = { ...conn, access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_at: tokens.expires_at };
  await fetch(`${supabaseUrl}/rest/v1/strava_connections?user_id=eq.${conn.user_id}`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: updated.access_token, refresh_token: updated.refresh_token, expires_at: updated.expires_at }),
  });
  return updated;
}

/** Pulls any new Strava activities for one connected user, auto-importing the clear ones
 *  and queuing likely duplicates for the user to resolve. Returns a small summary. */
export async function syncStravaForUser(
  supabaseUrl: string, serviceKey: string, connection: StravaConnectionRow,
): Promise<{ imported: number; flagged: number; error?: string }> {
  const adminHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  try {
    const conn = await ensureFreshToken(supabaseUrl, adminHeaders, connection);

    const after = connection.last_synced_at ? Math.floor(new Date(connection.last_synced_at).getTime() / 1000) : 0;
    const stravaRes = await fetch(`${STRAVA_ACTIVITIES_URL}?after=${after}&per_page=100`, {
      headers: { Authorization: `Bearer ${conn.access_token}` },
    });
    if (!stravaRes.ok) return { imported: 0, flagged: 0, error: `Strava activities fetch failed (${stravaRes.status})` };
    const stravaActivities = (await stravaRes.json()) as StravaActivity[];

    if (stravaActivities.length === 0) {
      await fetch(`${supabaseUrl}/rest/v1/strava_connections?user_id=eq.${conn.user_id}`, {
        method: 'PATCH', headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_synced_at: new Date().toISOString() }),
      });
      return { imported: 0, flagged: 0 };
    }

    // Activities already imported or already queued for review — never re-process either.
    const [existingRes, seenRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/activities?select=*&user_id=eq.${conn.user_id}`, { headers: adminHeaders }),
      fetch(`${supabaseUrl}/rest/v1/strava_pending_duplicates?select=strava_activity_id&user_id=eq.${conn.user_id}`, { headers: adminHeaders }),
    ]);
    const existingActivities = (await existingRes.json()) as (Activity & { strava_activity_id?: number })[];
    const seenDuplicateIds = new Set(((await seenRes.json()) as { strava_activity_id: number }[]).map(r => r.strava_activity_id));
    const alreadyImportedIds = new Set(existingActivities.map(a => a.strava_activity_id).filter(Boolean));

    let imported = 0, flagged = 0;
    for (const s of stravaActivities) {
      if (alreadyImportedIds.has(s.id) || seenDuplicateIds.has(s.id)) continue;
      const fields = stravaToActivityFields(s);
      const match = findDuplicateMatch(fields, existingActivities);

      if (match) {
        await fetch(`${supabaseUrl}/rest/v1/strava_pending_duplicates`, {
          method: 'POST', headers: { ...adminHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ user_id: conn.user_id, strava_activity_id: s.id, strava_data: fields, matched_activity_id: match.id }),
        });
        flagged++;
      } else {
        await fetch(`${supabaseUrl}/rest/v1/activities`, {
          method: 'POST', headers: { ...adminHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ ...fields, user_id: conn.user_id, strava_activity_id: s.id, is_pb: false }),
        });
        imported++;
      }
    }

    await fetch(`${supabaseUrl}/rest/v1/strava_connections?user_id=eq.${conn.user_id}`, {
      method: 'PATCH', headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ last_synced_at: new Date().toISOString() }),
    });

    return { imported, flagged };
  } catch (err) {
    return { imported: 0, flagged: 0, error: err instanceof Error ? err.message : String(err) };
  }
}
