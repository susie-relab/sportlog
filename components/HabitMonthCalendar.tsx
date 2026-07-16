'use client';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Habit, HabitLog, isHabitScheduledOn } from '@/types';
import { todayLocalISO } from '@/lib/utils';
import { completionRatio, isFailedLog, isSkippedLog } from '@/lib/habitStats';

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

/** Side length of the square grid the circles are arranged in — e.g. 1-2 habits is a 1x1
 *  grid (one big circle each), up to 49 is a 7x7 grid of tiny ones. Using an actual CSS grid
 *  (below) rather than fixed pixel sizes means the circles always scale to completely fill
 *  whatever room the day cell actually has, at any viewport size. */
function gridSizeForCount(habitCount: number): number {
  return Math.min(7, Math.max(1, Math.ceil(Math.sqrt(habitCount))));
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
  const gridSize = gridSizeForCount(habits.length);

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
              className={`relative aspect-square rounded-lg border overflow-hidden ${
                isToday ? 'border-blue-500 bg-[#1E293B]' : 'border-[#334155] bg-[#0F172A]/40 hover:border-[#475569]'
              }`}
            >
              <span className="absolute top-0.5 left-1 text-[9px] text-[#64748B] leading-tight z-10 pointer-events-none">{dayNum}</span>
              {/* Absolutely filling the button (not a flex sibling of the day-number label) so
                  this grid is always exactly as wide as it is tall — otherwise the rows and
                  columns divide up slightly different amounts of space and the circles come
                  out as ovals with a gap at the bottom instead of true circles filling the cell. */}
              <div
                className="absolute inset-0 grid"
                style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, gridTemplateRows: `repeat(${gridSize}, 1fr)`, gap: 1, padding: 3 }}
              >
                {scheduled.slice(0, 49).map(h => {
                  const log = logsByHabitDate.get(`${h.id}|${date}`);
                  const ratio = completionRatio(h, log);
                  const failed = isFailedLog(log);
                  const skipped = isSkippedLog(log);
                  return (
                    <div key={h.id} className="flex items-center justify-center min-w-0 min-h-0 p-px">
                      {failed ? (
                        <span
                          className="rounded-full w-full h-full flex items-center justify-center leading-none font-bold text-black"
                          style={{ background: '#E2E8F0', border: `1px solid ${h.color}`, fontSize: '80%' }}
                        >
                          ×
                        </span>
                      ) : skipped ? (
                        <span
                          className="rounded-full w-full h-full flex items-center justify-center leading-none font-bold text-white"
                          style={{ background: '#475569', border: `1px solid ${h.color}`, fontSize: '80%' }}
                        >
                          –
                        </span>
                      ) : (
                        <span
                          className="rounded-full w-full h-full"
                          style={{
                            background: ratio > 0 ? hexToRgba(h.color, Math.max(0.25, ratio)) : 'transparent',
                            border: `1px solid ${h.color}`,
                          }}
                        />
                      )}
                    </div>
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
                const failed = isFailedLog(log);
                const skipped = isSkippedLog(log);
                const count = (failed || skipped) ? 0 : (log?.count ?? 0);
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
                    <span className="text-xs font-medium text-[#94A3B8] flex-shrink-0">{failed ? "Didn't happen" : skipped ? 'Skipped' : `${count}/${h.target_per_period}`}</span>
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
