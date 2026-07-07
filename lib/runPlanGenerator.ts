// Run training plan generator.
// Produces a varied, adidas-style week-by-week plan from a small config.
// A fresh call gives a different plan each time (randomised within constraints).

export type PlanLevel = 'relaxed' | 'moderate' | 'tough';

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};
export const WEEKDAY_SHORT: Record<Weekday, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

export type SessionType =
  | 'rest' | 'crosstrain'
  | 'easy' | 'recovery' | 'long' | 'tempo' | 'fartlek' | 'progression'
  | 'long_intervals' | 'sprint_reps' | 'hill_reps' | 'trail'
  | 'sport'; // generic non-run session (sport / custom plans)

export interface Session {
  type: SessionType;
  title: string;        // display heading, e.g. "Tempo Run"
  exerciseType?: string;// for sport/custom sessions: an ExerciseType key
  subType?: string;     // e.g. 'football', 'strength'
  sportSessionType?: string; // for sport-plan sessions: the session-type key ('recovery','training',…) used for colour
  distanceKm?: number;  // the session's displayed TOTAL distance goal (mutually exclusive with timeMin)
  timeMin?: number;     // the session's displayed TOTAL time goal (mutually exclusive with distanceKm)
  estKm?: number;       // internal-only distance estimate for weekly volume totals (not displayed as a goal)
  /** Rep notation ("4 x 400 m", "8 x 30 sec") shown INSTEAD of distanceKm/timeMin —
   *  used by long intervals / sprint reps / hill reps, which show quantity x each-rep,
   *  not a computed total. */
  repLabel?: string;
  detail: string;       // short description / structure text
  completed?: boolean;
  completedActivityId?: string | null;
  /** Difficulty relative to the original generated session. */
  variant?: 'easier' | 'harder' | null;
  /** A filler slot in the lead-in "Week 0" that falls before the plan's actual start date. */
  beforeStart?: boolean;
}

export type Phase = 'Base' | 'Build' | 'Peak' | 'Taper';

export interface PlanWeek {
  weekNumber: number;
  phase: Phase;
  totalKm: number;
  focus?: string; // one-line coaching note for the week
  days: Record<Weekday, Session>;
}

export interface PlanData {
  weeks: PlanWeek[];
  customConfig?: CustomConfig; // stored on multi-sport plans so they can be edited/regenerated
  sportConfig?: SportConfig;   // stored on single-sport plans so they can be edited/regenerated
}

// ---------- sport plan session types (universal across sports) ----------
export const SPORT_SESSION_TYPES: { key: string; label: string }[] = [
  { key: 'game', label: 'Game / Match' },
  { key: 'training', label: 'Training' },
  { key: 'skills', label: 'Skills' },
  { key: 'conditioning', label: 'Conditioning' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'solo', label: 'Solo Session' },
  { key: 'easy', label: 'Easy' },
  { key: 'crosstrain', label: 'Cross Train' },
  { key: 'rest', label: 'Rest' },
];
export const SPORT_SESSION_LABELS: Record<string, string> = Object.fromEntries(SPORT_SESSION_TYPES.map(t => [t.key, t.label]));

/** One day's session in a single-sport plan (the weekly template repeats each week). */
export interface SportSession {
  day: Weekday;
  sessionType: string;  // a SPORT_SESSION_TYPES key, or a custom label
  durationMin?: number;
  durationMax?: number;
}

/** A session type + how many per week, for the randomise mode. */
export interface SportPoolItem {
  sessionType: string;   // a SPORT_SESSION_TYPES key or a custom label
  count: number;         // sessions per week
  durationMin?: number;
  durationMax?: number;
}

export interface SportConfig {
  name?: string;
  exerciseType: string;    // ExerciseType key for logging (e.g. 'sport', 'swim')
  sportSubType?: string;   // optional subtype key ('football', ...)
  sportLabel: string;      // display name for the sport (subtype label, type label, or custom text)
  assignMode: 'perDay' | 'random'; // choose each day, or pick sessions and randomise the days
  sessions: SportSession[];        // perDay mode: the weekly template (each carries its own duration)
  pool: SportPoolItem[];           // random mode: session types + weekly counts
  spread: 'weeks' | 'cram';        // random mode, when >7/week: spread across weeks vs pack into each week
  weeks: number;
  startDate: string;
  level: PlanLevel;
}

/** One selected activity in a custom mix plan. */
export interface CustomActivity {
  exerciseType: string; // ExerciseType key ('run','sport','swim',...)
  subType?: string;     // optional subtype key ('football','strength',...)
  label: string;        // display name
  quantity: number;     // sessions per week
  durationMin?: number; // suggested duration range (minutes)
  durationMax?: number;
}

export interface CustomConfig {
  name?: string;
  activities: CustomActivity[];
  weeks: number;
  daysPerWeek: number;
  trainDays: Weekday[];
  level: PlanLevel;
  startDate: string;
}

export type RunDistance =
  | '5k' | '10k' | 'half' | 'marathon' | 'keep_fit' | 'speed'
  | 'ultra_50k' | 'ultra_100k' | 'ultra_100mile' | 'custom';

export const RUN_DISTANCE_LABELS: Record<RunDistance, string> = {
  '5k': '5K', '10k': '10K', half: 'Half Marathon', marathon: 'Marathon',
  keep_fit: 'Keep Run Fit', speed: 'Speed Training',
  ultra_50k: 'Ultra 50K', ultra_100k: 'Ultra 100K', ultra_100mile: 'Ultra 100 Miler',
  custom: 'Custom Distance',
};

/** The final PB-day label for the plan. */
export function finalDayLabel(distance: RunDistance, customKm?: number): string {
  switch (distance) {
    case '5k': return '5K PB Day';
    case '10k': return '10K PB Day';
    case 'half': return 'Half Marathon PB Day';
    case 'marathon': return 'Marathon PB Day';
    case 'keep_fit': return 'Congratulations — completed! Time for another plan?';
    case 'speed': return 'Congratulations — completed! Time for another plan?';
    case 'ultra_50k': return '50K Ultra PB Day';
    case 'ultra_100k': return '100K Ultra PB Day';
    case 'ultra_100mile': return '100 Miler PB Day';
    case 'custom': return `${customKm ?? ''}K PB Day`;
  }
}

export type PlanKind = 'run' | 'sport' | 'custom';

/** A saved plan row from the `training_plans` table. */
export interface PlanRecord {
  id: string;
  user_id: string;
  plan_kind: PlanKind;
  distance: RunDistance;
  custom_distance_km: number;
  level: PlanLevel;
  weeks: number;
  days_per_week: number;      // max sessions/week
  days_per_week_min: number;  // min sessions/week (equals max for an exact count)
  train_days: Weekday[];
  goal_time_seconds: number | null;
  start_distance_km: number | null;
  long_run_cap_km?: number | null;
  start_date: string;
  name?: string | null;       // optional label (esp. sport/custom plans)
  active: boolean;            // run plans: only one active at a time (switch ends the other). sport/custom: always active.
  plan_data: PlanData;
  created_at: string;
  updated_at?: string;
}

