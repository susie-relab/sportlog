'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Activity, ExerciseType, EXERCISE_TYPE_LABELS, EXERCISE_TYPE_COLORS } from '@/types';
import { formatDuration, daysAgo, calcDayStreak, calcWeekStreak } from '@/lib/utils';
import { PlanRecord, RUN_DISTANCE_LABELS, todaysSession, isRunSession, planSessionHref } from '@/lib/runPlanGenerator';
import { SESSION_COLORS, sessionTarget } from '@/components/PlanWeekTable';
import Link from 'next/link';

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
  const { user, signOut } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Today's scheduled sessions across active plans
  const todayISO = new Date().toISOString().split('T')[0];
  const todayPlanItems = plans
    .map(p => ({ plan: p, today: todaysSession(p, todayISO) }))
    .filter((x): x is { plan: PlanRecord; today: NonNullable<ReturnType<typeof todaysSession>> } => !!x.today);

  const now14 = daysAgo(14).split('T')[0];
  const last14 = activities.filter(a => a.date >= now14);

  // Streaks
  const dayStreak = calcDayStreak(activities.map(a => a.date));
  const weekStreak = calcWeekStreak(activities.map(a => a.date));

  // 14-day summaries
  const total14 = last14.length;
  const runs14 = last14.filter(a => a.exercise_type === 'run');
  const dist14 = last14.reduce((s, a) => s + (a.distance_km || 0), 0);
  const mins14 = last14.reduce((s, a) => s + a.duration_minutes, 0);
  const intensity14 = last14.reduce((s, a) => s + (a.intensity_minutes || 0), 0);

  // This week
  const todayStr = new Date().toISOString().split('T')[0];
  const weekStart = (() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  })();
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
  for (const a of last14) {
    byType[a.exercise_type] = (byType[a.exercise_type] || 0) + 1;
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return <div className="text-[#64748B] text-sm">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">{greeting()}{user?.user_metadata?.username ? `, ${user.user_metadata.username}` : ''} 👋</h1>
          <p className="text-[#64748B] text-sm mt-0.5">Here's your training at a glance</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/import" className="btn-secondary text-xs px-3 py-1.5">↑ Import</Link>
          <Link href="/profile" className="w-8 h-8 rounded-full bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#94A3B8] hover:border-[#475569] hover:text-white transition-colors text-sm">
            ⚙
          </Link>
          <button
            onClick={signOut}
            className="text-xs text-[#64748B] hover:text-white transition-colors px-2 py-1.5 rounded-lg border border-[#334155] hover:border-[#475569]"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Today's Plan */}
      {todayPlanItems.length > 0 && (
        <div className="card mb-5">
          <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">Today's Plan</h2>
          <div className="flex flex-col gap-2">
            {todayPlanItems.map(({ plan, today }) => {
              const s = today.session;
              const done = s.completed;
              const runnable = isRunSession(s);
              return (
                <div key={plan.id} className="flex items-center gap-3 py-2 px-3 rounded-lg border border-[#293548] bg-[#0F172A]">
                  <span className="w-1.5 h-9 rounded-full flex-shrink-0" style={{ background: SESSION_COLORS[s.type] }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold truncate ${done ? 'text-[#64748B] line-through' : 'text-white'}`}>{s.title}</span>
                      {done && <span className="text-green-400 text-xs">✓</span>}
                    </div>
                    <span className="text-xs text-[#64748B]">{RUN_DISTANCE_LABELS[plan.distance]}{sessionTarget(s) ? ` · ${sessionTarget(s)}` : ''}</span>
                  </div>
                  {runnable && !done && (
                    <Link href={planSessionHref(s, plan.id, today.week, today.day)}
                      className="btn-primary text-xs px-3 py-1.5 flex-shrink-0">Complete</Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Streaks */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="card text-center border-orange-500/30" style={{ background: 'rgba(249,115,22,0.08)' }}>
          <div className="text-3xl font-extrabold text-orange-400" style={{ fontFamily: 'var(--font-display)' }}>
            {dayStreak}
          </div>
          <div className="text-xs text-orange-400/70 mt-1 uppercase tracking-wide font-semibold">Day Streak 🔥</div>
        </div>
        <div className="card text-center border-yellow-500/30" style={{ background: 'rgba(234,179,8,0.08)' }}>
          <div className="text-3xl font-extrabold text-yellow-400" style={{ fontFamily: 'var(--font-display)' }}>
            {weekStreak}
          </div>
          <div className="text-xs text-yellow-400/70 mt-1 uppercase tracking-wide font-semibold">Week Streak ⚡</div>
        </div>
      </div>

      {/* 14-day snapshot */}
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

      {/* By type */}
      {Object.keys(byType).length > 0 && (
        <div className="card mb-5">
          <h2 className="text-sm font-semibold text-[#94A3B8] mb-3 uppercase tracking-wide">14-Day Breakdown</h2>
          <div className="flex flex-col gap-2">
            {(Object.entries(byType) as [ExerciseType, number][]).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: EXERCISE_TYPE_COLORS[type] }} />
                <span className="text-sm text-[#94A3B8] flex-1">{EXERCISE_TYPE_LABELS[type]}</span>
                <span className="text-sm font-semibold" style={{ color: EXERCISE_TYPE_COLORS[type] }}>{count}</span>
              </div>
            ))}
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
    </div>
  );
}
