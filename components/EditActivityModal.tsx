'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Activity, ExerciseType, RunType,
  EXERCISE_TYPE_LABELS, RUN_TYPE_LABELS,
  EXERCISE_TYPE_COLORS, RUN_TYPE_COLORS,
  EXERCISE_TYPE_ORDER,
  SportSubType, GymSubType, WaterSnowSubType, SwimSubType, FitnessSubType, BikeSubType, StretchSubType, WalkSubType,
  SPORT_SUB_LABELS, GYM_SUB_LABELS, WATER_SNOW_SUB_LABELS, SWIM_SUB_LABELS, FITNESS_SUB_LABELS, BIKE_SUB_LABELS, STRETCH_SUB_LABELS, WALK_SUB_LABELS,
} from '@/types';
import DistancePicker from './DistancePicker';
import ImageUploader from './ImageUploader';
import { openDatePicker } from '@/lib/utils';

const RUN_TYPES: RunType[] = ['easy', 'long', 'tempo', 'fartlek', 'speed_intervals', 'hill_reps', 'trail', 'long_intervals', 'push_buggy'];

function ColorDot({ color }: { color: string }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0" style={{ background: color }} />;
}

interface Props {
  activity: Activity;
  onClose: () => void;
  onSaved: (updated: Activity) => void;
  onDeleted: (id: string) => void;
}