export interface PlanConfig {
  distance: RunDistance;
  customDistanceKm?: number;
  level: PlanLevel;
  weeks: number;          // 4–16 (or more)
  daysPerWeek: number;    // max running days per week (2–6)
  daysPerWeekMin?: number; // min running days per week; if < daysPerWeek, the plan varies week to week
  trainDays: Weekday[];   // which weekdays are available to train
  goalTimeSeconds?: number | null;
  startDistanceKm?: number | null; // week-1 total distance baseline
  startDate: string;      // ISO date the plan begins — used to build a lead-in "Week 0" if not a Monday
  longRunDay?: Weekday | 'random' | null; // fixed day for the long run, or 'random' each week (default: auto/weekend)
  longRunCapKm?: number | null; // user-set ceiling — long runs on this plan never exceed this distance
}

// ---------- small random helpers ----------
const rand = () => Math.random();
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const pickN = <T>(arr: T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
};
const chance = (p: number) => rand() < p;
const round = (n: number, step = 0.5) => Math.round(n / step) * step;

// ---------- plan-shape config ----------
const LONG_RUN_MAX: Record<RunDistance, number> = {
  '5k': 10, '10k': 15, half: 18, marathon: 35,
  keep_fit: 15, speed: 11,
  ultra_50k: 38, ultra_100k: 45, ultra_100mile: 52, custom: 30,
};

function longRunMaxFor(cfg: PlanConfig): number {
  let max = cfg.distance === 'custom'
    ? Math.min(52, Math.max(10, (cfg.customDistanceKm ?? 21) * 0.85))
    : LONG_RUN_MAX[cfg.distance];
  // Relaxed level: long runs never exceed the plan's main goal distance.
  if (cfg.level === 'relaxed') {
    const goal = goalDistanceKm(cfg);
    if (goal) max = Math.min(max, goal);
  }
  if (cfg.level === 'tough') max *= 1.05;
  // User-set ceiling always wins, but never below the long-run floor.
  if (cfg.longRunCapKm && cfg.longRunCapKm > 0) max = Math.min(max, Math.max(MIN_KM_LONG, cfg.longRunCapKm));
  return round(max, 1);
}

function goalDistanceKm(cfg: PlanConfig): number | null {
  switch (cfg.distance) {
    case '5k': return 5;
    case '10k': return 10;
    case 'half': return 21.1;
    case 'marathon': return 42.2;
    case 'ultra_50k': return 50;
    case 'ultra_100k': return 100;
    case 'ultra_100mile': return 160;
    case 'custom': return cfg.customDistanceKm ?? null;
    default: return null; // keep_fit, speed have no single race distance
  }
}

// ---------- phase assignment ----------
function phaseForWeek(weekIdx: number, totalWeeks: number): Phase {
  const taperWeeks = Math.min(2, Math.max(1, Math.round(totalWeeks * 0.12)));
  const lastIdx = totalWeeks - 1;
  if (weekIdx > lastIdx - taperWeeks) return 'Taper';
  const peakStart = lastIdx - taperWeeks - Math.max(1, Math.round(totalWeeks * 0.15));
  if (weekIdx >= peakStart) return 'Peak';
  if (weekIdx < Math.max(1, Math.round(totalWeeks * 0.22))) return 'Base';
  return 'Build';
}

// Long-run distance for each week, ramping with cut-back weeks + taper.
function longRunSchedule(cfg: PlanConfig): number[] {
  const maxKm = Math.max(MIN_KM_LONG, longRunMaxFor(cfg));
  const startKm = Math.max(MIN_KM_LONG, Math.min(
    maxKm,
    cfg.level === 'relaxed' ? 6 : 8,
  ));
  const out: number[] = [];
  const taperWeeks = Math.min(2, Math.max(1, Math.round(cfg.weeks * 0.12)));
  const buildEnd = cfg.weeks - taperWeeks - 1; // last non-taper week index
  for (let i = 0; i < cfg.weeks; i++) {
    const phase = phaseForWeek(i, cfg.weeks);
    if (phase === 'Taper') {
      // wind down toward race
      const into = i - buildEnd; // 1..taperWeeks
      const frac = 0.6 - 0.15 * (into - 1);
      out.push(round(Math.max(startKm, maxKm * frac), 0.5));
      continue;
    }
    const frac = buildEnd > 0 ? Math.min(1, i / buildEnd) : 1;
    let km = startKm + (maxKm - startKm) * frac;
    // cut-back every 4th week (not first, not taper)
    if (i > 0 && (i + 1) % 4 === 0) km *= 0.72;
    out.push(round(Math.max(startKm, km), 0.5));
  }
  return out;
}

// Distance floors by session category (per spec): sprint/hill/long-intervals have
// no minimum; tempo/easy/progression/fartlek must be >=2km; long/trail >=5km.
const MIN_KM_STANDARD = 2;
const MIN_KM_LONG = 5;

function minKmForType(type: SessionType): number {
  if (type === 'long' || type === 'trail') return MIN_KM_LONG;
  if (type === 'easy' || type === 'recovery' || type === 'tempo' || type === 'progression' || type === 'fartlek') return MIN_KM_STANDARD;
  return 0; // sprint_reps, hill_reps, long_intervals, rest, crosstrain, sport
}

// ---------- session builders ----------
function easyRun(cfg: PlanConfig): Session {
  if (chance(0.5)) {
    const t = pick([20, 25, 30, 35, 40, 45]);
    return { type: 'easy', title: 'Easy Run', timeMin: t, estKm: round(t / 6, 0.5),
      detail: `${t} min at a comfortable, conversational pace.` };
  }
  const km = Math.max(MIN_KM_STANDARD, pick([3, 4, 5, 6, 7]));
  return { type: 'easy', title: 'Easy Run', distanceKm: km,
    detail: `${km} km at a comfortable pace — you should be able to hold a conversation.` };
}

function recoveryRun(): Session {
  const km = Math.max(MIN_KM_STANDARD, pick([2, 3, 4]));
  return { type: 'recovery', title: 'Recovery Run', distanceKm: km,
    detail: `${km} km very easy. Let your body recover — keep it gentle.` };
}

function longRun(km: number, cfg: PlanConfig, isPeak: boolean): Session {
  km = Math.max(MIN_KM_LONG, km);
  const variants: { title: string; detail: string }[] = [
    { title: 'Long Run', detail: `${km} km at a comfortable, conversational pace.` },
    { title: 'Long Run (Progression)', detail: `${km} km. Start slow and increase the pace slightly each km — your last km should be your fastest.` },
    { title: 'Long Run (Sprint Finish)', detail: `${km} km at a comfortable pace, but run the last 500 m as fast as you can — pretend you're finishing a race.` },
  ];
  if (isPeak && goalDistanceKm(cfg)) {
    variants.push({ title: 'Long Run (Race Pace)', detail: `${km} km easy, with a few sections at your goal race pace built in.` });
  }
  const v = pick(variants);
  return { type: 'long', title: v.title, distanceKm: km, detail: v.detail };
}

