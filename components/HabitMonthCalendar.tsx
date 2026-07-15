'use client';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Habit, HabitLog, isHabitScheduledOn } from '@/types';
import { todayLocalISO } from '@/lib/utils';
import { completionRatio } from '@/lib/habitStats';

interface Props {
  habits: Habit[];
  logs: HabitLog[];
  onCycle: (habit: Habit, date: string) => void;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '');
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Circle diameter (px) for a given side length of the square grid the circles are arranged
 *  in — e.g. a 1x1 grid (just 1-2 habits) gets big circles, a 7x7 grid (up to 49) gets tiny
 *  ones, so the day cell always looks "full" regardless of how many habits exist. */
const CIRCLE_SIZE_BY_GRID: Record<number, number> = { 1: 22, 2: 18, 3: 13, 4: 10, 5: 8, 6: 6.5, 7: 5.5 };
function circleSizeForCount(habitCount: number): number {
  const gridSize = Math.min(7, Math.max(1, Math.ceil(Math.sqrt(habitCount))));
  return CIRCLE_SIZE_BY_GRID[gridSize] || 5;
}

/** Combined month calendar — every scheduled habit shows as a small density-filled
 *  circle in its day cell. Tapping a day opens a popover to tap-cycle each habit. */
export default function HabitMonthCalendar({ habits, logs, onCycle }: Props) {
  const todayISO = todayLocalISO();
  const [year, setYear] = useState(Number(todayISO.slice(0, 4)));
  const [month0, setMonth0] = useState(Number(todayISO.slice(5, 7)) - 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const logsByHabitDate = useMemo(() => {
    const map = new Map<string, HabitLog>();
    for (const l of logs) map.set(`${l.habit_id}|${l.date}`, l);
    return map;
  }, [logs]);

  const cells = useMemo(() => {
    const firstOfMonth = new Date(year, month0, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-start
    const daysInMonth = new Date(year, month0 + 1, 0).getDate();
    const out: (string | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push(`${year}-${String(month0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return out;
  }, [year, month0]);

  const goPrevMonth = () => {
    if (month0 === 0) { setYear(y => y - 1); setMonth0(11); } else setMonth0(m => m - 1);
  };
  const goNextMonth = () => {
    if (month0 === 11) { setYear(y => y + 1); setMonth0(0); } else setMonth0(m => m + 1);
  };

  const habitsForDate = (date: string) => habits.filter(h => isHabitScheduledOn(h, date));
  const circleSize = circleSizeForCount(habits.length);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <button onClick={goPrevMonth} className="p-1.5 rounded-lg hover:bg-[#334155] text-[#94A3B8]"><ChevronLeft size={18} /></button>
        <span className="text-sm font-semibold text-white">{MONTH_NAMES[month0]} {year}</span>
        <button onClick={goNextMonth} className="p-1.5 rounded-lg hover:bg-[#334155] text-[#94A3B8]"><ChevronRight size={18} /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_HEADERS.map(w => (
          <div key={w} className="text-center text-[10px] font-medium text-[#64748B]">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} />;
          const scheduled = habitsForDate(date);
          const dayNum = Number(date.slice(8, 10));
          const isToday = date === todayISO;
          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`aspect-square rounded-lg border p-1 flex flex-col items-center gap-0.5 overflow-hidden ${
                isToday ? 'border-blue-500 bg-[#1E293B]' : 'border-[#334155] bg-[#0F172A]/40 hover:border-[#475569]'
              }`}
            >
              <span className="text-[9px] text-[#64748B]">{dayNum}</span>
              <div className="flex flex-wrap items-center justify-center gap-[2px] overflow-hidden">
                {scheduled.slice(0, 49).map(h => {
                  const log = logsByHabitDate.get(`${h.id}|${date}`);
                  const ratio = completionRatio(h, log);
                  return (
                    <span
                      key={h.id}
                      className="rounded-full flex-shrink-0"
                      style={{
                        width: circleSize, height: circleSize,
                        background: ratio > 0 ? hexToRgba(h.color, Math.max(0.25, ratio)) : 'transparent',
                        border: `1px solid ${h.color}`,
                      }}
                    />
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={() => setSelectedDate(null)}>
          <div className="card w-full sm:w-96 max-h-[70vh] overflow-y-auto rounded-b-none sm:rounded-b-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">{selectedDate}</span>
              <button onClick={() => setSelectedDate(null)} className="p-1 rounded-lg hover:bg-[#334155] text-[#94A3B8]"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-2">
              {habitsForDate(selectedDate).map(h => {
                const log = logsByHabitDate.get(`${h.id}|${selectedDate}`);
                const count = log?.count ?? 0;
                const ratio = completionRatio(h, log);
                return (
                  <button
                    key={h.id}
                    onClick={() => onCycle(h, selectedDate)}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[#334155] hover:border-[#475569] text-left"
                    style={{ background: ratio > 0 ? hexToRgba(h.color, Math.max(0.12, ratio * 0.3)) : 'transparent' }}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: h.color }} />
                      <span className="text-sm text-white truncate">{h.name}</span>
                    </span>
                    <span className="text-xs font-medium text-[#94A3B8] flex-shrink-0">{count}/{h.target_per_period}</span>
                  </button>
                );
              })}
              {habitsForDate(selectedDate).length === 0 && (
                <p className="text-xs text-[#64748B]">No habits scheduled this day.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
