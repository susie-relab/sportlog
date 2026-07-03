'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  ExerciseType, RunType,
  EXERCISE_TYPE_LABELS, RUN_TYPE_LABELS,
  EXERCISE_TYPE_COLORS, RUN_TYPE_COLORS,
  EXERCISE_TYPE_ORDER,
  SportSubType, GymSubType, WaterSnowSubType, SwimSubType, FitnessSubType, BikeSubType, StretchSubType,
  SPORT_SUB_LABELS, GYM_SUB_LABELS, WATER_SNOW_SUB_LABELS, SWIM_SUB_LABELS, FITNESS_SUB_LABELS, BIKE_SUB_LABELS, STRETCH_SUB_LABELS,
} from '@/types';
import DistancePicker from '@/components/DistancePicker';
import { useDirtyForm } from '@/components/DirtyFormContext';

const RUN_TYPES: RunType[] = ['easy', 'long', 'tempo', 'fartlek', 'speed_intervals', 'hill_reps', 'trail', 'long_intervals'];

function ColorDot({ color }: { color: string }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ background: color }} />;
}

export default function AddPage() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [exerciseType, setExerciseType] = useState<ExerciseType | ''>('');
  const [runType, setRunType] = useState<RunType | ''>('');
  const [subType, setSubType] = useState<string>('');
  const [gymTypes, setGymTypes] = useState<string[]>([]);
  const [hours, setHours] = useState('');
  const [mins, setMins] = useState('');
  const [effort, setEffort] = useState<number | null>(null);
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');
  const [intensityMins, setIntensityMins] = useState('');
  const [paceMin, setPaceMin] = useState('');
  const [paceSec, setPaceSec] = useState('');
  const [maxPaceMin, setMaxPaceMin] = useState('');
  const [maxPaceSec, setMaxPaceSec] = useState('');
  const [maxHr, setMaxHr] = useState('');
  const [avgHr, setAvgHr] = useState('');
  const [elevationGain, setElevationGain] = useState('');
  const [isPb, setIsPb] = useState(false);
  const [pbDesc, setPbDesc] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showMore, setShowMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { setDirty, showWarning, setShowWarning, pendingHref } = useDirtyForm();
  const router = useRouter();
  const [planLink, setPlanLink] = useState<{ planId: string; week: number; day: string } | null>(null);

  // Prefill from query params (e.g. clicking a session in a training plan)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('title'); if (t) setName(t);
    const type = params.get('type'); if (type) setExerciseType(type as ExerciseType);
    const rt = params.get('runType'); if (rt) setRunType(rt as RunType);
    const dist = params.get('distance'); if (dist) setDistance(dist);
    const time = params.get('time');
    if (time) { const m = parseInt(time); if (m > 0) { setHours(Math.floor(m / 60) ? String(Math.floor(m / 60)) : ''); setMins(m % 60 ? String(m % 60) : ''); } }
    const planId = params.get('planId'), week = params.get('week'), day = params.get('day');
    if (planId && week && day) setPlanLink({ planId, week: parseInt(week), day });
  }, []);

  const isDirty = !!(name || exerciseType || hours || mins || distance || notes || effort);

  useEffect(() => {
    setDirty(isDirty);
    return () => setDirty(false);
  }, [isDirty, setDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const durationMinutes = (parseInt(hours || '0') * 60) + parseInt(mins || '0');

  const paceToDecimal = (m: string, s: string) => {
    if (!m && !s) return undefined;
    return parseFloat(m || '0') + parseFloat(s || '0') / 60;
  };

  const calcAutoPace = (distStr: string, durMins: number) => {
    const dist = parseFloat(distStr);
    if (!dist || dist <= 0 || durMins <= 0) return undefined;
    return Math.round((durMins / dist) * 1000) / 1000;
  };

  const handleSave = async () => {
    if (!name.trim()) return setError('Please enter an activity name.');
    if (!exerciseType) return setError('Please select an exercise type.');
    if (durationMinutes <= 0) return setError('Please enter a valid duration.');
    if (!effort) return setError('Please select effort level.');

    setSaving(true);
    setError('');

    const { data: inserted, error: dbErr } = await supabase.from('activities').insert({
      user_id: user!.id,
      name: name.trim(),
      exercise_type: exerciseType,
      run_type: exerciseType === 'run' ? runType || null : null,
      sub_type: exerciseType === 'hiit' ? gymTypes.join(',') || null : subType || null,
      duration_minutes: durationMinutes,
      effort,
      distance_km: distance ? parseFloat(distance) : null,
      notes: notes || null,
      intensity_minutes: intensityMins ? parseInt(intensityMins) : null,
      pace_min_km: paceToDecimal(paceMin, paceSec) ?? calcAutoPace(distance, durationMinutes),
      max_pace_min_km: paceToDecimal(maxPaceMin, maxPaceSec),
      max_hr: maxHr ? parseInt(maxHr) : null,
      avg_hr: avgHr ? parseInt(avgHr) : null,
      elevation_gain_m: elevationGain ? parseInt(elevationGain) : null,
      is_pb: isPb,
      pb_description: isPb ? pbDesc : null,
      date,
    }).select('id').single();

    // If this came from a training plan session, mark that day complete.
    if (!dbErr && planLink) {
      const { data: planRow } = await supabase.from('training_plans').select('plan_data').eq('id', planLink.planId).single();
      if (planRow?.plan_data) {
        const pd = planRow.plan_data;
        const wk = pd.weeks.find((w: { weekNumber: number }) => w.weekNumber === planLink.week);
        if (wk && wk.days[planLink.day]) {
          wk.days[planLink.day].completed = true;
          wk.days[planLink.day].completedActivityId = inserted?.id ?? null;
          await supabase.from('training_plans').update({ plan_data: pd, updated_at: new Date().toISOString() }).eq('id', planLink.planId);
        }
      }
      setPlanLink(null);
    }

    setSaving(false);

    if (dbErr) {
      setError(dbErr.message);
    } else {
      setSuccess(true);
      // Reset form
      setName(''); setExerciseType(''); setRunType(''); setSubType(''); setGymTypes([]); setHours(''); setMins('');
      setEffort(null); setDistance(''); setNotes(''); setIntensityMins('');
      setPaceMin(''); setPaceSec(''); setMaxPaceMin(''); setMaxPaceSec('');
      setMaxHr(''); setAvgHr(''); setElevationGain(''); setIsPb(false); setPbDesc('');
      setDate(new Date().toISOString().split('T')[0]);
      setTimeout(() => setSuccess(false), 3000);
      // form is clean after save
    }
  };

  const accentColor = exerciseType === 'run' && runType
    ? RUN_TYPE_COLORS[runType]
    : exerciseType
    ? EXERCISE_TYPE_COLORS[exerciseType]
    : '#3B82F6';

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white mb-5">Add Exercise</h1>

      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-300 text-sm">
          Activity saved! 🎉
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Name */}
        <div>
          <label className="label">Activity Name *</label>
          <input className="input" placeholder="e.g. Morning Run" value={name} onChange={e => setName(e.target.value)} />
        </div>

        {/* Date */}
        <div>
          <label className="label">Date *</label>
          <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        {/* Exercise Type */}
        <div>
          <label className="label">Exercise Session *</label>
          <div className="grid grid-cols-2 gap-2">
            {EXERCISE_TYPE_ORDER.map(type => (
              <button
                key={type}
                onClick={() => { setExerciseType(type); setRunType(''); setSubType(''); setGymTypes([]); }}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium border transition-all text-left ${
                  exerciseType === type
                    ? 'border-2 text-white'
                    : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
                }`}
                style={exerciseType === type ? {
                  borderColor: EXERCISE_TYPE_COLORS[type],
                  background: EXERCISE_TYPE_COLORS[type] + '22',
                } : {}}
              >
                <ColorDot color={EXERCISE_TYPE_COLORS[type]} />
                {EXERCISE_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Run Type */}
        {exerciseType === 'run' && (
          <div>
            <label className="label">Run Type <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-2 gap-2">
              {RUN_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setRunType(runType === type ? '' : type)}
                  className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium border transition-all text-left ${
                    runType === type
                      ? 'border-2 text-white'
                      : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
                  }`}
                  style={runType === type ? {
                    borderColor: RUN_TYPE_COLORS[type],
                    background: RUN_TYPE_COLORS[type] + '33',
                  } : {}}
                >
                  <ColorDot color={RUN_TYPE_COLORS[type]} />
                  {RUN_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sport subtype */}
        {exerciseType === 'sport' && (
          <div>
            <label className="label">Sport Type <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(SPORT_SUB_LABELS) as SportSubType[]).map(t => (
                <button key={t} onClick={() => setSubType(subType === t ? '' : t)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center ${subType === t ? 'border-orange-500 bg-orange-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                  {SPORT_SUB_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Gym subtype — multi select */}
        {exerciseType === 'hiit' && (
          <div>
            <label className="label">Workout Focus <span className="text-[#64748B]">(optional, pick multiple)</span></label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(GYM_SUB_LABELS) as GymSubType[]).map(t => {
                const active = gymTypes.includes(t);
                return (
                  <button key={t} onClick={() => setGymTypes(active ? gymTypes.filter(x => x !== t) : [...gymTypes, t])}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center ${active ? 'border-red-500 bg-red-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                    {GYM_SUB_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {exerciseType === 'water_snow' && (
          <div>
            <label className="label">Activity <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(WATER_SNOW_SUB_LABELS) as WaterSnowSubType[]).map(t => (
                <button key={t} onClick={() => setSubType(subType === t ? '' : t)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center ${subType === t ? 'border-sky-500 bg-sky-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                  {WATER_SNOW_SUB_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        )}
        {exerciseType === 'swim' && (
          <div>
            <label className="label">Swim Type <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(SWIM_SUB_LABELS) as SwimSubType[]).map(t => (
                <button key={t} onClick={() => setSubType(subType === t ? '' : t)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center ${subType === t ? 'border-cyan-500 bg-cyan-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                  {SWIM_SUB_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        )}
        {exerciseType === 'solo_fitness' && (
          <div>
            <label className="label">Activity Type <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(FITNESS_SUB_LABELS) as FitnessSubType[]).map(t => (
                <button key={t} onClick={() => setSubType(subType === t ? '' : t)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center ${subType === t ? 'border-purple-500 bg-purple-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                  {FITNESS_SUB_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        )}
        {exerciseType === 'bike' && (
          <div>
            <label className="label">Ride Type <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(BIKE_SUB_LABELS) as BikeSubType[]).map(t => (
                <button key={t} onClick={() => setSubType(subType === t ? '' : t)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center ${subType === t ? 'border-yellow-500 bg-yellow-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                  {BIKE_SUB_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        )}
        {exerciseType === 'stretch' && (
          <div>
            <label className="label">Stretch Type <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(STRETCH_SUB_LABELS) as StretchSubType[]).map(t => (
                <button key={t} onClick={() => setSubType(subType === t ? '' : t)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center ${subType === t ? 'border-green-500 bg-green-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                  {STRETCH_SUB_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Duration */}
        <div>
          <label className="label">Duration *</label>
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="number"
                className="input"
                placeholder="Hours"
                min="0"
                value={hours}
                onChange={e => setHours(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <input
                type="number"
                className="input"
                placeholder="Minutes"
                min="0"
                max="59"
                value={mins}
                onChange={e => setMins(e.target.value)}
              />
            </div>
          </div>
          {durationMinutes > 0 && (
            <p className="text-xs text-[#64748B] mt-1">
              {Math.floor(durationMinutes / 60) > 0 ? `${Math.floor(durationMinutes / 60)}h ` : ''}{durationMinutes % 60 > 0 ? `${durationMinutes % 60}m` : ''}
            </p>
          )}
        </div>

        {/* Effort */}
        <div>
          <label className="label">Effort * <span className="text-[#64748B]">(1–10)</span></label>
          <div className="flex gap-1.5 flex-wrap">
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button
                key={n}
                onClick={() => setEffort(n)}
                className={`w-9 h-9 rounded-lg text-sm font-semibold border transition-all ${
                  effort === n
                    ? 'text-white border-2'
                    : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
                }`}
                style={effort === n ? { background: accentColor + 'cc', borderColor: accentColor } : {}}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Distance — always visible */}
        <div>
          <label className="label">Distance (optional)</label>
          <DistancePicker value={distance} onChange={setDistance} />
        </div>

        {/* More details toggle */}
        <button
          type="button"
          onClick={() => setShowMore(v => !v)}
          className="flex items-center gap-2 text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors py-1"
        >
          <span>{showMore ? '▼' : '▶'}</span>
          {showMore ? 'Hide details' : 'More details (pace, HR, intensity, notes)'}
        </button>

        {showMore && (
          <>
            {/* Pace */}
            <div>
              <label className="label">Average Pace (optional) <span className="text-[#64748B]">min/km</span></label>
              <div className="flex gap-2 items-center">
                <input type="number" className="input" placeholder="Min" min="0" value={paceMin} onChange={e => setPaceMin(e.target.value)} />
                <span className="text-[#64748B]">:</span>
                <input type="number" className="input" placeholder="Sec" min="0" max="59" value={paceSec} onChange={e => setPaceSec(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">Max Pace (optional) <span className="text-[#64748B]">min/km</span></label>
              <div className="flex gap-2 items-center">
                <input type="number" className="input" placeholder="Min" min="0" value={maxPaceMin} onChange={e => setMaxPaceMin(e.target.value)} />
                <span className="text-[#64748B]">:</span>
                <input type="number" className="input" placeholder="Sec" min="0" max="59" value={maxPaceSec} onChange={e => setMaxPaceSec(e.target.value)} />
              </div>
            </div>

            {/* HR */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Avg Heart Rate (optional)</label>
                <input type="number" className="input" placeholder="bpm" value={avgHr} onChange={e => setAvgHr(e.target.value)} />
              </div>
              <div>
                <label className="label">Max Heart Rate (optional)</label>
                <input type="number" className="input" placeholder="bpm" value={maxHr} onChange={e => setMaxHr(e.target.value)} />
              </div>
            </div>

            {/* Intensity Minutes */}
            <div>
              <label className="label">Intensity Minutes (optional)</label>
              <input type="number" className="input" placeholder="e.g. 25" value={intensityMins} onChange={e => setIntensityMins(e.target.value)} />
            </div>

            {/* Elevation Gain */}
            <div>
              <label className="label">Elevation Gain (optional) <span className="text-[#64748B]">m</span></label>
              <input type="number" className="input" placeholder="e.g. 120" min="0" value={elevationGain} onChange={e => setElevationGain(e.target.value)} />
            </div>

            {/* Notes */}
            <div>
              <label className="label">Notes / Highlights (optional)</label>
              <textarea
                className="input"
                placeholder="How did it go? Any highlights?"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          </>
        )}

        {/* PB */}
        <div>
          <button
            onClick={() => setIsPb(!isPb)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all w-full ${
              isPb
                ? 'border-yellow-500 bg-yellow-500/10 text-yellow-300'
                : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
            }`}
          >
            <span className="text-xl">⭐</span>
            {isPb ? 'Personal Best! 🎉' : 'Mark as Personal Best'}
          </button>
          {isPb && (
            <div className="mt-2">
              <input
                className="input"
                placeholder="What type of PB? (e.g. Fastest 5km, Longest run)"
                value={pbDesc}
                onChange={e => setPbDesc(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full mt-2 py-3 text-base"
          style={{ background: accentColor }}
        >
          {saving ? 'Saving...' : 'Save Activity'}
        </button>
      </div>

      {/* Unsaved changes modal */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6 max-w-sm w-full">
            <h2 className="text-white font-bold text-lg mb-2">Unsaved changes</h2>
            <p className="text-[#94A3B8] text-sm mb-5">You have unsaved changes on this form. Leave anyway?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowWarning(false)} className="btn-secondary flex-1">
                Keep editing
              </button>
              <button
                className="btn-primary flex-1"
                onClick={() => {
                  setShowWarning(false);
                  setDirty(false);
                  router.push(pendingHref);
                }}
              >
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
