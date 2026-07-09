'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Activity, ExerciseType, RunType, EXERCISE_TYPE_LABELS, EXERCISE_TYPE_COLORS, RUN_TYPE_LABELS } from '@/types';
import { formatPaceMinKm, formatDuration, formatDate, openDatePicker } from '@/lib/utils';
import ShareCard, { ShareStat } from '@/components/ShareCard';
import { PB_SHARE_ICON } from '@/lib/shareIcons';
import { DISTANCE_PB_KM, DISTANCE_LABELS } from '@/lib/pbDetect';

const EXERCISE_TYPES: ExerciseType[] = ['run', 'walk', 'sport', 'hiit', 'stretch', 'bike', 'swim', 'solo_fitness'];
const RUN_TYPES: RunType[] = ['easy', 'long', 'tempo', 'fartlek', 'speed_intervals', 'hill_reps', 'trail', 'long_intervals', 'push_buggy', 'treadmill'];

interface ManualPB {
  id: string;
  user_id: string;
  title: string;
  description: string;
  date: string;
}

export default function PBsPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [manualPBs, setManualPBs] = useState<ManualPB[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingManual, setAddingManual] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'starred' | 'distance' | 'type' | 'monthly' | 'manual'>('starred');
  const [sharing, setSharing] = useState<Activity | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('activities').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('manual_pbs').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    ]).then(([{ data: acts }, { data: mpbs }]) => {
      setActivities((acts as Activity[]) || []);
      setManualPBs((mpbs as ManualPB[]) || []);
      setLoading(false);
    });
  }, [user]);

  const starredPBs = activities.filter(a => a.is_pb);

  // Best pace for each distance
  const bestPaceByDist = DISTANCE_PB_KM.map(km => {
    const matching = activities.filter(a =>
      a.distance_km !== undefined && a.distance_km !== null &&
      Math.abs(a.distance_km - km) / km < 0.02 &&
      a.pace_min_km
    );
    if (matching.length === 0) return null;
    const best = matching.reduce((b, a) => (a.pace_min_km! < b.pace_min_km! ? a : b));
    return { km, label: DISTANCE_LABELS[km], activity: best };
  }).filter(Boolean);

  // By exercise type PBs
  const exerciseTypePBs = EXERCISE_TYPES.map(type => {
    const typeActs = activities.filter(a => a.exercise_type === type);
    if (typeActs.length === 0) return null;
    return {
      type,
      longestDist: typeActs.filter(a => a.distance_km).sort((a, b) => (b.distance_km || 0) - (a.distance_km || 0))[0],
      longestTime: typeActs.sort((a, b) => b.duration_minutes - a.duration_minutes)[0],
      bestPace: typeActs.filter(a => a.pace_min_km).sort((a, b) => a.pace_min_km! - b.pace_min_km!)[0],
      maxPace: typeActs.filter(a => a.max_pace_min_km).sort((a, b) => a.max_pace_min_km! - b.max_pace_min_km!)[0],
      maxHr: typeActs.filter(a => a.max_hr).sort((a, b) => b.max_hr! - a.max_hr!)[0],
    };
  }).filter(Boolean);

  // By run type PBs
  const runTypePBs = RUN_TYPES.map(type => {
    const typeActs = activities.filter(a => a.run_type === type);
    if (typeActs.length === 0) return null;
    return {
      type,
      longestDist: typeActs.filter(a => a.distance_km).sort((a, b) => (b.distance_km || 0) - (a.distance_km || 0))[0],
      longestTime: typeActs.sort((a, b) => b.duration_minutes - a.duration_minutes)[0],
      bestPace: typeActs.filter(a => a.pace_min_km).sort((a, b) => a.pace_min_km! - b.pace_min_km!)[0],
    };
  }).filter(Boolean);

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
    }).select().single();
    if (data) {
      setManualPBs(prev => [data as ManualPB, ...prev]);
      setManualTitle(''); setManualDesc(''); setAddingManual(false);
    }
  };

  const deleteManualPB = async (id: string) => {
    await supabase.from('manual_pbs').delete().eq('id', id);
    setManualPBs(prev => prev.filter(p => p.id !== id));
  };

  const tabs = [
    { key: 'starred', label: '⭐ Starred' },
    { key: 'distance', label: 'Distance PBs' },
    { key: 'type', label: 'By Type' },
    { key: 'monthly', label: 'Best Months' },
    { key: 'manual', label: 'Manual' },
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

      {/* Starred PBs */}
      {activeTab === 'starred' && (
        <div className="flex flex-col gap-3">
          {starredPBs.length === 0 ? (
            <div className="card text-[#64748B] text-sm">
              No starred PBs yet. When adding an activity, click the ⭐ to mark it as a personal best.
            </div>
          ) : starredPBs.map(a => (
            <div key={a.id} className="card border-yellow-500/30">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⭐</span>
                    <span className="font-semibold text-white">{a.name}</span>
                  </div>
                  {a.pb_description && <p className="text-sm text-yellow-300 mt-1">{a.pb_description}</p>}
                  <div className="flex gap-3 mt-2 flex-wrap">
                    <span className="text-xs text-[#64748B]">{formatDate(a.date)}</span>
                    {a.distance_km && <span className="text-xs text-[#94A3B8]">{a.distance_km} km</span>}
                    {a.pace_min_km && <span className="text-xs text-[#94A3B8]">{formatPaceMinKm(a.pace_min_km)}</span>}
                    <span className="text-xs text-[#94A3B8]">{formatDuration(a.duration_minutes)}</span>
                  </div>
                </div>
                <button onClick={() => setSharing(a)} className="text-xs text-[#64748B] hover:text-white border border-[#334155] hover:border-[#475569] rounded-lg px-2.5 py-1.5 flex-shrink-0">↗ Share</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Distance PBs */}
      {activeTab === 'distance' && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm text-[#94A3B8] font-semibold uppercase tracking-wide">Best Pace by Distance</h2>
          {bestPaceByDist.length === 0 ? (
            <div className="card text-[#64748B] text-sm">No pace data recorded yet.</div>
          ) : bestPaceByDist.map(pb => (
            <div key={pb!.km} className="card flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">{pb!.label}</span>
                <p className="text-xs text-[#64748B] mt-0.5">{pb!.activity.name} · {formatDate(pb!.activity.date)}</p>
              </div>
              <div className="text-right">
                <div className="text-blue-400 font-bold">{formatPaceMinKm(pb!.activity.pace_min_km!)}</div>
                {pb!.activity.distance_km && <div className="text-xs text-[#64748B]">{pb!.activity.distance_km} km</div>}
              </div>
            </div>
          ))}
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
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748B]">Longest Distance</span>
                      <span className="text-blue-400 font-medium">{pb!.longestDist.distance_km} km</span>
                    </div>
                  )}
                  {pb!.longestTime && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748B]">Longest Time</span>
                      <span className="text-blue-400 font-medium">{formatDuration(pb!.longestTime.duration_minutes)}</span>
                    </div>
                  )}
                  {pb!.bestPace && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748B]">Best Pace</span>
                      <span className="text-blue-400 font-medium">{formatPaceMinKm(pb!.bestPace.pace_min_km!)}</span>
                    </div>
                  )}
                  {pb!.maxPace && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748B]">Max Pace</span>
                      <span className="text-blue-400 font-medium">{formatPaceMinKm(pb!.maxPace.max_pace_min_km!)}</span>
                    </div>
                  )}
                  {pb!.maxHr && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748B]">Max HR</span>
                      <span className="text-blue-400 font-medium">{pb!.maxHr.max_hr} bpm</span>
                    </div>
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
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748B]">Longest Distance</span>
                      <span className="text-blue-400 font-medium">{pb!.longestDist.distance_km} km</span>
                    </div>
                  )}
                  {pb!.longestTime && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748B]">Longest Time</span>
                      <span className="text-blue-400 font-medium">{formatDuration(pb!.longestTime.duration_minutes)}</span>
                    </div>
                  )}
                  {pb!.bestPace && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748B]">Best Pace</span>
                      <span className="text-blue-400 font-medium">{formatPaceMinKm(pb!.bestPace.pace_min_km!)}</span>
                    </div>
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
            + Add Manual PB
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
                <p className="text-xs text-[#64748B] mt-1">{formatDate(pb.date)}</p>
              </div>
              <button onClick={() => deleteManualPB(pb.id)} className="text-[#475569] hover:text-red-400 text-xs ml-3">✕</button>
            </div>
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
            { label: 'Duration', value: formatDuration(sharing.duration_minutes) },
            sharing.pace_min_km ? { label: 'Pace', value: formatPaceMinKm(sharing.pace_min_km) } : null,
            sharing.avg_hr ? { label: 'Avg HR', value: `${sharing.avg_hr} bpm` } : null,
          ].filter(Boolean) as ShareStat[]}
          dateLabel={formatDate(sharing.date)}
          accentColor={EXERCISE_TYPE_COLORS[sharing.exercise_type]}
          onClose={() => setSharing(null)}
        />
      )}
    </div>
  );
}
