'use client';
import { useState } from 'react';
import {
  PlanData, Session, Weekday, WEEKDAYS, WEEKDAY_LABELS,
  switchDifficulty, isRunSession, movePlanSession, PlanConfig,
} from '@/lib/runPlanGenerator';
import { sessionColor, sessionTarget } from './PlanWeekTable';

interface Props {
  data: PlanData;
  selected: { week: number; day: Weekday };
  onSave: (newData: PlanData) => void;
  onClose: () => void;
  /** Only present in a saved/live plan — enables log-and-complete + mark-done. */
  onLogAndComplete?: (session: Session) => void;
  /** Needed for the easier/harder/reset buttons; omit to hide them. */
  cfg?: PlanConfig;
}

export default function PlanDaySheet({ data, selected, onSave, onClose, onLogAndComplete, cfg }: Props) {
  const [targetWeek, setTargetWeek] = useState(selected.week);
  const week = data.weeks.find(w => w.weekNumber === selected.week);
  const sel = week?.days[selected.day];
  if (!sel) return null;

  const weekNumbers = data.weeks.map(w => w.weekNumber);

  const mutateSelf = (fn: (s: Session) => Session) => {
    const newData = { ...data, weeks: data.weeks.map(w => w.weekNumber !== selected.week ? w : {
      ...w, days: { ...w.days, [selected.day]: fn(w.days[selected.day]) },
    }) };
    onSave(newData);
    onClose();
  };

  const moveTo = (toDay: Weekday) => {
    onSave(movePlanSession(data, selected, { week: targetWeek, day: toDay }));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-[#1E293B] border border-[#334155] rounded-t-2xl md:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: sessionColor(sel) }} />
          <span className="text-xs text-[#64748B] uppercase tracking-wide">Week {selected.week} · {WEEKDAY_LABELS[selected.day]}</span>
        </div>
        <h3 className="text-lg font-bold text-white">{sel.title}</h3>
        {sessionTarget(sel) && <p className="text-sm font-semibold mt-0.5" style={{ color: sessionColor(sel) }}>{sessionTarget(sel)}</p>}
        {sel.detail && <p className="text-sm text-[#94A3B8] mt-2 whitespace-pre-line leading-relaxed">{sel.detail}</p>}

        <div className="flex flex-col gap-2 mt-4">
          {onLogAndComplete && isRunSession(sel) && !sel.completed && (
            <button onClick={() => { onLogAndComplete(sel); onClose(); }} className="btn-primary w-full">✓ Log &amp; Complete</button>
          )}
          {onLogAndComplete && isRunSession(sel) && (
            <button onClick={() => mutateSelf(s => ({ ...s, completed: !s.completed }))} className="btn-secondary w-full">
              {sel.completed ? 'Mark as not done' : 'Mark done (without logging)'}
            </button>
          )}
          {cfg && isRunSession(sel) && (
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => mutateSelf(s => switchDifficulty(s, 'easier', cfg))} className="py-2 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569]">Easier</button>
              <button onClick={() => mutateSelf(s => switchDifficulty(s, 'reset', cfg))} className="py-2 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569]">Reset</button>
              <button onClick={() => mutateSelf(s => switchDifficulty(s, 'harder', cfg))} className="py-2 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569]">Harder</button>
            </div>
          )}
          {sel.type !== 'rest' && (
            <button onClick={() => mutateSelf(() => ({ type: 'rest', title: 'Rest', detail: 'Take a full day off. Recovery is where the gains happen.', completed: false }))}
              className="py-2 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569]">Make this a Rest day</button>
          )}

          {/* Move to another day — same week or a different week */}
          <div>
            <p className="text-xs text-[#64748B] mb-1.5">Move to another day {weekNumbers.length > 1 ? '(any week)' : '(swaps)'}</p>
            {weekNumbers.length > 1 && (
              <select
                className="input mb-1.5 text-sm"
                value={targetWeek}
                onChange={e => setTargetWeek(parseInt(e.target.value))}
              >
                {weekNumbers.map(w => <option key={w} value={w}>Week {w}</option>)}
              </select>
            )}
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map(d => (
                <button key={d} disabled={targetWeek === selected.week && d === selected.day}
                  onClick={() => moveTo(d)}
                  className={`py-1.5 rounded text-[10px] font-semibold border transition-all ${
                    targetWeek === selected.week && d === selected.day ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
                  }`}>
                  {WEEKDAY_LABELS[d].slice(0, 1)}
                </button>
              ))}
            </div>
          </div>

          <button onClick={onClose} className="text-sm text-[#64748B] hover:text-white py-1">Close</button>
        </div>
      </div>
    </div>
  );
}
