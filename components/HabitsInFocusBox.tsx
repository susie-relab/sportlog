'use client';
import { useState } from 'react';
import { Pencil, X, Flame } from 'lucide-react';
import { Habit, HabitLog } from '@/types';
import { completionRatio, currentStreak, bestStreak, isFailedLog, isSkippedLog, completionPctInRange, addDaysISO } from '@/lib/habitStats';

interface Props {
  habits: Habit[];         // all active habits
  logs: HabitLog[];        // today's logs (and recent enough for streaks)
  focusIds: string[];
  onSetFocusIds: (ids: string[]) => void;
  onCycleToday: (habit: Habit) => void;
  todayISO: string;
}

export default function HabitsInFocusBox({ habits, logs, focusIds, onSetFocusIds, onCycleToday, todayISO }: Props) {
  const [picking, setPicking] = useState(false);

  const logsByHabit = new Map<string, HabitLog>();
  for (const l of logs) logsByHabit.set(l.habit_id, l);

  const focusHabits = focusIds
    .map(id => habits.find(h => h.id === id))
    .filter((h): h is Habit => !!h);

  const doneCount = focusHabits.filter(h => {
    const log = logsByHabit.get(h.id);
    if (isSkippedLog(log) || isFailedLog(log)) return false;
    return completionRatio(h, log, h.target_per_period) >= 1;
  }).length;

  const toggleFocus = (id: string) => {
    if (focusIds.includes(id)) {
      onSetFocusIds(focusIds.filter(x => x !== id));
    } else if (focusIds.length < 5) {
      onSetFocusIds([...focusIds, id]);
    }
  };

  if (habits.length === 0) return null;

  return (
    <>
      <div className="card mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wide">Habits in Focus</h2>
            {focusHabits.length > 0 && (
              <span className="text-xs font-semibold text-white bg-[#1E293B] px-1.5 py-0.5 rounded-full border border-[#334155]">
                {doneCount}/{focusHabits.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setPicking(true)}
            className="p-1 rounded-lg hover:bg-[#334155] text-[#64748B] hover:text-white transition-colors"
            aria-label="Choose focus habits"
          >
            <Pencil size={14} />
          </button>
        </div>

        {focusHabits.length === 0 ? (
          <button
            onClick={() => setPicking(true)}
            className="w-full text-center text-sm text-[#64748B] hover:text-white py-3 border border-dashed border-[#334155] rounded-lg transition-colors"
          >
            + Choose up to 5 habits to focus on
          </button>
        ) : (
          <div className="flex flex-col gap-1">
            {focusHabits.map((h, i) => {
              const log = logsByHabit.get(h.id);
              const failed = isFailedLog(log);
              const skipped = isSkippedLog(log);
              const count = (failed || skipped) ? 0 : (log?.count ?? 0);
              const ratio = completionRatio(h, log, h.target_per_period);
              const done = ratio >= 1;
              const habitLogs = logs.filter(l => l.habit_id === h.id);
              const streak = currentStreak(h, habitLogs, todayISO, []);
              const best = bestStreak(h, habitLogs, []);
              const weekPct = Math.round(completionPctInRange(h, habitLogs, addDaysISO(todayISO, -6), todayISO) * 100);
              const monthPct = Math.round(completionPctInRange(h, habitLogs, addDaysISO(todayISO, -29), todayISO) * 100);
              const locked = failed || skipped;

              return (
                <div key={h.id} className={`rounded-lg border border-[#1E293B] p-3 ${i < focusHabits.length - 1 ? 'mb-1' : ''}`}>
                  <button
                    onClick={() => { if (!locked && !done) onCycleToday(h); }}
                    disabled={locked || done}
                    className={`flex items-center gap-3 w-full text-left mb-2 ${(!locked && !done) ? 'hover:opacity-80 transition-opacity' : ''}`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: h.color, boxShadow: done ? `0 0 0 2px ${h.color}55` : 'none' }}
                    />
                    <span className={`text-sm font-semibold flex-1 truncate ${done ? 'text-[#64748B] line-through' : skipped ? 'text-[#64748B] italic' : failed ? 'text-[#64748B] line-through' : 'text-white'}`}>
                      {h.name}
                    </span>
                    <span className={`text-xs font-semibold flex-shrink-0 ${done ? 'text-green-400' : skipped ? 'text-[#64748B]' : failed ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                      {done ? '✓' : skipped ? 'skip' : failed ? '✕' : `${count}/${h.target_per_period}`}
                    </span>
                  </button>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-0.5 text-amber-400">
                        <Flame size={11} />
                        <span className="text-xs font-bold">{streak}</span>
                      </div>
                      <div className="text-[10px] text-[#475569] mt-0.5">streak</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold text-[#94A3B8]">{best}</div>
                      <div className="text-[10px] text-[#475569] mt-0.5">best</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold" style={{ color: weekPct >= 80 ? '#22C55E' : weekPct >= 50 ? '#EAB308' : '#EF4444' }}>{weekPct}%</div>
                      <div className="text-[10px] text-[#475569] mt-0.5">this wk</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold" style={{ color: monthPct >= 80 ? '#22C55E' : monthPct >= 50 ? '#EAB308' : '#EF4444' }}>{monthPct}%</div>
                      <div className="text-[10px] text-[#475569] mt-0.5">30 days</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Picker sheet */}
      {picking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={() => setPicking(false)}>
          <div className="card w-full sm:w-96 max-h-[75vh] overflow-y-auto rounded-b-none sm:rounded-b-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-white">Choose Focus Habits</h3>
              <button onClick={() => setPicking(false)} className="p-1 rounded-lg hover:bg-[#334155] text-[#94A3B8]"><X size={18} /></button>
            </div>
            <p className="text-xs text-[#64748B] mb-4">Pick up to 5 — tap to add or remove</p>
            <div className="flex flex-col gap-0.5">
              {habits.map(h => {
                const selected = focusIds.includes(h.id);
                const maxed = !selected && focusIds.length >= 5;
                return (
                  <button
                    key={h.id}
                    onClick={() => { if (!maxed) toggleFocus(h.id); }}
                    disabled={maxed}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${selected ? 'border-blue-500 bg-blue-500/10' : maxed ? 'border-transparent opacity-40 cursor-not-allowed' : 'border-transparent hover:bg-[#1E293B]'}`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: h.color }} />
                    <span className="text-sm text-white flex-1 truncate">{h.name}</span>
                    {selected && <span className="text-blue-400 text-xs font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setPicking(false)} className="btn-primary w-full mt-4">Done</button>
          </div>
        </div>
      )}
    </>
  );
}
