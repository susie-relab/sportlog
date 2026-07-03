'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  generateRunPlan, RunDistance, RUN_DISTANCE_LABELS, PlanLevel, Weekday, WEEKDAYS, WEEKDAY_SHORT,
  PlanConfig, PlanRecord,
} from '@/lib/runPlanGenerator';
import PlanWeekTable from './PlanWeekTable';

const DISTANCES: RunDistance[] = ['5k', '10k', 'half', 'marathon', 'keep_fit', 'speed', 'ultra_50k', 'ultra_100k', 'ultra_100mile', 'custom'];
const LEVELS: { value: PlanLevel; label: string; desc: string }[] = [
  { value: 'relaxed', label: 'Relaxed', desc: 'Gentler distances; long runs stay within your goal distance.' },
  { value: 'moderate', label: 'Moderate', desc: 'A balanced mix of easy runs and quality sessions.' },
  { value: 'tough', label: 'Tough', desc: 'More tempo, sprint, and hill work. Bigger long runs.' },
];

interface Props {
  existing?: PlanRecord | null;
  onSaved: (rec: PlanRecord) => void;
  onCancel: () => void;
}

export default function PlanBuilder({ existing, onSaved, onCancel }: Props) {
  const { user } = useAuth();
  const [distance, setDistance] = useState<RunDistance>(existing?.distance ?? '5k');
  const [customKm, setCustomKm] = useState(existing?.custom_distance_km ? String(existing.custom_distance_km) : '');
  const [level, setLevel] = useState<PlanLevel>(existing?.level ?? 'moderate');
  const [weeks, setWeeks] = useState(existing?.weeks ?? 12);
  const [daysPerWeek, setDaysPerWeek] = useState(existing?.days_per_week ?? 4);
  const [trainDays, setTrainDays] = useState<Weekday[]>(existing?.train_days ?? ['mon', 'tue', 'thu', 'sat']);
  const [goalH, setGoalH] = useState(existing?.goal_time_seconds ? String(Math.floor(existing.goal_time_seconds / 3600)) : '');
  const [goalM, setGoalM] = useState(existing?.goal_time_seconds ? String(Math.floor((existing.goal_time_seconds % 3600) / 60)) : '');
  const [goalS, setGoalS] = useState(existing?.goal_time_seconds ? String(existing.goal_time_seconds % 60) : '');
  const [startKm, setStartKm] = useState(existing?.start_distance_km ? String(existing.start_distance_km) : '');
  const [startDate, setStartDate] = useState(existing?.start_date ?? new Date().toISOString().split('T')[0]);

  const [preview, setPreview] = useState(existing?.plan_data ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleDay = (d: Weekday) => {
    setTrainDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const buildConfig = (): PlanConfig => {
    const goalSecs = (parseInt(goalH || '0') * 3600) + (parseInt(goalM || '0') * 60) + parseInt(goalS || '0');
    return {
      distance,
      customDistanceKm: distance === 'custom' ? parseFloat(customKm) || undefined : undefined,
      level, weeks, daysPerWeek, trainDays,
      goalTimeSeconds: goalSecs > 0 ? goalSecs : null,
      startDistanceKm: startKm ? parseFloat(startKm) : null,
    };
  };

  const handleGenerate = () => {
    if (trainDays.length < daysPerWeek) {
      setError(`Pick at least ${daysPerWeek} training days (you selected ${trainDays.length}).`);
      return;
    }
    if (distance === 'custom' && !(parseFloat(customKm) > 0)) {
      setError('Enter a custom distance in km.');
      return;
    }
    setError('');
    setPreview(generateRunPlan(buildConfig()));
  };

  const handleSave = async () => {
    if (!preview || !user) return;
    setSaving(true);
    setError('');
    const cfg = buildConfig();
    const payload = {
      user_id: user.id,
      plan_kind: 'run' as const,
      distance,
      custom_distance_km: distance === 'custom' ? (parseFloat(customKm) || 0) : 0,
      level,
      weeks,
      days_per_week: daysPerWeek,
      train_days: trainDays,
      goal_time_seconds: cfg.goalTimeSeconds,
      start_distance_km: cfg.startDistanceKm,
      start_date: startDate,
      plan_data: preview,
      updated_at: new Date().toISOString(),
    };
    const { data, error: dbErr } = await supabase
      .from('training_plans')
      .upsert(payload, { onConflict: 'user_id,plan_kind,distance,custom_distance_km' })
      .select()
      .single();
    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    onSaved(data as PlanRecord);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">{existing ? 'Edit Plan' : 'New Training Plan'}</h2>
        <button onClick={onCancel} className="text-sm text-[#64748B] hover:text-white">✕ Cancel</button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm">{error}</div>}

      {/* Distance */}
      <div>
        <label className="label">Plan Distance</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {DISTANCES.map(d => (
            <button key={d} onClick={() => setDistance(d)}
              className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${
                distance === d ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
              }`}>
              {RUN_DISTANCE_LABELS[d]}
            </button>
          ))}
        </div>
        {distance === 'custom' && (
          <input type="number" className="input mt-2" placeholder="Custom distance (km, up to 160)" min="1" max="160"
            value={customKm} onChange={e => setCustomKm(e.target.value)} />
        )}
      </div>

      {/* Level */}
      <div>
        <label className="label">Difficulty</label>
        <div className="grid grid-cols-3 gap-1.5">
          {LEVELS.map(l => (
            <button key={l.value} onClick={() => setLevel(l.value)}
              className={`py-2 rounded-lg text-sm font-semibold border transition-all ${
                level === l.value ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
              }`}>
              {l.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#64748B] mt-1.5">{LEVELS.find(l => l.value === level)!.desc}</p>
      </div>

      {/* Weeks + days */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Weeks: <span className="text-white font-bold">{weeks}</span></label>
          <input type="range" min="4" max="16" value={weeks} onChange={e => setWeeks(parseInt(e.target.value))} className="w-full accent-blue-500" />
        </div>
        <div>
          <label className="label">Runs / week: <span className="text-white font-bold">{daysPerWeek}</span></label>
          <input type="range" min="2" max="6" value={daysPerWeek} onChange={e => setDaysPerWeek(parseInt(e.target.value))} className="w-full accent-blue-500" />
        </div>
      </div>

      {/* Train days */}
      <div>
        <label className="label">Available training days <span className="text-[#64748B]">(pick at least {daysPerWeek})</span></label>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map(d => (
            <button key={d} onClick={() => toggleDay(d)}
              className={`py-2 rounded-lg text-[11px] font-semibold border transition-all ${
                trainDays.includes(d) ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
              }`}>
              {WEEKDAY_SHORT[d].slice(0, 1)}
            </button>
          ))}
        </div>
      </div>

      {/* Start date */}
      <div>
        <label className="label">Start date</label>
        <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
      </div>

      {/* Optional inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Goal PB time <span className="text-[#64748B]">(optional)</span></label>
          <div className="flex gap-1.5 items-center">
            <input type="number" className="input" placeholder="h" min="0" value={goalH} onChange={e => setGoalH(e.target.value)} />
            <span className="text-[#64748B]">:</span>
            <input type="number" className="input" placeholder="m" min="0" max="59" value={goalM} onChange={e => setGoalM(e.target.value)} />
            <span className="text-[#64748B]">:</span>
            <input type="number" className="input" placeholder="s" min="0" max="59" value={goalS} onChange={e => setGoalS(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Starting weekly distance <span className="text-[#64748B]">(optional, km)</span></label>
          <input type="number" className="input" placeholder="e.g. 20" min="0" value={startKm} onChange={e => setStartKm(e.target.value)} />
        </div>
      </div>

      {/* Generate / Regenerate */}
      <div className="flex gap-2">
        <button onClick={handleGenerate} className="btn-primary flex-1">
          {preview ? '🎲 Regenerate' : 'Generate Plan'}
        </button>
        {preview && (
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1" style={{ background: '#22C55E' }}>
            {saving ? 'Saving…' : existing ? 'Save Changes' : 'Save Plan'}
          </button>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div>
          <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-3">Preview — regenerate for a different plan</p>
          <PlanWeekTable plan={preview} />
        </div>
      )}
    </div>
  );
}
