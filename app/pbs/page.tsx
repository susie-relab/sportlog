'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Activity, ExerciseType, RunType, EXERCISE_TYPE_LABELS, EXERCISE_TYPE_COLORS, RUN_TYPE_LABELS, REST_BREAK_RUN_TYPES } from '@/types';
import { formatPaceMinKm, formatDuration, formatDate, openDatePicker } from '@/lib/utils';
import ShareCard, { ShareStat } from '@/components/ShareCard';
import EditActivityModal from '@/components/EditActivityModal';
import { PB_SHARE_ICON } from '@/lib/shareIcons';
import { DISTANCE_PB_KM, DISTANCE_LABELS } from '@/lib/pbDetect';

const EXERCISE_TYPES: ExerciseType[] = ['run', 'walk', 'sport', 'hiit', 'stretch', 'bike', 'swim', 'solo_fitness'];
const RUN_TYPES: RunType[] = ['easy', 'long', 'tempo', 'fartlek', 'speed_intervals', 'hill_reps', 'trail', 'long_intervals', 'push_buggy', 'treadmill'];

const hasRestBreaks = (a: Activity) => !!a.run_type && REST_BREAK_RUN_TYPES.includes(a.run_type);

/** Seconds -> "M:SS" or "H:MM:SS". */
function fmtClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

interface ManualPB {
  id: string;
  user_id: string;
  title: string;
  description: string;
  date: string;
  distance_km?: number | null;
  duration_minutes?: number | null;
}

interface DistanceOverride {
  id: string;
  user_id: string;
  distance_km: number;
  status: 'hidden' | 'custom';
  custom_time_seconds: number | null;
  custom_note: string | null;
  activity_id: string | null;
  created_at?: string;
}

interface PbFeedItem {
  key: string;
  kind: 'starred' | 'distance' | 'type' | 'manual';
  isManual: boolean; // reflects a manual action (manually starred, custom override, or a manual PB entry) vs a pure auto-computed one
  title: string;
  subtitle?: string;
  date: string;
  stat: string;
  activity?: Activity;
  auto?: boolean;
}

const FEED_KIND_LABEL: Record<PbFeedItem['kind'], string> = {
  starred: 'Additional', distance: '📏 Distance', type: '🏷 By Type', manual: '✍️ Manual',
};
const FEED_KIND_COLOR: Record<PbFeedItem['kind'], string> = {
  starred: '#EAB308', distance: '#3B82F6', type: '#A855F7', manual: '#22C55E',
};

