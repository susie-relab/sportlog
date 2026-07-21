// Daily cron route (see vercel.json) that emails weekly/monthly recaps to users
// who opted in via Settings. Runs once a day; each user only gets the weekly
// email on their own week-start day (Mon/Sun preference) and the monthly email
// on the 1st. Requires server-only env vars:
//   SUPABASE_SERVICE_ROLE_KEY — list users + read their data (never exposed to client)
//   RESEND_API_KEY / RESEND_FROM — same email service as the contact form
//   CRON_SECRET — Vercel injects this as a Bearer token on cron invocations
import { Activity, Habit, HabitLog } from '@/types';
import { PlanRecord } from '@/lib/runPlanGenerator';
import { recapWithComparison, addDays, upcomingCount, upcomingSessions } from '@/lib/recap';
import { formatDuration, formatDistance, formatPaceMinKm, localWeekKey, WeekStart, calcWeekStreak } from '@/lib/utils';
import { completionPctInRange, currentStreak } from '@/lib/habitStats';

// Run on the Node runtime (needs Intl timezone + long-running fetches) and give the
// cron enough headroom to page users + fetch each one's data + send emails.
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

function fmt(d: string) { return d.split('-').reverse().join('/'); }

const esc = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function deltaHtml(pct: number | null): string {
  if (pct == null || pct === 0) return '';
  const up = pct > 0;
  return `<span style="color:${up ? '#4ADE80' : '#F87171'};font-size:10px;"> ${up ? '↑' : '↓'}${Math.abs(pct)}%</span>`;
}

function habitsHtml(habits: Habit[], logs: HabitLog[], startISO: string, endISO: string, todayISO: string): string {
  if (habits.length === 0) return '';
  const logsByHabit = new Map<string, HabitLog[]>();
  for (const l of logs) {
    const arr = logsByHabit.get(l.habit_id) || [];
    arr.push(l);
    logsByHabit.set(l.habit_id, arr);
  }
  const rows = habits
    .map(h => {
      const hLogs = logsByHabit.get(h.id) || [];
      return { h, pct: completionPctInRange(h, hLogs, startISO, endISO), streak: currentStreak(h, hLogs, todayISO, []) };
    })
    .sort((a, b) => b.pct - a.pct);
  const avgPct = Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length);
  const rowsHtml = rows.map(r => `
    <tr>
      <td style="padding:3px 0;font-size:13px;color:#E2E8F0;">${esc(r.h.name)}</td>
      <td style="padding:3px 0;font-size:13px;color:#94A3B8;text-align:right;">${r.pct}%${r.streak > 1 ? ` · 🔥${r.streak}` : ''}</td>
    </tr>`).join('');
  return `
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid #1E293B;">
      <h3 style="margin:0 0 4px;color:#fff;font-size:15px;">✅ Habits</h3>
      <p style="font-size:13px;color:#94A3B8;margin:6px 0 8px;">Average completion: <strong style="color:#fff;">${avgPct}%</strong> across ${habits.length} habit${habits.length > 1 ? 's' : ''}</p>
      <table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
    </div>`;
}

type Recap = ReturnType<typeof recapWithComparison>;

