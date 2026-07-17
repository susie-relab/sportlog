import { Habit, HabitLog, HabitFrequencyChange, HabitFrequencyConfig, isHabitScheduledOn } from '@/types';

/** Which frequency/target was actually in effect for a habit on a given date — the latest
 *  history row with effective_date <= dateISO, or the habit's own current fields if it's
 *  never had a frequency change (or the date predates any recorded change). This is what
 *  lets a switch from "5/7 days in winter" to "7/7 in summer" judge past winter days against
 *  5/7 while today judges against 7/7, instead of one setting silently rewriting the past. */
export function resolveFrequencyAt(habit: Habit, history: HabitFrequencyChange[], dateISO: string): HabitFrequencyConfig {
  let latest: HabitFrequencyChange | null = null;
  for (const h of history) {
    if (h.habit_id !== habit.id) continue;
    if (h.effective_date <= dateISO && (!latest || h.effective_date > latest.effective_date)) latest = h;
  }
  if (!latest) return habit;
  return {
    frequency_type: latest.frequency_type,
    frequency_days: latest.frequency_days,
    frequency_interval_days: latest.frequency_interval_days,
    target_per_period: latest.target_per_period,
    // A backdated frequency change (effective_date before the habit's own start_date)
    // must still make the habit eligible from that date on — otherwise isHabitScheduledOn's
    // start_date gate silently discards a history row that was explicitly applied to the past.
    start_date: habit.start_date && habit.start_date < latest.effective_date ? habit.start_date : latest.effective_date,
  };
}

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

/** 0..1 completion ratio for one habit on one day, from its log count vs its target — pass
 *  `targetOverride` (from resolveFrequencyAt) to judge a past day against the target that was
 *  actually in effect then, instead of the habit's current target. */
export function completionRatio(habit: Habit, log: HabitLog | undefined, targetOverride?: number): number {
  const target = targetOverride ?? habit.target_per_period;
  if (!log || target <= 0) return 0;
  return Math.max(0, Math.min(1, log.count / target));
}

/** A day explicitly marked "didn't happen" — stored as the sentinel count -1, distinct from
 *  a day that's simply unlogged so far. Failed days still count as a miss for streaks/stats
 *  (see the `< target` checks below), this only changes what the UI shows for that day. */
export function isFailedLog(log: HabitLog | undefined): boolean {
  return log?.count === -1;
}

/** A day explicitly "skipped" — stored as the sentinel count -2. Unlike a fail, a skip is an
 *  excused absence: it doesn't break a streak or use up the streak freeze, same as a day the
 *  habit isn't scheduled on at all. */
export function isSkippedLog(log: HabitLog | undefined): boolean {
  return log?.count === -2;
}

const isDoneAt = (target: number, logsByDate: Map<string, HabitLog>, dateISO: string) => {
  const log = logsByDate.get(dateISO);
  return !!log && log.count >= target;
};

/** A fixed Monday used to bucket fortnightly/every-N-days habits into stable, non-overlapping
 *  periods that tile consistently across history (any Monday works — it's just an anchor). */
const PERIOD_EPOCH_MONDAY = '2020-01-06';

