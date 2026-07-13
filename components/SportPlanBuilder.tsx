'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  generateSportPlan, SportConfig, SportSession, SportPoolItem, SPORT_SESSION_TYPES, PlanLevel,
  Weekday, WEEKDAYS, WEEKDAY_LABELS, PlanRecord, PlanData, movePlanSession, addSessionToDay,
} from '@/lib/runPlanGenerator';
import {
  ExerciseType, EXERCISE_TYPE_LABELS, EXERCISE_TYPE_COLORS, EXERCISE_TYPE_ORDER,
  SPORT_SUB_LABELS, GYM_SUB_LABELS, WATER_SUB_LABELS, SNOW_SUB_LABELS, SWIM_SUB_LABELS,
  FITNESS_SUB_LABELS, BIKE_SUB_LABELS, STRETCH_SUB_LABELS, WALK_SUB_LABELS,
} from '@/types';
import PlanWeekTable from './PlanWeekTable';
import PlanDaySheet from './PlanDaySheet';
import { todayLocalISO, openDatePicker } from '@/lib/utils';

const SUB_LABELS: Partial<Record<ExerciseType, Record<string, string>>> = {
  sport: SPORT_SUB_LABELS, hiit: GYM_SUB_LABELS, water: WATER_SUB_LABELS, snow: SNOW_SUB_LABELS,
  swim: SWIM_SUB_LABELS, solo_fitness: FITNESS_SUB_LABELS, bike: BIKE_SUB_LABELS, stretch: STRETCH_SUB_LABELS, walk: WALK_SUB_LABELS,
};
const LEVELS: PlanLevel[] = ['relaxed', 'moderate', 'tough'];
const BASE_TYPES = SPORT_SESSION_TYPES.filter(t => t.key !== 'rest'); // game/training/skills/... /crosstrain
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

  const [assignMode, setAssignMode] = useState<'perDay' | 'random'>(cfg0?.assignMode ?? 'perDay');
  const [spread, setSpread] = useState<'weeks' | 'cram'>(cfg0?.spread ?? 'weeks');

  // custom session types (added by the user; available in every dropdown + the pick list)
  const seededCustom = (() => {
    const known = new Set(BASE_TYPES.map(t => t.key));
    const fromCfg = [
      ...(cfg0?.sessions.map(s => s.sessionType) ?? []),
      ...(cfg0?.pool.map(p => p.sessionType) ?? []),
    ].filter(k => k && !known.has(k) && k !== 'rest' && k !== 'crosstrain');
    return Array.from(new Set(fromCfg));
  })();
  const [customTypes, setCustomTypes] = useState<string[]>(seededCustom);
  const [newType, setNewType] = useState('');
  const allTypes = [...BASE_TYPES.map(t => ({ key: t.key, label: t.label })), ...customTypes.map(c => ({ key: c, label: c }))];

  // per-day template — each day can hold multiple sessions
  const initDays = (): Record<Weekday, string[]> => {
    const base = Object.fromEntries(WEEKDAYS.map(d => [d, [] as string[]])) as Record<Weekday, string[]>;
    cfg0?.sessions.forEach(s => { base[s.day] = [...(base[s.day] || []), s.sessionType]; });
    return base;
  };
  const [daySessions, setDaySessions] = useState<Record<Weekday, string[]>>(initDays());
  const [perDayDur, setPerDayDur] = useState<Record<Weekday, { min: string; max: string }>>(() => {
    const base = Object.fromEntries(WEEKDAYS.map(d => [d, { min: '', max: '' }])) as Record<Weekday, { min: string; max: string }>;
    cfg0?.sessions.forEach(s => { base[s.day] = { min: s.durationMin ? String(s.durationMin) : '', max: s.durationMax ? String(s.durationMax) : '' }; });
    return base;
  });

  // random pool
  const [counts, setCounts] = useState<Record<string, string>>(() => Object.fromEntries((cfg0?.pool ?? []).map(p => [p.sessionType, String(p.count)])));
  const [perTypeDur, setPerTypeDur] = useState<Record<string, { min: string; max: string }>>(() =>
    Object.fromEntries((cfg0?.pool ?? []).map(p => [p.sessionType, { min: p.durationMin ? String(p.durationMin) : '', max: p.durationMax ? String(p.durationMax) : '' }])));

  const [durationMode, setDurationMode] = useState<'all' | 'per'>('all');
  const [durMin, setDurMin] = useState(cfg0?.sessions[0]?.durationMin ? String(cfg0.sessions[0].durationMin) : (cfg0?.pool[0]?.durationMin ? String(cfg0.pool[0].durationMin) : '60'));
  const [durMax, setDurMax] = useState(cfg0?.sessions[0]?.durationMax ? String(cfg0.sessions[0].durationMax) : (cfg0?.pool[0]?.durationMax ? String(cfg0.pool[0].durationMax) : '90'));

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
  const totalRandom = Object.values(counts).reduce((s, c) => s + (parseInt(c) || 0), 0);

  const globalDur = () => ({ min: durMin ? parseInt(durMin) : undefined, max: durMax ? parseInt(durMax) : undefined });
  const durForDay = (d: Weekday) => durationMode === 'all' ? globalDur() : { min: perDayDur[d]?.min ? parseInt(perDayDur[d].min) : undefined, max: perDayDur[d]?.max ? parseInt(perDayDur[d].max) : undefined };
  const durForType = (t: string) => durationMode === 'all' ? globalDur() : { min: perTypeDur[t]?.min ? parseInt(perTypeDur[t].min) : undefined, max: perTypeDur[t]?.max ? parseInt(perTypeDur[t].max) : undefined };

  const addCustomType = () => {
    const t = newType.trim();
    if (!t || allTypes.some(x => x.label.toLowerCase() === t.toLowerCase())) { setNewType(''); return; }
    setCustomTypes(prev => [...prev, t]);
    setNewType('');
  };

  const buildConfig = (): SportConfig => {
    const sessions: SportSession[] = WEEKDAYS.flatMap(d => {
      const dur = durForDay(d);
      return (daySessions[d] || []).map(sessionType => ({ day: d, sessionType, durationMin: dur.min, durationMax: dur.max }));
    });
    const pool: SportPoolItem[] = allTypes
      .filter(t => (parseInt(counts[t.key]) || 0) > 0)
      .map(t => { const dur = durForType(t.key); return { sessionType: t.key, count: parseInt(counts[t.key]), durationMin: dur.min, durationMax: dur.max }; });
    return {
      name: name.trim() || undefined, exerciseType, sportSubType: subType || undefined, sportLabel,
      assignMode, sessions, pool, spread, weeks: effectiveWeeks, startDate, level,
    };
  };

  const handleGenerate = () => {
    if (assignMode === 'perDay' && WEEKDAYS.every(d => (daySessions[d] || []).length === 0)) { setError('Assign at least one session to a day.'); return; }
    if (assignMode === 'random' && totalRandom === 0) { setError('Add at least one session to the pool.'); return; }
    if (lengthMode === 'date' && !weeksFromDates) { setError('Pick an end date after the start date.'); return; }
    setError('');
    setPreview(generateSportPlan(buildConfig()));
  };

  const handleSave = async () => {
    if (!preview || !user) return;
    setSaving(true); setError('');
    const daysCount = assignMode === 'random' ? Math.min(7, totalRandom) : WEEKDAYS.filter(d => (daySessions[d] || []).length > 0).length;
    const payload = {
      user_id: user.id, plan_kind: 'sport' as const,
      distance: 'custom', custom_distance_km: 0, level, weeks: effectiveWeeks,
      days_per_week: daysCount, days_per_week_min: 0,
      train_days: WEEKDAYS.filter(d => daySessions[d]),
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

  const perDur = durationMode === 'per';

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
                <button onClick={() => setSubType('')} className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-all ${!subType && !customSport ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>General</button>
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

      {/* Custom session types */}
      <div>
        <label className="label">Session types</label>
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Add your own session type (e.g. Gym, Yoga)…" value={newType}
            onChange={e => setNewType(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomType(); } }} />
          <button onClick={addCustomType} className="btn-secondary px-4 flex-shrink-0">+ Add</button>
        </div>
        {customTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {customTypes.map(c => (
              <span key={c} className="text-xs px-2 py-1 rounded-full bg-[#1E293B] border border-[#334155] text-[#94A3B8] flex items-center gap-1">
                {c}
                <button onClick={() => setCustomTypes(prev => prev.filter(x => x !== c))} className="text-[#64748B] hover:text-red-400">✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Assign mode */}
      <div>
        <label className="label">How to schedule</label>
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={() => setAssignMode('perDay')} className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${assignMode === 'perDay' ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>Choose what happens each day of the week</button>
          <button onClick={() => setAssignMode('random')} className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${assignMode === 'random' ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>Choose sessions to be scheduled at random</button>
        </div>
      </div>

      {/* Duration mode */}
      <div>
        <label className="label">Session length</label>
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <button onClick={() => setDurationMode('all')} className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${durationMode === 'all' ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>Same for all</button>
          <button onClick={() => setDurationMode('per')} className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${durationMode === 'per' ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>Per {assignMode === 'random' ? 'session type' : 'day'}</button>
        </div>
        {durationMode === 'all' && (
          <div className="flex gap-2 items-center">
            <input type="number" className="input" placeholder="Min" min="0" value={durMin} onChange={e => setDurMin(e.target.value)} />
            <span className="text-[#64748B]">to</span>
            <input type="number" className="input" placeholder="Max" min="0" value={durMax} onChange={e => setDurMax(e.target.value)} />
            <span className="text-xs text-[#64748B]">min</span>
          </div>
        )}
      </div>

      {/* Per-day assignment */}
      {assignMode === 'perDay' && (
        <div>
          <label className="label">Weekly sessions <span className="text-[#64748B]">(choose what happens each day)</span></label>
          <div className="flex flex-col gap-2">
            {WEEKDAYS.map(d => {
              const list = daySessions[d] || [];
              return (
                <div key={d} className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-[#94A3B8] w-16 sm:w-20 flex-shrink-0 pt-2">{WEEKDAY_LABELS[d]}</span>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    {list.map((st, i) => (
                      <select key={i} className="input w-full text-sm" value={st}
                        onChange={e => setDaySessions(prev => {
                          const next = [...(prev[d] || [])];
                          if (e.target.value === '') next.splice(i, 1); else next[i] = e.target.value;
                          return { ...prev, [d]: next };
                        })}>
                        <option value="">— Remove —</option>
                        {allTypes.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                      </select>
                    ))}
                    <select className="input w-full text-sm text-[#94A3B8]" value=""
                      onChange={e => { if (e.target.value) setDaySessions(prev => ({ ...prev, [d]: [...(prev[d] || []), e.target.value] })); }}>
                      <option value="">{list.length ? '+ Add another session…' : '— Rest / nothing —'}</option>
                      {allTypes.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                    {perDur && list.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#64748B] flex-shrink-0">Duration</span>
                        <input type="number" className="input flex-1 min-w-0 px-2 text-sm" placeholder="min" value={perDayDur[d]?.min ?? ''} onChange={e => setPerDayDur(p => ({ ...p, [d]: { ...p[d], min: e.target.value } }))} />
                        <span className="text-[#64748B] text-xs">to</span>
                        <input type="number" className="input flex-1 min-w-0 px-2 text-sm" placeholder="max" value={perDayDur[d]?.max ?? ''} onChange={e => setPerDayDur(p => ({ ...p, [d]: { ...p[d], max: e.target.value } }))} />
                        <span className="text-[10px] text-[#64748B] flex-shrink-0">min</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Random pool */}
      {assignMode === 'random' && (
        <div>
          <label className="label">Sessions to include <span className="text-[#64748B]">(tap to add, then set how many per week)</span></label>
          <div className="grid grid-cols-2 gap-1.5">
            {allTypes.map(t => {
              const c = parseInt(counts[t.key]) || 0;
              const on = c > 0;
              return (
                <div key={t.key} role="button" tabIndex={0}
                  onClick={() => setCounts(prev => ({ ...prev, [t.key]: on ? '0' : '1' }))}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCounts(prev => ({ ...prev, [t.key]: on ? '0' : '1' })); } }}
                  className={`rounded-lg border p-2 transition-all cursor-pointer ${on ? 'border-blue-500 bg-blue-500/15' : 'border-[#334155] hover:border-[#475569]'}`}>
                  <div className="w-full text-left text-xs font-semibold text-white flex items-center justify-between gap-1">
                    <span className="truncate">{t.label}</span>
                    {on && <span className="text-[10px] text-blue-300 flex-shrink-0">×{c}/wk</span>}
                  </div>
                  {on && (
                    <div className="flex items-center gap-1.5 mt-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setCounts(prev => ({ ...prev, [t.key]: String(Math.max(1, c - 1)) }))} className="w-6 h-6 rounded border border-[#334155] text-[#94A3B8] text-xs">−</button>
                      <span className="text-sm text-white w-5 text-center">{c}</span>
                      <button onClick={() => setCounts(prev => ({ ...prev, [t.key]: String(c + 1) }))} className="w-6 h-6 rounded border border-[#334155] text-[#94A3B8] text-xs">+</button>
                      {perDur && (
                        <div className="flex items-center gap-1 ml-auto">
                          <input type="number" className="input w-11 px-1 text-xs" placeholder="min" value={perTypeDur[t.key]?.min ?? ''} onChange={e => setPerTypeDur(p => ({ ...p, [t.key]: { ...p[t.key], min: e.target.value } }))} />
                          <span className="text-[#64748B] text-xs">-</span>
                          <input type="number" className="input w-11 px-1 text-xs" placeholder="max" value={perTypeDur[t.key]?.max ?? ''} onChange={e => setPerTypeDur(p => ({ ...p, [t.key]: { ...p[t.key], max: e.target.value } }))} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {totalRandom > 7 && (
            <div className="mt-3">
              <p className="text-xs text-[#64748B] mb-1.5">{totalRandom} sessions/week — more than 7 days:</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => setSpread('weeks')} className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${spread === 'weeks' ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>Spread across weeks</button>
                <button onClick={() => setSpread('cram')} className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${spread === 'cram' ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>Pack into each week</button>
              </div>
            </div>
          )}
        </div>
      )}

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
            <input type="date" className="input" value={endDate} min={startDate} onClick={openDatePicker} onChange={e => setEndDate(e.target.value)} />
            {weeksFromDates && <p className="text-xs text-[#64748B] mt-1">= {weeksFromDates} weeks</p>}
          </div>
        )}
      </div>

      {/* Start date */}
      <div>
        <label className="label">Start date</label>
        <div className="flex gap-2">
          <input type="date" className="input flex-1" value={startDate} onClick={openDatePicker} onChange={e => setStartDate(e.target.value)} />
          <button type="button" onClick={() => setStartDate(todayISO)} className={`px-3 rounded-lg text-sm font-semibold border transition-all flex-shrink-0 ${startDate === todayISO ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>Today</button>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handleGenerate} className="btn-primary flex-1">{preview ? (assignMode === 'random' ? '🎲 Regenerate' : 'Regenerate') : 'Generate Plan'}</button>
        {preview && <button onClick={handleSave} disabled={saving} className="btn-primary flex-1" style={{ background: '#22C55E' }}>{saving ? 'Saving…' : existing ? 'Save Changes' : 'Save Plan'}</button>}
      </div>

      {preview && (
        <div>
          <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-3">Preview — click a day to reorder before saving</p>
          <PlanWeekTable plan={preview} onDayClick={(week, day) => setSelected({ week, day })}
            onMove={(fromWeek, from, toWeek, to) => setPreview(p => p && movePlanSession(p, { week: fromWeek, day: from }, { week: toWeek, day: to }))}
            onAdd={(fromWeek, from, toWeek, to) => setPreview(p => p && addSessionToDay(p, { week: fromWeek, day: from }, { week: toWeek, day: to }))} />
        </div>
      )}

      {selected && preview && (
        <PlanDaySheet data={preview} selected={selected} onSave={setPreview} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
