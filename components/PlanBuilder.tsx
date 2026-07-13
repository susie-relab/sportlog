'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  generateRunPlan, RunDistance, RUN_DISTANCE_LABELS, PlanLevel, Weekday, WEEKDAYS, WEEKDAY_SHORT, WEEKDAY_LABELS,
  PlanConfig, PlanRecord, PlanData, movePlanSession, addSessionToDay,
} from '@/lib/runPlanGenerator';
import PlanWeekTable from './PlanWeekTable';
import PlanDaySheet from './PlanDaySheet';
import { todayLocalISO, openDatePicker } from '@/lib/utils';

const DISTANCES: RunDistance[] = ['5k', '10k', 'half', 'marathon', 'keep_fit', 'speed', 'ultra_50k', 'ultra_100k', 'ultra_100mile', 'custom'];
const LEVELS: { value: PlanLevel; label: string; desc: string }[] = [
  { value: 'relaxed', label: 'Relaxed', desc: 'Gentler distances; long runs stay within your goal distance.' },
  { value: 'moderate', label: 'Moderate', desc: 'A balanced mix of easy runs and quality sessions.' },
  { value: 'tough', label: 'Tough', desc: 'More tempo, sprint, and hill work. Bigger long runs.' },
];

interface Props {
  existing?: PlanRecord | null;
  hasActiveRunPlan?: boolean; // whether the user already has another active run plan
  onSaved: (rec: PlanRecord) => void;
  onCancel: () => void;
}

