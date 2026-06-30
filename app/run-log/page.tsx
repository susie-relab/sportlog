'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Activity, RunType, RUN_TYPE_LABELS, RUN_TYPE_COLORS } from '@/types';
import { formatDuration, formatDate, formatPaceMinKm, formatPaceMinMile, formatSpeedKmh, daysAgo, getStartOfWeek } from '@/lib/utils';

type Period = 'all' | 'week' | '30d' | 'month';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function RunLogPage() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('all');
  const [filterRunType, setFilterRunType] = useState<RunType | ''>('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!user) return;
    supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .eq('exercise_type', 'run')
      .order('date', { ascending: false })
      .then(({ data }) => {
        setRuns((data as Activity[]) || []);
        setLoading(false);
      });
  }, [user]);

  const weekStart = getStartOfWeek().split('T')[0];
  const day30Start = daysAgo(30).split('T')[0];

  const runsByPeriod = runs.filter(r => {
    if (period === 'week') return r.date >= weekStart;
    if (period === '30d') return r.date >= day30Start;
    if (period === 'month') {
      const d = new Date(r.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    }
    return true;
  });

  const filtered = runsByPeriod.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterRunType || r.run_type === filterRunType;
    return matchSearch && matchType;
  });

  // Stats for current period
  const totalDist = runsByPeriod.reduce((s, r) => s + (r.distance_km || 0), 0);
  const totalTime = runsByPeriod.reduce((s, r) => s + r.duration_minutes, 0);
  const avgDist = runsByPeriod.length > 0 ? totalDist / runsByPeriod.filter(r => r.distance_km).length : 0;
  const avgTime = runsByPeriod.length > 0 ? totalTime / runsByPeriod.length : 0;

  const runTypeCounts: Partial<Record<RunType, number>> = {};
  for (const r of runsByPeriod) {
    if (r.run_type) runTypeCounts[r.run_type] = (runTypeCounts[r.run_type] || 0) + 1;
  }

  const RUN_TYPES: RunType[] = ['easy', 'long', 'tempo', 'fartlek', 'speed_intervals', 'hill_reps', 'trail', 'long_intervals'];

  // Available years from data
  const years = [...new Set(runs.map(r => new Date(r.date).getFullYear()))].sort((a, b) => b - a);
  if (!years.includes(new Date().getFullYear())) years.unshift(new Date().getFullYear());

  if (loading) return <div className="text-[#64748B] text-sm">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-4">Run Log</h1>

      {/* Period selector */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {([['all','All Time'],['week','This Week'],['30d','Past 30 Days'],['month','By Month']] as [Period, string][]).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setPeriod(val)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
              period === val ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Month selector */}
      {period === 'month' && (
        <div className="flex gap-2 mb-4">
          <select className="input flex-1" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select className="input w-24" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="stat-card">
          <div className="stat-value">{runsByPeriod.length}</div>
          <div className="stat-label">Runs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalDist.toFixed(1)}</div>
          <div className="stat-label">Total km</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatDuration(totalTime)}</div>
          <div className="stat-label">Total Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{avgDist > 0 ? avgDist.toFixed(1) : '—'}</div>
          <div className="stat-label">Avg km</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="stat-card">
          <div className="stat-value">{avgTime > 0 ? formatDuration(Math.round(avgTime)) : '—'}</div>
          <div className="stat-label">Avg Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-sm leading-tight pt-1">
            {Object.entries(runTypeCounts).length === 0 ? '—' : (
              <div className="flex flex-col gap-0.5">
                {(Object.entries(runTypeCounts) as [RunType, number][]).map(([t, c]) => (
                  <div key={t} className="flex items-center gap-1 text-xs">
                    <span style={{ color: RUN_TYPE_COLORS[t] }}>●</span>
                    <span className="text-[#94A3B8]">{RUN_TYPE_LABELS[t]}</span>
                    <span className="text-white font-bold ml-auto">{c}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="stat-label">Run Types</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          className="input flex-1 min-w-[120px]"
          placeholder="Search runs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="input w-auto"
          value={filterRunType}
          onChange={e => setFilterRunType(e.target.value as RunType | '')}
        >
          <option value="">All run types</option>
          {RUN_TYPES.map(t => <option key={t} value={t}>{RUN_TYPE_LABELS[t]}</option>)}
        </select>
      </div>

      {/* Run list */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="card text-[#64748B] text-sm">No runs found.</div>
        ) : filtered.map(r => {
          const color = r.run_type ? RUN_TYPE_COLORS[r.run_type] : '#3B82F6';
          const isOpen = expanded === r.id;
          return (
            <div key={r.id} className="card cursor-pointer" onClick={() => setExpanded(isOpen ? null : r.id)}>
              <div className="flex items-center gap-3">
                <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">{r.name}</span>
                    {r.is_pb && <span>⭐</span>}
                  </div>
                  <div className="flex gap-2 mt-0.5 flex-wrap">
                    {r.run_type && (
                      <span className="text-xs font-medium" style={{ color }}>{RUN_TYPE_LABELS[r.run_type]}</span>
                    )}
                    <span className="text-xs text-[#64748B]">{formatDate(r.date)}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-medium text-white">{r.distance_km ? `${r.distance_km} km` : formatDuration(r.duration_minutes)}</div>
                  {r.pace_min_km && <div className="text-xs text-[#64748B]">{formatPaceMinKm(r.pace_min_km)}</div>}
                </div>
                <span className="text-[#475569] text-xs ml-1">{isOpen ? '▲' : '▼'}</span>
              </div>

              {isOpen && (
                <div className="mt-3 pt-3 border-t border-[#334155] grid grid-cols-2 gap-x-4 gap-y-2">
                  <RDetail label="Duration" value={formatDuration(r.duration_minutes)} />
                  <RDetail label="Effort" value={`${r.effort}/10`} />
                  {r.distance_km && <RDetail label="Distance" value={`${r.distance_km} km`} />}
                  {r.pace_min_km && (
                    <>
                      <RDetail label="Avg Pace" value={formatPaceMinKm(r.pace_min_km)} />
                      <RDetail label="Speed" value={formatSpeedKmh(r.pace_min_km)} />
                      <RDetail label="Pace (mi)" value={formatPaceMinMile(r.pace_min_km)} />
                    </>
                  )}
                  {r.max_pace_min_km && (
                    <>
                      <RDetail label="Max Pace" value={formatPaceMinKm(r.max_pace_min_km)} />
                      <RDetail label="Max Speed" value={formatSpeedKmh(r.max_pace_min_km)} />
                      <RDetail label="Max Pace (mi)" value={formatPaceMinMile(r.max_pace_min_km)} />
                    </>
                  )}
                  {r.avg_hr && <RDetail label="Avg HR" value={`${r.avg_hr} bpm`} />}
                  {r.max_hr && <RDetail label="Max HR" value={`${r.max_hr} bpm`} />}
                  {r.intensity_minutes && <RDetail label="Intensity Mins" value={`${r.intensity_minutes}`} />}
                  {r.notes && (
                    <div className="col-span-2">
                      <span className="text-xs text-[#64748B] font-medium">Notes</span>
                      <p className="text-sm text-[#94A3B8] mt-0.5">{r.notes}</p>
                    </div>
                  )}
                  {r.is_pb && r.pb_description && (
                    <div className="col-span-2">
                      <span className="text-xs text-yellow-500 font-medium">⭐ PB: {r.pb_description}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-[#64748B] font-medium">{label}</span>
      <p className="text-sm text-white mt-0.5">{value}</p>
    </div>
  );
}