/** A short weekday label ("Mon") from an ISO date, used for the upcoming-sessions list. */
function weekdayLabel(dateISO: string): string {
  return new Date(dateISO + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

function recapHtml(title: string, range: string, r: Recap, activitiesInRange: Activity[], opts: { appUrl: string; weekStreak?: number; upcoming?: number; upcomingList?: { date: string; title: string }[] }): string {
  const { appUrl, weekStreak, upcoming, upcomingList } = opts;
  const stat = (v: string, label: string, delta: number | null) =>
    `<td style="text-align:center;padding:12px;background:#1E293B;border-radius:8px;">
       <div style="font-size:24px;font-weight:800;color:#60A5FA;">${v}</div>
       <div style="font-size:11px;color:#94A3B8;text-transform:uppercase;">${label}${deltaHtml(delta)}</div>
     </td>`;
  const line = (color: string, html: string) => `<p style="font-size:13px;color:${color};margin:6px 0 0;">${html}</p>`;
  const top = r.topActivity;
  const sortedActs = [...activitiesInRange].sort((a, b) => a.date.localeCompare(b.date));
  const activityListHtml = sortedActs.length > 0 ? `
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid #1E293B;">
      <h3 style="margin:0 0 8px;color:#fff;font-size:15px;">📋 Activities this period</h3>
      <table style="width:100%;border-collapse:collapse;">
        ${sortedActs.map(a => `
          <tr>
            <td style="padding:3px 0;font-size:13px;color:#64748B;white-space:nowrap;">${fmt(a.date)}</td>
            <td style="padding:3px 8px;font-size:13px;color:#E2E8F0;">${esc(a.name)}</td>
            <td style="padding:3px 0;font-size:13px;color:#94A3B8;text-align:right;white-space:nowrap;">${formatDuration(a.duration_minutes)}${a.distance_km ? ` · ${formatDistance(a.distance_km, a.exercise_type)}` : ''}</td>
          </tr>`).join('')}
      </table>
    </div>` : '';
  const upcomingHtml = upcomingList && upcomingList.length > 0 ? `
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid #1E293B;">
      <h3 style="margin:0 0 8px;color:#fff;font-size:15px;">📅 Coming up this week</h3>
      <table style="width:100%;border-collapse:collapse;">
        ${upcomingList.map(s => `
          <tr>
            <td style="padding:3px 0;font-size:13px;color:#64748B;white-space:nowrap;">${weekdayLabel(s.date)}</td>
            <td style="padding:3px 8px;font-size:13px;color:#E2E8F0;">${esc(s.title)}</td>
          </tr>`).join('')}
      </table>
    </div>` : (upcoming && upcoming > 0 ? line('#64748B', `This week: ${upcoming} session${upcoming > 1 ? 's' : ''} planned`) : '');
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0F172A;color:#E2E8F0;padding:24px;border-radius:12px;max-width:520px;">
    <h2 style="margin:0 0 4px;color:#fff;">🏃 ${title}</h2>
    <p style="margin:0 0 16px;color:#64748B;font-size:13px;">${range}</p>
    <table style="width:100%;border-collapse:separate;border-spacing:6px;"><tr>
      ${stat(String(r.count), 'Activities', r.countDelta)}
      ${stat(r.km.toFixed(1), 'km', r.kmDelta)}
      ${stat(formatDuration(r.mins), 'Time', r.minsDelta)}
    </tr></table>
    ${(r.prev.count > 0 || r.prev.km > 0 || r.prev.mins > 0) ? line('#64748B', `Previous period: ${r.prev.count} activities · ${r.prev.km.toFixed(1)}km · ${formatDuration(r.prev.mins)}`) : ''}
    ${top ? line('#94A3B8', `🏆 Top session: <strong style="color:#fff;">${esc(top.name)}</strong> — ${formatDuration(top.duration_minutes)}${top.distance_km ? ` · ${formatDistance(top.distance_km, top.exercise_type)}` : ''}`) : ''}
    ${(r.topTypes.length > 0 || r.topSubtypes.length > 0) ? line('#94A3B8', esc([...r.topTypes.map(t => `${t.emoji} ${t.label} ×${t.count}`), ...r.topSubtypes.map(t => `${t.emoji} ${t.label} ×${t.count}`)].join(', '))) : ''}
    ${(r.maxHr || r.bestPace || r.intensityMins > 0) ? line('#94A3B8', esc([
      r.maxHr ? `❤️ ${r.maxHr} bpm` : null,
      r.bestPace ? `⚡ ${formatPaceMinKm(r.bestPace)}` : null,
      r.intensityMins > 0 ? `🔥 ${r.intensityMins}m intensity` : null,
    ].filter(Boolean).join(' · '))) : ''}
    ${r.planned > 0 ? line('#94A3B8', `Plan sessions: <strong style="color:#fff;">${r.done}/${r.planned}</strong> completed`) : ''}
    ${r.pbs.length > 0 ? line('#FACC15', `⭐ ${r.pbs.length} PB${r.pbs.length > 1 ? 's' : ''} hit: ${esc(r.pbs.map(a => a.name).join(', '))}`) : ''}
    ${weekStreak && weekStreak > 1 ? line('#FACC15', `⚡ ${weekStreak}-week streak going!`) : ''}
    ${activityListHtml}
    ${upcomingHtml}
    <p style="margin-top:16px;"><a href="${appUrl}/dash" style="color:#60A5FA;font-size:13px;">Open SportLog →</a></p>
    <p style="margin-top:12px;font-size:11px;color:#475569;">You're receiving this because recap emails are enabled in your SportLog settings.</p>
  </div>`;
}

export async function GET(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'SportLog <onboarding@resend.dev>';
  const appUrl = process.env.APP_URL || 'https://sportlogrun.vercel.app';

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!serviceKey || !supabaseUrl || !resendKey) {
    return Response.json({ error: 'Recap emails are not configured (missing env vars).' }, { status: 503 });
  }

  try {
  const adminHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const todayISO = todayInTz();
  const isFirstOfMonth = todayISO.slice(8, 10) === '01';
  const dow = new Date(todayISO + 'T00:00:00Z').getUTCDay(); // 0 = Sunday

  // Page through all users; only opted-in ones get anything.
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
    const weekStart: WeekStart = meta.week_start_day === 'sunday' ? 'sunday' : 'monday';
    const isWeekStartDay = weekStart === 'sunday' ? dow === 0 : dow === 1;
    const wantsWeekly = meta.weekly_recap_email === true && isWeekStartDay;
    const wantsMonthly = meta.monthly_recap_email === true && isFirstOfMonth;
    if (!wantsWeekly && !wantsMonthly) continue;
    const wantsHabits = meta.habits_in_recap_email === true;

    const [actsRes, plansRes, habitsRes, habitLogsRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/activities?select=*&user_id=eq.${u.id}&order=date.desc&limit=1000`, { headers: adminHeaders }),
      fetch(`${supabaseUrl}/rest/v1/training_plans?select=*&user_id=eq.${u.id}`, { headers: adminHeaders }),
      wantsHabits
        ? fetch(`${supabaseUrl}/rest/v1/habits?select=*&user_id=eq.${u.id}&archived=eq.false`, { headers: adminHeaders })
        : Promise.resolve(null),
      wantsHabits
        ? fetch(`${supabaseUrl}/rest/v1/habit_logs?select=*&user_id=eq.${u.id}`, { headers: adminHeaders })
        : Promise.resolve(null),
    ]);
    if (!actsRes.ok || !plansRes.ok) { errors.push(`${u.email}: data fetch failed`); continue; }
    const activities = (await actsRes.json()) as Activity[];
    const plans = (await plansRes.json()) as PlanRecord[];
    const habits = habitsRes && habitsRes.ok ? ((await habitsRes.json()) as Habit[]) : [];
    const habitLogs = habitLogsRes && habitLogsRes.ok ? ((await habitLogsRes.json()) as HabitLog[]) : [];

    const emails: { subject: string; html: string }[] = [];
    if (wantsWeekly) {
      const thisWeekStart = localWeekKey(todayISO, weekStart);
      const lastWeekStart = addDays(thisWeekStart, -7);
      const lastWeekEnd = addDays(thisWeekStart, -1);
      const r = recapWithComparison(activities, plans, lastWeekStart, lastWeekEnd, 7);
      const weekStreak = calcWeekStreak(activities.map(a => a.date), weekStart);
      const thisWeekEnd = addDays(thisWeekStart, 6);
      const upcoming = upcomingCount(plans, thisWeekStart, thisWeekEnd);
      const upcomingList = upcomingSessions(plans, thisWeekStart, thisWeekEnd);
      const actsInRange = activities.filter(a => a.date >= lastWeekStart && a.date <= lastWeekEnd);
      emails.push({
        subject: 'Your SportLog weekly recap 🏃',
        html: recapHtml("Last Week's Recap", `${fmt(lastWeekStart)} to ${fmt(lastWeekEnd)}`, r, actsInRange, { appUrl, weekStreak, upcoming, upcomingList })
          + (wantsHabits ? habitsHtml(habits, habitLogs, lastWeekStart, lastWeekEnd, todayISO) : ''),
      });
    }
    if (wantsMonthly) {
      const [y, m] = todayISO.split('-').map(Number);
      const prev = new Date(Date.UTC(y, m - 2, 1));
      const first = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}-01`;
      const end = addDays(todayISO, -1);
      const monthDays = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
      const r = recapWithComparison(activities, plans, first, end, monthDays);
      const actsInRange = activities.filter(a => a.date >= first && a.date <= end);
      emails.push({
        subject: 'Your SportLog monthly recap 📅',
        html: recapHtml("Last Month's Recap", `${fmt(first)} to ${fmt(end)}`, r, actsInRange, { appUrl })
          + (wantsHabits ? habitsHtml(habits, habitLogs, first, end, todayISO) : ''),
      });
    }

    for (const e of emails) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: u.email, subject: e.subject, html: e.html }),
      });
      if (res.ok) sent++;
      else errors.push(`${u.email}: send failed (${res.status})`);
    }
  }

  return Response.json({ date: todayISO, usersChecked: users.length, sent, errors });
  } catch (err) {
    // Surface the real cause as JSON (200) so it shows in the cron logs instead of a bare 502.
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.split('\n').slice(0, 4).join(' | ') : undefined;
    return Response.json({ error: 'Recap run failed', message, stack }, { status: 200 });
  }
}
