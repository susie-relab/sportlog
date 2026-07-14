'use client';
import { useState, useEffect, useRef } from 'react';
import { PlanData, PlanWeek, Session, SessionType, Weekday, WEEKDAYS, WEEKDAY_LABELS, WEEKDAY_SHORT, isRunSession, sessionCount, sessionParts, MAX_SESSIONS_PER_DAY } from '@/lib/runPlanGenerator';
import { EXERCISE_TYPE_COLORS, EXERCISE_TYPE_LABELS, ExerciseType } from '@/types';

export const SESSION_COLORS: Record<SessionType, string> = {
  rest: '#475569',
  crosstrain: '#64748B',
  easy: '#3B82F6',
  recovery: '#60A5FA',
  long: '#8B5CF6',
  tempo: '#F97316',
  fartlek: '#EAB308',
  progression: '#F59E0B',
  long_intervals: '#EF4444',
  sprint_reps: '#EC4899',
  hill_reps: '#14B8A6',
  trail: '#84CC16',
  sport: '#3B82F6',
};

// Distinct colour per sport-plan session type.
const SPORT_SESSION_COLORS: Record<string, string> = {
  game: '#EF4444',
  training: '#3B82F6',
  skills: '#8B5CF6',
  conditioning: '#F97316',
  recovery: '#22C55E',
  solo: '#06B6D4',
  easy: '#60A5FA',
  crosstrain: '#64748B',
  mixed: '#A855F7',
};

/** Colour for a session — sport-plan sessions colour by session type, then exercise type. */
export function sessionColor(s: Session): string {
  if (s.type === 'sport') {
    if (s.sportSessionType && SPORT_SESSION_COLORS[s.sportSessionType]) return SPORT_SESSION_COLORS[s.sportSessionType];
    if (s.exerciseType) return EXERCISE_TYPE_COLORS[s.exerciseType as ExerciseType] || SESSION_COLORS.sport;
  }
  return SESSION_COLORS[s.type];
}

// Monochrome-blue palette for sport-plan session categories on the printed page — easier to
// scan on paper than the on-screen rainbow, since it's still legible in black & white printing.
const SPORT_SESSION_PRINT_COLORS: Record<string, string> = {
  game: '#1E3A8A',
  training: '#1D4ED8',
  conditioning: '#2563EB',
  skills: '#3B82F6',
  solo: '#60A5FA',
  recovery: '#93C5FD',
  easy: '#60A5FA',
  mixed: '#2563EB',
  crosstrain: '#64748B',
};

/** Print variant of sessionColor() — sport-plan sessions use a blue-shade-per-category palette. */
export function printSessionColor(s: Session): string {
  if (s.type === 'sport' && s.sportSessionType && SPORT_SESSION_PRINT_COLORS[s.sportSessionType]) {
    return SPORT_SESSION_PRINT_COLORS[s.sportSessionType];
  }
  return sessionColor(s);
}

const PHASE_COLORS: Record<string, string> = {
  Base: '#3B82F6', Build: '#8B5CF6', Peak: '#F97316', Taper: '#22C55E',
};

/** The exercise-type tag to show next to a session's title, or null if the title already
 *  says it (e.g. a "Fitness Training" or "Bike" session doesn't need to repeat its own type). */
export function exerciseTypeTag(s: Session): string | null {
  if (!s.exerciseType) return null;
  const label = EXERCISE_TYPE_LABELS[s.exerciseType as ExerciseType];
  if (!label) return null;
  const norm = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (norm(s.title).includes(norm(label)) || norm(label).includes(norm(s.title))) return null;
  return label;
}

