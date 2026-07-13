// Daily cron route (see vercel.json) that emails a happy-birthday note to any user
// whose stored birthday (Profile page) matches today's month/day. Requires the same
// server-only env vars as the recap email:
//   SUPABASE_SERVICE_ROLE_KEY — list users + read their activities (never exposed to client)
//   RESEND_API_KEY / RESEND_FROM — same email service as the contact form
//   CRON_SECRET — Vercel injects this as a Bearer token on cron invocations
import { Activity, EXERCISE_TYPE_LABELS, allFavouriteItems } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TIMEZONE = process.env.RECAP_TIMEZONE || 'Pacific/Auckland';

type AdminUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

function todayInTz(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date()); // YYYY-MM-DD
}

function addDaysISO(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function yearBeforeISO(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${Number(y) - 1}-${m}-${d}`;
}

function daysBetweenInclusive(startISO: string, endISO: string): number {
  const start = new Date(startISO + 'T00:00:00Z').getTime();
  const end = new Date(endISO + 'T00:00:00Z').getTime();
  return Math.round((end - start) / 86400000) + 1;
}

const esc = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The subtype key an activity contributes to a favourite/top-list, matching the same
 *  logic used on the Profile page's Top 5 (run uses its type/style fields; everything
 *  else uses its free-text sub_type, which can hold several comma-joined values). */
function subKeysFor(a: Activity): string[] {
  return a.exercise_type === 'run'
    ? ([a.run_type, a.run_type_modifier].filter(Boolean) as string[])
    : (a.sub_type ? a.sub_type.split(',').map(s => s.trim()).filter(Boolean) : []);
}

interface YtdStats {
  favouriteCounts: { label: string; emoji: string; count: number }[];
  topType: { label: string; count: number } | null;
  topSubtype: { label: string; count: number } | null;
}

function computeYtdStats(activities: Activity[], yearStartISO: string, favouriteKeys: string[]): YtdStats {
  const inYear = activities.filter(a => a.date >= yearStartISO);
  const registry = new Map(allFavouriteItems().map(i => [i.key, i]));
  const typeCounts = new Map<string, number>();
  const subtypeCounts = new Map<string, number>();
  const favKeyCounts = new Map<string, number>();

  for (const a of inYear) {
    typeCounts.set(a.exercise_type, (typeCounts.get(a.exercise_type) || 0) + 1);
    favKeyCounts.set(a.exercise_type, (favKeyCounts.get(a.exercise_type) || 0) + 1);
    for (const sk of subKeysFor(a)) {
      const key = `${a.exercise_type}:${sk}`;
      subtypeCounts.set(key, (subtypeCounts.get(key) || 0) + 1);
      favKeyCounts.set(key, (favKeyCounts.get(key) || 0) + 1);
    }
  }

  const favouriteCounts = favouriteKeys
    .map(key => {
      const count = favKeyCounts.get(key) || 0;
      const item = registry.get(key);
      return { label: item?.label ?? key, emoji: item?.emoji ?? '🏅', count };
    })
    .filter(f => f.count > 0);

  const topTypeEntry = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topType = topTypeEntry ? { label: EXERCISE_TYPE_LABELS[topTypeEntry[0] as keyof typeof EXERCISE_TYPE_LABELS] ?? topTypeEntry[0], count: topTypeEntry[1] } : null;

  const topSubtypeEntry = [...subtypeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topSubtype = topSubtypeEntry ? { label: registry.get(topSubtypeEntry[0])?.label ?? topSubtypeEntry[0], count: topSubtypeEntry[1] } : null;

  return { favouriteCounts, topType, topSubtype };
}

function birthdayHtml(opts: {
  name: string; appUrl: string; priorAge: number | null; avgPerWeek: number | null; stats: YtdStats;
}): string {
  const { name, appUrl, priorAge, avgPerWeek, stats } = opts;
  const line = (html: string) => `<p style="margin:0 0 10px;color:#CBD5E1;font-size:14px;">${html}</p>`;

  const favLines = stats.favouriteCounts
    .map(f => line(`Well done on completing <strong style="color:#fff;">${f.count}</strong> ${f.emoji} ${esc(f.label)} session${f.count === 1 ? '' : 's'} this year!`))
    .join('');
  const avgLine = avgPerWeek != null && priorAge != null
    ? line(`You averaged <strong style="color:#fff;">${avgPerWeek}</strong> activities a week at age ${priorAge}.`)
    : '';
  const topTypeLine = stats.topType
    ? line(`Your top sport this year: <strong style="color:#fff;">${esc(stats.topType.label)}</strong> — ${stats.topType.count} session${stats.topType.count === 1 ? '' : 's'}.`)
    : '';
  const topSubtypeLine = stats.topSubtype
    ? line(`Your top session type this year: <strong style="color:#fff;">${esc(stats.topSubtype.label)}</strong> — ${stats.topSubtype.count} session${stats.topSubtype.count === 1 ? '' : 's'}.`)
    : '';

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0F172A;color:#E2E8F0;padding:24px;border-radius:12px;max-width:520px;text-align:center;">
    <div style="font-size:40px;">🎉🎂🎉</div>
    <h2 style="margin:12px 0 4px;color:#fff;">Happy Birthday${name ? `, ${esc(name)}` : ''}!</h2>
    <p style="margin:0 0 16px;color:#94A3B8;font-size:14px;">Another year, another lap around the sun — literally, if you've been logging those runs.</p>
    <p style="margin:0 0 20px;color:#CBD5E1;font-size:14px;">Here's to more PBs, more kms, and more reasons to celebrate. Go treat yourself today — a rest day counts too. 😉</p>
    <div style="text-align:left;background:#1E293B;border-radius:10px;padding:16px;margin-bottom:16px;">
      ${favLines}${avgLine}${topTypeLine}${topSubtypeLine}
    </div>
    <p style="margin:0 0 16px;color:#CBD5E1;font-size:14px;">Hope you have your best year yet!</p>
    <p style="margin-top:8px;"><a href="${appUrl}/dash" style="color:#60A5FA;font-size:13px;">Open SportLog →</a></p>
    <p style="margin-top:16px;font-size:11px;color:#475569;">from Susie at SportLogRun :)</p>
  </div>`;
}

export async function GET(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'SportLog <onboarding@resend.dev>';
  const appUrl = process.env.APP_URL || 'https://sportlogrun.app.nz';

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!serviceKey || !supabaseUrl || !resendKey) {
    return Response.json({ error: 'Birthday emails are not configured (missing env vars).' }, { status: 503 });
  }

  try {
    const adminHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const todayISO = todayInTz();
    const todayMonthDay = todayISO.slice(5); // "MM-DD"
    const yearStartISO = `${todayISO.slice(0, 4)}-01-01`;

    // Page through all users; only ones with a matching birthday get anything.
    const users: AdminUser[] = [];
    for (let page = 1; page <= 20; page++) {
      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: adminHeaders });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return Response.json({ error: `Failed to list users (${res.status})`, detail: body.slice(0, 300) }, { status: 200 });
      }
      const json = await res.json();
      const batch = (Array.isArray(json) ? json : json.users) as AdminUser[] | undefined;
      if (!batch || batch.length === 0) break;
      users.push(...batch);
      if (batch.length < 200) break;
    }

    let sent = 0;
    const errors: string[] = [];

    for (const u of users) {
      if (!u.email) continue;
      const meta = u.user_metadata || {};
      const birthday = meta.birthday;
      if (typeof birthday !== 'string' || birthday.slice(5) !== todayMonthDay) continue;

      const name = typeof meta.username === 'string' ? meta.username : '';
      const favouriteKeys = Array.isArray(meta.favourite_activities) ? meta.favourite_activities as string[] : [];
      const birthYear = Number(birthday.slice(0, 4));
      const newAge = Number(todayISO.slice(0, 4)) - birthYear;
      const priorAge = Number.isFinite(newAge) ? newAge - 1 : null;

      const actsRes = await fetch(`${supabaseUrl}/rest/v1/activities?select=*&user_id=eq.${u.id}`, { headers: adminHeaders });
      if (!actsRes.ok) { errors.push(`${u.email}: activity fetch failed`); continue; }
      const activities = (await actsRes.json()) as Activity[];

      const stats = computeYtdStats(activities, yearStartISO, favouriteKeys);

      let avgPerWeek: number | null = null;
      const windowStart = yearBeforeISO(todayISO);
      const windowEnd = addDaysISO(todayISO, -1);
      const countInWindow = activities.filter(a => a.date >= windowStart && a.date <= windowEnd).length;
      const days = daysBetweenInclusive(windowStart, windowEnd);
      if (days > 0) avgPerWeek = Math.round((countInWindow / (days / 7)) * 10) / 10;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from, to: u.email, subject: '🎉 Happy Birthday from SportLogRun!',
          html: birthdayHtml({ name, appUrl, priorAge, avgPerWeek, stats }),
        }),
      });
      if (res.ok) sent++;
      else errors.push(`${u.email}: send failed (${res.status})`);
    }

    return Response.json({ date: todayISO, usersChecked: users.length, sent, errors });
  } catch (err) {
    // Surface the real cause as JSON (200) so it shows in the cron logs instead of a bare 502.
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.split('\n').slice(0, 4).join(' | ') : undefined;
    return Response.json({ error: 'Birthday email run failed', message, stack }, { status: 200 });
  }
}
