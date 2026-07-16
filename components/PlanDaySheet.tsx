'use client';
import { useState } from 'react';
import {
  PlanData, Session, Weekday, WEEKDAYS, WEEKDAY_LABELS,
  switchDifficulty, isRunSession, movePlanSession, addSessionToDay, updateSessionDetails, PlanConfig,
  sessionCount, sessionParts, MAX_SESSIONS_PER_DAY, movePartToDay, updateSessionPart, removeSessionPart,
} from '@/lib/runPlanGenerator';
import { sessionColor, sessionTarget, exerciseTypeTag } from './PlanWeekTable';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import { Activity, EXERCISE_TYPE_COLORS } from '@/types';
import { formatDuration, formatDistance } from '@/lib/utils';

interface Props {
  data: PlanData;
  selected: { week: number; day: Weekday };
  onSave: (newData: PlanData) => void;
  onClose: () => void;
  /** Only present in a saved/live plan — enables log-and-complete + mark-done. partIndex identifies
   *  which session within a combined day is being logged (omitted/0 for a single-session day). */
  onLogAndComplete?: (session: Session, partIndex?: number) => void;
  /** Needed for the easier/harder/reset buttons; omit to hide them. */
  cfg?: PlanConfig;
}

export default function PlanDaySheet({ data, selected, onSave, onClose, onLogAndComplete, cfg }: Props) {
  const { user } = useAuth();
  const [assigningPart, setAssigningPart] = useState<number | null>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[] | null>(null);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [targetWeek, setTargetWeek] = useState(selected.week);
  const [pendingDay, setPendingDay] = useState<Weekday | null>(null);
  const [editing, setEditing] = useState(false);
  const [movingPart, setMovingPart] = useState<number | null>(null);
  const [partTargetWeek, setPartTargetWeek] = useState(selected.week);
  const [pendingPartDay, setPendingPartDay] = useState<Weekday | null>(null);
  const [editingPart, setEditingPart] = useState<number | null>(null);
  const [confirmRest, setConfirmRest] = useState(false);
  const [confirmRemovePart, setConfirmRemovePart] = useState<number | null>(null);
  const week = data.weeks.find(w => w.weekNumber === selected.week);
  const sel = week?.days[selected.day];
  const [editTitle, setEditTitle] = useState(sel?.title ?? '');
  const [editDetail, setEditDetail] = useState(sel?.detail ?? '');
  const [editMin, setEditMin] = useState(sel?.timeMin ? String(sel.timeMin) : '');
  const [editKm, setEditKm] = useState(sel?.distanceKm ? String(sel.distanceKm) : '');
  if (!sel) return null;

  const weekNumbers = data.weeks.map(w => w.weekNumber);

  const mutateSelf = (fn: (s: Session) => Session, keepOpen = false) => {
    const newData = { ...data, weeks: data.weeks.map(w => w.weekNumber !== selected.week ? w : {
      ...w, days: { ...w.days, [selected.day]: fn(w.days[selected.day]) },
    }) };
    onSave(newData);
    if (!keepOpen) onClose();
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

  const movingPartSession = movingPart !== null ? sessionParts(sel)[movingPart] : null;
  const pendingPartDaySession = pendingPartDay ? data.weeks.find(w => w.weekNumber === partTargetWeek)?.days[pendingPartDay] : undefined;
  const partTargetHasSession = !!pendingPartDaySession && isRunSession(pendingPartDaySession);
  const partAddWouldExceedMax = pendingPartDaySession && movingPartSession
    ? sessionCount(pendingPartDaySession) + sessionCount(movingPartSession) > MAX_SESSIONS_PER_DAY
    : false;

  const startMovingPart = (i: number) => {
    setMovingPart(i);
    setPartTargetWeek(selected.week);
    setPendingPartDay(null);
  };
  const choosePartDay = (d: Weekday) => {
    if (movingPart === null) return;
    if (partTargetWeek === selected.week && d === selected.day) return;
    const target = data.weeks.find(w => w.weekNumber === partTargetWeek)?.days[d];
    if (target && isRunSession(target)) {
      setPendingPartDay(d);
    } else {
      onSave(movePartToDay(data, selected, movingPart, { week: partTargetWeek, day: d }, 'add'));
      onClose();
    }
  };
  const confirmPartSwap = () => { if (!pendingPartDay || movingPart === null) return; onSave(movePartToDay(data, selected, movingPart, { week: partTargetWeek, day: pendingPartDay }, 'swap')); onClose(); };
  const confirmPartAdd = () => { if (!pendingPartDay || movingPart === null || partAddWouldExceedMax) return; onSave(movePartToDay(data, selected, movingPart, { week: partTargetWeek, day: pendingPartDay }, 'add')); onClose(); };

  const saveEdit = () => {
    onSave(updateSessionDetails(data, selected, {
      title: editTitle.trim() || sel.title,
      detail: editDetail,
      timeMin: editMin ? parseInt(editMin) : undefined,
      distanceKm: editKm ? parseFloat(editKm) : undefined,
    }));
    onClose();
  };

  const mutatePart = (i: number, fn: (s: Session) => Session, keepOpen = false) => {
    onSave(updateSessionPart(data, selected, i, fn));
    if (!keepOpen) onClose();
  };
  const makePartRestDay = (i: number) => { onSave(removeSessionPart(data, selected, i)); onClose(); };

  // "Assign an existing activity" — completes the session by linking an activity already
  // logged (e.g. from the same day), instead of opening the Add form to log a new one.
  const openAssignPicker = async (partIndex: number) => {
    setAssigningPart(partIndex);
    if (recentActivities !== null || !user) return;
    setLoadingRecent(true);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffISO = cutoff.toISOString().slice(0, 10);
    const { data: acts } = await supabase.from('activities').select('*')
      .eq('user_id', user.id).gte('date', cutoffISO).order('date', { ascending: false }).limit(50);
    setRecentActivities((acts as Activity[]) || []);
    setLoadingRecent(false);
  };
  const assignActivity = (activity: Activity, partIndex: number) => {
    const totalMin = activity.duration_minutes + (activity.duration_seconds ? activity.duration_seconds / 60 : 0);
    const patch = (s: Session): Session => ({
      ...s, completed: true, completedActivityId: activity.id,
      completedDistanceKm: activity.distance_km ?? null, completedTimeMin: Math.round(totalMin) || null,
      completedEffort: activity.effort,
    });
    setAssigningPart(null);
    if (sessionParts(sel).length > 1) mutatePart(partIndex, patch);
    else mutateSelf(patch);
  };
  const startEditingPart = (i: number) => {
    const p = sessionParts(sel)[i];
    setEditTitle(p.title);
    setEditDetail(p.detail);
    setEditMin(p.timeMin ? String(p.timeMin) : '');
    setEditKm(p.distanceKm ? String(p.distanceKm) : '');
    setEditingPart(i);
  };
  const savePartEdit = () => {
    if (editingPart === null) return;
    onSave(updateSessionPart(data, selected, editingPart, s => ({
      ...s,
      title: editTitle.trim() || s.title,
      detail: editDetail,
      timeMin: editMin ? parseInt(editMin) : undefined,
      distanceKm: editKm ? parseFloat(editKm) : undefined,
    })));
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
                    {editingPart === i ? (
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="label">Title</label>
                          <input className="input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                        </div>
                        <div>
                          <label className="label">Description / goal</label>
                          <textarea className="input" rows={3} value={editDetail} onChange={e => setEditDetail(e.target.value)} style={{ resize: 'vertical' }} />
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
                        <div className="flex gap-2">
                          <button onClick={savePartEdit} className="btn-primary flex-1">Save</button>
                          <button onClick={() => setEditingPart(null)} className="btn-secondary flex-1">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-white">{p.title}</h3>
                            {exerciseTypeTag(p) && <p className="text-xs text-[#64748B]">{exerciseTypeTag(p)}</p>}
                            {sessionTarget(p) && <p className="text-sm font-semibold mt-0.5" style={{ color: sessionColor(p) }}>{sessionTarget(p)}</p>}
                          </div>
                          {p.completed && <span className="text-green-400 text-xs flex-shrink-0">✓ Completed</span>}
                        </div>
                        {p.detail && <p className="text-sm text-[#94A3B8] mt-1.5 whitespace-pre-line leading-relaxed">{p.detail}</p>}
                        {p.completed && p.completedEffort != null && (
                          <p className="text-xs text-[#64748B] mt-1.5">Effort {p.completedEffort}/10</p>
                        )}

                        <div className="flex flex-col gap-1.5 mt-3">
                          {onLogAndComplete && isRunSession(p) && !p.completed && (
                            <button onClick={() => { onLogAndComplete(p, i); onClose(); }} className="btn-primary w-full text-sm py-1.5">✓ Log &amp; Complete</button>
                          )}
                          {onLogAndComplete && isRunSession(p) && !p.completed && (
                            <button onClick={() => openAssignPicker(i)} className="btn-secondary w-full text-xs py-1.5">☑ Assign an existing activity</button>
                          )}
                          {onLogAndComplete && isRunSession(p) && (
                            <button onClick={() => mutatePart(i, s => ({ ...s, completed: !s.completed }))} className="btn-secondary w-full text-xs py-1.5">
                              {p.completed ? 'Mark as not done' : 'Mark done (without logging)'}
                            </button>
                          )}
                          <div className="grid grid-cols-3 gap-1.5">
                            <button onClick={() => startEditingPart(i)} className="py-1.5 rounded-lg border border-[#334155] text-[#94A3B8] text-[10px] hover:border-[#475569]">✎ Edit</button>
                            <button onClick={() => movingPart === i ? setMovingPart(null) : startMovingPart(i)}
                              className="py-1.5 rounded-lg border border-[#334155] text-[#94A3B8] text-[10px] hover:border-[#475569]">
                              {movingPart === i ? 'Cancel move' : '↔ Move'}
                            </button>
                            {confirmRemovePart === i ? (
                              <button onClick={() => makePartRestDay(i)} className="py-1.5 rounded-lg border border-red-700 bg-red-900/40 text-red-300 text-[10px]">Confirm remove</button>
                            ) : (
                              <button onClick={() => setConfirmRemovePart(i)} className="py-1.5 rounded-lg border border-[#334155] text-[#94A3B8] text-[10px] hover:border-[#475569]">Remove</button>
                            )}
                          </div>
                          {confirmRemovePart === i && (
                            <div className="flex items-center justify-between gap-2 text-[10px]">
                              <span className="text-amber-400/80">Remove this session from the day?</span>
                              <button onClick={() => setConfirmRemovePart(null)} className="text-[#64748B] hover:text-white">Cancel</button>
                            </div>
                          )}
                          {cfg && isRunSession(p) && (
                            <div className="grid grid-cols-3 gap-1.5">
                              <button onClick={() => mutatePart(i, s => switchDifficulty(s, 'easier', cfg), true)} className="py-1.5 rounded-lg border border-[#334155] text-[#94A3B8] text-[10px] hover:border-[#475569]">Easier</button>
                              <button onClick={() => mutatePart(i, s => switchDifficulty(s, 'reset', cfg), true)} className="py-1.5 rounded-lg border border-[#334155] text-[#94A3B8] text-[10px] hover:border-[#475569]">Reset</button>
                              <button onClick={() => mutatePart(i, s => switchDifficulty(s, 'harder', cfg), true)} className="py-1.5 rounded-lg border border-[#334155] text-[#94A3B8] text-[10px] hover:border-[#475569]">Harder</button>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {movingPart === i && (
                      <div className="mt-3 pt-3 border-t border-[#334155]">
                        <p className="text-xs text-[#64748B] mb-1.5">Move this session to {weekNumbers.length > 1 ? 'another day/week' : 'another day'}</p>
                        {weekNumbers.length > 1 && (
                          <select
                            className="input mb-1.5 text-sm"
                            value={partTargetWeek}
                            onChange={e => { setPartTargetWeek(parseInt(e.target.value)); setPendingPartDay(null); }}
                          >
                            {weekNumbers.map(w => <option key={w} value={w}>Week {w}</option>)}
                          </select>
                        )}
                        <div className="grid grid-cols-7 gap-1">
                          {WEEKDAYS.map(d => (
                            <button key={d} disabled={partTargetWeek === selected.week && d === selected.day}
                              onClick={() => choosePartDay(d)}
                              className={`py-1.5 rounded text-[10px] font-semibold border transition-all ${
                                (partTargetWeek === selected.week && d === selected.day) || pendingPartDay === d ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
                              }`}>
                              {WEEKDAY_LABELS[d].slice(0, 1)}
                            </button>
                          ))}
                        </div>
                        {pendingPartDay && partTargetHasSession && (
                          <div className="mt-2 p-2.5 rounded-lg bg-[#1E293B] border border-[#334155]">
                            <p className="text-xs text-[#94A3B8] mb-2">{WEEKDAY_LABELS[pendingPartDay]} already has a session — swap it, or add this one alongside it?</p>
                            <div className="grid grid-cols-2 gap-2">
                              <button onClick={confirmPartSwap} className="py-1.5 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569]">Swap</button>
                              <button onClick={confirmPartAdd} disabled={partAddWouldExceedMax}
                                className={`py-1.5 rounded-lg border text-xs ${partAddWouldExceedMax ? 'border-[#334155] text-[#475569] cursor-not-allowed opacity-60' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                                Add to that day
                              </button>
                            </div>
                            {partAddWouldExceedMax && (
                              <p className="text-[10px] text-amber-400/80 mt-1.5">That day already has {MAX_SESSIONS_PER_DAY} sessions — the max per day.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white">{sel.title}</h3>
                {exerciseTypeTag(sel) && <p className="text-xs text-[#64748B]">{exerciseTypeTag(sel)}</p>}
                {sessionTarget(sel) && <p className="text-sm font-semibold mt-0.5" style={{ color: sessionColor(sel) }}>{sessionTarget(sel)}</p>}
                {sel.detail && <p className="text-sm text-[#94A3B8] mt-2 whitespace-pre-line leading-relaxed">{sel.detail}</p>}
                {sel.completed && sel.completedEffort != null && (
                  <p className="text-xs text-[#64748B] mt-1.5">Effort {sel.completedEffort}/10</p>
                )}
              </>
            )}

            <div className="flex flex-col gap-2 mt-4">
              {sessionParts(sel).length === 1 && (
                <>
                  {onLogAndComplete && isRunSession(sel) && !sel.completed && (
                    <button onClick={() => { onLogAndComplete(sel, 0); onClose(); }} className="btn-primary w-full">✓ Log &amp; Complete</button>
                  )}
                  {onLogAndComplete && isRunSession(sel) && !sel.completed && (
                    <button onClick={() => openAssignPicker(0)} className="btn-secondary w-full text-sm">☑ Assign an existing activity</button>
                  )}
                  {onLogAndComplete && isRunSession(sel) && (
                    <button onClick={() => mutateSelf(s => ({ ...s, completed: !s.completed }))} className="btn-secondary w-full">
                      {sel.completed ? 'Mark as not done' : 'Mark done (without logging)'}
                    </button>
                  )}
                  <button onClick={() => setEditing(true)} className="py-2 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569]">✎ Edit details / goal</button>
                  {cfg && isRunSession(sel) && (
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => mutateSelf(s => switchDifficulty(s, 'easier', cfg), true)} className="py-2 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569]">Easier</button>
                      <button onClick={() => mutateSelf(s => switchDifficulty(s, 'reset', cfg), true)} className="py-2 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569]">Reset</button>
                      <button onClick={() => mutateSelf(s => switchDifficulty(s, 'harder', cfg), true)} className="py-2 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569]">Harder</button>
                    </div>
                  )}
                  {sel.type !== 'rest' && (
                    confirmRest ? (
                      <div className="flex gap-2">
                        <button onClick={() => mutateSelf(() => ({ type: 'rest', title: 'Rest', detail: 'Take a full day off. Recovery is where the gains happen.', completed: false }))}
                          className="flex-1 py-2 rounded-lg border border-red-700 bg-red-900/40 text-red-300 text-xs">Yes, make it a Rest day</button>
                        <button onClick={() => setConfirmRest(false)} className="flex-1 py-2 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569]">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmRest(true)}
                        className="py-2 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569]">Make this a Rest day</button>
                    )
                  )}
                </>
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

      {assigningPart !== null && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60" onClick={() => setAssigningPart(null)}>
          <div className="card w-full sm:w-96 max-h-[75vh] overflow-y-auto rounded-b-none sm:rounded-b-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">Assign an Existing Activity</span>
              <button onClick={() => setAssigningPart(null)} className="p-1 rounded-lg hover:bg-[#334155] text-[#94A3B8]">✕</button>
            </div>
            {loadingRecent && <p className="text-xs text-[#64748B]">Loading...</p>}
            {!loadingRecent && recentActivities?.length === 0 && (
              <p className="text-xs text-[#64748B]">No activities logged in the last 30 days.</p>
            )}
            <div className="flex flex-col gap-2">
              {recentActivities?.map(a => (
                <button
                  key={a.id}
                  onClick={() => assignActivity(a, assigningPart)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#334155] hover:border-[#475569] text-left"
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: EXERCISE_TYPE_COLORS[a.exercise_type] }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-white truncate">{a.name}</span>
                    <span className="block text-xs text-[#64748B]">
                      {a.date.split('-').reverse().join('/')} · {formatDuration(a.duration_minutes)}
                      {a.distance_km ? ` · ${formatDistance(a.distance_km, a.exercise_type)}` : ''}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