function tempoRun(cfg: PlanConfig): Session {
  const hard = cfg.level === 'tough';
  if (chance(0.5)) {
    // distance-based — the displayed total includes the 1km warm-up + 1km cooldown
    const workKm = Math.max(MIN_KM_STANDARD, randInt(hard ? 3 : 2, hard ? 7 : 5));
    if (workKm >= 4 && chance(0.4)) {
      const half = round(workKm / 2, 0.5);
      return { type: 'tempo', title: 'Tempo Run', distanceKm: workKm + 2,
        detail: `1 km warm-up, 2 x ${half} km at a steady "comfortably hard" pace (short jog between), 1 km cooldown.` };
    }
    return { type: 'tempo', title: 'Tempo Run', distanceKm: workKm + 2,
      detail: `1 km warm-up, ${workKm} km at a steady "comfortably hard" pace, 1 km cooldown.` };
  }
  // time-based — total time already includes warm-up + tempo + cooldown
  const min = pick(hard ? [20, 25, 30] : [10, 15, 20, 25]);
  const totalTempoMin = 10 + min + 5;
  return { type: 'tempo', title: 'Tempo Run', timeMin: totalTempoMin, estKm: round(totalTempoMin / 6, 0.5),
    detail: `10 min warm-up, ${min} min steady at "comfortably hard", 5 min cooldown.` };
}

function fartlek(cfg: PlanConfig): Session {
  const roll = rand();
  if (roll < 0.2) {
    // mixed blocks with a tempo bridge; tough = more reps + shorter easy floats
    const tough = cfg.level === 'tough';
    const easySec = tough ? 20 : 30;
    const r1 = randInt(tough ? 5 : 3, tough ? 7 : 5);
    const r2 = randInt(tough ? 4 : 2, tough ? 5 : 4);
    const totalMin = Math.round(5 + (r1 * (30 + easySec)) / 60 + 2 + r2 * 2 + 5);
    return { type: 'fartlek', title: 'Fartlek (Mixed)', timeMin: totalMin, estKm: round(totalMin / 6, 0.5),
      detail: `5 min warm-up\n${r1} x [30 sec fast / ${easySec} sec easy]\n2 min tempo\n${r2} x [1 min fast / 1 min easy]\n5 min cooldown` };
  }
  if (roll < 0.35) {
    // pyramid fartlek: 1-2-3-4-5-4-3-2-1 min fast with slow floats between — fixed structure, fixed total
    return { type: 'fartlek', title: 'Fartlek (Pyramid)', timeMin: 51, estKm: round(51 / 6, 0.5),
      detail: '5:00 warm-up, then a pyramid:\n1 min fast / 1 min slow\n2 min fast / 2 min slow\n3 min fast / 2 min slow\n4 min fast / 2 min slow\n5 min fast / 2 min slow\n4 min fast / 2 min slow\n3 min fast / 2 min slow\n2 min fast / 2 min slow\n1 min fast / 1 min slow\n5:00 cooldown.' };
  }
  if (roll < 0.7) {
    const opts: [number, string, number][] = [
      [30, '30 sec', 20], [60, '1 min', 12], [90, '90 sec', 10], [120, '2 min', 8],
    ];
    const [workSec, label, maxReps] = pick(opts);
    const reps = randInt(Math.max(6, Math.round(maxReps * 0.5)), maxReps);
    const totalMin = Math.round(5 + (reps * workSec) / 60 + (reps - 1) * 1 + 5);
    return { type: 'fartlek', title: 'Fartlek', timeMin: totalMin, estKm: round(totalMin / 6, 0.5),
      detail: `5:00 warm-up, then ${reps} x ${label} fast with 1:00 easy recovery between, 5:00 cooldown.` };
  }
  // time-based — already the total, no separate warm-up/cooldown segments
  const min = pick([20, 25, 30, 35]);
  return { type: 'fartlek', title: 'Fartlek', timeMin: min, estKm: round(min / 6, 0.5),
    detail: `${min} min steady — at random moments pick a point ahead and surge to it as fast as you can.` };
}

function progression(km: number): Session {
  km = Math.max(MIN_KM_STANDARD, km);
  return { type: 'progression', title: 'Progression Run', distanceKm: km,
    detail: `${km} km steady, increasing your pace each km. Your last km should be your fastest.` };
}

// Long intervals / sprint reps / hill reps show a rep notation ("4 x 400 m")
// instead of a computed total — distanceKm/estKm still power the weekly volume total.
function longIntervals(): Session {
  if (chance(0.35)) {
    const templates: { warmup: string; reps: [number, string][]; recovery: string; cooldown: string }[] = [
      { warmup: '1 km warm-up', reps: [[2, '2 km'], [2, '600 m']], recovery: 'walk 1 min between reps', cooldown: '1 km cooldown' },
      { warmup: '5 min warm-up', reps: [[3, '800 m'], [4, '400 m']], recovery: '200 m walk between reps', cooldown: '5 min cooldown' },
      { warmup: '1 km warm-up', reps: [[4, '800 m'], [2, '400 m']], recovery: 'walk 90 sec between reps', cooldown: '1 km cooldown' },
    ];
    const t = pick(templates);
    const km = round(randInt(7, 11), 0.5);
    const repLabel = t.reps.map(([n, d]) => `${n} x ${d}`).join(' + ');
    const detail = [t.warmup, ...t.reps.map(([n, d]) => `${n} x ${d}`), t.recovery, t.cooldown].join('\n');
    return { type: 'long_intervals', title: 'Long Intervals', estKm: km, repLabel, detail };
  }
  const options: [string, number][] = [['400 m', 10], ['800 m', 8], ['1 km', 7], ['1.5 km', 5]];
  const [dist, maxReps] = pick(options);
  const reps = randInt(3, maxReps);
  const km = round(reps * (dist === '400 m' ? 0.6 : dist === '800 m' ? 1.0 : dist === '1 km' ? 1.2 : 1.7) + 2, 0.5);
  // recovery: either a jog, or a fixed timed rest
  const recovery = chance(0.5)
    ? 'a jog recovery between'
    : `${pick(['90 sec', '2 min', '2:30', '3 min'])} rest between`;
  return { type: 'long_intervals', title: 'Long Intervals', estKm: km, repLabel: `${reps} x ${dist}`,
    detail: `1 km warm-up, ${reps} x ${dist} at ~75% intensity with ${recovery}, 1 km cooldown.` };
}

