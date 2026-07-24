'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  PlanRecord, Session, Weekday, WEEKDAYS, WEEKDAY_LABELS, runPlanDisplayName,
  isRunSession, PlanConfig, planSessionHref, todaysSession, planEndDateISO, movePlanSession, addSessionToDay, missedStreak,
  removeLeadInWeek, jumpToWeek, restartFromWeek,
} from '@/lib/runPlanGenerator';
import PlanWeekTable, { sessionTarget } from './PlanWeekTable';
import PlanPrintTable from './PlanPrintTable';
import PlanDaySheet from './PlanDaySheet';
import PlanRecommendationSheet from './PlanRecommendationSheet';
import RunTypeGlossary from './RunTypeGlossary';
import ShareCard, { ShareStat } from './ShareCard';
import PlanShareBook, { OverviewStat } from './PlanShareBook';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { todayLocalISO } from '@/lib/utils';
import { TrendingUp, Trophy } from 'lucide-react';

const PHASE_COLORS: Record<string, string> = { Base: '#3B82F6', Build: '#8B5CF6', Peak: '#F97316', Taper: '#22C55E' };
const LEVEL_LABELS: Record<string, string> = { relaxed: 'Relaxed', moderate: 'Moderate', tough: 'Tough' };

function fmtNiceDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function fmtGoalTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

interface Props {
  plan: PlanRecord;
  onChange: (updated: PlanRecord) => void;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
  onSwitchToThis?: () => void; // run plans only — offered when this plan isn't the active one
  autoCelebrate?: boolean; // open the completion celebration on mount (arrived here right after finishing the final session)
}

