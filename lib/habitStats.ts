import { Habit, HabitLog, isHabitScheduledOn } from '@/types';

/** Add N days to a local YYYY-MM-DD date, staying in local calendar dates. */
export function addDaysISO(dateISO: string, n: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/** Every local calendar date (YYYY-MM-DD) in a given month, oldest first. */
export function getMonthDays(year: number, month0: number): string[] {
  const days: string[] = [];
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(`${year}-${String(month0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

/** The 7 local dates (oldest first) of the calendar week containing `dateISO`, Monday-start. */
export function getWeekDays(dateISO: string): string[] {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = addDaysISO(dateISO, diff);
  return Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
}

/** 0..1 completion ratio for one habit on one day, from its log count vs its target. */
export function completionRatio(habit: Habit, log: HabitLog | undefined): number {
  if (!log || habit.target_per_period <= 0) return 0;
  return Math.min(1, log.count / habit.target_per_period);
}

const isDone = (habit: Habit, logsByDate: Map<string, HabitLog>, dateISO: string) => {
  const log = logsByDate.get(dateISO);
  return !!log && log.count >= habit.target_per_period;
};

/** Current consecutive-day streak of fully-completed scheduled days, walking backward from
 *  today. A day the habit isn't scheduled on doesn't break the streak, it's just skipped. */
export function currentStreak(habit: Habit, logs: HabitLog[], todayISO: string): number {
  const logsByDate = new Map(logs.map(l => [l.date, l]));
  let streak = 0;
  let cursor = todayISO;
  // Today doesn't have to be done yet to keep a streak alive from yesterday.
  if (isHabitScheduledOn(habit, cursor) && !isDone(habit, logsByDate, cursor)) {
    cursor = addDaysISO(cursor, -1);
  }
  for (let i = 0; i < 3650; i++) {
    if (!isHabitScheduledOn(habit, cursor)) { cursor = addDaysISO(cursor, -1); continue; }
    if (!isDone(habit, logsByDate, cursor)) break;
    streak++;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

/** Longest-ever streak of fully-completed scheduled days across all logged history. */
export function bestStreak(habit: Habit, logs: HabitLog[]): number {
  if (logs.length === 0) return 0;
  const logsByDate = new Map(logs.map(l => [l.date, l]));
  const sortedDates = [...logsByDate.keys()].sort();
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];
  let best = 0, running = 0;
  let cursor = firstDate;
  while (cursor <= lastDate) {
    if (!isHabitScheduledOn(habit, cursor)) { cursor = addDaysISO(cursor, 1); continue; }
    if (isDone(habit, logsByDate, cursor)) {
      running++;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
    cursor = addDaysISO(cursor, 1);
  }
  return best;
}

/** Total completions logged (sum of counts, not just days done) across all history. */
export function totalCompletions(logs: HabitLog[]): number {
  return logs.reduce((s, l) => s + l.count, 0);
}

/** % of scheduled days fully completed within an inclusive date range. */
export function completionPctInRange(habit: Habit, logs: HabitLog[], startISO: string, endISO: string): number {
  const logsByDate = new Map(logs.map(l => [l.date, l]));
  let scheduled = 0, done = 0;
  let cursor = startISO;
  while (cursor <= endISO) {
    if (isHabitScheduledOn(habit, cursor)) {
      scheduled++;
      if (isDone(habit, logsByDate, cursor)) done++;
    }
    cursor = addDaysISO(cursor, 1);
  }
  return scheduled > 0 ? Math.round((done / scheduled) * 100) : 0;
}