function sprintReps(cfg: PlanConfig): Session {
  // Level scales volume: relaxed = fewer reps / fewer blocks, tough = more.
  const bump = cfg.level === 'tough' ? 1 : cfg.level === 'relaxed' ? -1 : 0;
  const blockCount = cfg.level === 'relaxed' ? randInt(1, 2) : cfg.level === 'tough' ? randInt(3, 4) : randInt(2, 3);
  const r = (min: number, max: number) => randInt(Math.max(1, min + bump), max + bump);

  // Multi-block session (mixed distances + sport-specific phase plays).
  if (chance(0.4)) {
    const n1 = r(3, 5), n2 = r(8, 12), n3 = r(3, 5), n4 = r(3, 5), n5 = r(4, 6), n6 = r(3, 4), n7 = r(2, 3), n8 = r(5, 8);
    const blockPool = [
      { short: `${n1} x [100&200m]`, long: `${n1} x [100 m & 200 m] (run every minute — less rest after the 200 m; e.g. 100, 200, 100, 200…)` },
      { short: `${n2} x 50m`, long: `${n2} x 50 m (on the 30 seconds)` },
      { short: `${n3} x 80m`, long: `${n3} x 80 m (run 20 m & back twice = 80 m; 20 sec rest, or go every 40 sec)` },
      { short: `${n4} x 150m`, long: `${n4} x 150 m (30 sec rest, or go every min)` },
      { short: `${n5} x 100m`, long: `${n5} x 100 m (full recovery between)` },
      { short: `${n6} x 200m`, long: `${n6} x 200 m (walk-back recovery)` },
      { short: `${n7} x phase plays`, long: `${n7} x 1 min phase plays (mimic your movements and plays in your sport)` },
      { short: `${n8} shuttles`, long: `${n8} shuttle runs (5 m & back, 10 m & back, 15 m & back, 20 m & back)` },
    ];
    const blocks = pickN(blockPool, blockCount);
    return { type: 'sprint_reps', title: 'Sprint Reps', estKm: round(blocks.length * 0.9 + 1.5, 0.5),
      repLabel: blocks.map(b => b.short).join(' + '),
      detail: '5 min warm-up\n' + blocks.map((b, i) => `Block ${i + 1}: ${b.long}`).join('\n') + '\n5 min cooldown' };
  }
  const pool = [
    'shuttle runs (5 m & back, 10 m & back, 15 m & back, 20 m & back)',
    'pyramid runs (10 m, 20 m, 30 m, 20 m, 10 m)',
    '50 m sprints',
    '100 m sprints',
    '200 m sprints',
  ];
  const types = pickN(pool, randInt(1, 3));
  const reps = randInt(cfg.level === 'tough' ? 10 : 5, cfg.level === 'tough' ? 20 : 14);
  return { type: 'sprint_reps', title: 'Sprint Reps', estKm: round(reps * 0.25 + 1.5, 0.5), repLabel: `${reps} reps`,
    detail: `Warm-up, then ${reps} reps: ${types.join(', ')}. Full recovery between reps.` };
}

function hillReps(cfg: PlanConfig): Session {
  const kind = pick(['long', 'short', 'time', 'sandwich'] as const);
  if (kind === 'sandwich') {
    // two hill blocks with an endurance run sandwiched between
    const reps = pick([8, 10, 12]);
    const t = pick(['30 sec', '45 sec']);
    const mid = pick([8, 10, 12]);
    return { type: 'hill_reps', title: 'Hill Repeats', estKm: round(reps * 0.35 * 2 + mid / 6 + 2, 0.5),
      repLabel: `${reps} x ${t} hills (x2)`,
      detail: `5 min warm-up\n${reps} x ${t} hills\n${mid} min steady run\n${reps} x ${t} hills\n5 min cooldown` };
  }
  if (kind === 'long') {
    const reps = randInt(2, 3);
    const lo = pick([1, 1.5]); const hi = lo + pick([0.5, 1, 1.5]);
    return { type: 'hill_reps', title: 'Hill Repeats', estKm: round(reps * hi + 2, 0.5),
      repLabel: `${reps} x ${lo}–${hi} km`,
      detail: `${reps} x ${lo}–${hi} km uphill at a strong effort, jog back down to recover.` };
  }
  if (kind === 'short') {
    const reps = randInt(5, 10);
    const lo = pick([100, 200]); const hi = lo + 100;
    return { type: 'hill_reps', title: 'Hill Repeats', estKm: round(reps * (hi / 1000) * 2 + 1.5, 0.5),
      repLabel: `${reps} x ${lo}–${hi} m`,
      detail: `${reps} x ${lo}–${hi} m uphill fast, jog/walk back down to recover.` };
  }
  // long time-based hills with a big warm-up/cooldown, e.g. 3 x 3min
  if (chance(0.3)) {
    const reps = randInt(3, 5);
    const t = pick(['2 min', '3 min', '4 min']);
    return { type: 'hill_reps', title: 'Hill Repeats', estKm: round(reps * 0.6 + 3.5, 0.5), repLabel: `${reps} x ${t}`,
      detail: `10 min warm-up\n${reps} x ${t} hills at a strong effort, jog back down to recover\n10 min cooldown` };
  }
  const opts = ['30 sec', '45–60 sec', '1 min'];
  const t = pick(opts);
  const reps = t === '30 sec' ? randInt(5, 12) : randInt(5, 8);
  return { type: 'hill_reps', title: 'Hill Repeats', estKm: round(reps * 0.35 + 1.5, 0.5), repLabel: `${reps} x ${t}`,
    detail: `${reps} x ${t} uphill at a strong effort, jog/walk back down between.` };
}

function trailRun(km: number): Session {
  km = Math.max(MIN_KM_LONG, km);
  return { type: 'trail', title: 'Trail Run', distanceKm: km,
    detail: `${km} km on hilly trails — the hardest terrain option. Run by effort, hike the steep bits.` };
}

function crosstrain(): Session {
  return { type: 'crosstrain', title: 'Cross Train',
    detail: 'Rest, or light cross training (swim, bike, yoga) or strength work. Keep any running very easy.' };
}

function restDay(): Session {
  return { type: 'rest', title: 'Rest', detail: 'Take a full day off. Recovery is where the gains happen.' };
}

// ---------- weekly quality-session menu ----------
function qualityCount(cfg: PlanConfig, runDays: number): number {
  let n = runDays <= 3 ? 1 : runDays === 4 ? (chance(0.5) ? 1 : 2) : 2;
  if (cfg.level === 'tough' && runDays >= 4) n += 1;
  if (cfg.level === 'relaxed') n = 1;
  return Math.min(n, Math.max(0, runDays - 1)); // leave room for the long run
}

function buildQualitySessions(cfg: PlanConfig, weekIdx: number, phase: Phase, runDays: number): Session[] {
  const n = qualityCount(cfg, runDays);
  const out: Session[] = [];
  // Speed-training plans lean heavily into sprint/interval work.
  const pool: (() => Session)[] = cfg.distance === 'speed'
    ? [() => sprintReps(cfg), () => longIntervals(), () => fartlek(cfg), () => hillReps(cfg), () => tempoRun(cfg)]
    : [() => tempoRun(cfg), () => longIntervals(), () => sprintReps(cfg), () => hillReps(cfg), () => fartlek(cfg), () => progression(pick([5, 6, 7]))];
  // rotate the pool by week so consecutive weeks differ
  const rotated = [...pool.slice(weekIdx % pool.length), ...pool.slice(0, weekIdx % pool.length)];
  for (let i = 0; i < n; i++) out.push(rotated[i % rotated.length]());
  // Peak weeks favour race-specific sharpening
  if (phase === 'Peak' && out.length && chance(0.5)) out[0] = cfg.distance === 'speed' ? sprintReps(cfg) : tempoRun(cfg);
  return out;
}

// ---------- day assignment ----------
function orderTrainDays(trainDays: Weekday[]): Weekday[] {
  return WEEKDAYS.filter(d => trainDays.includes(d));
}