// Each session has either a distance goal, a time goal, or (for long intervals /
// sprint reps / hill reps) a rep notation — never more than one of these.
function target(s: Session): string {
  // Once logged, show what was actually done first, with the original plan target in
  // brackets — e.g. "4.2 km completed (3 km)" or "30 min completed (45 min)".
  if (s.completed && s.completedDistanceKm != null) {
    return `${s.completedDistanceKm} km completed${s.distanceKm ? ` (${s.distanceKm} km)` : ''}`;
  }
  if (s.completed && s.completedTimeMin != null) {
    return `${s.completedTimeMin} min completed${s.timeMin ? ` (${s.timeMin} min)` : ''}`;
  }
  if (s.repLabel) return s.repLabel;
  if (s.distanceKm) return `${s.distanceKm} km`;
  if (s.timeMin) return `${s.timeMin} min`;
  return '';
}

/** Per-week summary: distance for run weeks, else session count + total minutes. */
function weekSummary(w: PlanWeek): string {
  if (w.totalKm > 0) return `${w.totalKm} km`;
  const trainable = WEEKDAYS.filter(d => isRunSession(w.days[d]));
  const mins = trainable.reduce((t, d) => t + (w.days[d].timeMin || 0), 0);
  const n = trainable.length;
  const sessionStr = `${n} session${n === 1 ? '' : 's'}`;
  if (mins <= 0) return sessionStr;
  const h = Math.floor(mins / 60), m = mins % 60;
  const timeStr = h > 0 ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
  return `${sessionStr} · ${timeStr}`;
}

interface Props {
  plan: PlanData;
  currentWeek?: number;
  onDayClick?: (weekNumber: number, day: Weekday) => void;
  /** Enables press-and-hold-the-handle drag-to-reorder, within or across weeks. Swaps the two days' sessions. */
  onMove?: (fromWeek: number, from: Weekday, toWeek: number, to: Weekday) => void;
  /** Combines the dragged session onto the target day instead of swapping (up to MAX_SESSIONS_PER_DAY). */
  onAdd?: (fromWeek: number, from: Weekday, toWeek: number, to: Weekday) => void;
}

const OVER_LABEL: Record<'move' | 'swap' | 'choose', string> = {
  move: '↓ Move here',
  swap: '⇄ Swap',
  choose: '⇄ Swap or add',
};

function DayCell({ s, onClick, compact, drag }: {
  s: Session; onClick?: () => void; compact?: boolean;
  drag?: { onPointerDown: (e: React.PointerEvent) => void; isDragging: boolean; isOver: false | 'move' | 'swap' | 'choose' };
}) {
  if (s.beforeStart) {
    return <div className={`w-full rounded-lg border border-dashed border-[#1E293B] ${compact ? 'h-8' : 'p-2.5 h-[52px]'}`} />;
  }
  const isRest = s.type === 'rest';
  const isCross = s.type === 'crosstrain';
  const muted = isRest || isCross;
  const parts = sessionParts(s);
  const isCombined = parts.length > 1;
  return (
    <div className="relative">
      <button
        onClick={drag ? undefined : onClick}
        onPointerDown={drag?.onPointerDown}
        aria-label={drag ? 'Tap to view, press and hold to drag to another day' : undefined}
        className={`w-full text-left rounded-lg transition-all select-none ${
          isCombined ? 'p-1 flex flex-col gap-1' : 'p-2.5'
        } border ${
          s.completed ? 'border-green-600/60 bg-green-900/15' : 'border-[#293548] bg-[#0F172A] hover:border-[#475569]'
        } ${compact && !isCombined ? 'flex items-center gap-2' : ''} ${drag ? 'cursor-grab active:cursor-grabbing' : ''} ${
          drag?.isDragging ? 'opacity-50 scale-[0.97] shadow-xl ring-2 ring-blue-400 relative z-10' : ''
        } ${drag?.isOver ? 'ring-2 ring-emerald-400 bg-emerald-500/10 scale-[1.02]' : ''}`}
      >
        {parts.map((p, i) => {
          const color = sessionColor(p);
          return (
            <div key={i} className={isCombined ? `rounded-md border border-[#293548] bg-[#0B1220] p-1.5 ${compact ? 'flex items-center gap-2' : ''}` : (compact ? 'flex items-center gap-2 w-full' : 'w-full')}>
              {compact && <span className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: color }} />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {!compact && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />}
                  <span className={`text-xs font-semibold truncate ${muted ? 'text-[#64748B]' : 'text-white'}`}>{p.title}</span>
                  {p.completed && <span className="text-green-400 text-xs ml-auto flex-shrink-0">✓</span>}
                  {p.variant && <span className="text-[9px] uppercase text-[#64748B] flex-shrink-0">{p.variant}</span>}
                </div>
                {exerciseTypeTag(p) && <div className="text-[10px] text-[#64748B] mt-0.5">{exerciseTypeTag(p)}</div>}
                {target(p) && <div className="text-xs font-bold mt-0.5" style={{ color }}>{target(p)}</div>}
                {!compact && !isCombined && p.detail && !muted && (
                  <div className="text-[10px] text-[#64748B] mt-1 leading-snug line-clamp-2 whitespace-pre-line">{p.detail}</div>
                )}
              </div>
            </div>
          );
        })}
      </button>
      {drag?.isOver && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#0B1220]/85 pointer-events-none">
          <span className="text-[11px] font-bold text-emerald-300 px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/40">
            {OVER_LABEL[drag.isOver]}
          </span>
        </div>
      )}
    </div>
  );
}

