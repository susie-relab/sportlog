'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  Activity, ExerciseType,
  EXERCISE_TYPE_LABELS, EXERCISE_TYPE_COLORS, combinedRunTypeLabel,
  EXERCISE_TYPE_ORDER, subTypeLabel,
} from '@/types';
import { formatDuration, formatDate, formatShortDate, formatPaceMinKm, formatPaceMinMile, formatSpeedKmh, daysAgo } from '@/lib/utils';
import EditActivityModal from '@/components/EditActivityModal';
import ImageGallery from '@/components/ImageGallery';
import ShareCard, { ShareStat } from '@/components/ShareCard';
import ShareRangeMenu from '@/components/ShareRangeMenu';
import { EXERCISE_TYPE_ICONS, THIRTY_DAY_SHARE_ICON } from '@/lib/shareIcons';
import ExportModal from '@/components/ExportModal';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type ChartWindow = '30d' | '90d' | '6m' | '1y' | 'all';

export default function ActivityLogPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Activity | null>(null);
  const [sharing, setSharing] = useState<Activity | null>(null);
  const [filterType, setFilterType] = useState<ExerciseType | ''>('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
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
  const runs30 = past30.filter(a => a.exercise_type === 'run' && a.pace_min_km);
  const avgRunPace30 = runs30.length ? runs30.reduce((s, a) => s + (a.pace_min_km || 0), 0) / runs30.length : null;
  const mostActiveType30 = (Object.entries(byType) as [ExerciseType, number][]).sort((a, b) => b[1] - a[1])[0];
  const longestDist30 = Math.max(0, ...past30.map(a => a.distance_km || 0));

  const filtered = activities.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || a.exercise_type === filterType;
    return matchSearch && matchType;
  });

  // Reordering same-date activities: swap created_at (the field the list is sorted by within a date)
  // between two neighbours, then re-sort. No schema change needed.
  const moveActivity = async (a: Activity, dir: 'up' | 'down') => {
    const i = filtered.findIndex(x => x.id === a.id);
    const b = filtered[dir === 'up' ? i - 1 : i + 1];
    if (!b || b.date !== a.date) return;
    const swapped = activities.map(x =>
      x.id === a.id ? { ...x, created_at: b.created_at } : x.id === b.id ? { ...x, created_at: a.created_at } : x
    ).sort((x, y) => (x.date === y.date ? y.created_at.localeCompare(x.created_at) : y.date.localeCompare(x.date)));
    setActivities(swapped);
    await Promise.all([
      supabase.from('activities').update({ created_at: b.created_at }).eq('id', a.id),
      supabase.from('activities').update({ created_at: a.created_at }).eq('id', b.id),
    ]);
  };

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
    date: formatShortDate(date),
    count,
  }));

  if (loading) return <div className="text-[#64748B] text-sm">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h1 className="text-xl font-bold text-white">Activity Log</h1>
        <div className="flex gap-2">
          <ShareRangeMenu activities={activities} icon={THIRTY_DAY_SHARE_ICON} accentColor="#8B5CF6" nounSingular="Activity" nounPlural="Activities" defaultScopeKey="activity_share" />
          <button
            onClick={() => setExporting(true)}
            disabled={activities.length === 0}
            className="btn-secondary text-xs flex items-center gap-1 flex-shrink-0 px-3 py-1.5"
          >
            ↓ Export
          </button>
        </div>
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
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          className="input flex-1 min-w-[120px]"
          placeholder="Search activities..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="input w-auto"
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
        ) : filtered.map((a, i) => {
          const color = EXERCISE_TYPE_COLORS[a.exercise_type];
          const isOpen = expanded === a.id;
          const canMoveUp = i > 0 && filtered[i - 1].date === a.date;
          const canMoveDown = i < filtered.length - 1 && filtered[i + 1].date === a.date;
          return (
            <div key={a.id} className="card cursor-pointer" onClick={() => setExpanded(isOpen ? null : a.id)}>
              <div className="flex items-center gap-3">
                <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: color }} />
                {(canMoveUp || canMoveDown) && (
                  <div className="flex flex-col flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => moveActivity(a, 'up')}
                      disabled={!canMoveUp}
                      className="text-[#64748B] hover:text-white disabled:opacity-20 disabled:hover:text-[#64748B] leading-none text-xs px-0.5"
                      aria-label="Move up"
                    >▲</button>
                    <button
                      onClick={() => moveActivity(a, 'down')}
                      disabled={!canMoveDown}
                      className="text-[#64748B] hover:text-white disabled:opacity-20 disabled:hover:text-[#64748B] leading-none text-xs px-0.5"
                      aria-label="Move down"
                    >▼</button>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">{a.name}</span>
                    {a.is_pb && <span className="text-sm">⭐</span>}
                  </div>
                  <div className="flex gap-2 mt-0.5 flex-wrap">
                    {a.sub_type && <span className="text-xs font-medium text-white">{subTypeLabel(a.sub_type)}</span>}
                    {combinedRunTypeLabel(a.run_type, a.run_type_modifier) && <span className="text-xs font-medium text-white">{combinedRunTypeLabel(a.run_type, a.run_type_modifier)}</span>}
                    <span className="text-xs" style={{ color }}>{EXERCISE_TYPE_LABELS[a.exercise_type]}</span>
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
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={e => { e.stopPropagation(); setEditing(a); }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-600/40 text-blue-400 text-xs font-medium hover:bg-blue-600/30 transition-colors"
                    >
                      ✏️ Edit activity
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setSharing(a); }}
                      className="px-3 py-1.5 rounded-lg border border-[#334155] text-[#94A3B8] text-xs font-medium hover:border-[#475569] hover:text-white transition-colors"
                    >
                      ↗ Share
                    </button>
                  </div>
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
                    {a.elevation_gain_m ? <Detail label="Elevation Gain" value={`${a.elevation_gain_m} m`} /> : null}
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
                    {a.image_urls && a.image_urls.length > 0 && (
                      <div className="col-span-2 mt-1" onClick={e => e.stopPropagation()}>
                        <span className="text-xs text-[#64748B] font-medium">Photos</span>
                        <div className="mt-1"><ImageGallery urls={a.image_urls} /></div>
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

      {sharing && (() => {
        const subtypeLabel = sharing.exercise_type === 'run'
          ? combinedRunTypeLabel(sharing.run_type, sharing.run_type_modifier)
          : (sharing.sub_type ? subTypeLabel(sharing.sub_type) : null);
        const subtypeKey = sharing.exercise_type === 'run' ? sharing.run_type : sharing.sub_type;
        const typeLabel = EXERCISE_TYPE_LABELS[sharing.exercise_type];
        return (
          <ShareCard
            badge={typeLabel}
            subtitle={subtypeLabel ?? undefined}
            title={sharing.name}
            icon={EXERCISE_TYPE_ICONS[sharing.exercise_type]}
            availableStats={[
              sharing.distance_km ? { label: 'Distance', value: `${sharing.distance_km} km` } : null,
              { label: 'Duration', value: formatDuration(sharing.duration_minutes) },
              sharing.pace_min_km ? { label: 'Pace', value: formatPaceMinKm(sharing.pace_min_km) } : null,
              sharing.pace_min_km ? { label: 'Speed', value: formatSpeedKmh(sharing.pace_min_km) } : null,
              sharing.max_pace_min_km ? { label: 'Max Pace', value: formatPaceMinKm(sharing.max_pace_min_km) } : null,
              sharing.avg_hr ? { label: 'Avg HR', value: `${sharing.avg_hr} bpm` } : null,
              sharing.max_hr ? { label: 'Max HR', value: `${sharing.max_hr} bpm` } : null,
              sharing.elevation_gain_m ? { label: 'Elevation', value: `${sharing.elevation_gain_m} m` } : null,
              sharing.intensity_minutes ? { label: 'Intensity Mins', value: String(sharing.intensity_minutes) } : null,
              { label: 'Effort', value: `${sharing.effort}/10` },
              sharing.is_pb ? { label: 'Personal Best', value: sharing.pb_description || 'Yes' } : null,
            ].filter(Boolean) as ShareStat[]}
            dateLabel={formatDate(sharing.date)}
            accentColor={EXERCISE_TYPE_COLORS[sharing.exercise_type]}
            defaultScopes={[
              ...(subtypeKey ? [{ key: `${sharing.exercise_type}:${subtypeKey}`, label: subtypeLabel || subtypeKey }] : []),
              { key: sharing.exercise_type, label: typeLabel },
            ]}
            onClose={() => setSharing(null)}
          />
        );
      })()}

      {exporting && (
        <ExportModal
          activities={activities}
          filenamePrefix="sportlog-activities"
          typeOptions={EXERCISE_TYPE_ORDER.map(t => ({ key: t, label: EXERCISE_TYPE_LABELS[t] }))}
          matchType={(a, key) => a.exercise_type === key}
          onClose={() => setExporting(false)}
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
