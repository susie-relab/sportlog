'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Activity, ExerciseType, EXERCISE_TYPE_LABELS, EXERCISE_TYPE_COLORS, subTypeLabel, combinedRunTypeLabel, YearTotalTile } from '@/types';
import { formatDuration, daysAgo, calcDayStreak, calcWeekStreak, todayLocalISO } from '@/lib/utils';
import { PlanRecord, PlanData, Session, Weekday, runPlanDisplayName, todaysSession, nextSession, isRunSession, planSessionHref, WEEKDAYS, movePlanSession, addSessionToDay, sessionParts } from '@/lib/runPlanGenerator';
import PlanWeekTable, { sessionColor, sessionTarget, exerciseTypeTag } from '@/components/PlanWeekTable';
import PlanDaySheet from '@/components/PlanDaySheet';
import Link from 'next/link';
import Avatar from '@/components/Avatar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import RecapCard from '@/components/RecapCard';
import LastWeekSummaryCard from '@/components/LastWeekSummaryCard';
import FavouritesCard from '@/components/FavouritesCard';
import YearTotalsCard from '@/components/YearTotalsCard';

/** The subtype label for any activity — sub_type for most types, run_type for runs. */
function activitySubLabel(a: Activity): string | null {
  if (a.exercise_type === 'run') return combinedRunTypeLabel(a.run_type, a.run_type_modifier);
  return a.sub_type ? subTypeLabel(a.sub_type) : null;
}

// --- streak drill-down helpers ---
// Pure UTC-based calendar-date arithmetic — avoids the classic bug where round-tripping
// through a local-time Date + toISOString() shifts dates backward in timezones ahead of UTC.
type WeekStart = 'monday' | 'sunday';
function mondayOf(dateISO: string, startDay: WeekStart = 'monday'): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay();
  const diff = startDay === 'sunday' ? -day : (day === 0 ? -6 : 1 - day);
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().split('T')[0];
}
function addDaysLocal(dateISO: string, n: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().split('T')[0];
}
/** Last N days (oldest first), each marked active if any activity happened that day. */
function buildDayTimeline(dates: string[], count: number) {
  const set = new Set(dates);
  const today = todayLocalISO();
  return Array.from({ length: count }, (_, i) => {
    const date = addDaysLocal(today, -(count - 1 - i));
    return { date, active: set.has(date) };
  });
}
/** Last N week-start weeks (oldest first), each marked active if any activity fell in it. */
function buildWeekTimeline(dates: string[], count: number, startDay: WeekStart = 'monday') {
  const activeWeeks = new Set(dates.map(d => mondayOf(d, startDay)));
  const thisWeek = mondayOf(todayLocalISO(), startDay);
  return Array.from({ length: count }, (_, i) => {
    const weekStart = addDaysLocal(thisWeek, -(count - 1 - i) * 7);
    return { date: weekStart, active: activeWeeks.has(weekStart) };
  });
}
/** The date/week the current active streak began (walking backward from today until a gap). */
function currentStreakStart(dates: string[], unit: 'day' | 'week', startDay: WeekStart = 'monday'): string | null {
  const keyOf = unit === 'day' ? (d: string) => d : (d: string) => mondayOf(d, startDay);
  const set = new Set(dates.map(keyOf));
  const step = unit === 'day' ? -1 : -7;
  let cur = keyOf(todayLocalISO());
  if (!set.has(cur)) {
    const prev = addDaysLocal(cur, step);
    if (!set.has(prev)) return null;
    cur = prev;
  }
  let start = cur;
  while (set.has(addDaysLocal(start, step))) start = addDaysLocal(start, step);
  return start;
}
function fmtNice(dateISO: string): string {
  const [y, m, d] = dateISO.split('-');
  return `${d}/${m}/${y}`;
}

const planLabel = (p: PlanRecord) => p.plan_kind === 'run' ? runPlanDisplayName(p.distance, p.custom_distance_km) : (p.name || 'Custom Plan');
type DetailSel = { planId: string; week: number; day: Weekday };

interface Goal {
  period: string;
  target_runs?: number;
  target_distance_km?: number;
  target_minutes?: number;
  target_activities?: number;
}