function assignWeek(cfg: PlanConfig, weekIdx: number): PlanWeek {
  const phase = phaseForWeek(weekIdx, cfg.weeks);
  const longKm = longRunSchedule(cfg)[weekIdx];
  const maxRunDays = Math.min(cfg.daysPerWeek, cfg.trainDays.length);
  const minRunDays = Math.min(cfg.daysPerWeekMin ?? cfg.daysPerWeek, maxRunDays);
  // Vary runs/week within the chosen range; taper weeks lean toward the lower end.
  const runDays = phase === 'Taper'
    ? minRunDays
    : randInt(minRunDays, maxRunDays);

  // Build the list of run sessions for the week.
  const sessions: Session[] = [];
  const isTaper = phase === 'Taper';

  // Long run (sometimes a trail run on higher levels / non-taper weeks).
  if (cfg.distance !== 'speed' || runDays >= 3) {
    if (cfg.level !== 'relaxed' && !isTaper && chance(0.15)) sessions.push(trailRun(longKm));
    else sessions.push(longRun(longKm, cfg, phase === 'Peak'));
  }

  // Quality sessions (reduced during taper).
  const qs = isTaper ? buildQualitySessions(cfg, weekIdx, phase, runDays).slice(0, 1) : buildQualitySessions(cfg, weekIdx, phase, runDays);
  sessions.push(...qs);

  // Fill the rest with easy / recovery runs.
  while (sessions.length < runDays) {
    sessions.push(sessions.length >= 3 && chance(0.4) ? recoveryRun() : easyRun(cfg));
  }
  // If we overshot (quality-heavy tough weeks), trim easy runs.
  while (sessions.length > runDays) {
    const idx = sessions.findIndex(s => s.type === 'easy' || s.type === 'recovery');
    if (idx === -1) break;
    sessions.splice(idx, 1);
  }

  // ----- place sessions across the week -----
  const available = orderTrainDays(cfg.trainDays);
  const days: Partial<Record<Weekday, Session>> = {};

  // Long run → user's chosen day, a random day each week, or default to a weekend day.
  const longSession = sessions.find(s => s.type === 'long' || s.type === 'trail');
  const weekendPref: Weekday[] = ['sun', 'sat'];
  let longDay: Weekday | undefined;
  if (longSession) {
    if (cfg.longRunDay && cfg.longRunDay !== 'random' && available.includes(cfg.longRunDay)) {
      longDay = cfg.longRunDay;
    } else if (cfg.longRunDay === 'random') {
      longDay = pick(available);
    } else {
      longDay = weekendPref.find(d => available.includes(d)) ?? available[available.length - 1];
    }
    days[longDay] = longSession;
  }

  // Remaining sessions spread across the other available days, spacing quality apart.
  const remaining = sessions.filter(s => s !== longSession);
  // Shuffle which open day comes first — otherwise the earliest weekday (e.g. Monday)
  // always gets the first placed session on every regeneration.
  const nonLongDays = available.filter(d => d !== longDay);
  const openDays = pickN(nonLongDays, nonLongDays.length);
  // interleave so hard sessions aren't back-to-back: sort remaining hard-first, then place on alternating days
  const hard = remaining.filter(s => ['tempo', 'long_intervals', 'sprint_reps', 'hill_reps', 'fartlek', 'progression'].includes(s.type));
  const easy = remaining.filter(s => !hard.includes(s));
  const ordered: Session[] = [];
  while (hard.length || easy.length) {
    if (hard.length) ordered.push(hard.shift()!);
    if (easy.length) ordered.push(easy.shift()!);
  }
  openDays.forEach((d, i) => { if (ordered[i]) days[d] = ordered[i]; });

  // Rest + crosstrain on the leftover (non-training) days. Exactly 1 rest day.
  const restEligible = WEEKDAYS.filter(d => !days[d]);
  // prefer rest the day after the long run
  let restDayChoice: Weekday | undefined;
  if (longDay) {
    const after = WEEKDAYS[(WEEKDAYS.indexOf(longDay) + 1) % 7];
    if (restEligible.includes(after)) restDayChoice = after;
  }
  restDayChoice = restDayChoice ?? restEligible[0];
  for (const d of WEEKDAYS) {
    if (days[d]) continue;
    days[d] = d === restDayChoice ? restDay() : crosstrain();
  }

  const full = days as Record<Weekday, Session>;

  // Scale week 1's total to the user's requested "Week 1's total distance".
  if (weekIdx === 0 && cfg.startDistanceKm) scaleWeekToTarget(full, cfg.startDistanceKm);
  const totalKm = sumKm(full);

  return { weekNumber: weekIdx + 1, phase, totalKm: round(totalKm, 0.5), days: full };
}

function sumKm(days: Record<Weekday, Session>): number {
  return WEEKDAYS.reduce((s, d) => s + (days[d].distanceKm || days[d].estKm || 0), 0);
}

/**
 * Scale every running session in a week toward a target total distance.
 * Distance-goal sessions (long run, tempo, etc.) scale distanceKm, clamped to
 * their category floor. Time-based sessions scale their minutes (and the
 * invisible estKm derived from them) — this never shows a contradicting
 * distance since only the time is displayed. Rep-based sessions (long
 * intervals/sprint/hill) only have an invisible estKm, which also flexes.
 * If floors alone exceed the target, the result lands as close as possible
 * from above rather than violating them.
 */
function scaleWeekToTarget(full: Record<Weekday, Session>, targetKm: number) {
  const totalNow = sumKm(full);
  if (totalNow <= 0 || !targetKm || targetKm <= 0) return;
  const factor = targetKm / totalNow;
  for (const d of WEEKDAYS) {
    const s = full[d];
    if (s.type === 'rest' || s.type === 'crosstrain') continue;
    if (s.distanceKm != null) {
      s.distanceKm = Math.max(minKmForType(s.type), round(s.distanceKm * factor, 0.5));
    } else if (s.timeMin != null && s.estKm != null) {
      s.timeMin = Math.max(10, Math.round(s.timeMin * factor));
      s.estKm = round(s.timeMin / 6, 0.5);
    } else if (s.estKm != null) {
      s.estKm = Math.max(1, round(s.estKm * factor, 0.5));
    }
  }
}

// ---------- final week / PB day ----------
function applyFinalDay(plan: PlanData, cfg: PlanConfig) {
  const lastWeek = plan.weeks[plan.weeks.length - 1];
  const available = orderTrainDays(cfg.trainDays);
  const pbDay = (['sun', 'sat'].find(d => available.includes(d as Weekday)) as Weekday) ?? available[available.length - 1] ?? 'sun';
  const label = finalDayLabel(cfg.distance, cfg.customDistanceKm);
  const goalKm = goalDistanceKm(cfg);
  const isRace = cfg.distance !== 'keep_fit' && cfg.distance !== 'speed';
  lastWeek.days[pbDay] = {
    type: 'long',
    title: label,
    distanceKm: isRace ? (goalKm ?? undefined) : undefined,
    detail: isRace
      ? `Race day! Give it everything — you've earned this${goalKm ? `. Target: ${goalKm} km` : ''}.`
      : 'You made it — nice work. Time to pick your next plan!',
    completed: false,
  };
  lastWeek.totalKm = round(sumKm(lastWeek.days), 0.5);
}

