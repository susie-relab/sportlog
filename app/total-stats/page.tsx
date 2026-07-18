'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Activity, ExerciseType, EXERCISE_TYPE_LABELS, EXERCISE_TYPE_COLORS, subTypeLabel, RUN_TYPE_LABELS } from '@/types';
import { formatDuration, formatPaceMinKm, formatDistance } from '@/lib/utils';
import AccountSwitcher from '@/components/AccountSwitcher';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

function weekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().split('T')[0];
}

/** Group activities into Monday-start weeks and aggregate a picked numeric field. */
function weeklySeries(acts: Activity[], pick: (a: Activity) => number | null | undefined, mode: 'sum' | 'avg' | 'max'): { week: string; value: number }[] {
  const groups: Record<string, number[]> = {};
  for (const a of acts) {
    const v = pick(a);
    if (v == null) continue;
    const k = weekKey(a.date);
    (groups[k] ||= []).push(v);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([week, vals]) => ({
    week: new Date(week + 'T00:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }),
    value: mode === 'sum' ? Math.round(vals.reduce((s, v) => s + v, 0) * 10) / 10
      : mode === 'avg' ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100
      : Math.max(...vals),
  }));
}

/** Count sessions per sub-type (splitting comma-joined multi-select values like gym focus). */
function subTypeBreakdown(acts: Activity[]): { name: string; count: number; exerciseType: ExerciseType }[] {
  const counts: Record<string, number> = {};
  const typeOf: Record<string, ExerciseType> = {};
  for (const a of acts) {
    if (a.exercise_type === 'run') {
      if (a.run_type) {
        const label = RUN_TYPE_LABELS[a.run_type];
        counts[label] = (counts[label] || 0) + 1;
        typeOf[label] = 'run';
      }
      continue;
    }
    if (!a.sub_type) continue;
    for (const key of a.sub_type.split(',')) {
      const label = subTypeLabel(key.trim());
      if (label) {
        counts[label] = (counts[label] || 0) + 1;
        typeOf[label] = a.exercise_type;
      }
    }
  }
  return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 8)
    .map(([name, count]) => ({ name, count, exerciseType: typeOf[name] }));
}

type Period = '30d' | '3m' | '6m' | '1y' | 'all';

const PERIODS: { value: Period; label: string }[] = [
  { value: '30d', label: '30 Days' },
  { value: '3m', label: '3 Months' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: 'Past Year' },
  { value: 'all', label: 'All Time' },
];

const ALL_TYPES: ExerciseType[] = ['run', 'walk', 'sport', 'hiit', 'stretch', 'bike', 'swim', 'solo_fitness'];

type ChartMetric = 'count' | 'distance' | 'minutes' | 'intensity';

const METRIC_OPTIONS: { value: ChartMetric; label: string; color: string }[] = [
  { value: 'count', label: 'Activities', color: '#3B82F6' },
  { value: 'distance', label: 'Distance', color: '#60A5FA' },
  { value: 'minutes', label: 'Time', color: '#1D4ED8' },
  { value: 'intensity', label: 'Intensity', color: '#06B6D4' },
];

function getStartDate(period: Period): string | null {
  if (period === 'all') return null;
  const d = new Date();
  if (period === '30d') d.setDate(d.getDate() - 30);
  else if (period === '3m') d.setMonth(d.getMonth() - 3);
  else if (period === '6m') d.setMonth(d.getMonth() - 6);
  else if (period === '1y') d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split('T')[0];
}

function getChartData(acts: Activity[], metric: ChartMetric) {
  const map: Record<string, number> = {};
  for (const a of acts) {
    const month = a.date.slice(0, 7);
    map[month] = (map[month] || 0) + (
      metric === 'count' ? 1 :
      metric === 'distance' ? (a.distance_km || 0) :
      metric === 'minutes' ? a.duration_minutes :
      (a.intensity_minutes || 0)
    );
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({
    month: new Date(month + '-01').toLocaleDateString('en-NZ', { month: 'short', year: '2-digit' }),
    value: metric === 'distance' ? parseFloat(value.toFixed(1)) : Math.round(value),
  }));
}

