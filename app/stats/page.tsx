'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Activity, ExerciseType, EXERCISE_TYPE_LABELS, EXERCISE_TYPE_COLORS } from '@/types';
import { formatDuration, daysAgo } from '@/lib/utils';

const CHART_BLUES: Record<ExerciseType, string> = {
  run:          '#3B82F6',
  swim:         '#22D3EE',
  bike:         '#60A5FA',
  sport:        '#818CF8',
  walk:         '#93C5FD',
  hiit:         '#1D4ED8',
  stretch:      '#BAE6FD',
  solo_fitness: '#38BDF8',
  snow:         '#BFDBFE',
  water:        '#0EA5E9',
};

function StatTile({ value, label, delta }: { value: string; label: string; delta?: { text: string; positive: boolean } | null }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {delta && (
        <div className={`text-[11px] mt-0.5 ${delta.positive ? 'text-green-400' : 'text-red-400'}`}>{delta.text} vs prior</div>
      )}
    </div>
  );
}

function diff(curr: number, prev: number, fmt: (n: number) => string) {
  const d = curr - prev;
  if (d === 0) return null;
  return { text: `${d > 0 ? '+' : ''}${fmt(d)}`, positive: d > 0 };
}

export default function StatsPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', daysAgo(60).split('T')[0])
      .order('date', { ascending: false })
      .then(({ data }) => {
        setActivities((data as Activity[]) || []);
        setLoading(false);
      });
  }, [user]);

  const cutoff = daysAgo(14).split('T')[0];
  const priorCutoff = daysAgo(28).split('T')[0];
  const current = activities.filter(a => a.date >= cutoff);
  const prior = activities.filter(a => a.date >= priorCutoff && a.date < cutoff);

  const totalActivities   = current.length;
  const totalDistanceKm   = current.reduce((s, a) => s + (a.distance_km || 0), 0);
  const totalMinutes      = current.reduce((s, a) => s + a.duration_minutes, 0);
  const totalIntensityMins = current.reduce((s, a) => s + (a.intensity_minutes || 0), 0);

  const priorActivities    = prior.length;
  const priorDistanceKm    = prior.reduce((s, a) => s + (a.distance_km || 0), 0);
  const priorMinutes       = prior.reduce((s, a) => s + a.duration_minutes, 0);
  const priorIntensityMins = prior.reduce((s, a) => s + (a.intensity_minutes || 0), 0);

  const allDates = new Set(activities.map(a => a.date));
  const activeDayCount = new Set(current.map(a => a.date)).size;

  const todayStr = new Date().toISOString().split('T')[0];
  let streak = 0;
  const streakStart = allDates.has(todayStr) ? 0 : 1;
  for (let i = streakStart; i < 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (allDates.has(d.toISOString().split('T')[0])) streak++;
    else break;
  }

  const byType: Partial<Record<ExerciseType, number>> = {};
  for (const a of current) {
    byType[a.exercise_type] = (byType[a.exercise_type] || 0) + 1;
  }

  const maxMins = Math.max(...current.map(a => a.duration_minutes), 1);

  if (loading) return <div className="text-[#64748B] text-sm">Loading...</div>;

  const chartTypes = (Object.keys(CHART_BLUES) as ExerciseType[]).filter(t => current.some(a => a.exercise_type === t));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-xl font-bold text-white">Last 14 Days</h1>
        <span className="text-xs text-[#64748B] bg-[#1E293B] border border-[#334155] px-2 py-1 rounded">
          {new Date(cutoff).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })} → Today
        </span>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatTile value={String(totalActivities)} label="Activities"
          delta={diff(totalActivities, priorActivities, n => String(Math.abs(n)))} />
        <StatTile value={totalDistanceKm.toFixed(1)} label="km Total"
          delta={diff(totalDistanceKm, priorDistanceKm, n => `${Math.abs(n).toFixed(1)} km`)} />
        <StatTile value={formatDuration(totalMinutes)} label="Total Time"
          delta={diff(totalMinutes, priorMinutes, n => formatDuration(Math.abs(n)))} />
        <StatTile value={String(totalIntensityMins)} label="Intensity Mins"
          delta={diff(totalIntensityMins, priorIntensityMins, n => String(Math.abs(n)))} />
      </div>

      {/* Consistency */}
      <div className="flex items-center gap-2 mb-6 px-1 text-sm text-[#94A3B8]">
        <span>{activeDayCount} of 14 days active</span>
        {streak > 0 && (
          <>
            <span className="text-[#334155]">·</span>
            <span>{streak} day streak 🔥</span>
          </>
        )}
      </div>

      {/* By exercise type */}
      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-[#94A3B8] mb-4 uppercase tracking-wide">By Exercise Type</h2>
        {Object.entries(byType).length === 0 ? (
          <p className="text-[#64748B] text-sm">No activities in the last 14 days.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {(Object.entries(byType) as [ExerciseType, number][]).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
              const typeActivities = current.filter(a => a.exercise_type === type);
              const dist = typeActivities.reduce((s, a) => s + (a.distance_km || 0), 0);
              const mins = typeActivities.reduce((s, a) => s + a.duration_minutes, 0);
              const color = EXERCISE_TYPE_COLORS[type];
              return (
                <div key={type} className="flex items-center gap-3">
                  <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{EXERCISE_TYPE_LABELS[type]}</span>
                      <span className="text-sm font-bold" style={{ color }}>{count} session{count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex gap-3 mt-0.5">
                      {dist > 0 && <span className="text-xs text-[#64748B]">{dist.toFixed(1)} km</span>}
                      <span className="text-xs text-[#64748B]">{formatDuration(mins)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Daily bar chart */}
      <div className="card">
        <h2 className="text-sm font-semibold text-[#94A3B8] mb-4 uppercase tracking-wide">Daily Activity</h2>
        <div className="flex gap-1 items-end h-16">
          {Array.from({ length: 14 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (13 - i));
            const dateStr = d.toISOString().split('T')[0];
            const dayActivities = current.filter(a => a.date === dateStr);
            const dayMins = dayActivities.reduce((s, a) => s + a.duration_minutes, 0);
            const height = dayMins > 0 ? Math.max(4, (dayMins / maxMins) * 56) : 2;
            const dominant = [...dayActivities].sort((a, b) => b.duration_minutes - a.duration_minutes)[0];
            const barColor = dominant ? CHART_BLUES[dominant.exercise_type] : undefined;
            return (
              <div key={dateStr} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm transition-all"
                  style={{
                    height,
                    background: dayActivities.length > 0 ? barColor : '#1E293B',
                    border: dayActivities.length === 0 ? '1px solid #334155' : 'none',
                  }}
                />
                {i % 2 === 0 && (
                  <span className="text-[8px] text-[#475569]">{d.getDate()}</span>
                )}
              </div>
            );
          })}
        </div>
        {chartTypes.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
            {chartTypes.map(t => (
              <div key={t} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_BLUES[t] }} />
                <span className="text-[10px] text-[#64748B]">{EXERCISE_TYPE_LABELS[t]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