function daysBetweenISO(aISO: string, bISO: string): number {
  const [ay, am, ad] = aISO.split('-').map(Number);
  const [by, bm, bd] = bISO.split('-').map(Number);
  return Math.round((new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / 86400000);
}

const isPeriodBasedType = (freq: HabitFrequencyConfig['frequency_type']) =>
  freq === 'weekly' || freq === 'fortnightly' || freq === 'monthly' || freq === 'every_n_days';

/** The stable, non-overlapping period [start, end] containing dateISO for a period-based
 *  habit (weekly/fortnightly/monthly/every_n_days) — e.g. "3 times a week" is judged against
 *  the whole calendar week's total, not each individual day, so a single "didn't happen" day
 *  doesn't wrongly break a streak the user already made up elsewhere in the same period. */
function periodBoundsFor(cfg: HabitFrequencyConfig, dateISO: string): [string, string] {
  switch (cfg.frequency_type) {
    case 'weekly': {
      const days = getWeekDays(dateISO);
      return [days[0], days[6]];
    }
    case 'monthly': {
      const year = Number(dateISO.slice(0, 4));
      const month0 = Number(dateISO.slice(5, 7)) - 1;
      const days = getMonthDays(year, month0);
      return [days[0], days[days.length - 1]];
    }
    case 'fortnightly': {
      const offset = daysBetweenISO(PERIOD_EPOCH_MONDAY, dateISO);
      const blockStart = addDaysISO(PERIOD_EPOCH_MONDAY, Math.floor(offset / 14) * 14);
      return [blockStart, addDaysISO(blockStart, 13)];
    }
    case 'every_n_days': {
      const n = cfg.frequency_interval_days || 2;
      const offset = daysBetweenISO(PERIOD_EPOCH_MONDAY, dateISO);
      const blockStart = addDaysISO(PERIOD_EPOCH_MONDAY, Math.floor(offset / n) * n);
      return [blockStart, addDaysISO(blockStart, n - 1)];
    }
    default:
      return [dateISO, dateISO];
  }
}

function periodSum(logsByDate: Map<string, HabitLog>, start: string, end: string): number {
  let sum = 0;
  let cursor = start;
  while (cursor <= end) {
    sum += Math.max(0, logsByDate.get(cursor)?.count || 0);
    cursor = addDaysISO(cursor, 1);
  }
  return sum;
}

/** Current consecutive-PERIOD streak for a period-based habit (weekly/fortnightly/monthly/
 *  every_n_days) — a period counts if its total logged sum met the target, regardless of how
 *  that total was distributed across its days. Mirrors the daily currentStreak's rules: the
 *  in-progress period doesn't have to be finished yet to keep the streak alive, and one missed
 *  period gets a single streak-freeze. */
function currentPeriodStreak(habit: Habit, logsByDate: Map<string, HabitLog>, todayISO: string, history: HabitFrequencyChange[]): number {
  const todayCfg = resolveFrequencyAt(habit, history, todayISO);
  const [todayStart, todayEnd] = periodBoundsFor(todayCfg, todayISO);
  const sumSoFar = periodSum(logsByDate, todayStart, todayISO);
  let cursor = sumSoFar < todayCfg.target_per_period ? addDaysISO(todayStart, -1) : todayEnd;

  let streak = 0;
  let freezesLeft = 1;
  for (let i = 0; i < 520; i++) {
    const cfg = resolveFrequencyAt(habit, history, cursor);
    const [start, end] = periodBoundsFor(cfg, cursor);
    const sum = periodSum(logsByDate, start, end);
    if (sum >= cfg.target_per_period) {
      streak++;
    } else if (freezesLeft > 0) {
      freezesLeft--;
    } else {
      break;
    }
    cursor = addDaysISO(start, -1);
  }
  return streak;
}

/** Longest-ever consecutive-PERIOD streak for a period-based habit — same "judge the whole
 *  period's total, not each day" rule as currentPeriodStreak, but no streak-freeze (matching
 *  bestStreak's day-based equivalent, which also doesn't apply a freeze). */
function bestPeriodStreak(habit: Habit, logsByDate: Map<string, HabitLog>, sortedDates: string[], history: HabitFrequencyChange[]): number {
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];
  let best = 0, running = 0;
  const seenPeriodStarts = new Set<string>();
  let cursor = firstDate;
  while (cursor <= lastDate) {
    const cfg = resolveFrequencyAt(habit, history, cursor);
    const [start, end] = periodBoundsFor(cfg, cursor);
    if (!seenPeriodStarts.has(start)) {
      seenPeriodStarts.add(start);
      const sum = periodSum(logsByDate, start, end);
      if (sum >= cfg.target_per_period) { running++; best = Math.max(best, running); }
      else running = 0;
    }
    cursor = addDaysISO(cursor, 1);
  }
  return best;
}