function getBestWeek(acts: Activity[]): { count: number; start: string; end: string } | null {
  if (acts.length === 0) return null;
  const dates = [...new Set(acts.map(a => a.date))].sort();
  let best = { count: 0, start: '', end: '' };
  for (const d of dates) {
    const start = new Date(d);
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    const endStr = end.toISOString().split('T')[0];
    const count = acts.filter(a => a.date >= d && a.date <= endStr).length;
    if (count > best.count) {
      best = {
        count,
        start: start.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }),
        end: end.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }),
      };
    }
  }
  return best.count > 0 ? best : null;
}

// Pure UTC calendar-date arithmetic — avoids shifting dates backward in timezones ahead of UTC.
function mondayOfUTC(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay();
  dt.setUTCDate(dt.getUTCDate() - day + (day === 0 ? -6 : 1));
  return dt.toISOString().split('T')[0];
}

function getLongestWeekStreak(acts: Activity[]): number {
  if (acts.length === 0) return 0;
  const weekKeys = [...new Set(acts.map(a => mondayOfUTC(a.date)))].sort();
  let max = 1, cur = 1;
  for (let i = 1; i < weekKeys.length; i++) {
    const prev = new Date(weekKeys[i - 1] + 'T00:00:00Z').getTime();
    const curr = new Date(weekKeys[i] + 'T00:00:00Z').getTime();
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (diffDays === 7) {
      cur++;
      if (cur > max) max = cur;
    } else {
      cur = 1;
    }
  }
  return max;
}

function getLongestStreak(acts: Activity[]): number {
  if (acts.length === 0) return 0;
  const days = [...new Set(acts.map(a => a.date))].sort();
  let max = 1, cur = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      cur++;
      if (cur > max) max = cur;
    } else {
      cur = 1;
    }
  }
  return max;
}

const TooltipStyle = { background: '#1E293B', border: '1px solid #334155', borderRadius: 8, color: '#F1F5F9', fontSize: 12 };