// ---------- weekly focus notes ----------
function weeklyFocus(week: PlanWeek, prev: PlanWeek | undefined, isLast: boolean, cfg: PlanConfig): string {
  if (isLast) return cfg.distance === 'keep_fit' || cfg.distance === 'speed' ? 'Finish strong — you made it!' : 'Race week — trust your training and go for the PB.';
  const longKm = Math.max(...WEEKDAYS.map(d => week.days[d].type === 'long' || week.days[d].type === 'trail' ? (week.days[d].distanceKm || 0) : 0));
  const prevTotal = prev?.totalKm ?? 0;
  const down = prev && week.totalKm < prevTotal - 1;
  const biggestLong = prev ? longKm > Math.max(...WEEKDAYS.map(d => prev.days[d].distanceKm && (prev.days[d].type === 'long' || prev.days[d].type === 'trail') ? prev.days[d].distanceKm! : 0)) : true;
  switch (week.phase) {
    case 'Base': return 'Build the habit — keep the easy runs truly easy.';
    case 'Build':
      if (down) return 'Cut-back week — lighter load so your body absorbs the work.';
      if (biggestLong && longKm) return `Endurance week — your biggest long run yet (${longKm} km).`;
      return 'Steady build — a bit more volume than last week.';
    case 'Peak':
      return down ? 'Ease back a touch before the final push.' : 'Peak week — sharpen up with your hardest quality sessions.';
    case 'Taper': return 'Taper — cut the volume, stay fresh, keep the legs snappy.';
  }
}

// Spread n picks evenly across an ordered array (so runs don't cluster on
// consecutive lead-in days when there's room to space them out).
function spreadPick<T>(arr: T[], n: number): T[] {
  if (n >= arr.length) return arr;
  const step = arr.length / n;
  const idx = new Set<number>();
  for (let i = 0; i < n; i++) idx.add(Math.min(arr.length - 1, Math.round(i * step)));
  return arr.filter((_, i) => idx.has(i));
}

/**
 * A scaled-down, same-shape lead-in "Week 0" for a run plan: uses the lower
 * end of the runs/week range (capped to however many lead-in days exist,
 * per spec), a smaller long run than Week 1's, a rest day, and is clamped to
 * land strictly below Week 1's total distance.
 */
function buildRunLeadInWeek(cfg: PlanConfig, week1: PlanWeek): PlanWeek | null {
  const anchor = firstMonday(cfg.startDate);
  if (anchor === cfg.startDate) return null;
  const leadInDays: Weekday[] = [];
  for (let d = cfg.startDate; d < anchor; d = addDaysISO(d, 1)) leadInDays.push(weekdayOf(d));
  if (!leadInDays.length) return null;

  const lowerBound = Math.max(1, cfg.daysPerWeekMin ?? cfg.daysPerWeek);
  const runDays = Math.min(lowerBound, leadInDays.length);

  const week1LongKm = Math.max(...WEEKDAYS.map(d => {
    const s = week1.days[d];
    return (s.type === 'long' || s.type === 'trail') ? (s.distanceKm || 0) : 0;
  }));

  const sessions: Session[] = [];
  if (runDays >= 1) {
    const smallLong = Math.max(MIN_KM_STANDARD, round((week1LongKm || 6) * 0.5, 0.5));
    sessions.push({ type: 'easy', title: 'Easy Run', distanceKm: smallLong,
      detail: `${smallLong} km at a comfortable, easy pace — a gentle intro before Week 1 begins.` });
  }
  while (sessions.length < runDays) sessions.push(chance(0.5) ? recoveryRun() : easyRun(cfg));

  const days: Partial<Record<Weekday, Session>> = {};
  const runOnDays = spreadPick(leadInDays, runDays);
  runOnDays.forEach((d, i) => { days[d] = sessions[i]; });
  for (const d of leadInDays) if (!days[d]) days[d] = chance(0.5) ? restDay() : crosstrain();
  for (const d of WEEKDAYS) if (!leadInDays.includes(d)) days[d] = { type: 'rest', title: '', detail: '', completed: false, beforeStart: true };

  const full = days as Record<Weekday, Session>;
  // Guarantee strictly less than Week 1's total, however tight the floors are.
  const week1Total = week1.totalKm || sumKm(week1.days);
  if (week1Total > 0 && sumKm(full) >= week1Total) scaleWeekToTarget(full, week1Total * 0.7);

  return { weekNumber: 0, phase: 'Base', totalKm: round(sumKm(full), 0.5), days: full };
}

// ---------- public API ----------
export function generateRunPlan(cfg: PlanConfig): PlanData {
  const weeks: PlanWeek[] = [];
  for (let i = 0; i < cfg.weeks; i++) weeks.push(assignWeek(cfg, i));
  const plan: PlanData = { weeks };
  applyFinalDay(plan, cfg);
  weeks.forEach((w, i) => { w.focus = weeklyFocus(w, weeks[i - 1], i === weeks.length - 1, cfg); });
  const leadIn = buildRunLeadInWeek(cfg, weeks[0]);
  if (leadIn) { leadIn.focus = 'Lead-in — a smaller week before Week 1 begins on Monday.'; weeks.unshift(leadIn); }
  return plan;
}

// ---------- custom / sport mix plans ----------
function customSessionFrom(act: CustomActivity): Session {
  const dur = act.durationMin != null && act.durationMax != null
    ? randInt(act.durationMin, act.durationMax)
    : (act.durationMin ?? act.durationMax ?? undefined);
  const durTxt = dur ? ` (${dur} min)` : '';
  if (act.exerciseType === 'run') {
    return { type: 'easy', exerciseType: 'run', title: act.label, timeMin: dur,
      detail: `${act.label}${durTxt} — run at a comfortable pace.` };
  }
  return { type: 'sport', exerciseType: act.exerciseType, subType: act.subType, title: act.label, timeMin: dur,
    detail: `${act.label}${durTxt}.` };
}

/**
 * Build a custom mix plan. Expands each activity by its weekly quantity into a
 * pool of sessions, then lays them across the training days. If the pool is
 * larger than the days available, it cycles the leftovers into following weeks.
 */
export function generateCustomPlan(cfg: CustomConfig): PlanData {
  // full weekly pool (one entry per session, respecting quantity)
  const pool: CustomActivity[] = [];
  for (const a of cfg.activities) for (let i = 0; i < Math.max(1, a.quantity); i++) pool.push(a);

  const perWeek = Math.min(cfg.daysPerWeek, cfg.trainDays.length);
  const available = orderTrainDays(cfg.trainDays);
  const weeks: PlanWeek[] = [];
  let cursor = 0; // position in the cycling pool

  for (let w = 0; w < cfg.weeks; w++) {
    // take the next `perWeek` sessions from the cycling pool
    const picks: CustomActivity[] = [];
    for (let i = 0; i < perWeek && pool.length; i++) {
      picks.push(pool[cursor % pool.length]);
      cursor++;
    }
    const sessions = picks.map(customSessionFrom);

    const days: Partial<Record<Weekday, Session>> = {};
    available.slice(0, perWeek).forEach((d, i) => { if (sessions[i]) days[d] = sessions[i]; });

    // rest + crosstrain on the rest (exactly 1 rest day)
    const rest = WEEKDAYS.filter(d => !days[d]);
    const restChoice = rest[0];
    for (const d of WEEKDAYS) if (!days[d]) days[d] = d === restChoice ? restDay() : crosstrain();

    weeks.push({ weekNumber: w + 1, phase: 'Build', totalKm: 0, days: days as Record<Weekday, Session> });
  }

  // final day celebration
  if (weeks.length) {
    const last = weeks[weeks.length - 1];
    const pbDay = (['sun', 'sat'].find(d => available.includes(d as Weekday)) as Weekday) ?? available[available.length - 1] ?? 'sun';
    last.days[pbDay] = { type: 'sport', title: 'Congratulations — completed!', detail: 'You made it — nice work. Time to pick your next plan!', completed: false };
  }

  const leadIn = buildLeadInWeek(cfg.startDate, () => restDay());
  if (leadIn) { leadIn.focus = 'Lead-in — a few days before Week 1 begins on Monday.'; weeks.unshift(leadIn); }

  return { weeks, customConfig: cfg };
}

