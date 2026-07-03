'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  PlanRecord, Session, Weekday, WEEKDAYS, WEEKDAY_LABELS, RUN_DISTANCE_LABELS,
  switchDifficulty, isRunSession, PlanConfig, planSessionHref,
} from '@/lib/runPlanGenerator';
import PlanWeekTable, { SESSION_COLORS, sessionTarget } from './PlanWeekTable';
import RunTypeGlossary from './RunTypeGlossary';

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
function fmtNiceDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

interface Props {
  plan: PlanRecord;
  onChange: (updated: PlanRecord) => void;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}

export default function PlanView({ plan, onChange, onEdit, onDelete, onBack }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<{ week: number; day: Weekday } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const data = plan.plan_data;
  const totalRuns = data.weeks.reduce((s, w) => s + WEEKDAYS.filter(d => isRunSession(w.days[d])).length, 0);
  const runsCompleted = data.weeks.reduce((s, w) => s + WEEKDAYS.filter(d => w.days[d].completed).length, 0);
  const kmDone = data.weeks.reduce((s, w) => s + WEEKDAYS.reduce((k, d) => k + (w.days[d].completed ? (w.days[d].distanceKm || 0) : 0), 0), 0);
  const totalKm = data.weeks.reduce((s, w) => s + w.totalKm, 0);

  // current week from start date
  const today = new Date().toISOString().split('T')[0];
  const daysSince = Math.floor((new Date(today + 'T00:00:00').getTime() - new Date(plan.start_date + 'T00:00:00').getTime()) / 86400000);
  const currentIdx = Math.min(Math.max(0, Math.floor(daysSince / 7)), plan.weeks - 1);
  const currentWeekNo = currentIdx + 1;
  const weeksToGo = Math.max(0, plan.weeks - currentIdx);
  const goalDate = addDays(plan.start_date, plan.weeks * 7 - 1);

  // If the plan doesn't start on a Monday, label the first week "Week 0".
  const startsMonday = new Date(plan.start_date + 'T00:00:00').getDay() === 1;
  const labelOffset = startsMonday ? 0 : -1;

  const currentWeek = data.weeks[currentIdx];
  const cwRuns = WEEKDAYS.filter(d => isRunSession(currentWeek.days[d]));
  const cwDone = cwRuns.filter(d => currentWeek.days[d].completed).length;

  const cfg: PlanConfig = {
    distance: plan.distance, customDistanceKm: plan.custom_distance_km || undefined,
    level: plan.level, weeks: plan.weeks, daysPerWeek: plan.days_per_week,
    daysPerWeekMin: plan.days_per_week_min || plan.days_per_week,
    trainDays: plan.train_days, goalTimeSeconds: plan.goal_time_seconds, startDistanceKm: plan.start_distance_km,
  };

  const persist = async (newData: typeof data) => {
    const updated = { ...plan, plan_data: newData };
    onChange(updated);
    await supabase.from('training_plans').update({ plan_data: newData, updated_at: new Date().toISOString() }).eq('id', plan.id);
  };

  const mutateDay = (week: number, day: Weekday, fn: (s: Session) => Session) => {
    const newData = { ...data, weeks: data.weeks.map(w => w.weekNumber !== week ? w : {
      ...w, days: { ...w.days, [day]: fn(w.days[day]) },
      totalKm: WEEKDAYS.reduce((k, d) => k + ((d === day ? fn(w.days[day]) : w.days[d]).distanceKm || 0), 0),
    }) };
    persist(newData);
  };

  // Swap a session with another day in the same week (reorder).
  const moveDay = (week: number, from: Weekday, to: Weekday) => {
    if (from === to) return;
    const newData = { ...data, weeks: data.weeks.map(w => {
      if (w.weekNumber !== week) return w;
      const days = { ...w.days };
      const tmp = days[to]; days[to] = days[from]; days[from] = tmp;
      return { ...w, days };
    }) };
    persist(newData);
  };

  const sel = selected ? data.weeks.find(w => w.weekNumber === selected.week)!.days[selected.day] : null;

  const logSession = (s: Session) => {
    if (!selected) return;
    const href = planSessionHref(s, plan.id, selected.week, selected.day);
    setSelected(null);
    router.push(href);
  };

  const copyPlan = async () => {
    const lines: string[] = [`${RUN_DISTANCE_LABELS[plan.distance]} Training Plan — ${plan.weeks} weeks, ${plan.level}`, ''];
    for (const w of data.weeks) {
      lines.push(`Week ${w.weekNumber} (${w.phase}) — ${w.totalKm} km`);
      for (const d of WEEKDAYS) {
        const s = w.days[d];
        lines.push(`  ${WEEKDAY_LABELS[d]}: ${s.title}${sessionTarget(s) ? ' — ' + sessionTarget(s) : ''}`);
      }
      lines.push('');
    }
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRace = plan.distance !== 'keep_fit' && plan.distance !== 'speed';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <button onClick={onBack} className="text-sm text-[#64748B] hover:text-white">← All plans</button>
        <div className="flex gap-2">
          <button onClick={copyPlan} className="btn-secondary text-xs px-3 py-1.5">{copied ? '✓ Copied' : '⧉ Copy'}</button>
          <button onClick={() => window.print()} className="btn-secondary text-xs px-3 py-1.5">🖨 Print</button>
          <button onClick={onEdit} className="btn-secondary text-xs px-3 py-1.5">✎ Edit</button>
        </div>
      </div>

      {/* Countdown / week overview card */}
      <div className="card">
        <h1 className="text-2xl font-extrabold text-white" style={{ fontFamily: 'var(--font-display)' }}>
          {weeksToGo} {weeksToGo === 1 ? 'Week' : 'Weeks'} to Go
        </h1>
        <p className="text-[#64748B] text-sm mt-0.5">{RUN_DISTANCE_LABELS[plan.distance]} plan · {isRace ? `Goal day ${fmtNiceDate(goalDate)}` : 'Keep it rolling'}</p>

        {/* segmented progress for current week */}
        <div className="flex gap-1.5 mt-4 mb-2">
          {cwRuns.map((d, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full" style={{ background: currentWeek.days[d].completed ? '#22C55E' : '#293548' }} />
          ))}
        </div>
        <p className="text-xs text-[#64748B]">Week {currentWeekNo + labelOffset} workouts completed: {cwDone} of {cwRuns.length}</p>
      </div>

      {/* Big progress card */}
      <div className="card">
        <div className="text-3xl font-extrabold" style={{ fontFamily: 'var(--font-display)', color: '#5B7A76' }}>
          {runsCompleted} {runsCompleted === 1 ? 'RUN' : 'RUNS'} COMPLETED
        </div>
        <p className="text-sm font-semibold text-white mt-1">{RUN_DISTANCE_LABELS[plan.distance]}{plan.distance === 'custom' && plan.custom_distance_km ? ` (${plan.custom_distance_km} km)` : ''}</p>
        {isRace && <p className="text-xs text-[#64748B]">Goal day: {fmtNiceDate(goalDate)}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="stat-card"><div className="stat-value">{weeksToGo}</div><div className="stat-label">Weeks to Go</div></div>
          <div className="stat-card"><div className="stat-value">{totalRuns - runsCompleted}</div><div className="stat-label">Runs Left</div></div>
          <div className="stat-card"><div className="stat-value">{kmDone.toFixed(0)}</div><div className="stat-label">km Done</div></div>
          <div className="stat-card"><div className="stat-value">{totalKm.toFixed(0)}</div><div className="stat-label">Total km</div></div>
        </div>
      </div>

      {/* Week table */}
      <PlanWeekTable plan={data} currentWeek={currentWeekNo} labelOffset={labelOffset} onDayClick={(week, day) => setSelected({ week, day })} />

      <RunTypeGlossary />

      {/* Delete */}
      <div>
        {!confirmDel ? (
          <button onClick={() => setConfirmDel(true)} className="w-full py-2 text-sm text-[#64748B] hover:text-red-400 transition-colors">Delete plan</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={onDelete} className="flex-1 py-2 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm font-medium">Yes, delete plan</button>
            <button onClick={() => setConfirmDel(false)} className="flex-1 py-2 rounded-lg border border-[#334155] text-[#94A3B8] text-sm">Cancel</button>
          </div>
        )}
      </div>

      {/* Day action sheet */}
      {selected && sel && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full md:max-w-md bg-[#1E293B] border border-[#334155] rounded-t-2xl md:rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ background: SESSION_COLORS[sel.type] }} />
              <span className="text-xs text-[#64748B] uppercase tracking-wide">Week {selected.week} · {WEEKDAY_LABELS[selected.day]}</span>
            </div>
            <h3 className="text-lg font-bold text-white">{sel.title}</h3>
            {sessionTarget(sel) && <p className="text-sm font-semibold mt-0.5" style={{ color: SESSION_COLORS[sel.type] }}>{sessionTarget(sel)}</p>}
            {sel.detail && <p className="text-sm text-[#94A3B8] mt-2 whitespace-pre-line leading-relaxed">{sel.detail}</p>}

            <div className="flex flex-col gap-2 mt-4">
              {isRunSession(sel) && !sel.completed && (
                <button onClick={() => logSession(sel)} className="btn-primary w-full">✓ Log & Complete</button>
              )}
              {isRunSession(sel) && (
                <button onClick={() => { mutateDay(selected.week, selected.day, s => ({ ...s, completed: !s.completed })); setSelected(null); }}
                  className="btn-secondary w-full">
                  {sel.completed ? 'Mark as not done' : 'Mark done (without logging)'}
                </button>
              )}
              {isRunSession(sel) && (
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => { mutateDay(selected.week, selected.day, s => switchDifficulty(s, 'easier', cfg)); setSelected(null); }}
                    className="py-2 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569]">Easier</button>
                  <button onClick={() => { mutateDay(selected.week, selected.day, s => switchDifficulty(s, 'reset', cfg)); setSelected(null); }}
                    className="py-2 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569]">Reset</button>
                  <button onClick={() => { mutateDay(selected.week, selected.day, s => switchDifficulty(s, 'harder', cfg)); setSelected(null); }}
                    className="py-2 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569]">Harder</button>
                </div>
              )}
              {sel.type !== 'rest' && (
                <button onClick={() => { mutateDay(selected.week, selected.day, () => ({ type: 'rest', title: 'Rest', detail: 'Take a full day off. Recovery is where the gains happen.', completed: false })); setSelected(null); }}
                  className="py-2 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569]">Make this a Rest day</button>
              )}

              {/* Move to another day (swaps) */}
              <div>
                <p className="text-xs text-[#64748B] mb-1.5">Move to another day (swaps)</p>
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAYS.map(d => (
                    <button key={d} disabled={d === selected.day}
                      onClick={() => { moveDay(selected.week, selected.day, d); setSelected(null); }}
                      className={`py-1.5 rounded text-[10px] font-semibold border transition-all ${
                        d === selected.day ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
                      }`}>
                      {WEEKDAY_LABELS[d].slice(0, 1)}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => setSelected(null)} className="text-sm text-[#64748B] hover:text-white py-1">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