/** Current consecutive-day streak of fully-completed scheduled days, walking backward from
 *  today. A day the habit isn't scheduled on doesn't break the streak, it's just skipped over —
 *  and neither does a day explicitly marked "skip for today". A "streak freeze" grants one
 *  missed scheduled day of grace per streak — that single miss doesn't reset the count to 0,
 *  it just doesn't add to it either. Each day is judged against whichever frequency/target
 *  was actually in effect that day (see resolveFrequencyAt), not the habit's current settings. */
export function currentStreak(habit: Habit, logs: HabitLog[], todayISO: string, history: HabitFrequencyChange[] = []): number {
  const logsByDate = new Map(logs.map(l => [l.date, l]));
  if (isPeriodBasedType(resolveFrequencyAt(habit, history, todayISO).frequency_type)) {
    return currentPeriodStreak(habit, logsByDate, todayISO, history);
  }
  let streak = 0;
  let freezesLeft = 1;
  let cursor = todayISO;
  // Today doesn't have to be done yet to keep a streak alive from yesterday.
  const todayCfg = resolveFrequencyAt(habit, history, cursor);
  if (isHabitScheduledOn(todayCfg, cursor) && !isDoneAt(todayCfg.target_per_period, logsByDate, cursor)) {
    cursor = addDaysISO(cursor, -1);
  }
  for (let i = 0; i < 3650; i++) {
    const cfg = resolveFrequencyAt(habit, history, cursor);
    if (!isHabitScheduledOn(cfg, cursor) || isSkippedLog(logsByDate.get(cursor))) {
      cursor = addDaysISO(cursor, -1); continue;
    }
    if (!isDoneAt(cfg.target_per_period, logsByDate, cursor)) {
      if (freezesLeft > 0) { freezesLeft--; cursor = addDaysISO(cursor, -1); continue; }
      break;
    }
    streak++;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

/** Longest-ever streak of fully-completed scheduled days across all logged history. */
export function bestStreak(habit: Habit, logs: HabitLog[], history: HabitFrequencyChange[] = []): number {
  if (logs.length === 0) return 0;
  const logsByDate = new Map(logs.map(l => [l.date, l]));
  const sortedDates = [...logsByDate.keys()].sort();
  if (isPeriodBasedType(resolveFrequencyAt(habit, history, sortedDates[sortedDates.length - 1]).frequency_type)) {
    return bestPeriodStreak(habit, logsByDate, sortedDates, history);
  }
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];
  let best = 0, running = 0;
  let cursor = firstDate;
  while (cursor <= lastDate) {
    const cfg = resolveFrequencyAt(habit, history, cursor);
    if (!isHabitScheduledOn(cfg, cursor) || isSkippedLog(logsByDate.get(cursor))) { cursor = addDaysISO(cursor, 1); continue; }
    if (isDoneAt(cfg.target_per_period, logsByDate, cursor)) {
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
  return logs.reduce((s, l) => s + Math.max(0, l.count), 0);
}

/** The habit's target as shown on its stats overview — for 'custom_days' the stored
 *  target_per_period stays a per-day amount (so editing the goal doesn't need to know how
 *  many days are selected), but the overview shows the resulting weekly total instead, e.g.
 *  4/day on Mon+Tue+Wed reads as "12 / week". Every other frequency just shows its own unit. */
export function displayTarget(habit: Habit): { amount: number; unit: string } {
  if (habit.frequency_type === 'custom_days') {
    const dayCount = habit.frequency_days ? habit.frequency_days.split(',').filter(Boolean).length : 0;
    return { amount: habit.target_per_period * dayCount, unit: 'week' };
  }
  switch (habit.frequency_type) {
    case 'every_n_days': return { amount: habit.target_per_period, unit: `${habit.frequency_interval_days || 2} days` };
    case 'weekly': return { amount: habit.target_per_period, unit: 'week' };
    case 'fortnightly': return { amount: habit.target_per_period, unit: 'fortnight' };
    case 'monthly': return { amount: habit.target_per_period, unit: 'month' };
    default: return { amount: habit.target_per_period, unit: 'day' };
  }
}

/** % of scheduled days fully completed within an inclusive date range — for a period-based
 *  habit (weekly/fortnightly/monthly/every_n_days) this instead measures % of PERIODS whose
 *  total met the target, so a "3/week" habit is judged on the week's sum, not each day. */
export function completionPctInRange(habit: Habit, logs: HabitLog[], startISO: string, endISO: string, history: HabitFrequencyChange[] = []): number {
  const logsByDate = new Map(logs.map(l => [l.date, l]));

  if (isPeriodBasedType(resolveFrequencyAt(habit, history, endISO).frequency_type)) {
    let periods = 0, achieved = 0;
    const seenPeriodStarts = new Set<string>();
    let cursor = startISO;
    while (cursor <= endISO) {
      const cfg = resolveFrequencyAt(habit, history, cursor);
      if (isHabitScheduledOn(cfg, cursor)) {
        const [start, end] = periodBoundsFor(cfg, cursor);
        if (!seenPeriodStarts.has(start)) {
          seenPeriodStarts.add(start);
          periods++;
          if (periodSum(logsByDate, start, end) >= cfg.target_per_period) achieved++;
        }
      }
      cursor = addDaysISO(cursor, 1);
    }
    return periods > 0 ? Math.round((achieved / periods) * 100) : 0;
  }

  let scheduled = 0, done = 0;
  let cursor = startISO;
  while (cursor <= endISO) {
    const cfg = resolveFrequencyAt(habit, history, cursor);
    if (isHabitScheduledOn(cfg, cursor) && !isSkippedLog(logsByDate.get(cursor))) {
      scheduled++;
      if (isDoneAt(cfg.target_per_period, logsByDate, cursor)) done++;
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
      sum += Math.max(0, logsByDate.get(cursor)?.count || 0);
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
  daysAchieved: number;
  daysPartial: number;
  daysIncomplete: number;
  daysSkipped: number;
  daysStacked: number;
}

/** Day-by-day breakdown since the habit's first log (or today, if none yet): Achieved (hit
 *  target that day), Partly Done (logged something but short of target), Incomplete (nothing
 *  logged, or explicitly marked "didn't happen"), Skipped (not scheduled, or explicitly
 *  skipped for the day), and Stacked (over-achieved beyond the target). */
export function habitDayStats(habit: Habit, logs: HabitLog[], todayISO: string, history: HabitFrequencyChange[] = []): HabitDayStats {
  const logsByDate = new Map(logs.map(l => [l.date, l]));
  const sortedDates = [...logsByDate.keys()].sort();
  const startISO = sortedDates.length > 0 ? sortedDates[0] : todayISO;

  let daysAchieved = 0, daysPartial = 0, daysIncomplete = 0, daysSkipped = 0, daysStacked = 0;
  let cursor = startISO;
  while (cursor <= todayISO) {
    const cfg = resolveFrequencyAt(habit, history, cursor);
    const scheduled = isHabitScheduledOn(cfg, cursor);
    const log = logsByDate.get(cursor);
    const count = log?.count || 0;
    if (!scheduled || isSkippedLog(log)) {
      daysSkipped++;
    } else if (count >= cfg.target_per_period) {
      daysAchieved++;
      if (count > cfg.target_per_period) daysStacked++;
    } else if (count > 0) {
      daysPartial++;
    } else {
      daysIncomplete++;
    }
    cursor = addDaysISO(cursor, 1);
  }

  return {
    currentStreak: currentStreak(habit, logs, todayISO, history),
    longestStreak: bestStreak(habit, logs, history),
    daysAchieved, daysPartial, daysIncomplete, daysSkipped, daysStacked,
  };
}
