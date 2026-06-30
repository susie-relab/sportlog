'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  Activity, ExerciseType,
  EXERCISE_TYPE_LABELS, EXERCISE_TYPE_COLORS, RUN_TYPE_LABELS
} from '@/types';
import { formatDuration, formatDate, formatPaceMinKm, formatPaceMinMile, formatSpeedKmh, daysAgo } from '@/lib/utils';

export default function ActivityLogPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ExerciseType | ''>('');
  const [expanded, setExpanded] = useState<string | null>(null);

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
  const totalIntensity30 = past30.reduce((s, a) => s + (a.intensity_minutes || 0), 0);

  const filtered = activities.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || a.exercise_type === filterType;
    return matchSearch && matchType;
  });

  const TYPES: ExerciseType[] = ['run', 'walk', 'sport', 'hiit', 'stretch', 'bike', 'swim', 'solo_fitness'];

  if (loading) return <div className="text-[#64748B] text-sm">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-4">Activity Log</h1>

      {/* 30 day quick stats */}
      <div className="card mb-5">
        <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-3">Past 30 Days</p>
        <div className="flex gap-4 flex-wrap">
          <div>
            <span className="text-lg font-bold text-blue-400">{totalActivities30}</span>
            <span className="text-xs text-[#64748B] ml-1">activities</span>
          </div>
          <div>
            <span className="text-lg font-bold text-blue-400">{totalKm30.toFixed(1)}</span>
            <span className="text-xs text-[#64748B] ml-1">km</span>
          </div>
          <div>
            <span className="text-lg font-bold text-blue-400">{totalIntensity30}</span>
            <span className="text-xs text-[#64748B] ml-1">intensity mins</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          className="input flex-1 min-w-[140px]"
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

              {/* Expanded detail */}
              {isOpen && (
                <div className="mt-3 pt-3 border-t border-[#334155] grid grid-cols-2 gap-x-4 gap-y-2">
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
              )}
            </div>
          );
        })}
      </div>
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
