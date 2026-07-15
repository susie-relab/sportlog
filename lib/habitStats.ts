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

/** The current goal period's inclusive [start, end] date range for a habit, based on its
 *  frequency_type — e.g. just today for 'daily', the calendar week for 'weekly', a rolling
 *  window for 'every_n_days', etc. Anchored to `todayISO`. */
export function currentPeriodRange(habit: Habit, todayISO: string): [string, string] {
  switch (habit.frequency_type) {
    case 'weekly': {
      const days = getWeekDays(todayISO);
      return [days[0], days[6]];
    }
    case 'fortnightly':
      return [addDaysISO(todayISO, -13), todayISO];
    case 'monthly': {
      const year = Number(todayISO.slice(0, 4));
      const month0 = Number(todayISO.slice(5, 7)) - 1;
      const days = getMonthDays(year, month0);
      return [days[0], days[days.length - 1]];
    }
    case 'every_n_days': {
      const n = habit.frequency_interval_days || 2;
      return [addDaysISO(todayISO, -(n - 1)), todayISO];
    }
    default: // daily & custom_days — a single day's goal
      return [todayISO, todayISO];
  }
}

/** How many times a habit is expected to come up within a 7-day week, used to scale its
 *  per-occurrence target up to a weekly planned total. */
function occurrencesPerWeek(habit: Habit, weekDays: string[]): number {
  switch (habit.frequency_type) {
    case 'custom_days':
      return weekDays.filter(d => isHabitScheduledOn(habit, d)).length;
    case 'every_n_days':
      return Math.ceil(7 / (habit.frequency_interval_days || 2));
    case 'weekly':
      return 1;
    default: // daily
      return 7;
  }
}

/** Progress toward the habit's planned total for the current tracking window: fortnightly and
 *  monthly habits track toward their own fortnight/month goal, but every other frequency
 *  (daily, every N days, weekly, specific days) tracks toward a planned WEEKLY total — the
 *  per-occurrence target scaled up by how many times it's expected to come up this week. */
export function periodProgress(habit: Habit, logs: HabitLog[], todayISO: string): { pct: number; sum: number; target: number; start: string; end: string; periodLabel: 'week' | 'fortnight' | 'month' } {
  const logsByDate = new Map(logs.map(l => [l.date, l]));
  const sumRange = (start: string, end: string) => {
    let sum = 0;
    let cursor = start;
    while (cursor <= end) {
      sum += logsByDate.get(cursor)?.count || 0;
      cursor = addDaysISO(cursor, 1);
    }
    return sum;
  };

  if (habit.frequency_type === 'fortnightly' || habit.frequency_type === 'monthly') {
    const [start, end] = currentPeriodRange(habit, todayISO);
    const sum = sumRange(start, end);
    const target = habit.target_per_period;
    const pct = target > 0 ? Math.min(100, Math.round((sum / target) * 100)) : 0;
    return { pct, sum, target, start, end, periodLabel: habit.frequency_type === 'fortnightly' ? 'fortnight' : 'month' };
  }

  const weekDays = getWeekDays(todayISO);
  const start = weekDays[0], end = weekDays[6];
  const sum = sumRange(start, end);
  const target = habit.target_per_period * occurrencesPerWeek(habit, weekDays);
  const pct = target > 0 ? Math.min(100, Math.round((sum / target) * 100)) : 0;
  return { pct, sum, target, start, end, periodLabel: 'week' };
}

export interface HabitDayStats {
  currentStreak: number;
  longestStreak: number;
  daysCompleted: number;
  daysFailed: number;
  daysSkipped: number;
  daysStacked: number;
}

/** Day-by-day breakdown since the habit's first log (or today, if none yet): Completed (hit
 *  target that day), Failed (scheduled but missed), Skipped (not scheduled that day at all —
 *  e.g. an off-day for a custom-days habit), and Stacked (over-achieved beyond the target). */
export function habitDayStats(habit: Habit, logs: HabitLog[], todayISO: string): HabitDayStats {
  const logsByDate = new Map(logs.map(l => [l.date, l]));
  const sortedDates = [...logsByDate.keys()].sort();
  const startISO = sortedDates.length > 0 ? sortedDates[0] : todayISO;

  let daysCompleted = 0, daysFailed = 0, daysSkipped = 0, daysStacked = 0;
  let cursor = startISO;
  while (cursor <= todayISO) {
    const scheduled = isHabitScheduledOn(habit, cursor);
    const count = logsByDate.get(cursor)?.count || 0;
    if (!scheduled) {
      daysSkipped++;
    } else if (count >= habit.target_per_period) {
      daysCompleted++;
      if (count > habit.target_per_period) daysStacked++;
    } else {
      daysFailed++;
    }
    cursor = addDaysISO(cursor, 1);
  }

  return {
    currentStreak: currentStreak(habit, logs, todayISO),
    longestStreak: bestStreak(habit, logs),
    daysCompleted, daysFailed, daysSkipped, daysStacked,
  };
}