export default function PlanView({ plan, onChange, onEdit, onDelete, onBack, onSwitchToThis, autoCelebrate }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<{ week: number; day: Weekday } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [sharingKind, setSharingKind] = useState<'progress' | 'completed' | null>(autoCelebrate ? 'completed' : null);
  const [showCongrats, setShowCongrats] = useState(!!autoCelebrate);
  const [sharingPlanBook, setSharingPlanBook] = useState(false);

  const data = plan.plan_data;
  const isRun = plan.plan_kind === 'run';
  const planTitle = isRun
    ? runPlanDisplayName(plan.distance, plan.custom_distance_km)
    : (plan.name || 'Custom Plan');
  const noun = isRun ? 'RUN' : 'SESSION';
  const realWeeks = data.weeks.filter(w => w.weekNumber > 0); // excludes lead-in Week 0 — used for the phase-coloured weekly volume chart only
  // Plan totals include Week 0 — a completed lead-in session still counts toward the plan's totals.
  const totalRuns = data.weeks.reduce((s, w) => s + WEEKDAYS.filter(d => isRunSession(w.days[d])).length, 0);
  const runsCompleted = data.weeks.reduce((s, w) => s + WEEKDAYS.filter(d => w.days[d].completed).length, 0);
  const kmDone = data.weeks.reduce((s, w) => s + WEEKDAYS.reduce((k, d) => k + (w.days[d].completed ? (w.days[d].distanceKm || 0) : 0), 0), 0);
  const totalKm = data.weeks.reduce((s, w) => s + w.totalKm, 0);
  const totalMin = data.weeks.reduce((s, w) => s + WEEKDAYS.reduce((m, d) => m + (isRunSession(w.days[d]) ? (w.days[d].timeMin || 0) : 0), 0), 0);
  const fmtHrs = (min: number) => { const h = Math.floor(min / 60); const m = min % 60; return h > 0 ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`; };

  const today = todayLocalISO();
  const pos = todaysSession(plan, today);
  // Before the plan starts: show the first scheduled week. After it ends: clamp to the last real week.
  const currentWeekNo = pos ? pos.week : (today < plan.start_date ? (data.weeks[0]?.weekNumber ?? 1) : plan.weeks);
  const weeksToGo = Math.max(0, plan.weeks - Math.max(0, currentWeekNo - 1));
  const goalDate = planEndDateISO(plan);

  const currentWeek = data.weeks.find(w => w.weekNumber === currentWeekNo) ?? data.weeks[0];
  const cwRuns = currentWeek ? WEEKDAYS.filter(d => isRunSession(currentWeek.days[d])) : [];
  const cwDone = currentWeek ? cwRuns.filter(d => currentWeek.days[d].completed).length : 0;

  // sport/custom plans are always "active"; only run plans can be parked as inactive.
  const isActive = !isRun || plan.active;
  const minWeekNo = data.weeks[0]?.weekNumber ?? 0;
  const maxWeekNo = data.weeks[data.weeks.length - 1]?.weekNumber ?? plan.weeks;
  const week1No = data.weeks.find(w => w.weekNumber === 1)?.weekNumber ?? minWeekNo;
  const [viewedWeek, setViewedWeek] = useState(isActive ? currentWeekNo : week1No);
  const [showRecommend, setShowRecommend] = useState(false);
  const missed = isRun && isActive ? missedStreak(plan, today) : 0;
  const isPaused = !!plan.paused_at;

  // Week management UI state
  const [showWeekMgmt, setShowWeekMgmt] = useState(false);
  const [weekMgmtMode, setWeekMgmtMode] = useState<'jump' | 'restart'>('jump');
  const [weekMgmtTarget, setWeekMgmtTarget] = useState(1);
  const [confirmWeekMgmt, setConfirmWeekMgmt] = useState(false);

  // Pause UI state
  const [showPauseSheet, setShowPauseSheet] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [customPauseReason, setCustomPauseReason] = useState('');

  // Print/share summary info
  const runsPerWeekText = plan.days_per_week_min && plan.days_per_week_min !== plan.days_per_week
    ? `${plan.days_per_week_min}-${plan.days_per_week} ${isRun ? 'runs' : 'sessions'}/week`
    : `${plan.days_per_week} ${isRun ? 'runs' : 'sessions'}/week`;
  const levelText = LEVEL_LABELS[plan.level] || plan.level;
  const week1Km = data.weeks.find(w => w.weekNumber === 1)?.totalKm;
  const longestLongRunKm = isRun
    ? Math.max(0, ...data.weeks.flatMap(w => WEEKDAYS.map(d => w.days[d]).filter(s => s.type === 'long').map(s => s.distanceKm || 0)))
    : 0;
  const last2WeekNums = [currentWeekNo - 1, currentWeekNo].filter(n => n >= 0);
  const last2Weeks = data.weeks.filter(w => last2WeekNums.includes(w.weekNumber));
  const last2Total = last2Weeks.reduce((s, w) => s + WEEKDAYS.filter(d => isRunSession(w.days[d])).length, 0);
  const last2Done = last2Weeks.reduce((s, w) => s + WEEKDAYS.filter(d => w.days[d].completed).length, 0);

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

  const handleJumpOrRestart = async () => {
    const { planData, startDate } = weekMgmtMode === 'jump'
      ? jumpToWeek(data, weekMgmtTarget, today)
      : restartFromWeek(data, weekMgmtTarget, today);
    const updated = { ...plan, plan_data: planData, start_date: startDate };
    onChange(updated);
    await supabase.from('training_plans').update({ plan_data: planData, start_date: startDate, updated_at: new Date().toISOString() }).eq('id', plan.id);
    setShowWeekMgmt(false);
    setConfirmWeekMgmt(false);
    setViewedWeek(weekMgmtTarget);
  };

  const handleRemoveLeadIn = async () => {
    const newData = removeLeadInWeek(data);
    const mondayStart = (() => {
      const d = new Date(plan.start_date);
      const day = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() + (7 - day) % 7);
      return d.toISOString().slice(0, 10);
    })();
    const updated = { ...plan, plan_data: newData, start_date: mondayStart };
    onChange(updated);
    await supabase.from('training_plans').update({ plan_data: newData, start_date: mondayStart, updated_at: new Date().toISOString() }).eq('id', plan.id);
  };

  const handlePause = async () => {
    const reason = pauseReason === 'Other' ? customPauseReason : pauseReason;
    const updated = { ...plan, paused_at: new Date().toISOString(), pause_reason: reason };
    onChange(updated);
    await supabase.from('training_plans').update({ paused_at: new Date().toISOString(), pause_reason: reason, updated_at: new Date().toISOString() }).eq('id', plan.id);
    setShowPauseSheet(false);
  };

  const handleResume = async () => {
    if (!plan.paused_at) return;
    const pausedMs = Date.now() - new Date(plan.paused_at).getTime();
    const pausedDays = Math.round(pausedMs / 86400000);
    const newStart = new Date(plan.start_date);
    newStart.setDate(newStart.getDate() + pausedDays);
    const newStartDate = newStart.toISOString().slice(0, 10);
    const updated = { ...plan, paused_at: null, pause_reason: null, start_date: newStartDate };
    onChange(updated);
    await supabase.from('training_plans').update({ paused_at: null, pause_reason: null, start_date: newStartDate, updated_at: new Date().toISOString() }).eq('id', plan.id);
  };

  const PAUSE_REASONS = ['Injury', 'Illness', 'Travel / Holiday', 'Life got busy', 'Taking a break', 'Other'];

  const logSession = (s: Session, partIndex?: number) => {
    if (!selected) return;
    router.push(planSessionHref(s, plan.id, selected.week, selected.day, partIndex));
  };

  const planText = () => {
    const lines: string[] = [`${planTitle} Training Plan — ${plan.weeks} weeks, ${plan.level}`, ''];
    for (const w of data.weeks) {
      lines.push(`Week ${w.weekNumber}${w.weekNumber === 0 ? ' (Lead-in)' : ` (${w.phase})`} — ${w.totalKm} km`);
      for (const d of WEEKDAYS) {
        const s = w.days[d];
        lines.push(`  ${WEEKDAY_LABELS[d]}: ${s.title}${sessionTarget(s) ? ' — ' + sessionTarget(s) : ''}`);
      }
      lines.push('');
    }
    return lines.join('\n');
  };

  const copyPlan = async () => {
    await navigator.clipboard.writeText(planText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    // The browser's own print header/footer shows document.title — swap in the branded
    // name for the printout, then restore it once the print dialog closes.
    const prevTitle = document.title;
    document.title = `SportLogRun — ${planTitle}`;
    window.addEventListener('afterprint', () => { document.title = prevTitle; }, { once: true });
    window.print();
  };


  const isRace = isRun && plan.distance !== 'keep_fit' && plan.distance !== 'speed';
  const isCompleted = totalRuns > 0 && runsCompleted >= totalRuns;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2 plan-no-print">
        <button onClick={onBack} className="text-sm text-[#64748B] hover:text-white">← All plans</button>
        <div className="flex gap-2 flex-wrap">
          <button onClick={copyPlan} className="btn-secondary text-xs px-3 py-1.5">{copied ? '✓ Copied' : '⧉ Copy'}</button>
          <button onClick={handlePrint} className="btn-secondary text-xs px-3 py-1.5">🖨 Print / PDF</button>
          <button onClick={() => setSharingPlanBook(true)} className="btn-secondary text-xs px-3 py-1.5">↗ Share Plan</button>
          <button onClick={() => setSharingKind('progress')} className="btn-secondary text-xs px-3 py-1.5">↗ Share Progress</button>
          {isCompleted && (
            <button onClick={() => setSharingKind('completed')} className="text-xs px-3 py-1.5 rounded-lg border border-yellow-600/50 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20">🏆 Share Completed Plan</button>
          )}
          <button onClick={onEdit} className="btn-secondary text-xs px-3 py-1.5">✎ Edit</button>
        </div>
      </div>

      {/* Print-only compact summary + table — hidden on screen, shown only in the PDF/print output */}
      <div className="plan-print-only">
        <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 800, fontStyle: 'italic', fontSize: 13, letterSpacing: 0.5, marginBottom: 8 }}>SportLogRun</div>
        <h1 style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 2 }}>{planTitle}</h1>
        <p style={{ fontSize: 11, color: '#444', marginBottom: 6 }}>
          {plan.weeks} weeks · {runsPerWeekText} · {levelText}
        </p>
        {(plan.goal_time_seconds || week1Km || longestLongRunKm > 0) && (
          <p style={{ fontSize: 11, color: '#444', marginBottom: 10 }}>
            {plan.goal_time_seconds ? `Goal time: ${fmtGoalTime(plan.goal_time_seconds)}` : ''}
            {plan.goal_time_seconds && (week1Km || longestLongRunKm > 0) ? ' · ' : ''}
            {week1Km ? `Week 1 distance: ${week1Km} km` : ''}
            {week1Km && longestLongRunKm > 0 ? ' · ' : ''}
            {longestLongRunKm > 0 ? `Longest long run: ${longestLongRunKm} km` : ''}
          </p>
        )}
        <PlanPrintTable plan={data} />
      </div>

      {isRun && !plan.active && (
        <div className="card border-yellow-600/40 flex items-center justify-between gap-3">
          <p className="text-sm text-yellow-300">This plan isn't your active run plan right now.</p>
          {onSwitchToThis && <button onClick={onSwitchToThis} className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0">↻ Switch to this plan</button>}
        </div>
      )}

      {isPaused && (
        <div className="card border-amber-600/40 bg-amber-500/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-300">⏸ Plan paused{plan.pause_reason ? ` — ${plan.pause_reason}` : ''}</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">Calendar will shift forward to account for the pause when you resume.</p>
            </div>
            <button onClick={handleResume} className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0 border-amber-600/50 text-amber-300 hover:bg-amber-500/10">▶ Resume</button>
          </div>
        </div>
      )}

      {/* Countdown / week overview card */}
      <div className="card plan-no-print">
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
      <div className="card plan-no-print">
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
              <div className="stat-card"><div className="stat-value">{totalRuns}</div><div className="stat-label">Sessions</div></div>
              <div className="stat-card"><div className="stat-value">{totalMin > 0 ? fmtHrs(totalMin) : '—'}</div><div className="stat-label">Total Time</div></div>
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
      <div className="flex items-center justify-between plan-no-print flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wide">
          {viewAll ? 'Full Plan' : (isActive ? (viewedWeek === currentWeekNo ? `This Week (Week ${viewedWeek})` : `Week ${viewedWeek}`) : `Week ${viewedWeek}`)}
        </h2>
        <div className="flex gap-1.5 items-center">
          {missed >= 2 && (
            <button onClick={() => setShowRecommend(true)} className="text-xs text-amber-400 hover:text-amber-300 font-semibold px-2">
              ⚡ See recommendation
            </button>
          )}
          {!viewAll && isActive && (
            <>
              <button
                onClick={() => setViewedWeek(w => Math.max(minWeekNo, w - 1))}
                disabled={viewedWeek <= minWeekNo}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#334155] text-[#94A3B8] hover:border-[#475569] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[#334155]"
              >‹ Last week</button>
              <button
                onClick={() => setViewedWeek(w => Math.min(maxWeekNo, w + 1))}
                disabled={viewedWeek >= maxWeekNo}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#334155] text-[#94A3B8] hover:border-[#475569] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[#334155]"
              >Next week ›</button>
            </>
          )}
          <button onClick={() => { setViewAll(false); setViewedWeek(isActive ? currentWeekNo : week1No); }} className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${!viewAll && viewedWeek === (isActive ? currentWeekNo : week1No) ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>{isActive ? 'This week' : 'Week 1'}</button>
          <button onClick={() => setViewAll(true)} className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${viewAll ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>Full plan</button>
        </div>
      </div>

      {/* Week table */}
      <div className="plan-no-print">
        <PlanWeekTable
          plan={viewAll ? data : { weeks: data.weeks.filter(w => w.weekNumber === viewedWeek) }}
          currentWeek={currentWeekNo}
          onDayClick={(week, day) => setSelected({ week, day })}
          onMove={(fromWeek, from, toWeek, to) => persist(movePlanSession(data, { week: fromWeek, day: from }, { week: toWeek, day: to }))}
          onAdd={(fromWeek, from, toWeek, to) => persist(addSessionToDay(data, { week: fromWeek, day: from }, { week: toWeek, day: to }))}
        />
      </div>

      {showRecommend && (
        <PlanRecommendationSheet
          data={data}
          weekNumber={currentWeekNo}
          cfg={cfg}
          planName={planTitle}
          todayISO={today}
          onApply={newData => persist(newData)}
          onClose={() => setShowRecommend(false)}
        />
      )}

      {isRun && <RunTypeGlossary />}

      {/* Week management + pause */}
      <div className="plan-no-print flex flex-col gap-1">
        {/* Lead-in removal */}
        {data.weeks.some(w => w.weekNumber === 0) && (
          <button onClick={handleRemoveLeadIn} className="w-full py-2 text-sm text-[#64748B] hover:text-amber-400 transition-colors">
            ✕ Remove lead-in week (Week 0)
          </button>
        )}

        {/* Jump / Restart from week */}
        {!showWeekMgmt ? (
          <button onClick={() => { setShowWeekMgmt(true); setWeekMgmtMode('jump'); setWeekMgmtTarget(currentWeekNo); setConfirmWeekMgmt(false); }}
            className="w-full py-2 text-sm text-[#64748B] hover:text-blue-400 transition-colors">
            ↪ Jump to week / Restart from week
          </button>
        ) : (
          <div className="card border-blue-500/20 bg-blue-500/5 flex flex-col gap-3">
            <div className="flex gap-2">
              <button onClick={() => setWeekMgmtMode('jump')} className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${weekMgmtMode === 'jump' ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>Jump to week</button>
              <button onClick={() => setWeekMgmtMode('restart')} className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${weekMgmtMode === 'restart' ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>Restart from week</button>
            </div>
            <div>
              <p className="text-xs text-[#94A3B8] mb-2">
                {weekMgmtMode === 'jump'
                  ? 'Completed sessions stay. Uncompleted prior sessions are marked skipped.'
                  : 'All sessions before the chosen week are marked skipped (including completed ones).'}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#64748B]">Week</span>
                <select
                  value={weekMgmtTarget}
                  onChange={e => { setWeekMgmtTarget(Number(e.target.value)); setConfirmWeekMgmt(false); }}
                  className="flex-1 bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-1.5 text-sm text-white"
                >
                  {data.weeks.filter(w => w.weekNumber > 0).map(w => (
                    <option key={w.weekNumber} value={w.weekNumber}>Week {w.weekNumber}{w.phase ? ` — ${w.phase}` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            {!confirmWeekMgmt ? (
              <div className="flex gap-2">
                <button onClick={() => setConfirmWeekMgmt(true)} className="flex-1 py-1.5 rounded-lg bg-blue-900/40 border border-blue-700 text-blue-300 text-xs font-medium">
                  {weekMgmtMode === 'jump' ? `Jump to Week ${weekMgmtTarget}` : `Restart from Week ${weekMgmtTarget}`}
                </button>
                <button onClick={() => setShowWeekMgmt(false)} className="flex-1 py-1.5 rounded-lg border border-[#334155] text-[#94A3B8] text-xs">Cancel</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleJumpOrRestart} className="flex-1 py-1.5 rounded-lg bg-blue-600 border border-blue-500 text-white text-xs font-medium">Yes, confirm</button>
                <button onClick={() => setConfirmWeekMgmt(false)} className="flex-1 py-1.5 rounded-lg border border-[#334155] text-[#94A3B8] text-xs">Back</button>
              </div>
            )}
          </div>
        )}

        {/* Pause plan */}
        {!isPaused && !showPauseSheet && (
          <button onClick={() => setShowPauseSheet(true)} className="w-full py-2 text-sm text-[#64748B] hover:text-amber-400 transition-colors">
            ⏸ Pause plan
          </button>
        )}
        {!isPaused && showPauseSheet && (
          <div className="card border-amber-500/20 bg-amber-500/5 flex flex-col gap-3">
            <p className="text-sm font-semibold text-amber-300">Why are you pausing?</p>
            <div className="flex flex-wrap gap-2">
              {PAUSE_REASONS.map(r => (
                <button key={r} onClick={() => setPauseReason(r)}
                  className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${pauseReason === r ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                  {r}
                </button>
              ))}
            </div>
            {pauseReason === 'Other' && (
              <input
                value={customPauseReason}
                onChange={e => setCustomPauseReason(e.target.value)}
                placeholder="What's the reason?"
                className="bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-sm text-white placeholder-[#475569]"
              />
            )}
            <div className="flex gap-2">
              <button onClick={handlePause} disabled={!pauseReason || (pauseReason === 'Other' && !customPauseReason.trim())}
                className="flex-1 py-1.5 rounded-lg bg-amber-900/40 border border-amber-700 text-amber-300 text-xs font-medium disabled:opacity-40">
                Pause plan
              </button>
              <button onClick={() => { setShowPauseSheet(false); setPauseReason(''); setCustomPauseReason(''); }}
                className="flex-1 py-1.5 rounded-lg border border-[#334155] text-[#94A3B8] text-xs">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete */}
      <div className="plan-no-print">
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

      {sharingPlanBook && (
        <PlanShareBook
          planData={data}
          planTitle={planTitle}
          overviewStats={[
            { key: 'weeks', label: 'Weeks', value: String(plan.weeks) },
            { key: 'perweek', label: isRun ? 'Runs/Week' : 'Sessions/Week', value: runsPerWeekText.split(' ')[0] },
            { key: 'level', label: 'Level', value: levelText },
            week1Km ? { key: 'week1km', label: 'Week 1 Distance', value: `${week1Km} km` } : null,
            plan.goal_time_seconds ? { key: 'goaltime', label: 'Goal Time', value: fmtGoalTime(plan.goal_time_seconds) } : null,
            longestLongRunKm > 0 ? { key: 'longestrun', label: 'Longest Long Run', value: `${longestLongRunKm} km` } : null,
          ].filter(Boolean) as OverviewStat[]}
          dateLabel={isRace ? `Goal day ${fmtNiceDate(goalDate)}` : `Starts ${fmtNiceDate(plan.start_date)}`}
          accentColor="#3B82F6"
          onClose={() => setSharingPlanBook(false)}
        />
      )}
      {sharingKind === 'progress' && (
        <ShareCard
          badge="Plan Progress"
          title={planTitle}
          icon={TrendingUp}
          availableStats={[
            { label: 'Weeks to Go', value: String(weeksToGo) },
            { label: isRun ? 'Runs Completed' : 'Sessions Completed', value: `${runsCompleted}/${totalRuns}` },
            { label: 'Last 2 Weeks', value: `${last2Done}/${last2Total}` },
            isRun ? { label: 'km Done', value: `${kmDone.toFixed(0)} km` } : { label: 'Total Time', value: totalMin > 0 ? fmtHrs(totalMin) : '—' },
          ] as ShareStat[]}
          dateLabel={isRace ? `Goal day ${fmtNiceDate(goalDate)}` : `Week ${currentWeekNo} of ${plan.weeks}`}
          accentColor="#22C55E"
          onClose={() => setSharingKind(null)}
        />
      )}
      {sharingKind === 'completed' && (
        <ShareCard
          badge="Plan Completed!"
          title={planTitle}
          icon={Trophy}
          availableStats={[
            { label: 'Weeks', value: String(plan.weeks) },
            { label: isRun ? 'Runs Completed' : 'Sessions Completed', value: String(runsCompleted) },
            isRun ? { label: 'Total Distance', value: `${totalKm.toFixed(0)} km` } : { label: 'Total Time', value: totalMin > 0 ? fmtHrs(totalMin) : '—' },
            longestLongRunKm > 0 ? { label: 'Longest Long Run', value: `${longestLongRunKm} km` } : null,
            { label: 'Level', value: levelText },
          ].filter(Boolean) as ShareStat[]}
          dateLabel={isRace ? `Goal day ${fmtNiceDate(goalDate)}` : `Completed`}
          accentColor="#EAB308"
          onClose={() => { setSharingKind(null); if (showCongrats) setShowCongrats(false); }}
          footer={showCongrats ? (
            <button
              onClick={() => { setSharingKind(null); setShowCongrats(false); setConfirmRestart(true); }}
              className="w-full py-2 rounded-lg bg-blue-900/40 border border-blue-700 text-blue-300 text-sm font-medium"
            >
              ↻ Start this plan again
            </button>
          ) : undefined}
        />
      )}
    </div>
  );
}
