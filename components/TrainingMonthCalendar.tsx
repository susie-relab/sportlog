'use client';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Activity, ExerciseType, activityEmoji, EXERCISE_TYPE_LABELS } from '@/types';
import { formatDuration, formatDistance } from '@/lib/utils';
import { PlanRecord, Session, todaysSession } from '@/lib/runPlanGenerator';

interface Props {
  activities: Activity[];
  plans: PlanRecord[];
  todayISO: string;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function addMonths(year: number, month0: number, n: number): [number, number] {
  const total = year * 12 + month0 + n;
  return [Math.floor(total / 12), ((total % 12) + 12) % 12];
}

/** Every non-rest session scheduled for `date` across the user's active plans — expands
 *  combined `parts` into separate entries so a merged multi-session day shows each one. */
function plannedSessionsFor(plans: PlanRecord[], date: string): Session[] {
  const out: Session[] = [];
  for (const plan of plans) {
    if (!plan.active) continue;
    const result = todaysSession(plan, date);
    if (!result || result.session.beforeStart) continue;
    const parts = result.session.parts && result.session.parts.length > 0 ? result.session.parts : [result.session];
    for (const s of parts) {
      if (s.type !== 'rest') out.push(s);
    }
  }
  return out;
}

function sessionEmoji(s: Session): string {
  return activityEmoji((s.exerciseType as ExerciseType) || 'run', s.subType);
}

/** Combined training month calendar — past days show a small icon per activity actually
 *  logged that day, upcoming days (up to 3 months out) show icons for whatever the active
 *  plan(s) have scheduled. Tapping a day opens a detail popover; navigation is unlimited
 *  into the past and capped 3 months into the future, with a "Today" shortcut. */
export default function TrainingMonthCalendar({ activities, plans, todayISO }: Props) {
  const todayYear = Number(todayISO.slice(0, 4));
  const todayMonth0 = Number(todayISO.slice(5, 7)) - 1;
  const [[year, month0], setYm] = useState<[number, number]>([todayYear, todayMonth0]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [maxYear, maxMonth0] = addMonths(todayYear, todayMonth0, 3);
  const canGoNext = year < maxYear || (year === maxYear && month0 < maxMonth0);

  const activitiesByDate = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const a of activities) {
      if (!map.has(a.date)) map.set(a.date, []);
      map.get(a.date)!.push(a);
    }
    return map;
  }, [activities]);

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

  // Functional updates (reading the previous [year, month0] rather than the closed-over
  // render-time values) so rapid repeated clicks each advance from the latest pending state
  // instead of all computing from the same stale month — React batches same-tick setState
  // calls, so a naive `if (month0 === 0)` here would make 5 quick clicks behave like 1.
  const goPrevMonth = () => {
    setYm(([y, m]) => m === 0 ? [y - 1, 11] : [y, m - 1]);
  };
  const goNextMonth = () => {
    setYm(([y, m]) => {
      const atMax = y > maxYear || (y === maxYear && m >= maxMonth0);
      if (atMax) return [y, m];
      return m === 11 ? [y + 1, 0] : [y, m + 1];
    });
  };
  const goToday = () => setYm([todayYear, todayMonth0]);

  const iconsForDate = (date: string): { emoji: string; label: string }[] => {
    if (date <= todayISO) {
      return (activitiesByDate.get(date) || []).map(a => ({
        emoji: activityEmoji(a.exercise_type, a.sub_type),
        label: a.name || EXERCISE_TYPE_LABELS[a.exercise_type],
      }));
    }
    return plannedSessionsFor(plans, date).map(s => ({ emoji: sessionEmoji(s), label: s.title }));
  };

  const selectedActivities = selectedDate && selectedDate <= todayISO ? (activitiesByDate.get(selectedDate) || []) : [];
  const selectedSessions = selectedDate && selectedDate > todayISO ? plannedSessionsFor(plans, selectedDate) : [];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <button onClick={goPrevMonth} className="p-1.5 rounded-lg hover:bg-[#334155] text-[#94A3B8]"><ChevronLeft size={18} /></button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{MONTH_NAMES[month0]} {year}</span>
          {(year !== todayYear || month0 !== todayMonth0) && (
            <button onClick={goToday} className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border border-[#334155] text-[#94A3B8] hover:border-blue-500 hover:text-white">Today</button>
          )}
        </div>
        <button onClick={goNextMonth} disabled={!canGoNext} className="p-1.5 rounded-lg hover:bg-[#334155] text-[#94A3B8] disabled:opacity-20 disabled:hover:bg-transparent"><ChevronRight size={18} /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_HEADERS.map(w => (
          <div key={w} className="text-center text-[10px] font-medium text-[#64748B]">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} />;
          const icons = iconsForDate(date);
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
              <span className="text-[9px] text-[#64748B] flex-shrink-0">{dayNum}</span>
              <div className="flex-1 flex flex-wrap items-center justify-center content-center gap-0.5 overflow-hidden text-[10px] leading-none sm:text-base">
                {icons.slice(0, 6).map((icon, idx) => <span key={idx}>{icon.emoji}</span>)}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={() => setSelectedDate(null)}>
          <div className="card w-full sm:w-96 max-h-[70vh] overflow-y-auto rounded-b-none sm:rounded-b-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">{selectedDate}{selectedDate === todayISO ? ' (Today)' : ''}</span>
              <button onClick={() => setSelectedDate(null)} className="p-1 rounded-lg hover:bg-[#334155] text-[#94A3B8]"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-2">
              {selectedDate <= todayISO ? (
                selectedActivities.length > 0 ? selectedActivities.map(a => (
                  <div key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[#334155]">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-base flex-shrink-0">{activityEmoji(a.exercise_type, a.sub_type)}</span>
                      <span className="text-sm text-white truncate">{a.name || EXERCISE_TYPE_LABELS[a.exercise_type]}</span>
                    </span>
                    <span className="text-xs font-medium text-[#94A3B8] flex-shrink-0">
                      {a.distance_km ? formatDistance(a.distance_km, a.exercise_type) : formatDuration(a.duration_minutes, a.duration_seconds)}
                    </span>
                  </div>
                )) : <p className="text-xs text-[#64748B]">Nothing logged this day.</p>
              ) : (
                selectedSessions.length > 0 ? selectedSessions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[#334155]">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-base flex-shrink-0">{sessionEmoji(s)}</span>
                      <span className="text-sm text-white truncate">{s.title}</span>
                    </span>
                    <span className="text-xs font-medium text-[#94A3B8] flex-shrink-0">
                      {s.repLabel || (s.distanceKm ? `${s.distanceKm}km` : s.timeMin ? formatDuration(s.timeMin) : '')}
                    </span>
                  </div>
                )) : <p className="text-xs text-[#64748B]">Nothing planned this day.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