export default function PlanBuilder({ existing, hasActiveRunPlan, onSaved, onCancel }: Props) {
  const { user } = useAuth();
  const [distance, setDistance] = useState<RunDistance>(existing?.distance ?? '5k');
  const [customKm, setCustomKm] = useState(existing?.custom_distance_km ? String(existing.custom_distance_km) : '');
  const [level, setLevel] = useState<PlanLevel>(existing?.level ?? 'moderate');
  const [weeks, setWeeks] = useState(existing?.weeks ?? 12);
  const [daysMax, setDaysMax] = useState(existing?.days_per_week ?? 4);
  const [daysMin, setDaysMin] = useState(existing?.days_per_week_min && existing.days_per_week_min > 0 ? existing.days_per_week_min : (existing?.days_per_week ?? 4));
  const [trainDays, setTrainDays] = useState<Weekday[]>(existing?.train_days ?? ['mon', 'tue', 'thu', 'sat']);
  const [goalH, setGoalH] = useState(existing?.goal_time_seconds ? String(Math.floor(existing.goal_time_seconds / 3600)) : '');
  const [goalM, setGoalM] = useState(existing?.goal_time_seconds ? String(Math.floor((existing.goal_time_seconds % 3600) / 60)) : '');
  const [goalS, setGoalS] = useState(existing?.goal_time_seconds ? String(existing.goal_time_seconds % 60) : '');
  const [startKm, setStartKm] = useState(existing?.start_distance_km ? String(existing.start_distance_km) : '');
  const [longRunCap, setLongRunCap] = useState(existing?.long_run_cap_km ? String(existing.long_run_cap_km) : '');
  const todayISO = todayLocalISO();
  const tomorrowISO = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const [startDate, setStartDate] = useState(existing?.start_date ?? tomorrowISO);
  const [lengthMode, setLengthMode] = useState<'weeks' | 'date'>('weeks');
  const [endDate, setEndDate] = useState('');
  const [longRunDay, setLongRunDay] = useState<Weekday | 'random' | 'auto'>('auto');

  const [preview, setPreview] = useState<PlanData | null>(existing?.plan_data ?? null);
  const [selected, setSelected] = useState<{ week: number; day: Weekday } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Effective weeks: from the slider, or computed from a goal end date.
  const weeksFromDates = (() => {
    if (!endDate) return null;
    const days = Math.round((new Date(endDate + 'T00:00:00').getTime() - new Date(startDate + 'T00:00:00').getTime()) / 86400000);
    return days > 0 ? Math.max(1, Math.ceil((days + 1) / 7)) : null;
  })();
  const effectiveWeeks = lengthMode === 'date' && weeksFromDates ? weeksFromDates : weeks;

  const toggleDay = (d: Weekday) => {
    setTrainDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const buildConfig = (): PlanConfig => {
    const goalSecs = (parseInt(goalH || '0') * 3600) + (parseInt(goalM || '0') * 60) + parseInt(goalS || '0');
    return {
      distance,
      customDistanceKm: distance === 'custom' ? parseFloat(customKm) || undefined : undefined,
      level, weeks: effectiveWeeks, daysPerWeek: daysMax, daysPerWeekMin: daysMin, trainDays,
      goalTimeSeconds: goalSecs > 0 ? goalSecs : null,
      startDistanceKm: startKm ? parseFloat(startKm) : null,
      startDate,
      longRunDay: longRunDay === 'auto' ? null : longRunDay,
      longRunCapKm: longRunCap ? parseFloat(longRunCap) : null,
    };
  };

  const handleGenerate = () => {
    if (trainDays.length < daysMax) {
      setError(`Pick at least ${daysMax} training days (you selected ${trainDays.length}).`);
      return;
    }
    if (distance === 'custom' && !(parseFloat(customKm) > 0)) {
      setError('Enter a custom distance in km.');
      return;
    }
    if (lengthMode === 'date' && !weeksFromDates) {
      setError('Pick an end date after the start date.');
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
      weeks: effectiveWeeks,
      days_per_week: daysMax,
      days_per_week_min: daysMin,
      train_days: trainDays,
      goal_time_seconds: cfg.goalTimeSeconds,
      start_distance_km: cfg.startDistanceKm,
      long_run_cap_km: cfg.longRunCapKm,
      start_date: startDate,
      plan_data: preview,
      updated_at: new Date().toISOString(),
      // Preserve active status when editing; a brand-new run plan auto-activates
      // only if the user doesn't already have another active run plan.
      ...(existing ? {} : { active: !hasActiveRunPlan }),
    };
    const q = existing
      ? supabase.from('training_plans').update(payload).eq('id', existing.id).select().single()
      : supabase.from('training_plans').insert(payload).select().single();
    const { data, error: dbErr } = await q;
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

      {/* Length: weeks or end date */}
      <div>
        <label className="label">Plan length</label>
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <button onClick={() => setLengthMode('weeks')}
            className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${lengthMode === 'weeks' ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
            By weeks
          </button>
          <button onClick={() => setLengthMode('date')}
            className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${lengthMode === 'date' ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
            By goal date
          </button>
        </div>
        {lengthMode === 'weeks' ? (
          <div>
            <span className="text-xs text-[#64748B]">Weeks: <span className="text-white font-bold">{weeks}</span></span>
            <input type="range" min="4" max="16" value={weeks} onChange={e => setWeeks(parseInt(e.target.value))} className="w-full accent-blue-500" />
          </div>
        ) : (
          <div>
            <input type="date" className="input" value={endDate} min={startDate} onClick={openDatePicker} onChange={e => setEndDate(e.target.value)} />
            {weeksFromDates && <p className="text-xs text-[#64748B] mt-1">= {weeksFromDates} weeks</p>}
          </div>
        )}
      </div>

      {/* Runs per week — range or exact */}
      <div>
        <label className="label">
          Runs / week: <span className="text-white font-bold">{daysMin === daysMax ? daysMax : `${daysMin}–${daysMax}`}</span>
          {daysMin !== daysMax && <span className="text-[#64748B] text-xs"> (varies week to week)</span>}
        </label>
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div>
            <span className="text-xs text-[#64748B]">Min</span>
            <input type="range" min="2" max="6" value={daysMin}
              onChange={e => { const v = parseInt(e.target.value); setDaysMin(v); if (v > daysMax) setDaysMax(v); }}
              className="w-full accent-blue-500" />
          </div>
          <div>
            <span className="text-xs text-[#64748B]">Max</span>
            <input type="range" min="2" max="6" value={daysMax}
              onChange={e => { const v = parseInt(e.target.value); setDaysMax(v); if (v < daysMin) setDaysMin(v); }}
              className="w-full accent-blue-500" />
          </div>
        </div>
      </div>

      {/* Train days */}
      <div>
        <label className="label">Available training days <span className="text-[#64748B]">(pick at least {daysMax})</span></label>
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

      {/* Long run day */}
      <div>
        <label className="label">Long run day</label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          <button onClick={() => setLongRunDay('auto')}
            className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${longRunDay === 'auto' ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
            Auto (weekend)
          </button>
          <button onClick={() => setLongRunDay('random')}
            className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${longRunDay === 'random' ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
            Random each week
          </button>
          {trainDays.map(d => (
            <button key={d} onClick={() => setLongRunDay(d)}
              className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${longRunDay === d ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
              {WEEKDAY_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {/* Start date */}
      <div>
        <label className="label">Start date</label>
        <div className="flex gap-2">
          <input type="date" className="input flex-1" value={startDate} onClick={openDatePicker} onChange={e => setStartDate(e.target.value)} />
          <button type="button" onClick={() => setStartDate(todayISO)}
            className={`px-3 rounded-lg text-sm font-semibold border transition-all flex-shrink-0 ${startDate === todayISO ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
            Today
          </button>
        </div>
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
          <label className="label">Week 1's total distance <span className="text-[#64748B]">(optional, km)</span></label>
          <input type="number" className="input" placeholder="e.g. 20" min="0" value={startKm} onChange={e => setStartKm(e.target.value)} />
        </div>
        <div>
          <label className="label">Long runs never exceed <span className="text-[#64748B]">(optional, km)</span></label>
          <input type="number" className="input" placeholder="e.g. 25" min="5" value={longRunCap} onChange={e => setLongRunCap(e.target.value)} />
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
          <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-3">Preview — click a day for more info or to reorder before saving</p>
          <PlanWeekTable plan={preview} onDayClick={(week, day) => setSelected({ week, day })}
            onMove={(fromWeek, from, toWeek, to) => setPreview(p => p && movePlanSession(p, { week: fromWeek, day: from }, { week: toWeek, day: to }))}
            onAdd={(fromWeek, from, toWeek, to) => setPreview(p => p && addSessionToDay(p, { week: fromWeek, day: from }, { week: toWeek, day: to }))} />
        </div>
      )}

      {selected && preview && (
        <PlanDaySheet
          data={preview}
          selected={selected}
          cfg={buildConfig()}
          onSave={setPreview}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
