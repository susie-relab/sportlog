'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  generateCustomPlan, CustomActivity, CustomConfig, PlanLevel, Weekday, WEEKDAYS, WEEKDAY_SHORT, PlanRecord, PlanData,
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

export default function CustomPlanBuilder({ existing, onSaved, onCancel }: Props) {
  const { user } = useAuth();
  const cfg0 = existing?.plan_data.customConfig;
  const [name, setName] = useState(cfg0?.name ?? existing?.name ?? '');
  const [activities, setActivities] = useState<CustomActivity[]>(cfg0?.activities ?? []);
  const [weeks, setWeeks] = useState(cfg0?.weeks ?? existing?.weeks ?? 8);
  const [daysPerWeek, setDaysPerWeek] = useState(cfg0?.daysPerWeek ?? existing?.days_per_week ?? 5);
  const [trainDays, setTrainDays] = useState<Weekday[]>(cfg0?.trainDays ?? ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
  const [level, setLevel] = useState<PlanLevel>(cfg0?.level ?? existing?.level ?? 'moderate');
  const todayISO = todayLocalISO();
  const tomorrowISO = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const [startDate, setStartDate] = useState(cfg0?.startDate ?? existing?.start_date ?? tomorrowISO);

  // add-activity form state
  const [selType, setSelType] = useState<ExerciseType>('sport');
  const [selSub, setSelSub] = useState<string>('');
  const [qty, setQty] = useState(1);
  const [durMin, setDurMin] = useState('45');
  const [durMax, setDurMax] = useState('60');

  const [preview, setPreview] = useState<PlanData | null>(existing?.plan_data ?? null);
  const [selected, setSelected] = useState<{ week: number; day: Weekday } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleDay = (d: Weekday) => setTrainDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const subs = SUB_LABELS[selType];
  const addActivity = () => {
    const subLabel = selSub && subs ? subs[selSub] : '';
    const label = subLabel || EXERCISE_TYPE_LABELS[selType];
    setActivities(prev => [...prev, {
      exerciseType: selType, subType: selSub || undefined, label, quantity: qty,
      durationMin: durMin ? parseInt(durMin) : undefined, durationMax: durMax ? parseInt(durMax) : undefined,
    }]);
    setSelSub('');
    setQty(1);
  };
  const removeActivity = (i: number) => setActivities(prev => prev.filter((_, idx) => idx !== i));

  const totalPerWeek = activities.reduce((s, a) => s + a.quantity, 0);

  const buildConfig = (): CustomConfig => ({ name: name.trim() || undefined, activities, weeks, daysPerWeek, trainDays, level, startDate });

  const handleGenerate = () => {
    if (activities.length === 0) { setError('Add at least one activity.'); return; }
    if (trainDays.length < daysPerWeek) { setError(`Pick at least ${daysPerWeek} training days.`); return; }
    setError('');
    setPreview(generateCustomPlan(buildConfig()));
  };

  const handleSave = async () => {
    if (!preview || !user) return;
    setSaving(true); setError('');
    const payload = {
      user_id: user.id, plan_kind: 'custom' as const,
      distance: 'custom', custom_distance_km: 0, level, weeks,
      days_per_week: daysPerWeek, days_per_week_min: daysPerWeek,
      train_days: trainDays, goal_time_seconds: null, start_distance_km: null,
      start_date: startDate, name: name.trim() || 'Sport Plan', active: true, plan_data: preview,
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
        <input className="input" placeholder="e.g. Off-season mix" value={name} onChange={e => setName(e.target.value)} />
      </div>

      {/* Added activities */}
      <div>
        <label className="label">Weekly activities {totalPerWeek > 0 && <span className="text-[#64748B]">({totalPerWeek}/week)</span>}</label>
        {activities.length === 0 ? (
          <p className="text-sm text-[#475569]">None yet — add activities below.</p>
        ) : (
          <div className="flex flex-col gap-1.5 mb-2">
            {activities.map((a, i) => (
              <div key={i} className="flex items-center gap-2 py-2 px-3 rounded-lg border border-[#293548] bg-[#0F172A]">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: EXERCISE_TYPE_COLORS[a.exerciseType as ExerciseType] || '#3B82F6' }} />
                <span className="text-sm text-white flex-1 min-w-0 truncate">{a.quantity}× {a.label}</span>
                {a.durationMin && <span className="text-xs text-[#64748B]">{a.durationMin}{a.durationMax && a.durationMax !== a.durationMin ? `–${a.durationMax}` : ''} min</span>}
                <button onClick={() => removeActivity(i)} className="text-[#64748B] hover:text-red-400 text-sm flex-shrink-0">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add activity form */}
      <div className="card flex flex-col gap-3">
        <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold">Add an activity</p>
        <div className="grid grid-cols-3 gap-1.5">
          {EXERCISE_TYPE_ORDER.map(t => (
            <button key={t} onClick={() => { setSelType(t); setSelSub(''); }}
              className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${selType === t ? 'text-white border-2' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}
              style={selType === t ? { borderColor: EXERCISE_TYPE_COLORS[t], background: EXERCISE_TYPE_COLORS[t] + '22' } : {}}>
              {EXERCISE_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        {subs && (
          <>
            <div className="border-t border-[#334155] -mx-5" />
            <div className="bg-[#0F172A] -mx-5 -mb-3 px-5 pt-3 pb-4 rounded-b-xl">
              <p className="text-[10px] text-[#64748B] uppercase tracking-wide font-semibold mb-2">Subtype (optional)</p>
              <div className="grid grid-cols-3 gap-1.5">
                <button onClick={() => setSelSub('')} className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-all ${!selSub ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>General</button>
                {Object.entries(subs).map(([k, lbl]) => (
                  <button key={k} onClick={() => setSelSub(k)} className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-all ${selSub === k ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>{lbl}</button>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="grid grid-cols-3 gap-2 items-end">
          <div>
            <span className="text-xs text-[#64748B]">Per week</span>
            <input type="number" className="input" min="1" max="14" value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} />
          </div>
          <div>
            <span className="text-xs text-[#64748B]">Min mins</span>
            <input type="number" className="input" min="0" value={durMin} onChange={e => setDurMin(e.target.value)} />
          </div>
          <div>
            <span className="text-xs text-[#64748B]">Max mins</span>
            <input type="number" className="input" min="0" value={durMax} onChange={e => setDurMax(e.target.value)} />
          </div>
        </div>
        <button onClick={addActivity} className="btn-secondary">+ Add {selSub && subs ? subs[selSub] : EXERCISE_TYPE_LABELS[selType]}</button>
      </div>

      {/* Weeks + days */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Weeks: <span className="text-white font-bold">{weeks}</span></label>
          <input type="range" min="1" max="16" value={weeks} onChange={e => setWeeks(parseInt(e.target.value))} className="w-full accent-blue-500" />
        </div>
        <div>
          <label className="label">Sessions / week: <span className="text-white font-bold">{daysPerWeek}</span></label>
          <input type="range" min="1" max="7" value={daysPerWeek} onChange={e => setDaysPerWeek(parseInt(e.target.value))} className="w-full accent-blue-500" />
        </div>
      </div>
      {totalPerWeek > daysPerWeek && (
        <p className="text-xs text-[#64748B]">You've added {totalPerWeek} activities but {daysPerWeek} sessions/week — the extras will cycle across weeks.</p>
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

      {/* Training days */}
      <div>
        <label className="label">Available days <span className="text-[#64748B]">(pick at least {daysPerWeek})</span></label>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map(d => (
            <button key={d} onClick={() => toggleDay(d)} className={`py-2 rounded-lg text-[11px] font-semibold border transition-all ${trainDays.includes(d) ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>{WEEKDAY_SHORT[d].slice(0, 1)}</button>
          ))}
        </div>
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
        <button onClick={handleGenerate} className="btn-primary flex-1">{preview ? '🎲 Regenerate' : 'Generate Plan'}</button>
        {preview && <button onClick={handleSave} disabled={saving} className="btn-primary flex-1" style={{ background: '#22C55E' }}>{saving ? 'Saving…' : existing ? 'Save Changes' : 'Save Plan'}</button>}
      </div>

      {preview && (
        <div>
          <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-3">Preview — click a day for more info or to reorder before saving</p>
          <PlanWeekTable plan={preview} onDayClick={(week, day) => setSelected({ week, day })} />
        </div>
      )}

      {selected && preview && (
        <PlanDaySheet
          data={preview}
          selected={selected}
          onSave={setPreview}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