export default function EditActivityModal({ activity, onClose, onSaved, onDeleted }: Props) {
  const [name, setName] = useState(activity.name);
  const [exerciseType, setExerciseType] = useState<ExerciseType>(activity.exercise_type);
  const [runType, setRunType] = useState<RunType | ''>(activity.run_type || '');
  const [subType, setSubType] = useState(activity.exercise_type === 'hiit' ? '' : activity.sub_type || '');
  const [gymTypes, setGymTypes] = useState<string[]>(activity.exercise_type === 'hiit' && activity.sub_type ? activity.sub_type.split(',') : []);
  const [hours, setHours] = useState(String(Math.floor(activity.duration_minutes / 60) || ''));
  const [mins, setMins] = useState(String(activity.duration_minutes % 60 || ''));
  const [effort, setEffort] = useState<number | null>(activity.effort);
  const [distance, setDistance] = useState(activity.distance_km ? String(activity.distance_km) : '');
  const [notes, setNotes] = useState(activity.notes || '');
  const [intensityMins, setIntensityMins] = useState(activity.intensity_minutes ? String(activity.intensity_minutes) : '');
  const [paceMin, setPaceMin] = useState(activity.pace_min_km ? String(Math.floor(activity.pace_min_km)) : '');
  const [paceSec, setPaceSec] = useState(activity.pace_min_km ? String(Math.round((activity.pace_min_km % 1) * 60)) : '');
  const [maxPaceMin, setMaxPaceMin] = useState(activity.max_pace_min_km ? String(Math.floor(activity.max_pace_min_km)) : '');
  const [maxPaceSec, setMaxPaceSec] = useState(activity.max_pace_min_km ? String(Math.round((activity.max_pace_min_km % 1) * 60)) : '');
  const [maxHr, setMaxHr] = useState(activity.max_hr ? String(activity.max_hr) : '');
  const [avgHr, setAvgHr] = useState(activity.avg_hr ? String(activity.avg_hr) : '');
  const [elevationGain, setElevationGain] = useState(activity.elevation_gain_m ? String(activity.elevation_gain_m) : '');
  const [isPb, setIsPb] = useState(activity.is_pb);
  const [pbDesc, setPbDesc] = useState(activity.pb_description || '');
  const [images, setImages] = useState<string[]>(activity.image_urls ?? []);
  const [date, setDate] = useState(activity.date);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

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

  const accentColor = exerciseType === 'run' && runType
    ? RUN_TYPE_COLORS[runType]
    : EXERCISE_TYPE_COLORS[exerciseType];

  const handleSave = async () => {
    if (!name.trim()) return setError('Please enter an activity name.');
    if (durationMinutes <= 0) return setError('Please enter a valid duration.');
    if (!effort) return setError('Please select effort level.');

    setSaving(true);
    setError('');

    const { data, error: dbErr } = await supabase
      .from('activities')
      .update({
        name: name.trim(),
        exercise_type: exerciseType,
        run_type: exerciseType === 'run' ? runType || null : null,
        sub_type: exerciseType === 'hiit' ? gymTypes.join(',') || null : subType || null,
        duration_minutes: durationMinutes,
        effort,
        distance_km: distance ? parseFloat(distance) : null,
        notes: notes || null,
        intensity_minutes: intensityMins ? parseInt(intensityMins) : null,
        pace_min_km: paceToDecimal(paceMin, paceSec) ?? calcAutoPace(distance, durationMinutes) ?? null,
        max_pace_min_km: paceToDecimal(maxPaceMin, maxPaceSec) ?? null,
        max_hr: maxHr ? parseInt(maxHr) : null,
        avg_hr: avgHr ? parseInt(avgHr) : null,
        elevation_gain_m: elevationGain ? parseInt(elevationGain) : null,
        is_pb: isPb,
        pb_description: isPb ? pbDesc : null,
        image_urls: images.length ? images : null,
        date,
      })
      .eq('id', activity.id)
      .select()
      .single();

    setSaving(false);
    if (dbErr) { setError(dbErr.message); }
    else { onSaved(data as Activity); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    await supabase.from('activities').delete().eq('id', activity.id);
    onDeleted(activity.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full md:max-w-lg bg-[#1E293B] border border-[#334155] rounded-t-2xl md:rounded-2xl overflow-y-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155] sticky top-0 bg-[#1E293B] z-10">
          <h2 className="text-lg font-bold text-white">Edit Activity</h2>
          <button onClick={onClose} className="text-[#64748B] hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {error && <p className="text-red-400 text-sm p-3 rounded-lg bg-red-900/20 border border-red-800">{error}</p>}

          {/* Name */}
          <div>
            <label className="label">Activity Name *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </div>

          {/* Date */}
          <div>
            <label className="label">Date *</label>
            <input type="date" className="input" value={date} onClick={openDatePicker} onChange={e => setDate(e.target.value)} />
          </div>

          {/* Exercise Type */}
          <div>
            <label className="label">Exercise Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {EXERCISE_TYPE_ORDER.map(type => (
                <button
                  key={type}
                  onClick={() => { setExerciseType(type); setRunType(''); setSubType(''); setGymTypes([]); }}
                  className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium border transition-all text-left ${
                    exerciseType === type ? 'border-2 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
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
                      runType === type ? 'border-2 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
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
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(BIKE_SUB_LABELS) as BikeSubType[]).map(t => (
                  <button key={t} onClick={() => setSubType(subType === t ? '' : t)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center ${subType === t ? 'border-yellow-500 bg-yellow-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                    {BIKE_SUB_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {exerciseType === 'walk' && (
            <div>
              <label className="label">Walk Type <span className="text-[#64748B]">(optional)</span></label>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(WALK_SUB_LABELS) as WalkSubType[]).map(t => (
                  <button key={t} onClick={() => setSubType(subType === t ? '' : t)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center ${subType === t ? 'border-orange-500 bg-orange-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                    {WALK_SUB_LABELS[t]}
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
              <input type="number" className="input" placeholder="Hours" min="0" value={hours} onChange={e => setHours(e.target.value)} />
              <input type="number" className="input" placeholder="Minutes" min="0" max="59" value={mins} onChange={e => setMins(e.target.value)} />
            </div>
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
                    effort === n ? 'text-white border-2' : 'border-[#334155] text-[#94A3B8]'
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
            <DistancePicker value={distance} onChange={setDistance} />
          </div>

          {/* Pace */}
          <div>
            <label className="label">Avg Pace (optional) <span className="text-[#64748B]">min/km</span></label>
            <div className="flex gap-2 items-center">
              <input type="number" className="input" placeholder="Min" value={paceMin} onChange={e => setPaceMin(e.target.value)} />
              <span className="text-[#64748B]">:</span>
              <input type="number" className="input" placeholder="Sec" min="0" max="59" value={paceSec} onChange={e => setPaceSec(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Max Pace (optional) <span className="text-[#64748B]">min/km</span></label>
            <div className="flex gap-2 items-center">
              <input type="number" className="input" placeholder="Min" value={maxPaceMin} onChange={e => setMaxPaceMin(e.target.value)} />
              <span className="text-[#64748B]">:</span>
              <input type="number" className="input" placeholder="Sec" min="0" max="59" value={maxPaceSec} onChange={e => setMaxPaceSec(e.target.value)} />
            </div>
          </div>

          {/* HR */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Avg HR (optional)</label>
              <input type="number" className="input" placeholder="bpm" value={avgHr} onChange={e => setAvgHr(e.target.value)} />
            </div>
            <div>
              <label className="label">Max HR (optional)</label>
              <input type="number" className="input" placeholder="bpm" value={maxHr} onChange={e => setMaxHr(e.target.value)} />
            </div>
          </div>

          {/* Intensity */}
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
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
          </div>

          {/* Photos */}
          <ImageUploader userId={activity.user_id} value={images} onChange={setImages} />

          {/* PB */}
          <div>
            <button
              onClick={() => setIsPb(!isPb)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all w-full ${
                isPb ? 'border-yellow-500 bg-yellow-500/10 text-yellow-300' : 'border-[#334155] text-[#94A3B8]'
              }`}
            >
              <span className="text-xl">⭐</span>
              {isPb ? 'Personal Best!' : 'Mark as Personal Best'}
            </button>
            {isPb && (
              <div className="mt-2">
                <input className="input" placeholder="What type of PB?" value={pbDesc} onChange={e => setPbDesc(e.target.value)} />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-2 pb-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-3" style={{ background: accentColor }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={onClose} className="btn-secondary px-4">Cancel</button>
          </div>

          {/* Delete */}
          <div className="pb-2">
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="w-full py-2 text-sm text-[#64748B] hover:text-red-400 transition-colors">
                Delete activity
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm font-medium">
                  {deleting ? 'Deleting...' : 'Yes, delete'}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-lg border border-[#334155] text-[#94A3B8] text-sm">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
