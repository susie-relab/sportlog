'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  Activity, ExerciseType,
  EXERCISE_TYPE_LABELS, EXERCISE_TYPE_COLORS, RUN_TYPE_LABELS,
  EXERCISE_TYPE_ORDER,
} from '@/types';
import { formatDuration, formatDate, formatPaceMinKm, formatPaceMinMile, formatSpeedKmh, daysAgo } from '@/lib/utils';
import EditActivityModal from '@/components/EditActivityModal';
import { activitiesToCsv, downloadCsv } from '@/lib/exportCsv';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type ChartWindow = '30d' | '90d' | '6m' | '1y' | 'all';

export default function ActivityLogPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Activity | null>(null);
  const [filterType, setFilterType] = useState<ExerciseType | ''>('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [chartWindow, setChartWindow] = useState<ChartWindow>('30d');
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setActivities((data as Activity[]) || []);
        setLoading(false);
      });
  }, [user]);

  const past30 = activities.filter(a => a.date >= daysAgo(30).split('T')[0]);
  const totalActivities30 = past30.length;
  const totalKm30 = past30.reduce((s, a) => s + (a.distance_km || 0), 0);
  const totalMins30 = past30.reduce((s, a) => s + a.duration_minutes, 0);
  const avgMins30 = totalActivities30 > 0 ? Math.round(totalMins30 / totalActivities30) : 0;
  const totalIntensity30 = past30.reduce((s, a) => s + (a.intensity_minutes || 0), 0);

  // Type breakdown for past 30 days
  const byType: Partial<Record<ExerciseType, number>> = {};
  for (const a of past30) byType[a.exercise_type] = (byType[a.exercise_type] || 0) + 1;

  const filtered = activities.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || a.exercise_type === filterType;
    return matchSearch && matchType;
  });

  const TYPES = EXERCISE_TYPE_ORDER;

  // Chart data
  const chartStart = chartWindow === '30d' ? daysAgo(30).split('T')[0]
    : chartWindow === '90d' ? daysAgo(90).split('T')[0]
    : chartWindow === '6m' ? daysAgo(182).split('T')[0]
    : chartWindow === '1y' ? daysAgo(365).split('T')[0]
    : '0000-01-01';
  const chartActivities = activities.filter(a => a.date >= chartStart);
  const getWeekStart = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  };
  const grouped: Record<string, number> = {};
  for (const a of [...chartActivities].sort((a, b) => a.date.localeCompare(b.date))) {
    const week = getWeekStart(a.date);
    grouped[week] = (grouped[week] || 0) + 1;
  }
  const chartData = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({
    date: date.slice(5).replace('-', '/'),
    count,
  }));

  if (loading) return <div className="text-[#64748B] text-sm">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h1 className="text-xl font-bold text-white">Exercise Log</h1>
        <button
          onClick={() => {
            const csv = activitiesToCsv(activities);
            downloadCsv(csv, `sportlog-all-${new Date().toISOString().split('T')[0]}.csv`);
          }}
          disabled={activities.length === 0}
          className="btn-secondary text-xs flex items-center gap-1 flex-shrink-0 px-3 py-1.5"
        >
          ↓ Export all
        </button>
      </div>

      {/* 30-day stats */}
      <div className="card mb-4">
        <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-3">30 Day Overview</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="stat-card">
            <div className="stat-value">{totalActivities30}</div>
            <div className="stat-label">Activities</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatDuration(avgMins30)}</div>
            <div className="stat-label">Avg Activity Time</div>
          </div>
        </div>

        {/* Type breakdown */}
        {Object.keys(byType).length > 0 && (
          <div className="flex flex-col gap-1.5 min-w-0">
            {(Object.entries(byType) as [ExerciseType, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: EXERCISE_TYPE_COLORS[type] }} />
                  <span className="text-xs text-[#94A3B8] w-28 flex-shrink-0 truncate">{EXERCISE_TYPE_LABELS[type]}</span>
                  <div className="flex-1 bg-[#0F172A] rounded-full h-1.5 overflow-hidden min-w-0">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${(count / totalActivities30) * 100}%`, background: EXERCISE_TYPE_COLORS[type] }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-white w-4 text-right flex-shrink-0">{count}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Chart */}
      {activities.length > 1 && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowChart(v => !v)}
              className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wide hover:text-white transition-colors"
            >
              {showChart ? '▼' : '▶'} Exercise Summary
            </button>
            {showChart && (
              <select
                className="text-xs bg-[#0F172A] border border-[#334155] text-[#94A3B8] rounded px-2 py-1 outline-none"
                value={chartWindow}
                onChange={e => setChartWindow(e.target.value as ChartWindow)}
              >
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="6m">Last 6 months</option>
                <option value="1y">Last year</option>
                <option value="all">All time</option>
              </select>
            )}
          </div>
          {showChart && (
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, color: '#F1F5F9', fontSize: 12 }}
                  formatter={(val) => [`${val} activities`, 'Count']}
                />
                <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-2 mb-4 sm:flex-row">
        <input
          className="input flex-1"
          placeholder="Search activities..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="input sm:w-auto"
          value={filterType}
          onChange={e => setFilterType(e.target.value as ExerciseType | '')}
        >
          <option value="">All types</option>
          {TYPES.map(t => <option key={t} value={t}>{EXERCISE_TYPE_LABELS[t]}</option>)}
        </select>
      </div>

      {/* Activity list */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="card text-[#64748B] text-sm">No activities found.</div>
        ) : filtered.map(a => {
          const color = EXERCISE_TYPE_COLORS[a.exercise_type];
          const isOpen = expanded === a.id;
          return (
            <div key={a.id} className="card cursor-pointer" onClick={() => setExpanded(isOpen ? null : a.id)}>
              <div className="flex items-center gap-3">
                <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">{a.name}</span>
                    {a.is_pb && <span className="text-sm">⭐</span>}
                  </div>
                  <div className="flex gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs" style={{ color }}>{EXERCISE_TYPE_LABELS[a.exercise_type]}</span>
                    {a.run_type && <span className="text-xs text-blue-300">{RUN_TYPE_LABELS[a.run_type]}</span>}
                    <span className="text-xs text-[#64748B]">{formatDate(a.date)}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm text-white font-medium">{formatDuration(a.duration_minutes)}</div>
                  {a.distance_km && <div className="text-xs text-[#64748B]">{a.distance_km} km</div>}
                </div>
                <span className="text-[#475569] text-xs ml-1">{isOpen ? '▲' : '▼'}</span>
              </div>

              {isOpen && (
                <div className="mt-3 pt-3 border-t border-[#334155]">
                  <button
                    onClick={e => { e.stopPropagation(); setEditing(a); }}
                    className="mb-3 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-600/40 text-blue-400 text-xs font-medium hover:bg-blue-600/30 transition-colors"
                  >
                    ✏️ Edit activity
                  </button>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <Detail label="Duration" value={formatDuration(a.duration_minutes)} />
                    <Detail label="Effort" value={`${a.effort}/10`} />
                    {a.distance_km && <Detail label="Distance" value={`${a.distance_km} km`} />}
                    {a.pace_min_km && (
                      <>
                        <Detail label="Avg Pace" value={formatPaceMinKm(a.pace_min_km)} />
                        <Detail label="Speed" value={formatSpeedKmh(a.pace_min_km)} />
                        <Detail label="Pace (mi)" value={formatPaceMinMile(a.pace_min_km)} />
                      </>
                    )}
                    {a.max_pace_min_km && (
                      <>
                        <Detail label="Max Pace" value={formatPaceMinKm(a.max_pace_min_km)} />
                        <Detail label="Max Speed" value={formatSpeedKmh(a.max_pace_min_km)} />
                      </>
                    )}
                    {a.avg_hr && <Detail label="Avg HR" value={`${a.avg_hr} bpm`} />}
                    {a.max_hr && <Detail label="Max HR" value={`${a.max_hr} bpm`} />}
                    {a.intensity_minutes && <Detail label="Intensity Mins" value={`${a.intensity_minutes}`} />}
                    {a.notes && (
                      <div className="col-span-2">
                        <span className="text-xs text-[#64748B] font-medium">Notes</span>
                        <p className="text-sm text-[#94A3B8] mt-0.5">{a.notes}</p>
                      </div>
                    )}
                    {a.is_pb && a.pb_description && (
                      <div className="col-span-2">
                        <span className="text-xs text-yellow-500 font-medium">⭐ PB: {a.pb_description}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <EditActivityModal
          activity={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => {
            setActivities(prev => prev.map(a => a.id === updated.id ? updated : a));
            setEditing(null);
          }}
          onDeleted={id => {
            setActivities(prev => prev.filter(a => a.id !== id));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-[#64748B] font-medium">{label}</span>
      <p className="text-sm text-white mt-0.5">{value}</p>
    </div>
  );
}
