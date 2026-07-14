import { Activity, ExerciseType, EXERCISE_TYPE_LABELS, EXERCISE_TYPE_EMOJI, activityEmoji, subTypeLabel, activitySubKeys, REST_BREAK_RUN_TYPES } from '@/types';
import { PlanRecord, todaysSession, isRunSession, sessionParts } from '@/lib/runPlanGenerator';

function topN<T>(counts: Map<T, number>, n: number): [T, number][] {
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, n);
}

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

  const typeCounts = new Map<ExerciseType, number>();
  const subtypeCounts = new Map<string, number>(); // key = `${exercise_type}:${subKey}`
  for (const a of inRange) {
    typeCounts.set(a.exercise_type, (typeCounts.get(a.exercise_type) || 0) + 1);
    for (const sk of activitySubKeys(a)) {
      const key = `${a.exercise_type}:${sk}`;
      subtypeCounts.set(key, (subtypeCounts.get(key) || 0) + 1);
    }
  }
  const topTypes = topN(typeCounts, 2).map(([type, count]) => ({ type, label: EXERCISE_TYPE_LABELS[type], emoji: EXERCISE_TYPE_EMOJI[type], count }));
  const topSubtypes = topN(subtypeCounts, 2).map(([key, count]) => {
    const [type, subKey] = key.split(':') as [ExerciseType, string];
    return { key, label: subTypeLabel(subKey), emoji: activityEmoji(type, subKey), count };
  });

  const intensityMins = inRange.reduce((s, a) => s + (a.intensity_minutes || 0), 0);
  const maxHrActs = inRange.filter(a => a.max_hr);
  const maxHr = maxHrActs.length ? Math.max(...maxHrActs.map(a => a.max_hr!)) : null;
  const paceActs = inRange.filter(a => a.pace_min_km && !(a.run_type && REST_BREAK_RUN_TYPES.includes(a.run_type)));
  const bestPace = paceActs.length ? Math.min(...paceActs.map(a => a.pace_min_km!)) : null;

  return { count: inRange.length, km, mins, pbs, planned, done, topActivity, topTypes, topSubtypes, intensityMins, maxHr, bestPace };
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