export default function TotalStatsPage() {
  const { user } = useAuth();
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [period, setPeriod] = useState<Period>('30d');
  const [filterType, setFilterType] = useState<ExerciseType | 'all'>('all');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('count');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .then(({ data }) => {
        setAllActivities((data as Activity[]) || []);
        setLoading(false);
      });
  }, [user]);

  const startDate = getStartDate(period);
  const periodActivities = startDate
    ? allActivities.filter(a => a.date >= startDate)
    : allActivities;

  const activities = filterType === 'all'
    ? periodActivities
    : periodActivities.filter(a => a.exercise_type === filterType);

  const totalActivities = activities.length;
  const totalKm = activities.reduce((s, a) => s + (a.distance_km || 0), 0);
  // Swim distance is shown in metres everywhere else in the app — match that here too,
  // since km summed across many swims (a few hundred metres each) reads as tiny/confusing.
  const totalDistLabel = filterType === 'swim' ? 'Total m' : 'Total km';
  const totalDistValue = filterType === 'swim' ? String(Math.round(totalKm * 1000)) : totalKm.toFixed(1);
  const totalMinutes = activities.reduce((s, a) => s + a.duration_minutes, 0);
  const totalIntensity = activities.reduce((s, a) => s + (a.intensity_minutes || 0), 0);
  const avgDuration = totalActivities > 0 ? Math.round(totalMinutes / totalActivities) : 0;
  const avgEffort = totalActivities > 0
    ? (activities.reduce((s, a) => s + a.effort, 0) / totalActivities)
    : 0;

  const runActivities = activities.filter(a => a.exercise_type === 'run' && a.pace_min_km);
  const avgPace = runActivities.length > 0
    ? runActivities.reduce((s, a) => s + (a.pace_min_km || 0), 0) / runActivities.length
    : null;

  const totalRuns = periodActivities.filter(a => a.exercise_type === 'run').length;

  const byType = ALL_TYPES.map(type => {
    const typeActs = periodActivities.filter(a => a.exercise_type === type);
    const dist = typeActs.reduce((s, a) => s + (a.distance_km || 0), 0);
    const mins = typeActs.reduce((s, a) => s + a.duration_minutes, 0);
    return { type, count: typeActs.length, dist, mins };
  }).filter(t => t.count > 0).sort((a, b) => b.count - a.count);

  const chartData = getChartData(activities, chartMetric);
  const activeMetric = METRIC_OPTIONS.find(m => m.value === chartMetric)!;

  const bestWeek = getBestWeek(allActivities);
  const streak = getLongestStreak(allActivities);
  const weekStreak = getLongestWeekStreak(allActivities);

  // Extra charts (respect the current period + type filter via `activities`)
  const weeklyDistance = weeklySeries(activities, a => a.distance_km, 'sum');
  const weeklyIntensity = weeklySeries(activities, a => a.intensity_minutes, 'sum');
  const weeklyEffort = weeklySeries(activities, a => a.effort, 'avg');
  const weeklyMaxHr = weeklySeries(activities, a => a.max_hr, 'max');
  const weeklyPace = weeklySeries(activities.filter(a => a.exercise_type === 'run'), a => a.pace_min_km, 'avg');
  const subtypeData = subTypeBreakdown(activities);

  if (loading) return <div className="text-[#64748B] text-sm">Loading...</div>;

  return (
    <div className="max-w-2xl lg:max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5 gap-2 flex-wrap">
        <h1 className="text-xl font-bold text-white">Stats</h1>
        <AccountSwitcher compact />
      </div>

      {/* Period selector */}
      <div className="flex gap-2 flex-wrap mb-4">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
              period === p.value
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Activity type filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            filterType === 'all'
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
          }`}
        >
          All
        </button>
        {ALL_TYPES.filter(t => periodActivities.some(a => a.exercise_type === t)).map(type => {
          const color = EXERCISE_TYPE_COLORS[type];
          const active = filterType === type;
          return (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
              style={{
                borderColor: active ? color : '#334155',
                color: active ? '#fff' : color,
                background: active ? color : 'transparent',
              }}
            >
              {EXERCISE_TYPE_LABELS[type]}
            </button>
          );
        })}
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="stat-card">
          <div className="stat-value">{totalActivities}</div>
          <div className="stat-label">Activities</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalDistValue}</div>
          <div className="stat-label">{totalDistLabel}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatDuration(totalMinutes)}</div>
          <div className="stat-label">Total Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalIntensity}</div>
          <div className="stat-label">Intensity Mins</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatDuration(avgDuration)}</div>
          <div className="stat-label">Avg Duration</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{avgEffort > 0 ? avgEffort.toFixed(1) : '—'}</div>
          <div className="stat-label">Avg Effort</div>
        </div>
        {(filterType === 'run' || filterType === 'all') && (
          <div className="stat-card">
            <div className="stat-value">{avgPace ? formatPaceMinKm(avgPace) : '—'}</div>
            <div className="stat-label">Avg Pace</div>
          </div>
        )}
        {filterType === 'all' && (
          <div className="stat-card">
            <div className="stat-value">{totalRuns}</div>
            <div className="stat-label">Total Runs</div>
          </div>
        )}
      </div>

      {/* By Exercise Type */}
      {filterType === 'all' && byType.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-[#94A3B8] mb-4 uppercase tracking-wide">By Exercise Type</h2>
          <div className="flex flex-col gap-3">
            {byType.map(({ type, count, dist, mins }) => {
              const color = EXERCISE_TYPE_COLORS[type];
              const hours = Math.floor(mins / 60);
              const remainMins = mins % 60;
              return (
                <div key={type} className="flex items-center gap-3">
                  <div className="w-1.5 h-9 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{EXERCISE_TYPE_LABELS[type]}</span>
                      <span className="text-sm font-bold" style={{ color }}>{count}</span>
                    </div>
                    <span className="text-xs text-[#64748B]">
                      {formatDistance(dist, type)} · {hours > 0 ? `${hours}h ` : ''}{remainMins}m
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Combined chart with metric toggle */}
      {activities.length > 0 && (
        <div className="card mb-6">
          <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wide">Monthly</h2>
            <div className="flex gap-1.5 flex-wrap">
              {METRIC_OPTIONS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setChartMetric(m.value)}
                  className="px-2.5 py-1 rounded text-xs font-medium border transition-all"
                  style={{
                    borderColor: chartMetric === m.value ? m.color : '#334155',
                    color: chartMetric === m.value ? '#fff' : '#94A3B8',
                    background: chartMetric === m.value ? m.color : 'transparent',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={32} />
              <Tooltip contentStyle={TooltipStyle} />
              <Bar dataKey="value" fill={activeMetric.color} radius={[3, 3, 0, 0]} name={activeMetric.label} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Additional stats */}
      <div className="grid grid-cols-2 gap-3">
        {bestWeek && (
          <div className="card">
            <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-2">Best Week</p>
            <p className="text-2xl font-bold text-white">{bestWeek.count}</p>
            <p className="text-xs text-[#94A3B8] mt-1">activities</p>
            <p className="text-xs text-[#64748B] mt-1">{bestWeek.start} – {bestWeek.end}</p>
          </div>
        )}
        <div className="card">
          <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-2">Longest Streak</p>
          <p className="text-2xl font-bold text-white">{streak}</p>
          <p className="text-xs text-[#94A3B8] mt-1">consecutive days</p>
        </div>
        <div className="card">
          <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-2">Longest Weekly Streak</p>
          <p className="text-2xl font-bold text-white">{weekStreak}</p>
          <p className="text-xs text-[#94A3B8] mt-1">consecutive weeks</p>
        </div>
      </div>

      {/* Deeper stats — weekly trends (last 12 weeks in the current filter) */}
      <h2 className="text-sm font-semibold text-[#64748B] uppercase tracking-wide mt-6 mb-3">Deeper Stats</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {weeklyDistance.length > 0 && (
          <div className="card">
            <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-3">Weekly Distance</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={weeklyDistance} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="week" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={TooltipStyle} formatter={(v) => [formatDistance(Number(v), filterType === 'all' ? undefined : filterType), 'Distance']} />
                <Bar dataKey="value" fill="#60A5FA" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {weeklyIntensity.length > 0 && (
          <div className="card">
            <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-3">Intensity Minutes by Week</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={weeklyIntensity} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="week" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={TooltipStyle} formatter={(v) => [`${v} min`, 'Intensity']} />
                <Bar dataKey="value" fill="#06B6D4" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {weeklyPace.length > 0 && (
          <div className="card">
            <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-3">Avg Run Pace by Week</p>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={weeklyPace} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="week" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis reversed tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} width={28} tickFormatter={(v) => formatPaceMinKm(v)} />
                <Tooltip contentStyle={TooltipStyle} formatter={(v) => [formatPaceMinKm(v as number), 'Avg Pace']} />
                <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {weeklyMaxHr.length > 0 && (
          <div className="card">
            <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-3">Max Heart Rate by Week</p>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={weeklyMaxHr} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="week" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={TooltipStyle} formatter={(v) => [`${v} bpm`, 'Max HR']} />
                <Line type="monotone" dataKey="value" stroke="#F87171" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {weeklyEffort.length > 0 && (
          <div className="card">
            <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-3">Avg Effort by Week</p>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={weeklyEffort} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="week" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 10]} tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} width={20} />
                <Tooltip contentStyle={TooltipStyle} formatter={(v) => [v, 'Avg Effort']} />
                <Line type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {subtypeData.length > 0 && (
          <div className="card">
            <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-3">Top Subtypes</p>
            <ResponsiveContainer width="100%" height={Math.max(140, subtypeData.length * 32)} key={`${period}-${filterType}`}>
              <BarChart data={subtypeData} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} tickLine={false} axisLine={false} width={90} interval={0} />
                <Tooltip
                  contentStyle={TooltipStyle}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const row = payload[0].payload as { name: string; count: number; exerciseType: ExerciseType };
                    return (
                      <div style={{ ...TooltipStyle, padding: '8px 10px' }}>
                        <p style={{ color: '#F1F5F9', marginBottom: 2 }}>{row.name}</p>
                        <p style={{ color: EXERCISE_TYPE_COLORS[row.exerciseType] }}>{EXERCISE_TYPE_LABELS[row.exerciseType]}</p>
                        <p style={{ color: '#A78BFA' }}>Sessions : {row.count}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" fill="#A78BFA" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