function ProgressBar({ value, max, color = '#3B82F6' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full bg-[#0F172A] rounded-full h-2 overflow-hidden">
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function StatCard({ value, label, color = '#60A5FA' }: { value: string; label: string; color?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function DashPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<DetailSel | null>(null);
  const [showWeek, setShowWeek] = useState(false);
  const [streakModal, setStreakModal] = useState<'day' | 'week' | null>(null);
  const [hoverType, setHoverType] = useState<ExerciseType | null>(null);

  const detailPlan = detail ? plans.find(p => p.id === detail.planId) : undefined;
  const persistPlanData = async (planId: string, newData: PlanData) => {
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, plan_data: newData } : p));
    await supabase.from('training_plans').update({ plan_data: newData, updated_at: new Date().toISOString() }).eq('id', planId);
  };
  const persistDetailPlan = (newData: PlanData) => {
    if (!detailPlan) return;
    persistPlanData(detailPlan.id, newData);
  };
  const saveYearTotalTiles = (tiles: YearTotalTile[]) => {
    supabase.auth.updateUser({ data: { ...user?.user_metadata, year_total_tiles: tiles } });
  };

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('activities').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('goals').select('*').eq('user_id', user.id),
      supabase.from('training_plans').select('*').eq('user_id', user.id),
    ]).then(([{ data: acts }, { data: g }, { data: p }]) => {
      setActivities((acts as Activity[]) || []);
      setGoals((g as Goal[]) || []);
      setPlans((p as PlanRecord[]) || []);
      setLoading(false);
    });
  }, [user]);

  // Today's scheduled sessions across active plans (deactivated plans are hidden from the Dash)
  const todayISO = todayLocalISO();
  const activePlans = plans.filter(p => p.active);
  const todayPlanItems = activePlans
    .map(p => ({ plan: p, today: todaysSession(p, todayISO) }))
    .filter((x): x is { plan: PlanRecord; today: NonNullable<ReturnType<typeof todaysSession>> } => !!x.today);

  // Next upcoming run (strictly after today) across active run plans — the soonest one.
  const nextRun = activePlans
    .filter(p => p.plan_kind === 'run')
    .map(p => ({ plan: p, next: nextSession(p, todayISO, isRunSession, { after: true }) }))
    .filter((x): x is { plan: PlanRecord; next: NonNullable<ReturnType<typeof nextSession>> } => !!x.next)
    .sort((a, b) => a.next.dateISO.localeCompare(b.next.dateISO))[0] ?? null;
  const fmtDay = (iso: string) => {
    const [, m, d] = iso.split('-');
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(iso + 'T00:00:00').getDay()];
    return `${wd} ${d}/${m}`;
  };

  // This week's completion across active plans + whether today's sessions are done.
  const weekAgg = todayPlanItems.reduce((acc, { plan, today }) => {
    const wk = plan.plan_data.weeks.find(w => w.weekNumber === today.week);
    if (wk) for (const d of WEEKDAYS) if (isRunSession(wk.days[d])) { acc.total++; if (wk.days[d].completed) acc.done++; }
    return acc;
  }, { done: 0, total: 0 });
  const todaysRunnable = todayPlanItems.filter(x => isRunSession(x.today.session));
  const todayAllDone = todaysRunnable.length > 0 && todaysRunnable.every(x => x.today.session.completed);

  const now14 = daysAgo(14).split('T')[0];
  const last14 = activities.filter(a => a.date >= now14);

  // Streaks
  const weekStartPref: WeekStart = user?.user_metadata?.week_start_day === 'sunday' ? 'sunday' : 'monday';
  const dayStreak = calcDayStreak(activities.map(a => a.date));
  const weekStreak = calcWeekStreak(activities.map(a => a.date), weekStartPref);

  // Evening nudge: after the user's reminder hour, if there's a streak to protect but nothing logged today.
  const reminderOn = user?.user_metadata?.streak_reminder !== false; // default on
  const reminderHour = user?.user_metadata?.streak_reminder_hour ?? 17;
  const loggedToday = activities.some(a => a.date === todayLocalISO());
  const isEvening = new Date().getHours() >= reminderHour;
  const showStreakNudge = reminderOn && isEvening && !loggedToday && dayStreak > 0;

  // 14-day summaries
  const total14 = last14.length;
  const runs14 = last14.filter(a => a.exercise_type === 'run');
  const dist14 = last14.reduce((s, a) => s + (a.distance_km || 0), 0);
  const mins14 = last14.reduce((s, a) => s + a.duration_minutes, 0);
  const intensity14 = last14.reduce((s, a) => s + (a.intensity_minutes || 0), 0);

  // This week
  const todayStr = todayLocalISO();
  const weekStart = mondayOf(todayStr, weekStartPref);
  const thisWeek = activities.filter(a => a.date >= weekStart);
  const weekRuns = thisWeek.filter(a => a.exercise_type === 'run').length;
  const weekDist = thisWeek.reduce((s, a) => s + (a.distance_km || 0), 0);
  const weekMins = thisWeek.reduce((s, a) => s + a.duration_minutes, 0);
  const weekActivities = thisWeek.length;

  // This month
  const monthStart = todayStr.slice(0, 7) + '-01';
  const thisMonth = activities.filter(a => a.date >= monthStart);
  const monthRuns = thisMonth.filter(a => a.exercise_type === 'run').length;
  const monthDist = thisMonth.reduce((s, a) => s + (a.distance_km || 0), 0);
  const monthMins = thisMonth.reduce((s, a) => s + a.duration_minutes, 0);
  const monthActivities = thisMonth.length;

  const weekGoal = goals.find(g => g.period === 'week');
  const monthGoal = goals.find(g => g.period === 'month');

  // By type last 14 days
  const byType: Partial<Record<ExerciseType, number>> = {};
  const subtypeByType: Partial<Record<ExerciseType, Record<string, number>>> = {};
  for (const a of last14) {
    byType[a.exercise_type] = (byType[a.exercise_type] || 0) + 1;
    const key = activitySubLabel(a);
    if (key) {
      const bucket = subtypeByType[a.exercise_type] || (subtypeByType[a.exercise_type] = {});
      bucket[key] = (bucket[key] || 0) + 1;
    }
  }
  // Any type with a subtype breakdown but some activities logged with no subtype at all —
  // count those as "Generic" so the breakdown total matches the type's overall count.
  for (const type of Object.keys(subtypeByType) as ExerciseType[]) {
    const bucket = subtypeByType[type]!;
    const bucketTotal = Object.values(bucket).reduce((s, v) => s + v, 0);
    const total = byType[type] || 0;
    if (bucketTotal < total) bucket['Generic'] = total - bucketTotal;
  }
  const presentTypes14 = Object.keys(byType) as ExerciseType[];

  // 14-day stacked-by-type chart: one row per day, one key per activity type present.
  // Also keep a per-day, per-type subtype breakdown for the tooltip.
  const day14Details: Record<string, Partial<Record<ExerciseType, Record<string, number>>>> = {};
  const day14Chart = Array.from({ length: 14 }, (_, i) => {
    const date = addDaysLocal(todayLocalISO(), -(13 - i));
    const dayActs = activities.filter(a => a.date === date);
    const label = date.slice(5).split('-').reverse().join('/');
    const row: Record<string, number | string> = { date: label };
    const detail: Partial<Record<ExerciseType, Record<string, number>>> = {};
    for (const a of dayActs) {
      row[a.exercise_type] = ((row[a.exercise_type] as number) || 0) + 1;
      const key = activitySubLabel(a);
      if (key) {
        const bucket = detail[a.exercise_type] || (detail[a.exercise_type] = {});
        bucket[key] = (bucket[key] || 0) + 1;
      }
    }
    for (const type of Object.keys(detail) as ExerciseType[]) {
      const bucket = detail[type]!;
      const bucketTotal = Object.values(bucket).reduce((s, v) => s + v, 0);
      const total = (row[type] as number) || 0;
      if (bucketTotal < total) bucket['Generic'] = total - bucketTotal;
    }
    day14Details[label] = detail;
    return row;
  });

  // Streak drill-down timelines — window grows to fit the current streak, plus a
  // couple of extra slots so a gap before it is visible too, instead of clipping it.
  const allDates = activities.map(a => a.date);
  const dayTimeline = buildDayTimeline(allDates, Math.max(30, dayStreak + 2));
  const weekTimeline = buildWeekTimeline(allDates, Math.max(12, weekStreak + 2), weekStartPref);
  const dayStreakStart = currentStreakStart(allDates, 'day');
  const weekStreakStart = currentStreakStart(allDates, 'week', weekStartPref);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return <div className="text-[#64748B] text-sm">Loading...</div>;

  return (
    <div className="max-w-2xl lg:max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">{greeting()}{user?.user_metadata?.username ? `, ${user.user_metadata.username}` : ''} 👋</h1>
          <p className="text-[#64748B] text-sm mt-0.5">Here's your training at a glance</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/help" aria-label="Help" className="w-9 h-9 rounded-full bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#94A3B8] hover:border-[#475569] hover:text-white transition-colors text-base">
            ?
          </Link>
          <Link href="/settings" aria-label="Settings" className="w-9 h-9 rounded-full bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#94A3B8] hover:border-[#475569] hover:text-white transition-colors text-base">
            ⚙
          </Link>
          <Link href="/profile" aria-label="Profile" className="w-9 h-9 rounded-full border border-[#334155] hover:border-[#475569] transition-colors overflow-hidden flex items-center justify-center">
            <Avatar url={user?.user_metadata?.avatar_url} color={user?.user_metadata?.avatar_color} size={34} />
          </Link>
        </div>
      </div>

      <RecapCard activities={activities} plans={plans} weekStartDay={weekStartPref} todayISO={todayISO} />

      {/* Evening reminder to protect the current day streak */}
      {showStreakNudge && (
        <Link href="/add" className="flex items-center gap-3 mb-5 p-3 rounded-xl border border-orange-500/40 hover:border-orange-500/70 transition-colors" style={{ background: 'rgba(249,115,22,0.1)' }}>
          <span className="text-2xl flex-shrink-0">🔥</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-orange-300">Don&apos;t lose your streak — log exercise today!</p>
            <p className="text-xs text-orange-400/70 mt-0.5">You&apos;re on a {dayStreak}-day streak. Tap to log an activity.</p>
          </div>
        </Link>
      )}

      {/* Streaks — tap to see when the streak started/broke */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button onClick={() => setStreakModal('day')} className="card text-center border-orange-500/30 hover:border-orange-500/60 transition-colors" style={{ background: 'rgba(249,115,22,0.08)' }}>
          <div className="text-3xl font-extrabold text-orange-400" style={{ fontFamily: 'var(--font-display)' }}>
            {dayStreak}
          </div>
          <div className="text-xs text-orange-400/70 mt-1 uppercase tracking-wide font-semibold">Day Streak 🔥</div>
        </button>
        <button onClick={() => setStreakModal('week')} className="card text-center border-yellow-500/30 hover:border-yellow-500/60 transition-colors" style={{ background: 'rgba(234,179,8,0.08)' }}>
          <div className="text-3xl font-extrabold text-yellow-400" style={{ fontFamily: 'var(--font-display)' }}>
            {weekStreak}
          </div>
          <div className="text-xs text-yellow-400/70 mt-1 uppercase tracking-wide font-semibold">Week Streak ⚡</div>
        </button>
      </div>

      {/* This Year — full width on mobile; moves beside Today's Plan on desktop (see grid below) */}
      <div className="lg:hidden">
        <YearTotalsCard activities={activities} config={user?.user_metadata?.year_total_tiles} onSave={saveYearTotalTiles} />
      </div>

      {/* Desktop: today's plan + this year side by side instead of one long column */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start">
      <div>
      {/* Today's Plan / what's next */}
      {(todayPlanItems.length > 0 || nextRun) && (
        <div className="card mb-5">
          <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">
            {todayPlanItems.length > 0 ? "Today's Plan" : 'Up Next'}
          </h2>
          <div className="flex flex-col gap-2">
            {todayPlanItems.map(({ plan, today }) => {
              const s = today.session;
              const done = s.completed;
              const runnable = isRunSession(s);
              return (
                <div key={plan.id} className="flex items-center gap-3 py-2 px-3 rounded-lg border border-[#293548] bg-[#0F172A]">
                  <span className="w-1.5 h-9 rounded-full flex-shrink-0" style={{ background: sessionColor(s) }} />
                  <button onClick={() => setDetail({ planId: plan.id, week: today.week, day: today.day })} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold truncate ${done ? 'text-[#64748B] line-through' : 'text-white'}`}>{s.title}</span>
                      {done && <span className="text-green-400 text-xs">✓</span>}
                    </div>
                    <span className="text-xs text-[#64748B]">{planLabel(plan)}{sessionTarget(s) ? ` · ${sessionTarget(s)}` : ''} · tap for details</span>
                  </button>
                  {runnable && !done && (
                    <Link href={planSessionHref(s, plan.id, today.week, today.day, undefined, true)}
                      className="btn-primary text-xs px-3 py-1.5 flex-shrink-0">Complete</Link>
                  )}
                </div>
              );
            })}

            {/* Next run (upcoming) */}
            {nextRun && todayPlanItems.length > 0 && <div className="divider-strong my-1" />}
            {nextRun && (
              <div>
                <span className="text-[10px] font-semibold text-[#64748B] uppercase">Next Run · {fmtDay(nextRun.next.dateISO)}</span>
                <div className="flex items-center gap-3 py-2 px-3 mt-1 rounded-lg border border-[#293548] bg-[#0F172A]">
                  <span className="w-1.5 h-9 rounded-full flex-shrink-0" style={{ background: sessionColor(nextRun.next.session) }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-white truncate block">{nextRun.next.session.title}</span>
                    <span className="text-xs text-[#64748B]">{planLabel(nextRun.plan)}{sessionTarget(nextRun.next.session) ? ` · ${sessionTarget(nextRun.next.session)}` : ''}</span>
                  </div>
                  <Link href={planSessionHref(nextRun.next.session, nextRun.plan.id, nextRun.next.week, nextRun.next.day, undefined, true)}
                    className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0">Log</Link>
                </div>
              </div>
            )}
          </div>

          {/* Week progress + today nudge */}
          {weekAgg.total > 0 && (
            <div className="mt-3 pt-3 border-t border-[#293548]">
              {todayAllDone && <p className="text-xs text-green-400 font-medium mb-2">✓ Today's sessions done — nice work! 🎉</p>}
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[#64748B]">This week</span>
                <span className="text-xs text-[#94A3B8] font-semibold">{weekAgg.done} of {weekAgg.total} done</span>
              </div>
              <div className="w-full bg-[#0F172A] rounded-full h-1.5 overflow-hidden">
                <div className="h-1.5 rounded-full bg-green-500 transition-all" style={{ width: `${Math.round((weekAgg.done / weekAgg.total) * 100)}%` }} />
              </div>
            </div>
          )}

        </div>
      )}

      </div>

      <div className="hidden lg:block">
      <YearTotalsCard activities={activities} config={user?.user_metadata?.year_total_tiles} onSave={saveYearTotalTiles} />
      </div>
      </div>

      {/* This week's plan — one PlanWeekTable per active plan, so drag-to-reorder (press and
          hold anywhere, works on touch too) and cross-week moves work exactly like the
          full Training Plan view. Full width (like YearTotalsCard above) so the week table
          has room to breathe instead of being squeezed into half the desktop layout. */}
      {todayPlanItems.length > 0 && (
        <div className="card mb-5">
          <button onClick={() => setShowWeek(v => !v)} className="text-sm font-semibold text-[#94A3B8] hover:text-white transition-colors uppercase tracking-wide">
            {showWeek ? '▼' : '▶'} This Week&apos;s Plan
          </button>
          {showWeek && (
            <div className="mt-3 flex flex-col gap-4">
              {todayPlanItems.map(({ plan, today }) => {
                const week = plan.plan_data.weeks.find(w => w.weekNumber === today.week);
                if (!week) return null;
                return (
                  <div key={plan.id}>
                    <p className="text-xs font-semibold text-white mb-1.5">{planLabel(plan)}</p>
                    <PlanWeekTable
                      plan={{ weeks: [week] }}
                      currentWeek={today.week}
                      onDayClick={(w, d) => setDetail({ planId: plan.id, week: w, day: d })}
                      onMove={(fromWeek, from, toWeek, to) => persistPlanData(plan.id, movePlanSession(plan.plan_data, { week: fromWeek, day: from }, { week: toWeek, day: to }))}
                      onAdd={(fromWeek, from, toWeek, to) => persistPlanData(plan.id, addSessionToDay(plan.plan_data, { week: fromWeek, day: from }, { week: toWeek, day: to }))}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <LastWeekSummaryCard activities={activities} plans={plans} weekStartDay={weekStartPref} todayISO={todayISO} />
      <FavouritesCard favourites={user?.user_metadata?.favourite_activities ?? []} activities={activities} />

      {/* 14-day snapshot — sits directly above the 14-Day Activity Mix chart below */}
      <h2 className="text-sm font-semibold text-[#64748B] uppercase tracking-wide mb-3">Last 14 Days</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard value={String(total14)} label="Activities" />
        <StatCard value={String(runs14.length)} label="Runs" />
        <StatCard value={`${dist14.toFixed(1)}`} label="km" />
        <StatCard value={formatDuration(mins14)} label="Total Time" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard value={String(intensity14)} label="Intensity Mins" color="#06B6D4" />
        <StatCard value={String(total14 > 0 ? Math.round(dist14 / total14 * 10) / 10 : 0)} label="Avg km/session" color="#A78BFA" />
      </div>

      {/* 14-day activity mix — stacked by type, one bar per day (full width) */}
      {presentTypes14.length > 0 && (
        <div className="card mb-5">
          <h2 className="text-sm font-semibold text-[#94A3B8] mb-3 uppercase tracking-wide">14-Day Activity Mix</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={day14Chart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} width={24} />
              <Tooltip
                contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, color: '#F1F5F9', fontSize: 12 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const detail = day14Details[label as string] || {};
                  return (
                    <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px', fontSize: 12 }}>
                      <p style={{ color: '#F1F5F9', marginBottom: 4 }}>{label}</p>
                      {payload.map(p => {
                        const t = p.dataKey as ExerciseType;
                        const subs = detail[t];
                        return (
                          <div key={t} style={{ marginBottom: 2 }}>
                            <span style={{ color: p.color }}>{EXERCISE_TYPE_LABELS[t]} : {p.value}</span>
                            {subs && Object.entries(subs).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                              <div key={k} style={{ color: '#94A3B8', marginLeft: 10, fontSize: 11 }}>{k} : {v}</div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                }}
              />
              {presentTypes14.map(t => (
                <Bar key={t} dataKey={t} stackId="a" fill={EXERCISE_TYPE_COLORS[t]} name={EXERCISE_TYPE_LABELS[t]} radius={presentTypes14[presentTypes14.length - 1] === t ? [3, 3, 0, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* By type */}
      {Object.keys(byType).length > 0 && (
        <div className="card mb-5">
          <h2 className="text-sm font-semibold text-[#94A3B8] mb-3 uppercase tracking-wide">14-Day Breakdown</h2>
          <div className="flex flex-col gap-2">
            {(Object.entries(byType) as [ExerciseType, number][]).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
              const subs = subtypeByType[type];
              return (
                <div key={type} className="relative flex items-center gap-3"
                  onMouseEnter={() => subs && setHoverType(type)}
                  onMouseLeave={() => setHoverType(null)}
                  onClick={() => subs && setHoverType(h => h === type ? null : type)}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: EXERCISE_TYPE_COLORS[type] }} />
                  <span className={`text-sm text-[#94A3B8] flex-1 ${subs ? 'cursor-pointer underline decoration-dotted underline-offset-4' : ''}`}>{EXERCISE_TYPE_LABELS[type]}</span>
                  <span className="text-sm font-semibold" style={{ color: EXERCISE_TYPE_COLORS[type] }}>{count}</span>
                  {subs && hoverType === type && (
                    <div className="absolute right-0 top-full mt-1 z-10 bg-[#1E293B] border border-[#334155] rounded-lg p-2.5 text-xs shadow-lg min-w-[10rem]">
                      {Object.entries(subs).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4 py-0.5">
                          <span className="text-[#94A3B8]">{k}</span>
                          <span className="text-white font-semibold">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly goals progress */}
      {weekGoal && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wide">This Week's Goals</h2>
            <span className="text-xs text-[#475569]">resets Monday</span>
          </div>
          <div className="flex flex-col gap-4">
            {weekGoal.target_runs && (
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-[#94A3B8]">Runs</span>
                  <span className="font-semibold text-white">{weekRuns} / {weekGoal.target_runs}</span>
                </div>
                <ProgressBar value={weekRuns} max={weekGoal.target_runs} color="#3B82F6" />
              </div>
            )}
            {weekGoal.target_distance_km && (
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-[#94A3B8]">Distance</span>
                  <span className="font-semibold text-white">{weekDist.toFixed(1)} / {weekGoal.target_distance_km} km</span>
                </div>
                <ProgressBar value={weekDist} max={weekGoal.target_distance_km} color="#60A5FA" />
              </div>
            )}
            {weekGoal.target_minutes && (
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-[#94A3B8]">Time</span>
                  <span className="font-semibold text-white">{formatDuration(weekMins)} / {formatDuration(weekGoal.target_minutes)}</span>
                </div>
                <ProgressBar value={weekMins} max={weekGoal.target_minutes} color="#1D4ED8" />
              </div>
            )}
            {weekGoal.target_activities && (
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-[#94A3B8]">Activities</span>
                  <span className="font-semibold text-white">{weekActivities} / {weekGoal.target_activities}</span>
                </div>
                <ProgressBar value={weekActivities} max={weekGoal.target_activities} color="#22C55E" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Monthly goals progress */}
      {monthGoal && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wide">This Month's Goals</h2>
            <span className="text-xs text-[#475569]">{new Date().toLocaleDateString('en-NZ', { month: 'long' })}</span>
          </div>
          <div className="flex flex-col gap-4">
            {monthGoal.target_runs && (
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-[#94A3B8]">Runs</span>
                  <span className="font-semibold text-white">{monthRuns} / {monthGoal.target_runs}</span>
                </div>
                <ProgressBar value={monthRuns} max={monthGoal.target_runs} color="#3B82F6" />
              </div>
            )}
            {monthGoal.target_distance_km && (
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-[#94A3B8]">Distance</span>
                  <span className="font-semibold text-white">{monthDist.toFixed(1)} / {monthGoal.target_distance_km} km</span>
                </div>
                <ProgressBar value={monthDist} max={monthGoal.target_distance_km} color="#60A5FA" />
              </div>
            )}
            {monthGoal.target_minutes && (
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-[#94A3B8]">Time</span>
                  <span className="font-semibold text-white">{formatDuration(monthMins)} / {formatDuration(monthGoal.target_minutes)}</span>
                </div>
                <ProgressBar value={monthMins} max={monthGoal.target_minutes} color="#1D4ED8" />
              </div>
            )}
            {monthGoal.target_activities && (
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-[#94A3B8]">Activities</span>
                  <span className="font-semibold text-white">{monthActivities} / {monthGoal.target_activities}</span>
                </div>
                <ProgressBar value={monthActivities} max={monthGoal.target_activities} color="#22C55E" />
              </div>
            )}
          </div>
        </div>
      )}

      {!weekGoal && !monthGoal && (
        <div className="card border-dashed border-[#334155] text-center py-6">
          <p className="text-[#64748B] text-sm">No goals set yet.</p>
          <a href="/training-plan" className="text-blue-400 text-sm mt-1 block hover:text-blue-300">Set your training goals →</a>
        </div>
      )}

      {/* Planned session detail — view, edit, complete, or reorder */}
      {detail && detailPlan && (
        <PlanDaySheet
          data={detailPlan.plan_data}
          selected={{ week: detail.week, day: detail.day }}
          onSave={persistDetailPlan}
          onClose={() => setDetail(null)}
          onLogAndComplete={(s, partIndex) => router.push(planSessionHref(s, detailPlan.id, detail.week, detail.day, partIndex, true))}
        />
      )}

      {/* Streak drill-down: when did the current streak start, and where were the gaps */}
      {streakModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setStreakModal(null)} />
          <div className="relative w-full md:max-w-md bg-[#1E293B] border border-[#334155] rounded-t-2xl md:rounded-2xl p-5">
            <h3 className="text-lg font-bold text-white mb-1">{streakModal === 'day' ? 'Day Streak' : 'Week Streak'}</h3>
            <p className="text-sm text-[#94A3B8] mb-4">
              {streakModal === 'day'
                ? (dayStreakStart ? <>Current streak started <strong className="text-white">{fmtNice(dayStreakStart)}</strong> ({dayStreak} day{dayStreak === 1 ? '' : 's'}).</> : 'No active streak — log something today to start one!')
                : (weekStreakStart ? <>Current streak started the week of <strong className="text-white">{fmtNice(weekStreakStart)}</strong> ({weekStreak} week{weekStreak === 1 ? '' : 's'}).</> : 'No active streak — log something this week to start one!')}
            </p>
            <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-2">
              {streakModal === 'day' ? `Last ${dayTimeline.length} days` : `Last ${weekTimeline.length} weeks`}
            </p>
            <div className={`grid gap-1 ${streakModal === 'day' ? 'grid-cols-10' : 'grid-cols-12'}`}>
              {(streakModal === 'day' ? dayTimeline : weekTimeline).map(({ date, active }) => (
                <div key={date} title={fmtNice(date)}
                  className={`aspect-square rounded ${active ? (streakModal === 'day' ? 'bg-orange-400' : 'bg-yellow-400') : 'bg-[#293548]'}`} />
              ))}
            </div>
            <p className="text-xs text-[#475569] mt-3">Gaps (grey) show where the streak broke before restarting.</p>
            <button onClick={() => setStreakModal(null)} className="text-sm text-[#64748B] hover:text-white py-1 mt-3">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
