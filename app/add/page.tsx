'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  ExerciseType, RunType,
  EXERCISE_TYPE_LABELS, RUN_TYPE_LABELS,
  EXERCISE_TYPE_COLORS, RUN_TYPE_COLORS
} from '@/types';

const EXERCISE_TYPES: ExerciseType[] = ['run', 'walk', 'sport', 'hiit', 'stretch', 'bike', 'swim', 'solo_fitness'];
const RUN_TYPES: RunType[] = ['easy', 'long', 'tempo', 'fartlek', 'speed_intervals', 'hill_reps', 'trail', 'long_intervals'];

const DISTANCES = [
  0.1, 0.2, 0.4, 0.5, 0.8, 1, 1.5, 1.6, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 21.1, 22, 23, 24, 25, 26, 27,
  28, 29, 30, 32, 35, 40, 42, 42.2, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90,
  95, 100
];

function ColorDot({ color }: { color: string }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ background: color }} />;
}

export default function AddPage() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [exerciseType, setExerciseType] = useState<ExerciseType | ''>('');
  const [runType, setRunType] = useState<RunType | ''>('');
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
  const [isPb, setIsPb] = useState(false);
  const [pbDesc, setPbDesc] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const durationMinutes = (parseInt(hours || '0') * 60) + parseInt(mins || '0');

  const paceToDecimal = (m: string, s: string) => {
    if (!m && !s) return undefined;
    return parseFloat(m || '0') + parseFloat(s || '0') / 60;
  };

  const handleSave = async () => {
    if (!name.trim()) return setError('Please enter an activity name.');
    if (!exerciseType) return setError('Please select an exercise type.');
    if (exerciseType === 'run' && !runType) return setError('Please select a run type.');
    if (durationMinutes <= 0) return setError('Please enter a valid duration.');
    if (!effort) return setError('Please select effort level.');

    setSaving(true);
    setError('');

    const { error: dbErr } = await supabase.from('activities').insert({
      user_id: user!.id,
      name: name.trim(),
      exercise_type: exerciseType,
      run_type: exerciseType === 'run' ? runType : null,
      duration_minutes: durationMinutes,
      effort,
      distance_km: distance ? parseFloat(distance) : null,
      notes: notes || null,
      intensity_minutes: intensityMins ? parseInt(intensityMins) : null,
      pace_min_km: paceToDecimal(paceMin, paceSec),
      max_pace_min_km: paceToDecimal(maxPaceMin, maxPaceSec),
      max_hr: maxHr ? parseInt(maxHr) : null,
      avg_hr: avgHr ? parseInt(avgHr) : null,
      is_pb: isPb,
      pb_description: isPb ? pbDesc : null,
      date,
    });

    setSaving(false);

    if (dbErr) {
      setError(dbErr.message);
    } else {
      setSuccess(true);
      // Reset form
      setName(''); setExerciseType(''); setRunType(''); setHours(''); setMins('');
      setEffort(null); setDistance(''); setNotes(''); setIntensityMins('');
      setPaceMin(''); setPaceSec(''); setMaxPaceMin(''); setMaxPaceSec('');
      setMaxHr(''); setAvgHr(''); setIsPb(false); setPbDesc('');
      setDate(new Date().toISOString().split('T')[0]);
      setTimeout(() => setSuccess(false), 3000);
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
          <label className="label">Exercise Type *</label>
          <div className="grid grid-cols-2 gap-2">
            {EXERCISE_TYPES.map(type => (
              <button
                key={type}
                onClick={() => { setExerciseType(type); setRunType(''); }}
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
            <label className="label">Run Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {RUN_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setRunType(type)}
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

        {/* Distance */}
        <div>
          <label className="label">Distance (optional)</label>
          <select className="input" value={distance} onChange={e => setDistance(e.target.value)}>
            <option value="">— Select distance —</option>
            {DISTANCES.map(d => (
              <option key={d} value={d}>{d} km</option>
            ))}
          </select>
        </div>

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
    </div>
  );
}
