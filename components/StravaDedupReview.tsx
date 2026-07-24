'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase as createClient } from '@/lib/supabase';
import { EXERCISE_TYPE_LABELS, EXERCISE_TYPE_COLORS, ExerciseType } from '@/types';
import { Activity } from '@/types';

interface PendingDup {
  id: string;
  strava_activity_id: number;
  matched_activity_id: string | null;
  strava_data: Partial<Activity> & { name?: string; date?: string; duration_minutes?: number; distance_km?: number | null; avg_hr?: number | null; max_hr?: number | null; elevation_gain_m?: number | null; pace_min_km?: number | null };
}

function fmtDuration(mins: number | undefined | null) {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

function fmtDist(km: number | undefined | null) {
  if (!km) return null;
  return `${km.toFixed(2)} km`;
}

function fmtPace(p: number | undefined | null) {
  if (!p) return null;
  const m = Math.floor(p);
  const s = Math.round((p - m) * 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

function ActivityCard({ label, act, color }: { label: string; act: Partial<Activity> & { name?: string }; color?: string }) {
  const type = act.exercise_type as ExerciseType | undefined;
  const accentColor = color ?? (type ? EXERCISE_TYPE_COLORS[type] : '#3B82F6');
  return (
    <div className="flex-1 rounded-xl border p-3 flex flex-col gap-1 text-sm" style={{ borderColor: accentColor + '44', background: accentColor + '11' }}>
      <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: accentColor }}>{label}</div>
      <div className="font-semibold text-white text-base leading-tight">{act.name || (type ? EXERCISE_TYPE_LABELS[type] : 'Activity')}</div>
      <div className="text-[#94A3B8] text-xs">{act.date}</div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[#94A3B8] text-xs">
        <span>{fmtDuration(act.duration_minutes)}</span>
        {fmtDist(act.distance_km) && <span>{fmtDist(act.distance_km)}</span>}
        {fmtPace(act.pace_min_km) && <span>{fmtPace(act.pace_min_km)}</span>}
        {act.avg_hr && <span>{act.avg_hr} bpm avg</span>}
        {act.elevation_gain_m && <span>↑{act.elevation_gain_m}m</span>}
      </div>
    </div>
  );
}

export default function StravaDedupReview() {
  const supabase = createClient;
  const [queue, setQueue] = useState<PendingDup[]>([]);
  const [matchedActivities, setMatchedActivities] = useState<Record<string, Activity>>({});
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoaded(true); return; }
    const { data } = await supabase
      .from('strava_pending_duplicates')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (!data || data.length === 0) { setLoaded(true); return; }
    setQueue(data as PendingDup[]);

    const ids = (data as PendingDup[]).map(d => d.matched_activity_id).filter(Boolean) as string[];
    if (ids.length > 0) {
      const { data: acts } = await supabase.from('activities').select('*').in('id', ids);
      if (acts) {
        const map: Record<string, Activity> = {};
        acts.forEach((a: Activity) => { map[a.id] = a; });
        setMatchedActivities(map);
      }
    }
    setLoaded(true);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const current = queue[0] ?? null;
  const matched = current?.matched_activity_id ? matchedActivities[current.matched_activity_id] : null;

  const resolve = useCallback(async (action: 'keep_both' | 'keep_strava' | 'keep_mine' | 'merge') => {
    if (!current || busy) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }

    try {
      if (action === 'keep_both') {
        await supabase.from('activities').insert({
          ...current.strava_data,
          user_id: user.id,
          strava_activity_id: current.strava_activity_id,
          is_pb: false,
        });
        await supabase.from('strava_pending_duplicates').update({ status: 'saved' }).eq('id', current.id);

      } else if (action === 'keep_strava') {
        if (current.matched_activity_id) {
          await supabase.from('activities').delete().eq('id', current.matched_activity_id);
        }
        await supabase.from('activities').insert({
          ...current.strava_data,
          user_id: user.id,
          strava_activity_id: current.strava_activity_id,
          is_pb: false,
        });
        await supabase.from('strava_pending_duplicates').update({ status: 'replaced' }).eq('id', current.id);

      } else if (action === 'keep_mine') {
        await supabase.from('strava_pending_duplicates').update({ status: 'skipped' }).eq('id', current.id);

      } else if (action === 'merge') {
        if (current.matched_activity_id) {
          const fields: Partial<Activity> = {};
          const sd = current.strava_data;
          if (sd.distance_km != null && !matched?.distance_km) fields.distance_km = sd.distance_km;
          if (sd.avg_hr != null && !matched?.avg_hr) fields.avg_hr = sd.avg_hr;
          if (sd.max_hr != null && !matched?.max_hr) fields.max_hr = sd.max_hr;
          if (sd.elevation_gain_m != null && !matched?.elevation_gain_m) fields.elevation_gain_m = sd.elevation_gain_m;
          if (sd.pace_min_km != null && !matched?.pace_min_km) fields.pace_min_km = sd.pace_min_km;
          if (sd.duration_minutes != null && !matched?.duration_minutes) fields.duration_minutes = sd.duration_minutes;
          fields.strava_activity_id = current.strava_activity_id;
          if (Object.keys(fields).length > 0) {
            await supabase.from('activities').update(fields).eq('id', current.matched_activity_id);
          }
        }
        await supabase.from('strava_pending_duplicates').update({ status: 'saved' }).eq('id', current.id);
      }
    } catch (_) { /* continue — remove from queue regardless */ }

    setQueue(q => q.slice(1));
    setBusy(false);
  }, [current, busy, matched, supabase]);

  if (!loaded || !current) return null;

  const stravaColor = EXERCISE_TYPE_COLORS[(current.strava_data.exercise_type as ExerciseType) ?? 'solo_fitness'] ?? '#3B82F6';
  const remaining = queue.length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70">
      <div className="card w-full max-w-lg flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white">Strava import conflict</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              {remaining > 1 ? `${remaining} conflicts to resolve — this one first` : 'Last conflict — resolve to continue'}
            </p>
          </div>
          <span className="text-xs text-[#475569] bg-[#0F172A] px-2 py-1 rounded-full border border-[#334155] flex-shrink-0">
            {queue.length - remaining + 1} / {queue.length + (queue.length - remaining)}
          </span>
        </div>

        {/* Side-by-side cards */}
        <div className="flex gap-3">
          <ActivityCard label="From Strava" act={current.strava_data} color={stravaColor} />
          {matched
            ? <ActivityCard label="Your SportLog entry" act={matched} />
            : <div className="flex-1 rounded-xl border border-[#334155] p-3 text-sm text-[#64748B] flex items-center justify-center">No matching entry found</div>
          }
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => resolve('merge')}
            disabled={busy || !matched}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-medium border border-blue-500/50 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition-all disabled:opacity-40"
          >
            🔀 Merge — keep my entry, copy Strava details (distance, HR, elevation) into it
          </button>
          <button
            onClick={() => resolve('keep_mine')}
            disabled={busy}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-medium border border-[#334155] text-[#94A3B8] hover:border-[#475569] hover:text-white transition-all"
          >
            ✅ Keep mine — discard the Strava import
          </button>
          <button
            onClick={() => resolve('keep_both')}
            disabled={busy}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-medium border border-[#334155] text-[#94A3B8] hover:border-[#475569] hover:text-white transition-all"
          >
            ➕ Keep both — add Strava as a separate entry
          </button>
          <button
            onClick={() => resolve('keep_strava')}
            disabled={busy}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
          >
            🔄 Keep Strava — replace my SportLog entry with this one
          </button>
        </div>
      </div>
    </div>
  );
}