// ---------- single-sport plans (session types on chosen days) ----------
// A single session-type instance placed on a day (used by both modes).
function sportSession(sessionType: string, cfg: SportConfig, durMin?: number, durMax?: number): Session {
  if (sessionType === 'rest') return restDay();
  if (sessionType === 'crosstrain') return crosstrain();
  const dur = durMin != null && durMax != null ? randInt(durMin, durMax) : (durMin ?? durMax ?? undefined);
  const stLabel = SPORT_SESSION_LABELS[sessionType] ?? sessionType;
  return {
    type: 'sport', exerciseType: cfg.exerciseType, subType: cfg.sportSubType, sportSessionType: sessionType,
    title: `${cfg.sportLabel} — ${stLabel}`, timeMin: dur,
    detail: `${cfg.sportLabel} ${stLabel.toLowerCase()} session${dur ? ` · ${dur} min` : ''}.`,
  };
}

// Merge multiple sessions landing on one day (cram mode) into one combined entry.
function combineSportSessions(list: Session[], cfg: SportConfig): Session {
  if (list.length === 1) return list[0];
  const parts = list.map(s => s.title.includes('—') ? s.title.split('—').pop()!.trim() : s.title);
  const totalMin = list.reduce((t, s) => t + (s.timeMin || 0), 0) || undefined;
  return {
    type: 'sport', exerciseType: cfg.exerciseType, subType: cfg.sportSubType, sportSessionType: 'mixed',
    title: `${cfg.sportLabel} — ${parts.join(' + ')}`, timeMin: totalMin,
    detail: list.map(s => s.detail).join('\n'),
  };
}

/** Build a single-sport plan (per-day template, or pick-and-randomise). */
export function generateSportPlan(cfg: SportConfig): PlanData {
  const weeks: PlanWeek[] = [];

  if (cfg.assignMode === 'random') {
    // one entry per session instance for a single week
    const perWeek: SportPoolItem[] = [];
    for (const p of cfg.pool) for (let i = 0; i < Math.max(1, p.count); i++) perWeek.push(p);

    // spread='weeks': cycle the pool across weeks (<=7/week, 1 per day).
    // spread='cram' (or <=7/week): every week gets the full pool, packing days if >7.
    let cursor = 0;
    for (let w = 0; w < cfg.weeks; w++) {
      let items: SportPoolItem[];
      if (cfg.spread === 'weeks' && perWeek.length > 7) {
        items = [];
        for (let i = 0; i < 7 && perWeek.length; i++) { items.push(perWeek[cursor % perWeek.length]); cursor++; }
      } else {
        items = perWeek;
      }
      const sessions = items.map(p => sportSession(p.sessionType, cfg, p.durationMin, p.durationMax));
      const days: Partial<Record<Weekday, Session>> = {};
      const shuffled = pickN(WEEKDAYS, 7); // random order of all 7 days
      const buckets = Object.fromEntries(WEEKDAYS.map(d => [d, [] as Session[]])) as Record<Weekday, Session[]>;
      sessions.forEach((s, i) => { buckets[shuffled[i % 7]].push(s); });
      for (const d of WEEKDAYS) days[d] = buckets[d].length ? combineSportSessions(buckets[d], cfg) : restDay();
      weeks.push({ weekNumber: w + 1, phase: 'Build', totalKm: 0, days: days as Record<Weekday, Session> });
    }
  } else {
    // per-day template repeats each week (a day may hold multiple sessions)
    for (let w = 0; w < cfg.weeks; w++) {
      const days: Partial<Record<Weekday, Session>> = {};
      for (const d of WEEKDAYS) {
        const daySess = cfg.sessions.filter(s => s.day === d);
        if (daySess.length === 0) days[d] = restDay();
        else {
          const built = daySess.map(s => sportSession(s.sessionType, cfg, s.durationMin, s.durationMax));
          days[d] = built.length === 1 ? built[0] : combineSportSessions(built, cfg);
        }
      }
      weeks.push({ weekNumber: w + 1, phase: 'Build', totalKm: 0, days: days as Record<Weekday, Session> });
    }
  }

  // final day celebration on the last active weekday
  if (weeks.length) {
    const last = weeks[weeks.length - 1];
    const activeDay = [...WEEKDAYS].reverse().find(d => isRunSession(last.days[d])) ?? 'sun';
    last.days[activeDay] = { type: 'sport', title: 'Congratulations — completed!', detail: 'You made it — nice work. Time to pick your next plan!', completed: false };
  }

  // Lead-in Week 0: mirror a normal week onto the lead-in days (both per-day and
  // random modes), so a plan starting mid-week already shows real sessions.
  const refDays = weeks[0]?.days;
  const leadIn = buildLeadInWeek(cfg.startDate, (d) => refDays ? { ...refDays[d], completed: false, completedActivityId: null } : restDay());
  if (leadIn) { leadIn.focus = 'Lead-in — your first few days before Week 1 begins on Monday.'; weeks.unshift(leadIn); }

  return { weeks, sportConfig: cfg };
}

// ---------- difficulty switching ----------
// Returns a harder or easier variant of a session, or the original when reset.
export function switchDifficulty(session: Session, dir: 'easier' | 'harder' | 'reset', cfg: PlanConfig): Session {
  if (dir === 'reset') { const { variant, ...rest } = session; return { ...rest, variant: null }; }
  const scale = dir === 'harder' ? 1.25 : 0.75;
  const next: Session = { ...session, variant: dir };
  if (next.distanceKm) next.distanceKm = round(next.distanceKm * scale, 0.5);
  if (next.timeMin) next.timeMin = Math.round(next.timeMin * scale);
  if (next.estKm) next.estKm = round(next.estKm * scale, 0.5);
  if (next.repLabel) {
    next.repLabel = next.repLabel.replace(/^(\d+)/, m => String(Math.max(1, Math.round(parseInt(m, 10) * scale))));
  }
  // Hill reps can escalate to a trail run (the hardest option).
  if (session.type === 'hill_reps' && dir === 'harder') {
    return { ...trailRun(round((session.distanceKm || session.estKm || 6) * 1.2, 0.5)), variant: 'harder' };
  }
  const tag = dir === 'harder' ? ' (harder)' : ' (easier)';
  next.detail = session.detail + tag;
  return next;
}

