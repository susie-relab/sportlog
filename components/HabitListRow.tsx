'use client';
import { Habit, HabitLog, isHabitScheduledOn } from '@/types';
import { todayLocalISO } from '@/lib/utils';
import { getWeekDays, completionRatio, completionPctInRange } from '@/lib/habitStats';

interface Props {
  habit: Habit;
  logs: HabitLog[];
  onCycle: (date: string) => void;
  onSelect: () => void;
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '');
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** One habit as a progress-bar row: a % badge, a week of check/circle day-ticks, and the
 *  whole row tinted by the habit's colour at an opacity matching this week's completion. */
export default function HabitListRow({ habit, logs, onCycle, onSelect }: Props) {
  const todayISO = todayLocalISO();
  const weekDays = getWeekDays(todayISO);
  const logsByDate = new Map(logs.map(l => [l.date, l]));
  const pct = completionPctInRange(habit, logs, weekDays[0], weekDays[6]);

  return (
    <div
      onClick={onSelect}
      className="card cursor-pointer flex items-center gap-3 transition-colors"
      style={{ background: pct > 0 ? hexToRgba(habit.color, Math.min(0.85, 0.15 + pct / 130)) : undefined }}
    >
      <div
        className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-[11px] font-bold"
        style={{ background: hexToRgba(habit.color, 0.9), color: '#0F172A' }}
      >
        {pct}%
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate mb-1.5">{habit.name}</p>
        <div className="flex gap-1.5">
          {weekDays.map(date => {
            const scheduled = isHabitScheduledOn(habit, date);
            const log = logsByDate.get(date);
            const ratio = completionRatio(habit, log);
            const done = ratio >= 1;
            const isToday = date === todayISO;
            return (
              <button
                key={date}
                onClick={e => { e.stopPropagation(); if (scheduled) onCycle(date); }}
                disabled={!scheduled}
                title={`${date}${log ? ` — ${log.count}/${habit.target_per_period}` : ''}`}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 border transition-transform ${
                  !scheduled ? 'opacity-20 cursor-default border-transparent' : 'hover:scale-110'
                } ${isToday ? 'ring-1 ring-white/60' : ''}`}
                style={{
                  background: done ? '#fff' : ratio > 0 ? hexToRgba('#ffffff', 0.3) : 'rgba(255,255,255,0.08)',
                  borderColor: scheduled ? 'rgba(255,255,255,0.25)' : 'transparent',
                  color: habit.color,
                }}
              >
                {done ? '✓' : '○'}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
