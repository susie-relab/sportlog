'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Activity, ExerciseType, EXERCISE_TYPE_LABELS, EXERCISE_TYPE_COLORS } from '@/types';
import { formatDuration, daysAgo } from '@/lib/utils';

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
      .gte('date', daysAgo(14).split('T')[0])
      .order('date', { ascending: false })
      .then(({ data }) => {
        setActivities((data as Activity[]) || []);
        setLoading(false);
      });
  }, [user]);

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
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-xl font-bold text-white">Last 14 Days</h1>
        <span className="text-xs text-[#64748B] bg-[#1E293B] border border-[#334155] px-2 py-1 rounded">
          {new Date(daysAgo(14)).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })} → Today
        </span>
      </div>

      {/* Summary stats */}
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

      {/* By exercise type */}
      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-[#94A3B8] mb-4 uppercase tracking-wide">By Exercise Type</h2>
        {Object.entries(byType).length === 0 ? (
          <p className="text-[#64748B] text-sm">No activities in the last 14 days.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {(Object.entries(byType) as [ExerciseType, number][]).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
              const typeActivities = activities.filter(a => a.exercise_type === type);
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

      {/* Daily breakdown */}
      <div className="card">
        <h2 className="text-sm font-semibold text-[#94A3B8] mb-4 uppercase tracking-wide">Daily Activity</h2>
        <div className="flex gap-1 items-end h-16">
          {Array.from({ length: 14 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (13 - i));
            const dateStr = d.toISOString().split('T')[0];
            const dayActivities = activities.filter(a => a.date === dateStr);
            const maxMins = Math.max(...activities.map(a => a.duration_minutes), 1);
            const dayMins = dayActivities.reduce((s, a) => s + a.duration_minutes, 0);
            const height = dayMins > 0 ? Math.max(4, (dayMins / maxMins) * 56) : 2;
            return (
              <div key={dateStr} className="flex-1 flex flex-col items-center gap-1" title={`${dateStr}: ${dayActivities.length} activities`}>
                <div
                  className="w-full rounded-sm transition-all"
                  style={{
                    height,
                    background: dayActivities.length > 0 ? '#3B82F6' : '#1E293B',
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
      </div>
    </div>
  );
}
