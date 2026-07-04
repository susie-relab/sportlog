'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  generateSportPlan, SportConfig, SportSession, SPORT_SESSION_TYPES, PlanLevel,
  Weekday, WEEKDAYS, WEEKDAY_LABELS, PlanRecord, PlanData,
} from '@/lib/runPlanGenerator';
import {
  ExerciseType, EXERCISE_TYPE_LABELS, EXERCISE_TYPE_COLORS, EXERCISE_TYPE_ORDER,
  SPORT_SUB_LABELS, GYM_SUB_LABELS, WATER_SNOW_SUB_LABELS, SWIM_SUB_LABELS,
  FITNESS_SUB_LABELS, BIKE_SUB_LABELS, STRETCH_SUB_LABELS,
} from '@/types';
import PlanWeekTable from './PlanWeekTable';
import PlanDaySheet from './PlanDaySheet';
import { todayLocalISO } from '@/lib/utils';

const SUB_LABELS: Partial<Record<ExerciseType, Record<string, string>>> = {
  sport: SPORT_SUB_LABELS, hiit: GYM_SUB_LABELS, water_snow: WATER_SNOW_SUB_LABELS,
  swim: SWIM_SUB_LABELS, solo_fitness: FITNESS_SUB_LABELS, bike: BIKE_SUB_LABELS, stretch: STRETCH_SUB_LABELS,
};
const LEVELS: PlanLevel[] = ['relaxed', 'moderate', 'tough'];

interface Props {
  existing?: PlanRecord | null;
  onSaved: (rec: PlanRecord) => void;
  onCancel: () => void;
}

