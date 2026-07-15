'use client';
import { useState } from 'react';
import { Habit, HabitLog, HabitFrequencyType } from '@/types';
import { todayLocalISO } from '@/lib/utils';
import { periodProgress } from '@/lib/habitStats';
import { FrequencyFields, PencilIcon } from '@/components/HabitTabBox';

interface Props {
  habit: Habit;
  logs: HabitLog[];
  onIncrement: () => void;
  onDecrement: () => void;
  onUpdateHabit: (patch: Partial<Habit>) => void;
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '');
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** One habit as a paint-style fill bar — a 30%-opacity wash of the habit's colour floods
 *  left-to-right as progress builds toward its planned total for the current tracking window
 *  (a week for daily/every-N-days/weekly/specific-days habits, a fortnight or month for those
 *  frequencies). Tapping anywhere on the box (or the +/- stepper) logs/undoes a completion for
 *  today; tapping the name or the pencil opens a quick editor for the goal amount and frequency. */
export default function HabitListRow({ habit, logs, onIncrement, onDecrement, onUpdateHabit }: Props) {
  const [editing, setEditing] = useState(false);
  const [frequency, setFrequency] = useState<HabitFrequencyType>(habit.frequency_type);
  const [days, setDays] = useState<string[]>(habit.frequency_days ? habit.frequency_days.split(',') : []);
  const [intervalDays, setIntervalDays] = useState(String(habit.frequency_interval_days || 2));
  const [target, setTarget] = useState(String(habit.target_per_period));

  const todayISO = todayLocalISO();
  const { pct, sum, target: periodTarget, periodLabel } = periodProgress(habit, logs, todayISO);
  const todayCount = logs.find(l => l.date === todayISO)?.count || 0;

  const openEditor = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFrequency(habit.frequency_type);
    setDays(habit.frequency_days ? habit.frequency_days.split(',') : []);
    setIntervalDays(String(habit.frequency_interval_days || 2));
    setTarget(String(habit.target_per_period));
    setEditing(true);
  };

  const save = () => {
    onUpdateHabit({
      frequency_type: frequency,
      frequency_days: frequency === 'custom_days' ? (days.join(',') || null) : null,
      frequency_interval_days: frequency === 'every_n_days' ? (parseInt(intervalDays) || 2) : null,
      target_per_period: parseInt(target) || 1,
    });
    setEditing(false);
  };

  return (
    <div className="card p-0 overflow-hidden">
      <div
        onClick={onIncrement}
        role="button"
        className="relative h-20 select-none cursor-pointer"
        style={{ background: '#1E293B' }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.max(pct, pct > 0 ? 6 : 0)}%`, background: hexToRgba(habit.color, 0.3) }}
        />
        {pct > 0 && pct < 100 && (
          <div
            className="absolute top-1/2 rounded-full blur-md pointer-events-none"
            style={{
              left: `${pct}%`, width: 28, height: 28, transform: 'translate(-50%, -50%)',
              background: hexToRgba(habit.color, 0.45),
            }}
          />
        )}

        <div className="relative z-10 h-full flex flex-col justify-center px-4 gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <button onClick={openEditor} className="text-sm font-semibold text-white truncate hover:underline text-left">
              {habit.name}
            </button>
            <span
              className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0"
              style={{ background: hexToRgba(habit.color, 0.9), color: '#0F172A' }}
            >
              {pct}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[#94A3B8]">{sum}/{periodTarget} this {periodLabel}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={e => { e.stopPropagation(); onDecrement(); }}
                disabled={todayCount <= 0}
                aria-label="Remove one for today"
                className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold bg-black/25 text-white hover:bg-black/40 disabled:opacity-30"
              >
                −
              </button>
              <span className="text-xs font-semibold text-white w-4 text-center">{todayCount}</span>
              <button
                onClick={e => { e.stopPropagation(); onIncrement(); }}
                aria-label="Add one for today"
                className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold bg-black/25 text-white hover:bg-black/40"
              >
                +
              </button>
              <button
                onClick={openEditor}
                aria-label="Edit habit"
                className="w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white bg-black/25 hover:bg-black/40"
              >
                <PencilIcon />
              </button>
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <div className="p-3 border-t border-[#334155] flex flex-col gap-3">
          <FrequencyFields
            frequency={frequency} setFrequency={setFrequency}
            days={days} setDays={setDays}
            intervalDays={intervalDays} setIntervalDays={setIntervalDays}
            target={target} setTarget={setTarget}
          />
          <div className="flex gap-2">
            <button onClick={save} className="btn-primary flex-1">Save</button>
            <button onClick={() => setEditing(false)} className="text-sm text-[#64748B] hover:text-white px-3">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
