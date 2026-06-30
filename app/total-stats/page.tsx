'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Activity, ExerciseType, EXERCISE_TYPE_LABELS, EXERCISE_TYPE_COLORS } from '@/types';
import { formatDuration } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

type Period = 'all' | '12m' | '6m' | '1m';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: '12m', label: 'Past 12 Months' },
  { value: '6m', label: 'Past 6 Months' },
  { value: '1m', label: 'Past Month' },
];

function getStartDate(period: Period): string | null {
  if (period === 'all') return null;
  const d = new Date();
  if (period === '12m') d.setFullYear(d.getFullYear() - 1);
  else if (period === '6m') d.setMonth(d.getMonth() - 6);
  else d.setMonth(d.getMonth() - 1);
  return d.toISOString().split('T')[0];
}

function getMonthlyData(activities: Activity[], key: 'count' | 'distance' | 'minutes' | 'intensity') {
  const map: Record<string, number> = {};
  for (const a of activities) {
    const month = a.date.slice(0, 7);
    if (!map[month]) map[month] = 0;
    if (key === 'count') map[month]++;
    else if (key === 'distance') map[month] += a.distance_km || 0;
    else if (key === 'minutes') map[month] += a.duration_minutes;
    else map[month] += a.intensity_minutes || 0;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-NZ', { month: 'short', year: '2-digit' }),
      value: key === 'distance' ? parseFloat(value.toFixed(1)) : value,
    }));
}

const TooltipStyle = { backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 8, color: '#F1F5F9', fontSize: 12 };

export default function TotalStatsPage() {
  const { user } = useAuth();
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [period, setPeriod] = useState<Period>('all');
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
  const activities = startDate
    ? allActivities.filter(a => a.date >= startDate)
    : allActivities;

  const totalActivities = activities.length;
  const totalDistanceKm = activities.reduce((s, a) => s + (a.distance_km || 0), 0);
  const totalMinutes = activities.reduce((s, a) => s + a.duration_minutes, 0);
  const totalIntensityMins = activities.reduce((s, a) => s + (a.intensity_minutes || 0), 0);

  const byType: Partial<Record<ExerciseType, number>> = {};
  for (const a of activities) {
    byType[a.exercise_type] = (byType[a.exercise_type] || 0) + 1;
  }

  if (loading) return <div className="text-[#64748B] text-sm">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-5">Total Stats</h1>

      {/* Period selector */}
      <div className="flex gap-2 flex-wrap mb-5">
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

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="stat-card">
          <div className="stat-value">{totalActivities}</div>
          <div className="stat-label">Activities</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalDistanceKm.toFixed(1)}</div>
          <div className="stat-label">km Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatDuration(totalMinutes)}</div>
          <div className="stat-label">Total Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalIntensityMins}</div>
          <div className="stat-label">Intensity Mins</div>
        </div>
      </div>

      {/* By type */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-[#94A3B8] mb-4 uppercase tracking-wide">By Exercise Type</h2>
        {Object.entries(byType).length === 0 ? (
          <p className="text-[#64748B] text-sm">No activities recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {(Object.entries(byType) as [ExerciseType, number][]).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
              const typeActivities = activities.filter(a => a.exercise_type === type);
              const dist = typeActivities.reduce((s, a) => s + (a.distance_km || 0), 0);
              const color = EXERCISE_TYPE_COLORS[type];
              return (
                <div key={type} className="flex items-center gap-3">
                  <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{EXERCISE_TYPE_LABELS[type]}</span>
                      <span className="text-sm font-bold" style={{ color }}>{count}</span>
                    </div>
                    {dist > 0 && <span className="text-xs text-[#64748B]">{dist.toFixed(1)} km</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Charts */}
      {activities.length > 0 && (
        <>
          <div className="card mb-4">
            <h2 className="text-sm font-semibold text-[#94A3B8] mb-4 uppercase tracking-wide">Activities per Month</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={getMonthlyData(activities, 'count')}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 11 }} width={28} />
                <Tooltip contentStyle={TooltipStyle} />
                <Bar dataKey="value" fill="#3B82F6" radius={[3, 3, 0, 0]} name="Activities" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card mb-4">
            <h2 className="text-sm font-semibold text-[#94A3B8] mb-4 uppercase tracking-wide">Distance per Month (km)</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={getMonthlyData(activities, 'distance')}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 11 }} width={32} />
                <Tooltip contentStyle={TooltipStyle} />
                <Bar dataKey="value" fill="#60A5FA" radius={[3, 3, 0, 0]} name="km" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card mb-4">
            <h2 className="text-sm font-semibold text-[#94A3B8] mb-4 uppercase tracking-wide">Minutes per Month</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={getMonthlyData(activities, 'minutes')}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 11 }} width={32} />
                <Tooltip contentStyle={TooltipStyle} />
                <Bar dataKey="value" fill="#1D4ED8" radius={[3, 3, 0, 0]} name="Minutes" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-[#94A3B8] mb-4 uppercase tracking-wide">Intensity Minutes per Month</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={getMonthlyData(activities, 'intensity')}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 11 }} width={32} />
                <Tooltip contentStyle={TooltipStyle} />
                <Bar dataKey="value" fill="#06B6D4" radius={[3, 3, 0, 0]} name="Intensity mins" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
