'use client';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Habit, HabitLog, HabitFrequencyChange, isHabitScheduledOn } from '@/types';
import { todayLocalISO } from '@/lib/utils';
import { completionRatio, isFailedLog, isSkippedLog, isSkippableFrequency, resolveFrequencyAt } from '@/lib/habitStats';

interface Props {
  habits: Habit[];
  logs: HabitLog[];
  frequencyHistory: HabitFrequencyChange[];
  onCycle: (habit: Habit, date: string) => void;
  onMarkFailed: (habit: Habit, date: string) => void;
  onSkipForDate: (habit: Habit, date: string) => void;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TOD_ORDER: Record<string, number> = { morning: 0, daytime: 1, night: 2 };
function sortForPopover(habits: Habit[]): Habit[] {
  return [...habits].sort((a, b) => {
    const ta = TOD_ORDER[a.time_of_day ?? ''] ?? 3;
    const tb = TOD_ORDER[b.time_of_day ?? ''] ?? 3;
    if (ta !== tb) return ta - tb;
    return (a.category || '').localeCompare(b.category || '');
  });
}

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
export default function HabitMonthCalendar({ habits, logs, frequencyHistory, onCycle, onMarkFailed, onSkipForDate }: Props) {
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

  const habitsForDate = (date: string) => habits.filter(h => isHabitScheduledOn(resolveFrequencyAt(h, frequencyHistory, date), date));
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
                {/* A skipped habit's circle disappears entirely for that day — same as a habit
                    that simply isn't scheduled — rather than showing a special marker. */}
                {scheduled.filter(h => !isSkippedLog(logsByHabitDate.get(`${h.id}|${date}`))).slice(0, 49).map(h => {
                  const log = logsByHabitDate.get(`${h.id}|${date}`);
                  const ratio = completionRatio(h, log, resolveFrequencyAt(h, frequencyHistory, date).target_per_period);
                  const failed = isFailedLog(log);
                  // Once a day gets crowded (6x6 grid = 26+ habits) circles get too small for the
                  // 1px outline to read as a distinct ring, so thin it down; a tiny dark dot in the
                  // middle of any still-incomplete circle keeps "what's left today" scannable even
                  // when the colour fill alone is too small to judge at a glance.
                  const dense = gridSize >= 6;
                  return (
                    <div key={h.id} className="flex items-center justify-center min-w-0 min-h-0 p-px">
                      {failed ? (
                        <span
                          className="rounded-full w-full h-full"
                          style={{ background: '#000000', border: `${dense ? 0.5 : 1}px solid #000000` }}
                        />
                      ) : (
                        <span
                          className="relative rounded-full w-full h-full flex items-center justify-center"
                          style={{
                            background: ratio > 0 ? hexToRgba(h.color, Math.max(0.25, ratio)) : 'transparent',
                            border: `${dense ? 0.5 : 1}px solid ${h.color}`,
                          }}
                        >
                          {dense && ratio === 0 && (
                            <span className="rounded-full bg-black/70" style={{ width: '30%', height: '30%' }} />
                          )}
                        </span>
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
            {(() => {
              const allScheduled = habitsForDate(selectedDate);
              const active = sortForPopover(allScheduled.filter(h => !isSkippedLog(logsByHabitDate.get(`${h.id}|${selectedDate}`))));
              const skippedHabits = sortForPopover(allScheduled.filter(h => isSkippedLog(logsByHabitDate.get(`${h.id}|${selectedDate}`))));
              const isFuture = selectedDate > todayISO;
              const renderHabitRow = (h: Habit, forceSkipped = false) => {
                const log = logsByHabitDate.get(`${h.id}|${selectedDate}`);
                const failed = isFailedLog(log);
                const skipped = forceSkipped || isSkippedLog(log);
                const count = (failed || skipped) ? 0 : (log?.count ?? 0);
                const dayTarget = resolveFrequencyAt(h, frequencyHistory, selectedDate).target_per_period;
                const ratio = completionRatio(h, log, dayTarget);
                const complete = !skipped && ratio >= 1;
                const locked = failed || skipped;
                const canSkip = isSkippableFrequency(h.frequency_type);
                return (
                  <div
                    key={h.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[#334155]"
                    style={{ background: complete ? h.color : ratio > 0 && !skipped ? hexToRgba(h.color, Math.max(0.12, ratio * 0.3)) : 'transparent' }}
                  >
                    <button
                      onClick={() => { if (!locked && !complete) onCycle(h, selectedDate); }}
                      disabled={locked || complete || isFuture}
                      className={`flex items-center gap-2 min-w-0 flex-1 text-left ${(locked || complete || isFuture) ? 'cursor-default' : 'hover:opacity-80'}`}
                    >
                      {!complete && (
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: h.color }} />
                      )}
                      <span className={`text-sm truncate ${complete ? 'text-white font-semibold' : skipped ? 'text-[#64748B] italic' : 'text-white'}`}>{h.name}</span>
                    </button>
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      {locked ? (
                        <span className={`text-xs font-medium ${failed ? 'text-red-400' : 'text-[#64748B]'}`}>
                          {failed ? "Didn't happen" : 'Skipped'}
                        </span>
                      ) : (
                        <>
                          <span className={`text-xs font-medium ${complete ? 'text-white/90' : 'text-[#94A3B8]'}`}>
                            {`${count}/${dayTarget}`}
                          </span>
                          {!isFuture && (
                            <>
                              <button
                                onClick={() => onMarkFailed(h, selectedDate)}
                                className="w-5 h-5 rounded-full bg-black/25 text-white/70 hover:bg-red-500/70 hover:text-white flex items-center justify-center text-xs font-bold"
                                aria-label="Didn't happen"
                                title="Didn't happen"
                              >×</button>
                              {canSkip && (
                                <button
                                  onClick={() => onSkipForDate(h, selectedDate)}
                                  className="w-5 h-5 rounded-full bg-black/25 text-white/70 hover:bg-slate-500/70 hover:text-white flex items-center justify-center"
                                  aria-label="Skip"
                                  title="Skip"
                                >
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                                </button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                );
              };
              return (
                <div className="flex flex-col gap-2">
                  {active.map(h => renderHabitRow(h))}
                  {skippedHabits.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 my-1">
                        <div className="flex-1 border-t border-[#334155]" />
                        <span className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide">Skipped</span>
                        <div className="flex-1 border-t border-[#334155]" />
                      </div>
                      {skippedHabits.map(h => renderHabitRow(h, true))}
                    </>
                  )}
                  {allScheduled.length === 0 && (
                    <p className="text-xs text-[#64748B]">No habits scheduled this day.</p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
