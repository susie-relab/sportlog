'use client';
import { useRef, useState } from 'react';
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
  onReorder: (toHabitId: string) => void;
  onArchive: () => void;
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '');
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** One habit as a compact paint-style fill bar — a 30%-opacity wash of the habit's colour
 *  floods left-to-right as progress builds toward its planned total for the current tracking
 *  window. Tapping anywhere on the row (other than the +/- stepper or pencil) opens/closes the
 *  quick editor; press-and-hold anywhere else drags the row to reorder it within the full
 *  habit list (across every category). */
export default function HabitListRow({ habit, logs, onIncrement, onDecrement, onUpdateHabit, onReorder, onArchive }: Props) {
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragMovedRef = useRef(false);
  const draggingRef = useRef(false);
  const [frequency, setFrequency] = useState<HabitFrequencyType>(habit.frequency_type);
  const [days, setDays] = useState<string[]>(habit.frequency_days ? habit.frequency_days.split(',') : []);
  const [intervalDays, setIntervalDays] = useState(String(habit.frequency_interval_days || 2));
  const [target, setTarget] = useState(String(habit.target_per_period));

  const todayISO = todayLocalISO();
  const { pct, sum, target: periodTarget, periodLabel } = periodProgress(habit, logs, todayISO);
  const todayCount = logs.find(l => l.date === todayISO)?.count || 0;

  // A tap toggles the editor open/closed (like the Cancel button); opening also refreshes
  // the form fields to the habit's current values.
  const toggleEditor = () => {
    if (editing) { setEditing(false); return; }
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

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    draggingRef.current = true;
    dragMovedRef.current = false;
    setDragging(true);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };
  const handlePointerMove = (e: PointerEvent) => {
    if (!draggingRef.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const overRow = el?.closest('[data-habit-key]') as HTMLElement | null;
    // Highlight whichever row is currently under the pointer so it's clear where the
    // dragged habit will land, clearing any previous highlight first.
    document.querySelectorAll('[data-habit-key]').forEach(r => r.classList.remove('ring-2', 'ring-blue-400', 'ring-inset'));
    if (overRow && overRow.dataset.habitKey !== habit.id) {
      dragMovedRef.current = true;
      overRow.classList.add('ring-2', 'ring-blue-400', 'ring-inset');
    }
  };
  const handlePointerUp = (e: PointerEvent) => {
    const moved = dragMovedRef.current;
    draggingRef.current = false;
    setDragging(false);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    document.querySelectorAll('[data-habit-key]').forEach(r => r.classList.remove('ring-2', 'ring-blue-400', 'ring-inset'));
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const overId = (el?.closest('[data-habit-key]') as HTMLElement | null)?.dataset.habitKey;
    if (moved && overId && overId !== habit.id) onReorder(overId);
    else toggleEditor();
  };

  return (
    <div
      data-habit-key={habit.id}
      className={`card p-0 overflow-hidden transition-opacity ${dragging ? 'opacity-60' : ''}`}
    >
      <div
        onPointerDown={handlePointerDown}
        className="relative h-12 select-none cursor-pointer"
        style={{ background: '#1E293B', touchAction: 'none' }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.max(pct, pct > 0 ? 6 : 0)}%`, background: hexToRgba(habit.color, 0.3) }}
        />
        {pct > 0 && pct < 100 && (
          <div
            className="absolute top-1/2 rounded-full blur-md pointer-events-none"
            style={{
              left: `${pct}%`, width: 22, height: 22, transform: 'translate(-50%, -50%)',
              background: hexToRgba(habit.color, 0.45),
            }}
          />
        )}

        <div className="relative z-10 h-full flex items-center justify-between px-3 gap-2">
          <span className="text-sm font-semibold text-white truncate min-w-0 flex-1">{habit.name}</span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] text-[#94A3B8] hidden sm:inline">{sum}/{periodTarget} · {periodLabel}</span>
            <button
              onClick={e => { e.stopPropagation(); onDecrement(); }}
              onPointerDown={e => e.stopPropagation()}
              disabled={todayCount <= 0}
              aria-label="Remove one for today"
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-black/25 text-white hover:bg-black/40 disabled:opacity-30"
            >
              −
            </button>
            <span className="text-xs font-semibold text-white w-3 text-center">{todayCount}</span>
            <button
              onClick={e => { e.stopPropagation(); onIncrement(); }}
              onPointerDown={e => e.stopPropagation()}
              aria-label="Add one for today"
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-black/25 text-white hover:bg-black/40"
            >
              +
            </button>
            <button
              onClick={e => { e.stopPropagation(); toggleEditor(); }}
              onPointerDown={e => e.stopPropagation()}
              aria-label="Edit habit"
              className="w-5 h-5 rounded-full flex items-center justify-center text-white/70 hover:text-white bg-black/25 hover:bg-black/40"
            >
              <PencilIcon />
            </button>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: hexToRgba(habit.color, 0.9), color: '#0F172A' }}
            >
              {pct}%
            </span>
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
            <button onClick={onArchive} className="text-sm text-red-400 hover:text-red-300 px-2">Archive</button>
          </div>
        </div>
      )}
    </div>
  );
}