export default function PBsPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [manualPBs, setManualPBs] = useState<ManualPB[]>([]);
  const [overrides, setOverrides] = useState<DistanceOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingManual, setAddingManual] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualDistance, setManualDistance] = useState('');
  const [manualDuration, setManualDuration] = useState('');
  const [activeTab, setActiveTab] = useState<'starred' | 'distance' | 'type' | 'monthly' | 'manual' | 'additional'>('starred');
  const [starredFilter, setStarredFilter] = useState<'all' | 'manual'>('all');
  const [sharing, setSharing] = useState<Activity | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // Inline "override this distance PB" editor state.
  const [editingOverrideKm, setEditingOverrideKm] = useState<number | null>(null);
  const [ovHours, setOvHours] = useState('');
  const [ovMins, setOvMins] = useState('');
  const [ovSecs, setOvSecs] = useState('');
  const [ovNote, setOvNote] = useState('');
  const [ovActivityId, setOvActivityId] = useState('');

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('activities').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('manual_pbs').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('distance_pb_overrides').select('*').eq('user_id', user.id),
    ]).then(([{ data: acts }, { data: mpbs }, { data: ovs }]) => {
      setActivities((acts as Activity[]) || []);
      setManualPBs((mpbs as ManualPB[]) || []);
      setOverrides((ovs as DistanceOverride[]) || []);
      setLoading(false);
    });
  }, [user]);

  const openOverrideEditor = (km: number) => {
    const existing = overrides.find(o => o.distance_km === km && o.status === 'custom');
    if (existing?.custom_time_seconds != null) {
      const h = Math.floor(existing.custom_time_seconds / 3600);
      const m = Math.floor((existing.custom_time_seconds % 3600) / 60);
      const s = existing.custom_time_seconds % 60;
      setOvHours(h ? String(h) : ''); setOvMins(String(m)); setOvSecs(String(s));
    } else { setOvHours(''); setOvMins(''); setOvSecs(''); }
    setOvNote(existing?.custom_note || '');
    setOvActivityId(existing?.activity_id || '');
    setEditingOverrideKm(km);
  };

  const saveOverride = async (km: number) => {
    const totalSeconds = (parseInt(ovHours) || 0) * 3600 + (parseInt(ovMins) || 0) * 60 + (parseInt(ovSecs) || 0);
    if (totalSeconds <= 0) return;
    const { data } = await supabase.from('distance_pb_overrides').upsert({
      user_id: user!.id, distance_km: km, status: 'custom',
      custom_time_seconds: totalSeconds, custom_note: ovNote.trim() || null,
      activity_id: ovActivityId || null,
    }, { onConflict: 'user_id,distance_km' }).select().single();
    if (data) {
      setOverrides(prev => [...prev.filter(o => o.distance_km !== km), data as DistanceOverride]);
      setEditingOverrideKm(null);
    }
  };

  const hideDistancePB = async (km: number) => {
    const { data } = await supabase.from('distance_pb_overrides').upsert({
      user_id: user!.id, distance_km: km, status: 'hidden', custom_time_seconds: null, custom_note: null, activity_id: null,
    }, { onConflict: 'user_id,distance_km' }).select().single();
    if (data) setOverrides(prev => [...prev.filter(o => o.distance_km !== km), data as DistanceOverride]);
  };

  const restoreDistancePB = async (km: number) => {
    if (!user) return;
    await supabase.from('distance_pb_overrides').delete().eq('user_id', user.id).eq('distance_km', km);
    setOverrides(prev => prev.filter(o => o.distance_km !== km));
  };

  // Best pace for each distance — excludes interval-style runs (rest breaks make the total
  // elapsed pace misleading), and folds in any manual hide/override for that bucket.
  const bestPaceByDist = DISTANCE_PB_KM.map(km => {
    const matching = activities.filter(a =>
      a.distance_km !== undefined && a.distance_km !== null &&
      Math.abs(a.distance_km - km) / km < 0.02 &&
      a.pace_min_km && !hasRestBreaks(a)
    );
    const best = matching.length > 0 ? matching.reduce((b, a) => (a.pace_min_km! < b.pace_min_km! ? a : b)) : null;
    const override = overrides.find(o => o.distance_km === km);
    if (!best && !override) return null;
    return { km, label: DISTANCE_LABELS[km], activity: best, override };
  }).filter(Boolean);

  // By exercise type PBs — "Best Pace" excludes interval-style runs; other metrics are unaffected.
  const exerciseTypePBs = EXERCISE_TYPES.map(type => {
    const typeActs = activities.filter(a => a.exercise_type === type);
    if (typeActs.length === 0) return null;
    return {
      type,
      longestDist: typeActs.filter(a => a.distance_km).sort((a, b) => (b.distance_km || 0) - (a.distance_km || 0))[0],
      longestTime: typeActs.sort((a, b) => b.duration_minutes - a.duration_minutes)[0],
      bestPace: typeActs.filter(a => a.pace_min_km && !hasRestBreaks(a)).sort((a, b) => a.pace_min_km! - b.pace_min_km!)[0],
      maxPace: typeActs.filter(a => a.max_pace_min_km).sort((a, b) => a.max_pace_min_km! - b.max_pace_min_km!)[0],
      maxHr: typeActs.filter(a => a.max_hr).sort((a, b) => b.max_hr! - a.max_hr!)[0],
    };
  }).filter(Boolean);

  // By run type PBs — "Best Pace" is omitted entirely for interval-style run types, since
  // every activity in that bucket has the same rest-break-diluted-pace problem.
  const runTypePBs = RUN_TYPES.map(type => {
    const typeActs = activities.filter(a => a.run_type === type);
    if (typeActs.length === 0) return null;
    return {
      type,
      longestDist: typeActs.filter(a => a.distance_km).sort((a, b) => (b.distance_km || 0) - (a.distance_km || 0))[0],
      longestTime: typeActs.sort((a, b) => b.duration_minutes - a.duration_minutes)[0],
      bestPace: REST_BREAK_RUN_TYPES.includes(type) ? undefined : typeActs.filter(a => a.pace_min_km).sort((a, b) => a.pace_min_km! - b.pace_min_km!)[0],
    };
  }).filter(Boolean);

  // Unified "All PBs" feed — every starred activity, every distance-bucket PB, every
  // by-type/by-run-type metric, and every manually-added PB, so nothing lives only in
  // its own tab. Sorted newest-first by whatever date each entry is tied to.
  const pbFeed: PbFeedItem[] = [];
  for (const a of activities.filter(x => x.is_pb)) {
    pbFeed.push({
      key: `star-${a.id}`, kind: 'starred', isManual: !a.pb_auto,
      title: a.name, subtitle: a.pb_description, date: a.date,
      stat: [a.distance_km ? `${a.distance_km} km` : null, a.pace_min_km ? formatPaceMinKm(a.pace_min_km) : null, formatDuration(a.duration_minutes, a.duration_seconds)].filter(Boolean).join(' · '),
      activity: a, auto: a.pb_auto,
    });
  }
  for (const pb of bestPaceByDist) {
    if (!pb || pb.override?.status === 'hidden') continue;
    if (pb.override?.status === 'custom') {
      const linked = pb.override.activity_id ? activities.find(x => x.id === pb.override!.activity_id) : undefined;
      pbFeed.push({
        key: `dist-${pb.km}`, kind: 'distance', isManual: true,
        title: `${pb.label} PB`, subtitle: pb.override.custom_note || undefined,
        date: linked?.date || pb.override.created_at?.slice(0, 10) || '',
        stat: fmtClock(pb.override.custom_time_seconds!),
        activity: linked,
      });
    } else if (pb.activity) {
      pbFeed.push({
        key: `dist-${pb.km}`, kind: 'distance', isManual: false,
        title: `${pb.label} PB`, date: pb.activity.date,
        stat: [formatPaceMinKm(pb.activity.pace_min_km!), pb.activity.distance_km ? `${pb.activity.distance_km} km` : null].filter(Boolean).join(' · '),
        activity: pb.activity,
      });
    }
  }
  for (const pb of exerciseTypePBs) {
    if (!pb) continue;
    const label = EXERCISE_TYPE_LABELS[pb.type];
    if (pb.longestDist) pbFeed.push({ key: `etype-${pb.type}-dist`, kind: 'type', isManual: false, title: `${label} — Longest Distance`, date: pb.longestDist.date, stat: `${pb.longestDist.distance_km} km`, activity: pb.longestDist });
    if (pb.longestTime) pbFeed.push({ key: `etype-${pb.type}-time`, kind: 'type', isManual: false, title: `${label} — Longest Time`, date: pb.longestTime.date, stat: formatDuration(pb.longestTime.duration_minutes, pb.longestTime.duration_seconds), activity: pb.longestTime });
    if (pb.bestPace) pbFeed.push({ key: `etype-${pb.type}-pace`, kind: 'type', isManual: false, title: `${label} — Best Pace`, date: pb.bestPace.date, stat: formatPaceMinKm(pb.bestPace.pace_min_km!), activity: pb.bestPace });
    if (pb.maxPace) pbFeed.push({ key: `etype-${pb.type}-maxpace`, kind: 'type', isManual: false, title: `${label} — Max Pace`, date: pb.maxPace.date, stat: formatPaceMinKm(pb.maxPace.max_pace_min_km!), activity: pb.maxPace });
    if (pb.maxHr) pbFeed.push({ key: `etype-${pb.type}-maxhr`, kind: 'type', isManual: false, title: `${label} — Max HR`, date: pb.maxHr.date, stat: `${pb.maxHr.max_hr} bpm`, activity: pb.maxHr });
  }
  for (const pb of runTypePBs) {
    if (!pb) continue;
    const label = RUN_TYPE_LABELS[pb.type];
    if (pb.longestDist) pbFeed.push({ key: `rtype-${pb.type}-dist`, kind: 'type', isManual: false, title: `${label} Run — Longest Distance`, date: pb.longestDist.date, stat: `${pb.longestDist.distance_km} km`, activity: pb.longestDist });
    if (pb.longestTime) pbFeed.push({ key: `rtype-${pb.type}-time`, kind: 'type', isManual: false, title: `${label} Run — Longest Time`, date: pb.longestTime.date, stat: formatDuration(pb.longestTime.duration_minutes, pb.longestTime.duration_seconds), activity: pb.longestTime });
    if (pb.bestPace) pbFeed.push({ key: `rtype-${pb.type}-pace`, kind: 'type', isManual: false, title: `${label} Run — Best Pace`, date: pb.bestPace.date, stat: formatPaceMinKm(pb.bestPace.pace_min_km!), activity: pb.bestPace });
  }
  for (const pb of manualPBs) {
    pbFeed.push({
      key: `manual-${pb.id}`, kind: 'manual', isManual: true,
      title: pb.title, subtitle: pb.description, date: pb.date,
      stat: [pb.distance_km != null ? `${pb.distance_km} km` : null, pb.duration_minutes != null ? formatDuration(pb.duration_minutes) : null].filter(Boolean).join(' · '),
    });
  }
  pbFeed.sort((a, b) => b.date.localeCompare(a.date));
  const filteredFeed = starredFilter === 'all' ? pbFeed : pbFeed.filter(f => f.isManual);

  // Best months
  const monthlyStats = () => {
    const map: Record<string, { runs: number; activities: number; intensityMins: number; runDist: number; totalDist: number }> = {};
    for (const a of activities) {
      const m = a.date.slice(0, 7);
      if (!map[m]) map[m] = { runs: 0, activities: 0, intensityMins: 0, runDist: 0, totalDist: 0 };
      map[m].activities++;
      map[m].intensityMins += a.intensity_minutes || 0;
      map[m].totalDist += a.distance_km || 0;
      if (a.exercise_type === 'run') {
        map[m].runs++;
        map[m].runDist += a.distance_km || 0;
      }
    }
    return map;
  };

  const monthly = monthlyStats();
  const monthEntries = Object.entries(monthly);
  const fmtMonth = (m: string) => new Date(m + '-01').toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' });

  const bestMonthRuns = monthEntries.sort((a, b) => b[1].runs - a[1].runs)[0];
  const bestMonthActs = monthEntries.sort((a, b) => b[1].activities - a[1].activities)[0];
  const bestMonthIntensity = monthEntries.sort((a, b) => b[1].intensityMins - a[1].intensityMins)[0];
  const bestMonthRunDist = monthEntries.sort((a, b) => b[1].runDist - a[1].runDist)[0];
  const bestMonthTotalDist = monthEntries.sort((a, b) => b[1].totalDist - a[1].totalDist)[0];

  const saveManualPB = async () => {
    if (!manualTitle.trim()) return;
    const { data } = await supabase.from('manual_pbs').insert({
      user_id: user!.id,
      title: manualTitle.trim(),
      description: manualDesc,
      date: manualDate,
      distance_km: manualDistance ? parseFloat(manualDistance) : null,
      duration_minutes: manualDuration ? parseInt(manualDuration) : null,
    }).select().single();
    if (data) {
      setManualPBs(prev => [data as ManualPB, ...prev]);
      setManualTitle(''); setManualDesc(''); setManualDistance(''); setManualDuration(''); setAddingManual(false);
    }
  };

  const deleteManualPB = async (id: string) => {
    await supabase.from('manual_pbs').delete().eq('id', id);
    setManualPBs(prev => prev.filter(p => p.id !== id));
  };

  const tabs = [
    { key: 'starred', label: '⭐ All PBs' },
    { key: 'distance', label: 'Distance PBs' },
    { key: 'type', label: 'By Type' },
    { key: 'monthly', label: 'Best Months' },
    { key: 'additional', label: '⭐ Additional' },
    { key: 'manual', label: 'Add PB' },
  ] as const;

  if (loading) return <div className="text-[#64748B] text-sm">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-5">Personal Bests ⭐</h1>

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap mb-5 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all whitespace-nowrap ${
              activeTab === t.key
                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300'
                : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* All PBs — starred activities, distance PBs, by-type PBs, and manual entries, all together */}
      {activeTab === 'starred' && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5">
            <button onClick={() => setStarredFilter('all')} className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${starredFilter === 'all' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>All</button>
            <button onClick={() => setStarredFilter('manual')} className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${starredFilter === 'manual' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>Custom</button>
          </div>
          {filteredFeed.length === 0 ? (
            <div className="card text-[#64748B] text-sm">
              {starredFilter === 'manual'
                ? 'No manually-added PBs yet — star an activity, override a distance PB, or add one under "Add PB".'
                : 'No PBs yet — star an activity, or one will star itself automatically the moment it beats a previous best.'}
            </div>
          ) : filteredFeed.map(item => (
            <button
              key={item.key}
              onClick={() => item.activity && setEditingActivity(item.activity)}
              disabled={!item.activity}
              className={`card text-left w-full transition-colors ${item.kind === 'starred' ? 'border-yellow-500/30' : 'border-[#293548]'} ${item.activity ? 'hover:border-[#475569]' : 'cursor-default'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base flex-shrink-0">⭐</span>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ color: FEED_KIND_COLOR[item.kind], background: `${FEED_KIND_COLOR[item.kind]}22` }}>{FEED_KIND_LABEL[item.kind]}</span>
                    <span className="font-semibold text-white">{item.title}</span>
                    {item.auto && <span className="text-[9px] uppercase font-bold text-blue-300 bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.5 rounded flex-shrink-0">Auto</span>}
                  </div>
                  {item.subtitle && <p className="text-sm text-yellow-300 mt-1">{item.subtitle}</p>}
                  <div className="flex gap-3 mt-2 flex-wrap">
                    {item.date && <span className="text-xs text-[#64748B]">{formatDate(item.date)}</span>}
                    {item.stat && <span className="text-xs text-[#94A3B8]">{item.stat}</span>}
                  </div>
                </div>
                {item.kind === 'starred' && item.activity && (
                  <span onClick={e => { e.stopPropagation(); setSharing(item.activity!); }} className="text-xs text-[#64748B] hover:text-white border border-[#334155] hover:border-[#475569] rounded-lg px-2.5 py-1.5 flex-shrink-0">↗ Share</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Distance PBs */}
      {activeTab === 'distance' && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm text-[#94A3B8] font-semibold uppercase tracking-wide">Best Pace by Distance</h2>
          <p className="text-xs text-[#64748B] -mt-1">Excludes sprint/hill/long-interval sessions — rest between reps makes their overall pace misleading.</p>
          {bestPaceByDist.length === 0 ? (
            <div className="card text-[#64748B] text-sm">No pace data recorded yet.</div>
          ) : bestPaceByDist.map(pb => {
            const linkedActivity = pb!.override?.activity_id ? activities.find(a => a.id === pb!.override!.activity_id) : null;
            return (
              <div key={pb!.km} className="card">
                {pb!.override?.status === 'hidden' ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[#64748B]">{pb!.label}</span>
                      <p className="text-xs text-[#64748B] mt-0.5">Hidden</p>
                    </div>
                    <button onClick={() => restoreDistancePB(pb!.km)} className="text-xs text-blue-400 hover:text-blue-300">Restore</button>
                  </div>
                ) : pb!.override?.status === 'custom' ? (
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{pb!.label}</span>
                        <span className="text-[9px] uppercase font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded flex-shrink-0">Custom</span>
                      </div>
                      {pb!.override.custom_note && <p className="text-xs text-[#94A3B8] mt-0.5">{pb!.override.custom_note}</p>}
                      {linkedActivity && (
                        <button onClick={() => setEditingActivity(linkedActivity)} className="text-xs text-[#64748B] hover:text-white mt-0.5 underline">{linkedActivity.name} · {formatDate(linkedActivity.date)}</button>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-emerald-400 font-bold">{fmtClock(pb!.override.custom_time_seconds!)}</div>
                      <div className="flex gap-2 mt-1 justify-end">
                        <button onClick={() => openOverrideEditor(pb!.km)} className="text-[11px] text-[#64748B] hover:text-white">Edit</button>
                        <button onClick={() => restoreDistancePB(pb!.km)} className="text-[11px] text-[#64748B] hover:text-red-400">Remove</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <button onClick={() => pb!.activity && setEditingActivity(pb!.activity)} className="text-left min-w-0">
                      <span className="font-semibold text-white">{pb!.label}</span>
                      <p className="text-xs text-[#64748B] mt-0.5 hover:text-white">{pb!.activity!.name} · {formatDate(pb!.activity!.date)}</p>
                    </button>
                    <div className="text-right flex-shrink-0">
                      <div className="text-blue-400 font-bold">{formatPaceMinKm(pb!.activity!.pace_min_km!)}</div>
                      {pb!.activity!.distance_km && <div className="text-xs text-[#64748B]">{pb!.activity!.distance_km} km</div>}
                      <div className="flex gap-2 mt-1 justify-end">
                        <button onClick={() => openOverrideEditor(pb!.km)} className="text-[11px] text-[#64748B] hover:text-white">Override</button>
                        <button onClick={() => hideDistancePB(pb!.km)} className="text-[11px] text-[#64748B] hover:text-red-400">Hide</button>
                      </div>
                    </div>
                  </div>
                )}

                {editingOverrideKm === pb!.km && (
                  <div className="mt-3 pt-3 border-t border-[#293548] flex flex-col gap-2">
                    <label className="label">Real result for {pb!.label}</label>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" placeholder="h" className="input" value={ovHours} onChange={e => setOvHours(e.target.value)} />
                      <input type="number" placeholder="m" className="input" value={ovMins} onChange={e => setOvMins(e.target.value)} />
                      <input type="number" placeholder="s" className="input" value={ovSecs} onChange={e => setOvSecs(e.target.value)} />
                    </div>
                    <select className="input" value={ovActivityId} onChange={e => setOvActivityId(e.target.value)}>
                      <option value="">No linked activity</option>
                      {activities.slice().sort((a, b) => b.date.localeCompare(a.date)).map(a => (
                        <option key={a.id} value={a.id}>{formatDate(a.date)} — {a.name}{a.distance_km ? ` (${a.distance_km}km)` : ''}</option>
                      ))}
                    </select>
                    <input className="input" placeholder="Note (optional) — e.g. 1km split during a 3km run" value={ovNote} onChange={e => setOvNote(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={() => saveOverride(pb!.km)} className="btn-primary flex-1 text-sm">Save</button>
                      <button onClick={() => setEditingOverrideKm(null)} className="btn-secondary flex-1 text-sm">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* By Type */}
      {activeTab === 'type' && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm text-[#94A3B8] font-semibold uppercase tracking-wide mb-3">By Exercise Type</h2>
            {exerciseTypePBs.map(pb => (
              <div key={pb!.type} className="card mb-3">
                <h3 className="font-semibold text-white mb-3">{EXERCISE_TYPE_LABELS[pb!.type]}</h3>
                <div className="grid grid-cols-1 gap-2">
                  {pb!.longestDist && (
                    <button onClick={() => setEditingActivity(pb!.longestDist)} className="flex justify-between text-sm w-full hover:bg-white/5 rounded px-1 -mx-1">
                      <span className="text-[#64748B]">Longest Distance</span>
                      <span className="text-blue-400 font-medium">{pb!.longestDist.distance_km} km</span>
                    </button>
                  )}
                  {pb!.longestTime && (
                    <button onClick={() => setEditingActivity(pb!.longestTime)} className="flex justify-between text-sm w-full hover:bg-white/5 rounded px-1 -mx-1">
                      <span className="text-[#64748B]">Longest Time</span>
                      <span className="text-blue-400 font-medium">{formatDuration(pb!.longestTime.duration_minutes, pb!.longestTime.duration_seconds)}</span>
                    </button>
                  )}
                  {pb!.bestPace && (
                    <button onClick={() => setEditingActivity(pb!.bestPace)} className="flex justify-between text-sm w-full hover:bg-white/5 rounded px-1 -mx-1">
                      <span className="text-[#64748B]">Best Pace</span>
                      <span className="text-blue-400 font-medium">{formatPaceMinKm(pb!.bestPace.pace_min_km!)}</span>
                    </button>
                  )}
                  {pb!.maxPace && (
                    <button onClick={() => setEditingActivity(pb!.maxPace)} className="flex justify-between text-sm w-full hover:bg-white/5 rounded px-1 -mx-1">
                      <span className="text-[#64748B]">Max Pace</span>
                      <span className="text-blue-400 font-medium">{formatPaceMinKm(pb!.maxPace.max_pace_min_km!)}</span>
                    </button>
                  )}
                  {pb!.maxHr && (
                    <button onClick={() => setEditingActivity(pb!.maxHr)} className="flex justify-between text-sm w-full hover:bg-white/5 rounded px-1 -mx-1">
                      <span className="text-[#64748B]">Max HR</span>
                      <span className="text-blue-400 font-medium">{pb!.maxHr.max_hr} bpm</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-sm text-[#94A3B8] font-semibold uppercase tracking-wide mb-3">By Run Type</h2>
            {runTypePBs.length === 0 ? (
              <div className="card text-[#64748B] text-sm">No runs logged yet.</div>
            ) : runTypePBs.map(pb => (
              <div key={pb!.type} className="card mb-3">
                <h3 className="font-semibold text-white mb-3">{RUN_TYPE_LABELS[pb!.type]}</h3>
                <div className="grid grid-cols-1 gap-2">
                  {pb!.longestDist && (
                    <button onClick={() => setEditingActivity(pb!.longestDist)} className="flex justify-between text-sm w-full hover:bg-white/5 rounded px-1 -mx-1">
                      <span className="text-[#64748B]">Longest Distance</span>
                      <span className="text-blue-400 font-medium">{pb!.longestDist.distance_km} km</span>
                    </button>
                  )}
                  {pb!.longestTime && (
                    <button onClick={() => setEditingActivity(pb!.longestTime)} className="flex justify-between text-sm w-full hover:bg-white/5 rounded px-1 -mx-1">
                      <span className="text-[#64748B]">Longest Time</span>
                      <span className="text-blue-400 font-medium">{formatDuration(pb!.longestTime.duration_minutes, pb!.longestTime.duration_seconds)}</span>
                    </button>
                  )}
                  {pb!.bestPace ? (
                    <button onClick={() => setEditingActivity(pb!.bestPace!)} className="flex justify-between text-sm w-full hover:bg-white/5 rounded px-1 -mx-1">
                      <span className="text-[#64748B]">Best Pace</span>
                      <span className="text-blue-400 font-medium">{formatPaceMinKm(pb!.bestPace.pace_min_km!)}</span>
                    </button>
                  ) : REST_BREAK_RUN_TYPES.includes(pb!.type) && (
                    <p className="text-[11px] text-[#475569] italic">Pace not shown — rest between reps makes the overall time misleading.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best Months */}
      {activeTab === 'monthly' && (
        <div className="flex flex-col gap-3">
          {monthEntries.length === 0 ? (
            <div className="card text-[#64748B] text-sm">No data yet.</div>
          ) : (
            <>
              {bestMonthRuns && (
                <div className="card flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Most Runs</div>
                    <div className="text-xs text-[#64748B] mt-0.5">{fmtMonth(bestMonthRuns[0])}</div>
                  </div>
                  <div className="text-blue-400 font-bold text-xl">{bestMonthRuns[1].runs}</div>
                </div>
              )}
              {bestMonthActs && (
                <div className="card flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Most Activities</div>
                    <div className="text-xs text-[#64748B] mt-0.5">{fmtMonth(bestMonthActs[0])}</div>
                  </div>
                  <div className="text-blue-400 font-bold text-xl">{bestMonthActs[1].activities}</div>
                </div>
              )}
              {bestMonthIntensity && (
                <div className="card flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Most Intensity Minutes</div>
                    <div className="text-xs text-[#64748B] mt-0.5">{fmtMonth(bestMonthIntensity[0])}</div>
                  </div>
                  <div className="text-blue-400 font-bold text-xl">{bestMonthIntensity[1].intensityMins}</div>
                </div>
              )}
              {bestMonthRunDist && (
                <div className="card flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Most Run Distance</div>
                    <div className="text-xs text-[#64748B] mt-0.5">{fmtMonth(bestMonthRunDist[0])}</div>
                  </div>
                  <div className="text-blue-400 font-bold text-xl">{bestMonthRunDist[1].runDist.toFixed(1)} km</div>
                </div>
              )}
              {bestMonthTotalDist && (
                <div className="card flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Most Total Distance</div>
                    <div className="text-xs text-[#64748B] mt-0.5">{fmtMonth(bestMonthTotalDist[0])}</div>
                  </div>
                  <div className="text-blue-400 font-bold text-xl">{bestMonthTotalDist[1].totalDist.toFixed(1)} km</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Manual PBs */}
      {activeTab === 'manual' && (
        <div className="flex flex-col gap-3">
          <button onClick={() => setAddingManual(!addingManual)} className="btn-primary">
            + Add Another PB
          </button>

          {addingManual && (
            <div className="card flex flex-col gap-3">
              <div>
                <label className="label">PB Title *</label>
                <input className="input" placeholder="e.g. First sub-20 5km" value={manualTitle} onChange={e => setManualTitle(e.target.value)} />
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" placeholder="Details..." value={manualDesc} onChange={e => setManualDesc(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Distance (km)</label>
                  <input type="number" className="input" placeholder="e.g. 5" value={manualDistance} onChange={e => setManualDistance(e.target.value)} />
                </div>
                <div>
                  <label className="label">Duration (min)</label>
                  <input type="number" className="input" placeholder="e.g. 20" value={manualDuration} onChange={e => setManualDuration(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={manualDate} onClick={openDatePicker} onChange={e => setManualDate(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button onClick={saveManualPB} className="btn-primary flex-1">Save</button>
                <button onClick={() => setAddingManual(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </div>
          )}

          {manualPBs.length === 0 ? (
            <div className="card text-[#64748B] text-sm">No manual PBs added yet.</div>
          ) : manualPBs.map(pb => (
            <div key={pb.id} className="card flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span>⭐</span>
                  <span className="font-semibold text-white">{pb.title}</span>
                </div>
                {pb.description && <p className="text-sm text-[#94A3B8] mt-1">{pb.description}</p>}
                <div className="flex gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-[#64748B]">{formatDate(pb.date)}</span>
                  {pb.distance_km != null && <span className="text-xs text-[#94A3B8]">{pb.distance_km} km</span>}
                  {pb.duration_minutes != null && <span className="text-xs text-[#94A3B8]">{formatDuration(pb.duration_minutes)}</span>}
                </div>
              </div>
              <button onClick={() => deleteManualPB(pb.id)} className="text-[#475569] hover:text-red-400 text-xs ml-3">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Additional — individually-starred activities (self-starred, manual or auto) */}
      {activeTab === 'additional' && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5">
            <button onClick={() => setStarredFilter('all')} className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${starredFilter === 'all' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>All</button>
            <button onClick={() => setStarredFilter('manual')} className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${starredFilter === 'manual' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>Custom</button>
          </div>
          {filteredFeed.filter(item => item.kind === 'starred').length === 0 ? (
            <div className="card text-[#64748B] text-sm">
              No additional PBs yet. When adding an activity, click the ⭐ to mark it as a personal best — or one will star itself the moment it beats a previous best.
            </div>
          ) : filteredFeed.filter(item => item.kind === 'starred').map(item => (
            <button key={item.key} onClick={() => item.activity && setEditingActivity(item.activity)} className="card border-yellow-500/30 text-left w-full hover:border-yellow-500/60 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg">⭐</span>
                    <span className="font-semibold text-white">{item.title}</span>
                    {item.auto && <span className="text-[9px] uppercase font-bold text-blue-300 bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.5 rounded flex-shrink-0">Auto</span>}
                  </div>
                  {item.subtitle && <p className="text-sm text-yellow-300 mt-1">{item.subtitle}</p>}
                  <div className="flex gap-3 mt-2 flex-wrap">
                    {item.date && <span className="text-xs text-[#64748B]">{formatDate(item.date)}</span>}
                    {item.stat && <span className="text-xs text-[#94A3B8]">{item.stat}</span>}
                  </div>
                </div>
                {item.activity && (
                  <span onClick={e => { e.stopPropagation(); setSharing(item.activity!); }} className="text-xs text-[#64748B] hover:text-white border border-[#334155] hover:border-[#475569] rounded-lg px-2.5 py-1.5 flex-shrink-0">↗ Share</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {sharing && (
        <ShareCard
          badge="Personal Best"
          title={sharing.pb_description || sharing.name}
          icon={PB_SHARE_ICON}
          availableStats={[
            sharing.distance_km ? { label: 'Distance', value: `${sharing.distance_km} km` } : null,
            { label: 'Duration', value: formatDuration(sharing.duration_minutes, sharing.duration_seconds) },
            sharing.pace_min_km ? { label: 'Pace', value: formatPaceMinKm(sharing.pace_min_km) } : null,
            sharing.avg_hr ? { label: 'Avg HR', value: `${sharing.avg_hr} bpm` } : null,
          ].filter(Boolean) as ShareStat[]}
          dateLabel={formatDate(sharing.date)}
          accentColor={EXERCISE_TYPE_COLORS[sharing.exercise_type]}
          onClose={() => setSharing(null)}
        />
      )}

      {editingActivity && (
        <EditActivityModal
          activity={editingActivity}
          onClose={() => setEditingActivity(null)}
          onSaved={updated => {
            setActivities(prev => prev.map(a => a.id === updated.id ? updated : a));
            setEditingActivity(null);
          }}
          onDeleted={id => {
            setActivities(prev => prev.filter(a => a.id !== id));
            setEditingActivity(null);
          }}
        />
      )}
    </div>
  );
}