function WeekHeader({ w }: { w: PlanWeek }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-bold text-white">Week {w.weekNumber}</span>
      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ background: PHASE_COLORS[w.phase] + '22', color: PHASE_COLORS[w.phase] }}>
        {w.weekNumber === 0 ? 'Lead-in' : `${w.phase} Phase`}
      </span>
      <span className="text-xs text-[#64748B] ml-auto">{weekSummary(w)}</span>
    </div>
  );
}

const HOLD_DELAY_MS = 280; // how long a press must be held before it's treated as a drag, not a tap
const MOVE_TOLERANCE_PX = 9; // movement allowed during the hold before we bail out and let the page scroll instead

export default function PlanWeekTable({ plan, currentWeek, onDayClick, onMove, onAdd }: Props) {
  const [dragFrom, setDragFrom] = useState<{ week: number; day: Weekday; pointerId: number } | null>(null);
  const [overCell, setOverCell] = useState<{ week: number; day: Weekday; kind: 'move' | 'swap' | 'choose' } | null>(null);
  const [dropChoice, setDropChoice] = useState<{ fromWeek: number; from: Weekday; toWeek: number; to: Weekday } | null>(null);

  // Kept as refs (not state) so the single mount-lifetime pointer listener below always sees
  // the latest values without needing to re-subscribe on every render.
  const planRef = useRef(plan); planRef.current = plan;
  const onMoveRef = useRef(onMove); onMoveRef.current = onMove;
  const onAddRef = useRef(onAdd); onAddRef.current = onAdd;
  const onDayClickRef = useRef(onDayClick); onDayClickRef.current = onDayClick;
  const dragFromRef = useRef(dragFrom); dragFromRef.current = dragFrom;

  // A press anywhere in a day's box: held still for HOLD_DELAY_MS → starts a drag; released
  // quickly (or moved) → treated as a tap that opens the day sheet. This lets you press and
  // hold ANYWHERE in the box to reorder, not just a small handle, while a normal touch-scroll
  // starting on a box still works (we never call preventDefault until the drag has engaged).
  const pressRef = useRef<{
    week: number; day: Weekday; pointerId: number; startX: number; startY: number;
    timer: ReturnType<typeof setTimeout>; engaged: boolean;
  } | null>(null);

  useEffect(() => {
    const findCell = (x: number, y: number): { week: number; day: Weekday } | null => {
      const el = document.elementFromPoint(x, y);
      const cellEl = el?.closest('[data-cellkey]') as HTMLElement | null;
      if (!cellEl?.dataset.cellkey) return null;
      const [wk, dy] = cellEl.dataset.cellkey.split('|');
      return { week: parseInt(wk, 10), day: dy as Weekday };
    };
    const clearPending = () => {
      if (pressRef.current) clearTimeout(pressRef.current.timer);
      pressRef.current = null;
    };
    const onPointerMove = (e: PointerEvent) => {
      const pending = pressRef.current;
      if (pending && !pending.engaged && pending.pointerId === e.pointerId) {
        const moved = Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY);
        if (moved > MOVE_TOLERANCE_PX) clearPending(); // let the browser scroll — this wasn't a hold
        return; // never preventDefault while still pending
      }
      const from = dragFromRef.current;
      if (!from || from.pointerId !== e.pointerId) return;
      e.preventDefault();
      const cell = findCell(e.clientX, e.clientY);
      if (!cell || (cell.week === from.week && cell.day === from.day)) { setOverCell(null); return; }
      const targetSession = planRef.current.weeks.find(w => w.weekNumber === cell.week)?.days[cell.day];
      const kind: 'move' | 'swap' | 'choose' = targetSession && isRunSession(targetSession)
        ? (onAddRef.current ? 'choose' : 'swap')
        : 'move';
      setOverCell(prev => (prev && prev.week === cell.week && prev.day === cell.day && prev.kind === kind) ? prev : { ...cell, kind });
    };
    const onPointerUp = (e: PointerEvent) => {
      const pending = pressRef.current;
      if (pending && !pending.engaged && pending.pointerId === e.pointerId) {
        clearPending();
        onDayClickRef.current?.(pending.week, pending.day); // quick tap — open the day sheet
        return;
      }
      const from = dragFromRef.current;
      if (!from || from.pointerId !== e.pointerId) return;
      const cell = findCell(e.clientX, e.clientY);
      if (cell && (cell.week !== from.week || cell.day !== from.day)) {
        const targetSession = planRef.current.weeks.find(w => w.weekNumber === cell.week)?.days[cell.day];
        if (onAddRef.current && targetSession && isRunSession(targetSession)) {
          setDropChoice({ fromWeek: from.week, from: from.day, toWeek: cell.week, to: cell.day });
        } else {
          onMoveRef.current?.(from.week, from.day, cell.week, cell.day);
        }
      }
      setDragFrom(null);
      setOverCell(null);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  const dragProps = (week: number, day: Weekday) => onMove ? {
    onPointerDown: (e: React.PointerEvent) => {
      const pointerId = e.pointerId;
      const timer = setTimeout(() => {
        const p = pressRef.current;
        if (!p || p.pointerId !== pointerId) return;
        p.engaged = true;
        setDragFrom({ week: p.week, day: p.day, pointerId });
      }, HOLD_DELAY_MS);
      pressRef.current = { week, day, pointerId, startX: e.clientX, startY: e.clientY, timer, engaged: false };
    },
    isDragging: dragFrom?.week === week && dragFrom?.day === day,
    isOver: (overCell && overCell.week === week && overCell.day === day ? overCell.kind : false) as false | 'move' | 'swap' | 'choose',
  } : undefined;
  // any week without distance is treated as a "sessions" plan for the column header
  const anyKm = plan.weeks.some(w => w.totalKm > 0);

  const dropFromWeek = dropChoice ? plan.weeks.find(w => w.weekNumber === dropChoice.fromWeek) : undefined;
  const dropToWeek = dropChoice ? plan.weeks.find(w => w.weekNumber === dropChoice.toWeek) : undefined;
  const addWouldExceedMax = dropChoice && dropFromWeek && dropToWeek
    ? sessionCount(dropFromWeek.days[dropChoice.from]) + sessionCount(dropToWeek.days[dropChoice.to]) > MAX_SESSIONS_PER_DAY
    : false;

  return (
    <>
      {/* Desktop: full week × day table */}
      <div className="hidden md:block">
        <table className="w-full table-fixed border-separate" style={{ borderSpacing: '4px' }}>
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wide px-2 py-2 w-28">Week &amp; {anyKm ? 'Total (km)' : 'Sessions'}</th>
              {WEEKDAYS.map(d => (
                <th key={d} className="text-center text-xs font-semibold text-[#94A3B8] uppercase tracking-wide px-1 py-2">{WEEKDAY_SHORT[d]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.weeks.map(w => (
              <tr key={w.weekNumber} className={currentWeek === w.weekNumber ? 'ring-1 ring-blue-500/40' : ''}>
                <td className="align-top px-2 py-2 rounded-lg bg-[#0F172A] border border-[#293548]">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-white">Week {w.weekNumber}</span>
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded self-start" style={{ background: PHASE_COLORS[w.phase] + '22', color: PHASE_COLORS[w.phase] }}>{w.weekNumber === 0 ? 'Lead-in' : w.phase}</span>
                    <span className="text-xs text-[#60A5FA] font-bold">{weekSummary(w)}</span>
                    {w.focus && <span className="text-[10px] text-[#64748B] leading-snug mt-0.5">{w.focus}</span>}
                  </div>
                </td>
                {WEEKDAYS.map(d => (
                  <td key={d} className="align-top" data-cellkey={`${w.weekNumber}|${d}`}>
                    <DayCell s={w.days[d]} onClick={onDayClick ? () => onDayClick(w.weekNumber, d) : undefined} drag={dragProps(w.weekNumber, d)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {onMove && (
          <p className="text-[10px] text-[#475569] mt-1">
            Tip: press and hold anywhere on a session, then drag onto another day{onAdd ? ' to swap or add it to that day' : ' to swap them'} — any week.
          </p>
        )}
      </div>

      {dropChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDropChoice(null)} />
          <div className="relative w-full max-w-xs bg-[#1E293B] border border-[#334155] rounded-2xl p-4">
            <p className="text-sm text-[#94A3B8] mb-3">{WEEKDAY_LABELS[dropChoice.to]} already has a session — swap it, or add this one alongside it?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { onMove?.(dropChoice.fromWeek, dropChoice.from, dropChoice.toWeek, dropChoice.to); setDropChoice(null); }}
                className="py-1.5 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569]">
                Swap
              </button>
              <button
                disabled={addWouldExceedMax}
                onClick={() => { if (addWouldExceedMax) return; onAdd?.(dropChoice.fromWeek, dropChoice.from, dropChoice.toWeek, dropChoice.to); setDropChoice(null); }}
                className={`py-1.5 rounded-lg border text-xs ${addWouldExceedMax ? 'border-[#334155] text-[#475569] cursor-not-allowed opacity-60' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                Add to that day
              </button>
            </div>
            {addWouldExceedMax && <p className="text-[10px] text-amber-400/80 mt-1.5">That day already has {MAX_SESSIONS_PER_DAY} sessions — the max per day.</p>}
            <button onClick={() => setDropChoice(null)} className="text-xs text-[#64748B] hover:text-white py-1 mt-2 w-full text-center">Cancel</button>
          </div>
        </div>
      )}

      {/* Mobile: stacked week cards */}
      <div className="md:hidden flex flex-col gap-4">
        {plan.weeks.map(w => (
          <div key={w.weekNumber} className={`rounded-xl border p-3 ${currentWeek === w.weekNumber ? 'border-blue-500/50 bg-blue-500/5' : 'border-[#293548] bg-[#141d2e]'}`}>
            <div className="mb-2.5">
              <WeekHeader w={w} />
              {w.focus && <p className="text-[11px] text-[#64748B] mt-1">{w.focus}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              {WEEKDAYS.map(d => (
                <div key={d} className="flex items-center gap-2" data-cellkey={`${w.weekNumber}|${d}`}>
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase w-8 flex-shrink-0">{WEEKDAY_SHORT[d]}</span>
                  <div className="flex-1 min-w-0">
                    <DayCell s={w.days[d]} compact onClick={onDayClick ? () => onDayClick(w.weekNumber, d) : undefined} drag={dragProps(w.weekNumber, d)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {onMove && (
          <p className="text-[10px] text-[#475569]">
            Tip: press and hold anywhere on a session, then drag onto another day{onAdd ? ' to swap or add it to that day' : ' to swap them'} — any week.
          </p>
        )}
      </div>
    </>
  );
}

export { target as sessionTarget, WEEKDAY_LABELS };