export default function SportPlanBuilder({ existing, onSaved, onCancel }: Props) {
  const { user } = useAuth();
  const cfg0 = existing?.plan_data.sportConfig;
  const [name, setName] = useState(cfg0?.name ?? existing?.name ?? '');
  const [exerciseType, setExerciseType] = useState<ExerciseType>((cfg0?.exerciseType as ExerciseType) ?? 'sport');
  const [subType, setSubType] = useState(cfg0?.sportSubType ?? '');
  const [customSport, setCustomSport] = useState(cfg0 && !cfg0.sportSubType && cfg0.sportLabel !== EXERCISE_TYPE_LABELS[cfg0.exerciseType as ExerciseType] ? cfg0.sportLabel : '');
  // weekly session template: day -> session type key ('' = rest/none)
  const initDays = (): Record<Weekday, string> => {
    const base = Object.fromEntries(WEEKDAYS.map(d => [d, ''])) as Record<Weekday, string>;
    cfg0?.sessions.forEach(s => { base[s.day] = s.sessionType; });
    return base;
  };
  const [daySessions, setDaySessions] = useState<Record<Weekday, string>>(initDays());
  const [durMin, setDurMin] = useState(cfg0?.sessions[0]?.durationMin ? String(cfg0.sessions[0].durationMin) : '60');
  const [durMax, setDurMax] = useState(cfg0?.sessions[0]?.durationMax ? String(cfg0.sessions[0].durationMax) : '90');
  const [weeks, setWeeks] = useState(cfg0?.weeks ?? existing?.weeks ?? 8);
  const [level, setLevel] = useState<PlanLevel>(cfg0?.level ?? existing?.level ?? 'moderate');
  const todayISO = todayLocalISO();
  const tomorrowISO = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const [startDate, setStartDate] = useState(cfg0?.startDate ?? existing?.start_date ?? tomorrowISO);
  const [lengthMode, setLengthMode] = useState<'weeks' | 'date'>('weeks');
  const [endDate, setEndDate] = useState('');

  const [preview, setPreview] = useState<PlanData | null>(existing?.plan_data ?? null);
  const [selected, setSelected] = useState<{ week: number; day: Weekday } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const weeksFromDates = (() => {
    if (!endDate) return null;
    const days = Math.round((new Date(endDate + 'T00:00:00').getTime() - new Date(startDate + 'T00:00:00').getTime()) / 86400000);
    return days > 0 ? Math.max(1, Math.ceil((days + 1) / 7)) : null;
  })();
  const effectiveWeeks = lengthMode === 'date' && weeksFromDates ? weeksFromDates : weeks;

  const subs = SUB_LABELS[exerciseType];
  const sportLabel = customSport.trim() || (subType && subs ? subs[subType] : EXERCISE_TYPE_LABELS[exerciseType]);

  const buildConfig = (): SportConfig => {
    const dMin = durMin ? parseInt(durMin) : undefined;
    const dMax = durMax ? parseInt(durMax) : undefined;
    const sessions: SportSession[] = WEEKDAYS
      .filter(d => daySessions[d])
      .map(d => ({ day: d, sessionType: daySessions[d], durationMin: dMin, durationMax: dMax }));
    return {
      name: name.trim() || undefined, exerciseType,
      sportSubType: subType || undefined, sportLabel,
      sessions, weeks: effectiveWeeks, startDate, level,
    };
  };

  const handleGenerate = () => {
    const chosen = WEEKDAYS.filter(d => daySessions[d] && daySessions[d] !== 'rest');
    if (chosen.length === 0) { setError('Assign at least one session to a day.'); return; }
    if (lengthMode === 'date' && !weeksFromDates) { setError('Pick an end date after the start date.'); return; }
    setError('');
    setPreview(generateSportPlan(buildConfig()));
  };

  const handleSave = async () => {
    if (!preview || !user) return;
    setSaving(true); setError('');
    const payload = {
      user_id: user.id, plan_kind: 'sport' as const,
      distance: 'custom', custom_distance_km: 0, level, weeks: effectiveWeeks,
      days_per_week: WEEKDAYS.filter(d => daySessions[d] && daySessions[d] !== 'rest').length,
      days_per_week_min: 0, train_days: WEEKDAYS.filter(d => daySessions[d]),
      goal_time_seconds: null, start_distance_km: null,
      start_date: startDate, name: name.trim() || sportLabel, active: true, plan_data: preview,
      updated_at: new Date().toISOString(),
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
        <h2 className="text-lg font-bold text-white">{existing ? 'Edit Sport Plan' : 'New Sport Plan'}</h2>
        <button onClick={onCancel} className="text-sm text-[#64748B] hover:text-white">✕ Cancel</button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm">{error}</div>}

      <div>
        <label className="label">Plan name <span className="text-[#64748B]">(optional)</span></label>
        <input className="input" placeholder="e.g. Football season" value={name} onChange={e => setName(e.target.value)} />
      </div>

      {/* Sport picker */}
      <div className="card flex flex-col gap-3">
        <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold">Your sport</p>
        <div className="grid grid-cols-3 gap-1.5">
          {EXERCISE_TYPE_ORDER.map(t => (
            <button key={t} onClick={() => { setExerciseType(t); setSubType(''); }}
              className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${exerciseType === t ? 'text-white border-2' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}
              style={exerciseType === t ? { borderColor: EXERCISE_TYPE_COLORS[t], background: EXERCISE_TYPE_COLORS[t] + '22' } : {}}>
              {EXERCISE_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        {subs && (
          <>
            <div className="border-t border-[#334155] -mx-5" />
            <div className="bg-[#0F172A] -mx-5 px-5 pt-3 pb-4">
              <p className="text-[10px] text-[#64748B] uppercase tracking-wide font-semibold mb-2">Which one?</p>
              <div className="grid grid-cols-3 gap-1.5">
                <button onClick={() => { setSubType(''); }} className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-all ${!subType && !customSport ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>General</button>
                {Object.entries(subs).map(([k, lbl]) => (
                  <button key={k} onClick={() => { setSubType(k); setCustomSport(''); }} className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-all ${subType === k ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>{lbl}</button>
                ))}
              </div>
              <input className="input mt-2 text-sm" placeholder="Or type a custom sport…" value={customSport}
                onChange={e => { setCustomSport(e.target.value); if (e.target.value) setSubType(''); }} />
            </div>
            <div className="border-t border-[#334155] -mx-5" />
          </>
        )}
      </div>

      {/* Weekly session template */}
      <div>
        <label className="label">Weekly sessions <span className="text-[#64748B]">(choose what happens each day)</span></label>
        <div className="flex flex-col gap-1.5">
          {WEEKDAYS.map(d => (
            <div key={d} className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#94A3B8] w-24 flex-shrink-0">{WEEKDAY_LABELS[d]}</span>
              <select
                className="input flex-1 text-sm"
                value={daySessions[d]}
                onChange={e => setDaySessions(prev => ({ ...prev, [d]: e.target.value }))}
              >
                <option value="">— Rest / nothing —</option>
                {SPORT_SESSION_TYPES.filter(t => t.key !== 'rest').map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Session length */}
      <div>
        <label className="label">Typical session length <span className="text-[#64748B]">(minutes, applied to all)</span></label>
        <div className="flex gap-2 items-center">
          <input type="number" className="input" placeholder="Min" min="0" value={durMin} onChange={e => setDurMin(e.target.value)} />
          <span className="text-[#64748B]">to</span>
          <input type="number" className="input" placeholder="Max" min="0" value={durMax} onChange={e => setDurMax(e.target.value)} />
        </div>
      </div>

      {/* Level */}
      <div>
        <label className="label">Difficulty</label>
        <div className="grid grid-cols-3 gap-1.5">
          {LEVELS.map(l => (
            <button key={l} onClick={() => setLevel(l)} className={`py-2 rounded-lg text-sm font-semibold border capitalize transition-all ${level === l ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* Length: weeks or end date */}
      <div>
        <label className="label">Plan length</label>
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <button onClick={() => setLengthMode('weeks')} className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${lengthMode === 'weeks' ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>By weeks</button>
          <button onClick={() => setLengthMode('date')} className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${lengthMode === 'date' ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>By end date</button>
        </div>
        {lengthMode === 'weeks' ? (
          <div>
            <span className="text-xs text-[#64748B]">Weeks: <span className="text-white font-bold">{weeks}</span></span>
            <input type="range" min="1" max="16" value={weeks} onChange={e => setWeeks(parseInt(e.target.value))} className="w-full accent-blue-500" />
          </div>
        ) : (
          <div>
            <input type="date" className="input" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
            {weeksFromDates && <p className="text-xs text-[#64748B] mt-1">= {weeksFromDates} weeks</p>}
          </div>
        )}
      </div>

      {/* Start date */}
      <div>
        <label className="label">Start date</label>
        <div className="flex gap-2">
          <input type="date" className="input flex-1" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <button type="button" onClick={() => setStartDate(todayISO)} className={`px-3 rounded-lg text-sm font-semibold border transition-all flex-shrink-0 ${startDate === todayISO ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>Today</button>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handleGenerate} className="btn-primary flex-1">{preview ? 'Regenerate' : 'Generate Plan'}</button>
        {preview && <button onClick={handleSave} disabled={saving} className="btn-primary flex-1" style={{ background: '#22C55E' }}>{saving ? 'Saving…' : existing ? 'Save Changes' : 'Save Plan'}</button>}
      </div>

      {preview && (
        <div>
          <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-3">Preview — click a day to reorder before saving</p>
          <PlanWeekTable plan={preview} onDayClick={(week, day) => setSelected({ week, day })} />
        </div>
      )}

      {selected && preview && (
        <PlanDaySheet data={preview} selected={selected} onSave={setPreview} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
