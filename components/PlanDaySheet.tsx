'use client';
import { useState } from 'react';
import {
  PlanData, Session, Weekday, WEEKDAYS, WEEKDAY_LABELS,
  switchDifficulty, isRunSession, movePlanSession, addSessionToDay, updateSessionDetails, PlanConfig,
  sessionCount, sessionParts, MAX_SESSIONS_PER_DAY,
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
  const [pendingDay, setPendingDay] = useState<Weekday | null>(null);
  const [editing, setEditing] = useState(false);
  const week = data.weeks.find(w => w.weekNumber === selected.week);
  const sel = week?.days[selected.day];
  const [editTitle, setEditTitle] = useState(sel?.title ?? '');
  const [editDetail, setEditDetail] = useState(sel?.detail ?? '');
  const [editMin, setEditMin] = useState(sel?.timeMin ? String(sel.timeMin) : '');
  const [editKm, setEditKm] = useState(sel?.distanceKm ? String(sel.distanceKm) : '');
  if (!sel) return null;

  const weekNumbers = data.weeks.map(w => w.weekNumber);

  const mutateSelf = (fn: (s: Session) => Session) => {
    const newData = { ...data, weeks: data.weeks.map(w => w.weekNumber !== selected.week ? w : {
      ...w, days: { ...w.days, [selected.day]: fn(w.days[selected.day]) },
    }) };
    onSave(newData);
    onClose();
  };

  const pendingDaySession = pendingDay ? data.weeks.find(w => w.weekNumber === targetWeek)?.days[pendingDay] : undefined;
  const targetHasSession = !!pendingDaySession && isRunSession(pendingDaySession);

  const chooseDay = (d: Weekday) => {
    if (targetWeek === selected.week && d === selected.day) return;
    const target = data.weeks.find(w => w.weekNumber === targetWeek)?.days[d];
    if (target && isRunSession(target)) {
      // Target already has something scheduled — ask swap vs add.
      setPendingDay(d);
    } else {
      onSave(movePlanSession(data, selected, { week: targetWeek, day: d }));
      onClose();
    }
  };

  const combinedCountIfAdded = pendingDaySession ? sessionCount(pendingDaySession) + sessionCount(sel) : 0;
  const addWouldExceedMax = combinedCountIfAdded > MAX_SESSIONS_PER_DAY;

  const confirmSwap = () => { if (!pendingDay) return; onSave(movePlanSession(data, selected, { week: targetWeek, day: pendingDay })); onClose(); };
  const confirmAdd = () => { if (!pendingDay || addWouldExceedMax) return; onSave(addSessionToDay(data, selected, { week: targetWeek, day: pendingDay })); onClose(); };

  const saveEdit = () => {
    onSave(updateSessionDetails(data, selected, {
      title: editTitle.trim() || sel.title,
      detail: editDetail,
      timeMin: editMin ? parseInt(editMin) : undefined,
      distanceKm: editKm ? parseFloat(editKm) : undefined,
    }));
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

        {editing ? (
          <div className="flex flex-col gap-3 mt-2">
            <div>
              <label className="label">Title</label>
              <input className="input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label className="label">Description / goal</label>
              <textarea className="input" rows={4} value={editDetail} onChange={e => setEditDetail(e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Time (min)</label>
                <input type="number" className="input" min="0" placeholder="—" value={editMin} onChange={e => { setEditMin(e.target.value); if (e.target.value) setEditKm(''); }} />
              </div>
              <div>
                <label className="label">Distance (km)</label>
                <input type="number" className="input" min="0" step="0.1" placeholder="—" value={editKm} onChange={e => { setEditKm(e.target.value); if (e.target.value) setEditMin(''); }} />
              </div>
            </div>
            <p className="text-xs text-[#64748B]">Fill in one of time or distance — whichever is the goal for this session.</p>
            <div className="flex gap-2">
              <button onClick={saveEdit} className="btn-primary flex-1">Save</button>
              <button onClick={() => setEditing(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            {sessionParts(sel).length > 1 ? (
              <div className="flex flex-col gap-3">
                {sessionParts(sel).map((p, i) => (
                  <div key={i} className="rounded-lg border border-[#334155] bg-[#0F172A] p-3">
                    <h3 className="text-base font-bold text-white">{p.title}</h3>
                    {sessionTarget(p) && <p className="text-sm font-semibold mt-0.5" style={{ color: sessionColor(p) }}>{sessionTarget(p)}</p>}
                    {p.detail && <p className="text-sm text-[#94A3B8] mt-1.5 whitespace-pre-line leading-relaxed">{p.detail}</p>}
                    {p.completed && <span className="text-green-400 text-xs mt-1 inline-block">✓ Completed</span>}
                  </div>
                ))}
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white">{sel.title}</h3>
                {sessionTarget(sel) && <p className="text-sm font-semibold mt-0.5" style={{ color: sessionColor(sel) }}>{sessionTarget(sel)}</p>}
                {sel.detail && <p className="text-sm text-[#94A3B8] mt-2 whitespace-pre-line leading-relaxed">{sel.detail}</p>}
              </>
            )}

            <div className="flex flex-col gap-2 mt-4">
              {onLogAndComplete && isRunSession(sel) && !sel.completed && (
                <button onClick={() => { onLogAndComplete(sel); onClose(); }} className="btn-primary w-full">✓ Log &amp; Complete</button>
              )}
              {onLogAndComplete && isRunSession(sel) && (
                <button onClick={() => mutateSelf(s => ({ ...s, completed: !s.completed }))} className="btn-secondary w-full">
                  {sel.completed ? 'Mark as not done' : 'Mark done (without logging)'}
                </button>
              )}
              <button onClick={() => setEditing(true)} className="py-2 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569]">✎ Edit details / goal</button>
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
                <p className="text-xs text-[#64748B] mb-1.5">Move to another day {weekNumbers.length > 1 ? '(any week)' : ''}</p>
                {weekNumbers.length > 1 && (
                  <select
                    className="input mb-1.5 text-sm"
                    value={targetWeek}
                    onChange={e => { setTargetWeek(parseInt(e.target.value)); setPendingDay(null); }}
                  >
                    {weekNumbers.map(w => <option key={w} value={w}>Week {w}</option>)}
                  </select>
                )}
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAYS.map(d => (
                    <button key={d} disabled={targetWeek === selected.week && d === selected.day}
                      onClick={() => chooseDay(d)}
                      className={`py-1.5 rounded text-[10px] font-semibold border transition-all ${
                        (targetWeek === selected.week && d === selected.day) || pendingDay === d ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
                      }`}>
                      {WEEKDAY_LABELS[d].slice(0, 1)}
                    </button>
                  ))}
                </div>
                {pendingDay && targetHasSession && (
                  <div className="mt-2 p-2.5 rounded-lg bg-[#0F172A] border border-[#334155]">
                    <p className="text-xs text-[#94A3B8] mb-2">{WEEKDAY_LABELS[pendingDay]} already has a session — swap it, or add this one alongside it?</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={confirmSwap} className="py-1.5 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569]">Swap</button>
                      <button onClick={confirmAdd} disabled={addWouldExceedMax}
                        className={`py-1.5 rounded-lg border text-xs ${addWouldExceedMax ? 'border-[#334155] text-[#475569] cursor-not-allowed opacity-60' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                        Add to that day
                      </button>
                    </div>
                    {addWouldExceedMax && (
                      <p className="text-[10px] text-amber-400/80 mt-1.5">That day already has {MAX_SESSIONS_PER_DAY} sessions — the max per day.</p>
                    )}
                  </div>
                )}
              </div>

              <button onClick={onClose} className="text-sm text-[#64748B] hover:text-white py-1">Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
