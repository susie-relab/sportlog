'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  PlanRecord, Session, Weekday, WEEKDAYS, WEEKDAY_LABELS, RUN_DISTANCE_LABELS,
  isRunSession, PlanConfig, planSessionHref, todaysSession, planEndDateISO,
} from '@/lib/runPlanGenerator';
import PlanWeekTable, { sessionTarget } from './PlanWeekTable';
import PlanDaySheet from './PlanDaySheet';
import RunTypeGlossary from './RunTypeGlossary';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const PHASE_COLORS: Record<string, string> = { Base: '#3B82F6', Build: '#8B5CF6', Peak: '#F97316', Taper: '#22C55E' };

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
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [viewAll, setViewAll] = useState(false);

  const data = plan.plan_data;
  const isRun = plan.plan_kind === 'run';
  const planTitle = isRun
    ? `${RUN_DISTANCE_LABELS[plan.distance]}${plan.distance === 'custom' && plan.custom_distance_km ? ` (${plan.custom_distance_km} km)` : ''}`
    : (plan.name || 'Custom Plan');
  const noun = isRun ? 'RUN' : 'SESSION';
  const realWeeks = data.weeks.filter(w => w.weekNumber > 0);
  const totalRuns = realWeeks.reduce((s, w) => s + WEEKDAYS.filter(d => isRunSession(w.days[d])).length, 0);
  const runsCompleted = realWeeks.reduce((s, w) => s + WEEKDAYS.filter(d => w.days[d].completed).length, 0);
  const kmDone = realWeeks.reduce((s, w) => s + WEEKDAYS.reduce((k, d) => k + (w.days[d].completed ? (w.days[d].distanceKm || 0) : 0), 0), 0);
  const totalKm = realWeeks.reduce((s, w) => s + w.totalKm, 0);

  const today = new Date().toISOString().split('T')[0];
  const pos = todaysSession(plan, today);
  // Before the plan starts: show the first scheduled week. After it ends: clamp to the last real week.
  const currentWeekNo = pos ? pos.week : (today < plan.start_date ? (data.weeks[0]?.weekNumber ?? 1) : plan.weeks);
  const weeksToGo = Math.max(0, plan.weeks - Math.max(0, currentWeekNo - 1));
  const goalDate = planEndDateISO(plan);

  const currentWeek = data.weeks.find(w => w.weekNumber === currentWeekNo) ?? data.weeks[0];
  const cwRuns = currentWeek ? WEEKDAYS.filter(d => isRunSession(currentWeek.days[d])) : [];
  const cwDone = currentWeek ? cwRuns.filter(d => currentWeek.days[d].completed).length : 0;

  const cfg: PlanConfig = {
    distance: plan.distance, customDistanceKm: plan.custom_distance_km || undefined,
    level: plan.level, weeks: plan.weeks, daysPerWeek: plan.days_per_week,
    daysPerWeekMin: plan.days_per_week_min || plan.days_per_week,
    trainDays: plan.train_days, goalTimeSeconds: plan.goal_time_seconds, startDistanceKm: plan.start_distance_km,
    startDate: plan.start_date,
  };

  const persist = async (newData: typeof data) => {
    const updated = { ...plan, plan_data: newData };
    onChange(updated);
    await supabase.from('training_plans').update({ plan_data: newData, updated_at: new Date().toISOString() }).eq('id', plan.id);
  };

  // Restart the plan from today: reset start date + clear all completed flags.
  const restartFromToday = async () => {
    const cleared = { ...data, weeks: data.weeks.map(w => ({
      ...w, days: Object.fromEntries(WEEKDAYS.map(d => [d, { ...w.days[d], completed: false, completedActivityId: null }])) as typeof w.days,
    })) };
    const updated = { ...plan, plan_data: cleared, start_date: today };
    onChange(updated);
    await supabase.from('training_plans').update({ plan_data: cleared, start_date: today, updated_at: new Date().toISOString() }).eq('id', plan.id);
    setConfirmRestart(false);
  };

  const logSession = (s: Session) => {
    if (!selected) return;
    router.push(planSessionHref(s, plan.id, selected.week, selected.day));
  };

  const copyPlan = async () => {
    const lines: string[] = [`${planTitle} Training Plan — ${plan.weeks} weeks, ${plan.level}`, ''];
    for (const w of data.weeks) {
      lines.push(`Week ${w.weekNumber}${w.weekNumber === 0 ? ' (Lead-in)' : ` (${w.phase})`} — ${w.totalKm} km`);
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

  const isRace = isRun && plan.distance !== 'keep_fit' && plan.distance !== 'speed';

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
        <p className="text-[#64748B] text-sm mt-0.5">{planTitle} · {isRace ? `Goal day ${fmtNiceDate(goalDate)}` : 'Keep it rolling'}</p>

        {cwRuns.length > 0 && (
          <>
            <div className="flex gap-1.5 mt-4 mb-2">
              {cwRuns.map((d, i) => (
                <div key={i} className="flex-1 h-1.5 rounded-full" style={{ background: currentWeek.days[d].completed ? '#22C55E' : '#293548' }} />
              ))}
            </div>
            <p className="text-xs text-[#64748B]">Week {currentWeekNo}{currentWeekNo === 0 ? ' (Lead-in)' : ''} workouts completed: {cwDone} of {cwRuns.length}</p>
          </>
        )}
      </div>

      {/* Big progress card */}
      <div className="card">
        <div className="text-3xl font-extrabold" style={{ fontFamily: 'var(--font-display)', color: '#5B7A76' }}>
          {runsCompleted} {noun}{runsCompleted === 1 ? '' : 'S'} COMPLETED
        </div>
        <p className="text-sm font-semibold text-white mt-1">{planTitle}</p>
        {isRace && <p className="text-xs text-[#64748B]">Goal day: {fmtNiceDate(goalDate)}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="stat-card"><div className="stat-value">{weeksToGo}</div><div className="stat-label">Weeks to Go</div></div>
          <div className="stat-card"><div className="stat-value">{totalRuns - runsCompleted}</div><div className="stat-label">{isRun ? 'Runs' : 'Sessions'} Left</div></div>
          {isRun ? (
            <>
              <div className="stat-card"><div className="stat-value">{kmDone.toFixed(0)}</div><div className="stat-label">km Done</div></div>
              <div className="stat-card"><div className="stat-value">{totalKm.toFixed(0)}</div><div className="stat-label">Total km</div></div>
            </>
          ) : (
            <>
              <div className="stat-card"><div className="stat-value">{runsCompleted}</div><div className="stat-label">Done</div></div>
              <div className="stat-card"><div className="stat-value">{totalRuns}</div><div className="stat-label">Total</div></div>
            </>
          )}
        </div>
      </div>

      {/* Weekly volume graph (run plans only; excludes the lead-in Week 0) */}
      {isRun && realWeeks.length > 1 && (
        <div className="card plan-no-print">
          <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-3">Weekly Volume</p>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={realWeeks.map(w => ({ label: w.weekNumber, km: w.totalKm, phase: w.phase }))} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, color: '#F1F5F9', fontSize: 12 }} formatter={(v) => [`${v} km`, 'Volume']} labelFormatter={(l) => `Week ${l}`} cursor={{ fill: '#ffffff08' }} />
              <Bar dataKey="km" radius={[3, 3, 0, 0]}>
                {realWeeks.map((w, i) => (
                  <Cell key={i} fill={PHASE_COLORS[w.phase]} opacity={w.weekNumber === currentWeekNo ? 1 : 0.55} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between plan-no-print">
        <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wide">{viewAll ? 'Full Plan' : `This Week (Week ${currentWeekNo})`}</h2>
        <div className="flex gap-1.5">
          <button onClick={() => setViewAll(false)} className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${!viewAll ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>This week</button>
          <button onClick={() => setViewAll(true)} className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${viewAll ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>Full plan</button>
        </div>
      </div>

      {/* Week table */}
      <div className="plan-print-full">
        <PlanWeekTable
          plan={viewAll ? data : { weeks: data.weeks.filter(w => w.weekNumber === currentWeekNo) }}
          currentWeek={currentWeekNo}
          onDayClick={(week, day) => setSelected({ week, day })}
        />
      </div>

      {isRun && <RunTypeGlossary />}

      {/* Restart */}
      <div>
        {!confirmRestart ? (
          <button onClick={() => setConfirmRestart(true)} className="w-full py-2 text-sm text-[#64748B] hover:text-blue-400 transition-colors">↻ Restart from today</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={restartFromToday} className="flex-1 py-2 rounded-lg bg-blue-900/40 border border-blue-700 text-blue-300 text-sm font-medium">Restart from today (clears progress)</button>
            <button onClick={() => setConfirmRestart(false)} className="flex-1 py-2 rounded-lg border border-[#334155] text-[#94A3B8] text-sm">Cancel</button>
          </div>
        )}
      </div>

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
      {selected && (
        <PlanDaySheet
          data={data}
          selected={selected}
          cfg={cfg}
          onLogAndComplete={logSession}
          onSave={persist}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
