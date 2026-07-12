import { Activity } from '@/types';
import { PlanRecord, todaysSession, isRunSession, sessionParts } from '@/lib/runPlanGenerator';

export function addDays(dateISO: string, n: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/** Planned/completed session counts across ACTIVE plans for a date range.
 *  Counts every individual session part (a combined day like "Training + Conditioning"
 *  is 2 planned sessions, and each part's completion counts on its own) so the numbers
 *  match what the week table visually shows. */
export function planStats(plans: PlanRecord[], start: string, end: string) {
  let planned = 0, done = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    for (const p of plans) {
      if (!p.active) continue;
      const pos = todaysSession(p, d);
      if (pos && isRunSession(pos.session)) {
        for (const part of sessionParts(pos.session)) {
          if (!isRunSession(part)) continue;
          planned++;
          if (part.completed) done++;
        }
      }
    }
  }
  return { planned, done };
}

export function recapFor(activities: Activity[], plans: PlanRecord[], start: string, end: string) {
  const inRange = activities.filter(a => a.date >= start && a.date <= end);
  const km = inRange.reduce((s, a) => s + (a.distance_km || 0), 0);
  const mins = inRange.reduce((s, a) => s + a.duration_minutes, 0);
  const pbs = inRange.filter(a => a.is_pb);
  const { planned, done } = planStats(plans, start, end);
  // The week's standout session — longest by duration, distance as tiebreaker.
  const topActivity = inRange.length
    ? [...inRange].sort((a, b) => (b.duration_minutes - a.duration_minutes) || ((b.distance_km || 0) - (a.distance_km || 0)))[0]
    : null;
  return { count: inRange.length, km, mins, pbs, planned, done, topActivity };
}

/** Percentage change of `current` vs `prev`, rounded, or null when there's no
 *  meaningful baseline (prev is 0). Positive = up on last period. */
export function deltaPct(current: number, prev: number): number | null {
  if (!prev) return null;
  return Math.round(((current - prev) / prev) * 100);
}

/** A recap for a period plus the same numbers for the period immediately before it,
 *  so callers can show "+12% vs last week"-style comparisons. `periodDays` is the
 *  length of the window (7 for a week) used to derive the prior window. */
export function recapWithComparison(activities: Activity[], plans: PlanRecord[], start: string, end: string, periodDays: number) {
  const current = recapFor(activities, plans, start, end);
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(start, -periodDays);
  const prev = recapFor(activities, plans, prevStart, prevEnd);
  return {
    ...current,
    prev,
    kmDelta: deltaPct(current.km, prev.km),
    minsDelta: deltaPct(current.mins, prev.mins),
    countDelta: deltaPct(current.count, prev.count),
  };
}

/** Upcoming planned session-part count across active plans for a date range. */
export function upcomingCount(plans: PlanRecord[], start: string, end: string) {
  return planStats(plans, start, end).planned;
}