/** Sessions that count as a run for completion / prefill purposes. */
export function isRunSession(s: Session): boolean {
  return s.type !== 'rest' && s.type !== 'crosstrain';
}

/** Map a plan session type to the app's RunType key (string). */
export function sessionRunType(type: SessionType): string | null {
  const map: Record<string, string> = {
    easy: 'easy', recovery: 'easy', long: 'long', tempo: 'tempo', fartlek: 'fartlek',
    progression: 'tempo', sprint_reps: 'speed_intervals', hill_reps: 'hill_reps',
    trail: 'trail', long_intervals: 'long_intervals',
  };
  return map[type] ?? null;
}

/** Build the /add prefill href for logging a plan session. */
export function planSessionHref(s: Session, planId: string, week: number, day: Weekday): string {
  const p = new URLSearchParams();
  p.set('title', s.title);
  const exType = s.type === 'sport' && s.exerciseType ? s.exerciseType : 'run';
  p.set('type', exType);
  if (exType === 'run') {
    const rt = sessionRunType(s.type);
    if (rt) p.set('runType', rt);
  }
  if (s.subType) p.set('subType', s.subType);
  if (s.distanceKm) p.set('distance', String(s.distanceKm));
  if (s.timeMin) p.set('time', String(s.timeMin));
  p.set('planId', planId);
  p.set('week', String(week));
  p.set('day', day);
  return `/add?${p.toString()}`;
}

// All date math below works purely in UTC (parse → operate → format) so it is
// timezone-independent. Using local `new Date(x+'T00:00:00')` + `.toISOString()`
// is NOT safe: in timezones ahead of UTC (e.g. NZT) the round-trip can fail to
// advance the date, causing an infinite loop in nextSession(). Keep this UTC-only.
function utcDate(dateISO: string): Date {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function addDaysISO(dateISO: string, days: number): string {
  const d = utcDate(dateISO);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}
function daysBetween(aISO: string, bISO: string): number {
  return Math.round((utcDate(bISO).getTime() - utcDate(aISO).getTime()) / 86400000);
}
function weekdayOf(dateISO: string): Weekday {
  const jsDay = utcDate(dateISO).getUTCDay(); // 0 Sun .. 6 Sat
  return (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as Weekday[])[jsDay];
}

/** The Monday on/after the given date (same date if it's already a Monday). */
function firstMonday(dateISO: string): string {
  const jsDay = utcDate(dateISO).getUTCDay(); // 0 Sun .. 6 Sat
  const diff = jsDay === 1 ? 0 : jsDay === 0 ? 1 : 8 - jsDay;
  return addDaysISO(dateISO, diff);
}

/**
 * A partial "Week 0" covering the lead-in days between a non-Monday start
 * date and the following Monday, when the real Week 1 begins. Returns null
 * if the plan already starts on a Monday (no lead-in needed).
 */
function buildLeadInWeek(startDate: string, sessionForLeadIn: (day: Weekday) => Session): PlanWeek | null {
  const anchor = firstMonday(startDate);
  if (anchor === startDate) return null;
  const leadInDays: Weekday[] = [];
  for (let d = startDate; d < anchor; d = addDaysISO(d, 1)) leadInDays.push(weekdayOf(d));
  const days: Partial<Record<Weekday, Session>> = {};
  for (const d of WEEKDAYS) {
    days[d] = leadInDays.includes(d) ? sessionForLeadIn(d) : { type: 'rest', title: '', detail: '', completed: false, beforeStart: true };
  }
  const full = days as Record<Weekday, Session>;
  return { weekNumber: 0, phase: 'Base', totalKm: round(sumKm(full), 0.5), days: full };
}

type PlanLike = { plan_data: PlanData; start_date: string; weeks: number };

/** Resolve which {weekNumber, day} a calendar date falls on, or null if outside the plan's range. */
function planDateIndex(plan: PlanLike, dateISO: string): { weekNumber: number; day: Weekday } | null {
  if (dateISO < plan.start_date) return null;
  const anchor = firstMonday(plan.start_date);
  if (dateISO < anchor) return { weekNumber: 0, day: weekdayOf(dateISO) };
  const daysSinceAnchor = daysBetween(anchor, dateISO);
  const weekIdx = Math.floor(daysSinceAnchor / 7);
  if (weekIdx >= plan.weeks) return null;
  return { weekNumber: weekIdx + 1, day: weekdayOf(dateISO) };
}

/** The calendar date of the last day of a plan's final (real) week. */
export function planEndDateISO(plan: PlanLike): string {
  const anchor = firstMonday(plan.start_date);
  return addDaysISO(anchor, plan.weeks * 7 - 1);
}

/** Today's session for a plan, given its start date, or null if out of range. */
export function todaysSession(plan: PlanLike, todayISO: string):
  { week: number; day: Weekday; session: Session } | null {
  const pos = planDateIndex(plan, todayISO);
  if (!pos) return null;
  const week = plan.plan_data.weeks.find(w => w.weekNumber === pos.weekNumber);
  if (!week) return null;
  return { week: pos.weekNumber, day: pos.day, session: week.days[pos.day] };
}

/**
 * The next matching session on or after `fromISO` (optionally strictly after).
 * Scans calendar days forward through the plan.
 */
export function nextSession(
  plan: PlanLike, fromISO: string,
  match: (s: Session) => boolean,
  opts: { after?: boolean; includeCompleted?: boolean } = {},
): { week: number; day: Weekday; session: Session; dateISO: string } | null {
  const endISO = planEndDateISO(plan);
  let d = fromISO < plan.start_date ? plan.start_date : fromISO;
  if (opts.after) d = addDaysISO(d, 1);
  // Hard cap on iterations as a defensive backstop against any date-math bug —
  // a plan can never span more than weeks*7 + a lead-in week of days.
  let guard = (plan.weeks + 2) * 7 + 2;
  while (d <= endISO && guard-- > 0) {
    const pos = planDateIndex(plan, d);
    if (pos) {
      const week = plan.plan_data.weeks.find(w => w.weekNumber === pos.weekNumber);
      const s = week?.days[pos.day];
      if (s && match(s) && (opts.includeCompleted || !s.completed)) {
        return { week: pos.weekNumber, day: pos.day, session: s, dateISO: d };
      }
    }
    d = addDaysISO(d, 1);
  }
  return null;
}

/** Swap two scheduled sessions — can be within the same week or across different weeks. Pure. */
export function movePlanSession(data: PlanData, from: { week: number; day: Weekday }, to: { week: number; day: Weekday }): PlanData {
  if (from.week === to.week && from.day === to.day) return data;
  const weeks = data.weeks.map(w => (w.weekNumber === from.week || w.weekNumber === to.week) ? { ...w, days: { ...w.days } } : w);
  const fromWeek = weeks.find(w => w.weekNumber === from.week);
  const toWeek = weeks.find(w => w.weekNumber === to.week);
  if (!fromWeek || !toWeek) return data;
  const tmp = toWeek.days[to.day];
  toWeek.days[to.day] = fromWeek.days[from.day];
  fromWeek.days[from.day] = tmp;
  fromWeek.totalKm = round(sumKm(fromWeek.days), 0.5);
  toWeek.totalKm = round(sumKm(toWeek.days), 0.5);
  return { ...data, weeks };
}
