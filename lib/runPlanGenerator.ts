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
  | 'long_intervals' | 'sprint_reps' | 'hill_reps' | 'trail';

export interface Session {
  type: SessionType;
  title: string;        // display heading, e.g. "Tempo Run"
  distanceKm?: number;  // counted toward weekly total + shown
  timeMin?: number;     // if a time-based session
  detail: string;       // short description / structure text
  completed?: boolean;
  completedActivityId?: string | null;
  /** Difficulty relative to the original generated session. */
  variant?: 'easier' | 'harder' | null;
}

export type Phase = 'Base' | 'Build' | 'Peak' | 'Taper';

export interface PlanWeek {
  weekNumber: number;
  phase: Phase;
  totalKm: number;
  days: Record<Weekday, Session>;
}

export interface PlanData {
  weeks: PlanWeek[];
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

/** A saved plan row from the `training_plans` table. */
export interface PlanRecord {
  id: string;
  user_id: string;
  plan_kind: 'run';
  distance: RunDistance;
  custom_distance_km: number;
  level: PlanLevel;
  weeks: number;
  days_per_week: number;
  train_days: Weekday[];
  goal_time_seconds: number | null;
  start_distance_km: number | null;
  start_date: string;
  plan_data: PlanData;
  created_at: string;
  updated_at?: string;
}

export interface PlanConfig {
  distance: RunDistance;
  customDistanceKm?: number;
  level: PlanLevel;
  weeks: number;          // 4–16 (or more)
  daysPerWeek: number;    // 2–6 running days
  trainDays: Weekday[];   // which weekdays are available to train
  goalTimeSeconds?: number | null;
  startDistanceKm?: number | null; // week-1 total distance baseline
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
  const maxKm = longRunMaxFor(cfg);
  const startKm = Math.min(
    maxKm,
    cfg.level === 'relaxed' ? 6 : 8,
  );
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

// ---------- session builders ----------
function easyRun(cfg: PlanConfig): Session {
  if (chance(0.5)) {
    const t = pick([20, 25, 30, 35, 40, 45]);
    return { type: 'easy', title: 'Easy Run', timeMin: t, distanceKm: round(t / 6.5, 0.5),
      detail: `${t} min at a comfortable, conversational pace.` };
  }
  const km = pick([3, 4, 5, 6, 7]);
  return { type: 'easy', title: 'Easy Run', distanceKm: km,
    detail: `${km} km at a comfortable pace — you should be able to hold a conversation.` };
}

function recoveryRun(): Session {
  const km = pick([2, 3, 4]);
  return { type: 'recovery', title: 'Recovery Run', distanceKm: km,
    detail: `${km} km very easy. Let your body recover — keep it gentle.` };
}

function longRun(km: number, cfg: PlanConfig, isPeak: boolean): Session {
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
    const km = randInt(hard ? 3 : 1, hard ? 7 : 5);
    return { type: 'tempo', title: 'Tempo Run', distanceKm: km + 2,
      detail: `1 km warm-up, ${km} km at a steady "comfortably hard" pace, 1 km cooldown.` };
  }
  const min = pick(hard ? [20, 25, 30] : [10, 15, 20, 25]);
  return { type: 'tempo', title: 'Tempo Run', timeMin: min + 10, distanceKm: round((min + 10) / 6, 0.5),
    detail: `10 min warm-up, ${min} min steady at "comfortably hard", 5 min cooldown.` };
}

function fartlek(cfg: PlanConfig): Session {
  const roll = rand();
  if (roll < 0.25) {
    // pyramid fartlek: 1-2-3-4-5-4-3-2-1 min fast with slow floats between
    return { type: 'fartlek', title: 'Fartlek (Pyramid)', distanceKm: round(6.5, 0.5),
      detail: '5:00 warm-up, then a pyramid:\n1 min fast / 1 min slow\n2 min fast / 2 min slow\n3 min fast / 2 min slow\n4 min fast / 2 min slow\n5 min fast / 2 min slow\n4 min fast / 2 min slow\n3 min fast / 2 min slow\n2 min fast / 2 min slow\n1 min fast / 1 min slow\n5:00 cooldown.' };
  }
  if (roll < 0.7) {
    const opts: [number, string, number][] = [
      [30, '30 sec', 20], [60, '1 min', 12], [90, '90 sec', 10], [120, '2 min', 8],
    ];
    const [, label, maxReps] = pick(opts);
    const reps = randInt(Math.max(6, Math.round(maxReps * 0.5)), maxReps);
    return { type: 'fartlek', title: 'Fartlek', distanceKm: round(reps * 0.4 + 2, 0.5),
      detail: `5:00 warm-up, then ${reps} x ${label} fast with 1:00 easy recovery between.` };
  }
  const min = pick([20, 25, 30, 35]);
  return { type: 'fartlek', title: 'Fartlek', timeMin: min, distanceKm: round(min / 6, 0.5),
    detail: `${min} min steady — at random moments pick a point ahead and surge to it as fast as you can.` };
}

function progression(km: number): Session {
  return { type: 'progression', title: 'Progression Run', distanceKm: km,
    detail: `${km} km steady, increasing your pace each km. Your last km should be your fastest.` };
}

function longIntervals(): Session {
  if (chance(0.35)) {
    // multi-block session
    const blocks = pick([
      ['1 km warm-up', '2 x 2 km', '2 x 600 m', 'walk 1 min between reps', '1 km cooldown'],
      ['5 min warm-up', '3 x 800 m', '4 x 400 m', '200 m walk between reps', '5 min cooldown'],
      ['1 km warm-up', '4 x 800 m', '2 x 400 m', 'walk 90 sec between reps', '1 km cooldown'],
    ]);
    const km = round(randInt(7, 11), 0.5);
    return { type: 'long_intervals', title: 'Long Intervals', distanceKm: km, detail: blocks.join('\n') };
  }
  const options: [string, number][] = [['400 m', 10], ['800 m', 8], ['1 km', 7], ['1.5 km', 5]];
  const [dist, maxReps] = pick(options);
  const reps = randInt(3, maxReps);
  const km = round(reps * (dist === '400 m' ? 0.6 : dist === '800 m' ? 1.0 : dist === '1 km' ? 1.2 : 1.7) + 2, 0.5);
  return { type: 'long_intervals', title: 'Long Intervals', distanceKm: km,
    detail: `1 km warm-up, ${reps} x ${dist} at ~75% intensity with a jog recovery between, 1 km cooldown.` };
}

function sprintReps(cfg: PlanConfig): Session {
  const pool = [
    'shuttle runs (5 m & back, 10 m & back, 15 m & back, 20 m & back)',
    'pyramid runs (10 m, 20 m, 30 m, 20 m, 10 m)',
    '50 m sprints',
    '100 m sprints',
    '200 m sprints',
  ];
  const types = pickN(pool, randInt(1, 3));
  const reps = randInt(cfg.level === 'tough' ? 10 : 5, cfg.level === 'tough' ? 20 : 14);
  return { type: 'sprint_reps', title: 'Sprint Reps', distanceKm: round(reps * 0.25 + 1.5, 0.5),
    detail: `Warm-up, then ${reps} reps: ${types.join(', ')}. Full recovery between reps.` };
}

function hillReps(cfg: PlanConfig): Session {
  const kind = pick(['long', 'short', 'time'] as const);
  if (kind === 'long') {
    const reps = randInt(2, 3);
    const lo = pick([1, 1.5]); const hi = lo + pick([0.5, 1, 1.5]);
    return { type: 'hill_reps', title: 'Hill Repeats', distanceKm: round(reps * hi + 2, 0.5),
      detail: `${reps} x ${lo}–${hi} km uphill at a strong effort, jog back down to recover.` };
  }
  if (kind === 'short') {
    const reps = randInt(5, 10);
    const lo = pick([100, 200]); const hi = lo + 100;
    return { type: 'hill_reps', title: 'Hill Repeats', distanceKm: round(reps * (hi / 1000) * 2 + 1.5, 0.5),
      detail: `${reps} x ${lo}–${hi} m uphill fast, jog/walk back down to recover.` };
  }
  const opts = ['30 sec', '45–60 sec', '1 min'];
  const t = pick(opts);
  const reps = t === '30 sec' ? randInt(5, 12) : randInt(5, 8);
  return { type: 'hill_reps', title: 'Hill Repeats', distanceKm: round(reps * 0.35 + 1.5, 0.5),
    detail: `${reps} x ${t} uphill at a strong effort, jog/walk back down between.` };
}

function trailRun(km: number): Session {
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
function qualityCount(cfg: PlanConfig): number {
  let n = cfg.daysPerWeek <= 3 ? 1 : cfg.daysPerWeek === 4 ? (chance(0.5) ? 1 : 2) : 2;
  if (cfg.level === 'tough' && cfg.daysPerWeek >= 4) n += 1;
  if (cfg.level === 'relaxed') n = Math.min(n, cfg.daysPerWeek <= 3 ? 1 : 1);
  return Math.min(n, Math.max(0, cfg.daysPerWeek - 1)); // leave room for the long run
}

function buildQualitySessions(cfg: PlanConfig, weekIdx: number, phase: Phase): Session[] {
  const n = qualityCount(cfg);
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
  const runDays = Math.min(cfg.daysPerWeek, cfg.trainDays.length);

  // Build the list of run sessions for the week.
  const sessions: Session[] = [];
  const isTaper = phase === 'Taper';

  // Long run (sometimes a trail run on higher levels / non-taper weeks).
  if (cfg.distance !== 'speed' || runDays >= 3) {
    if (cfg.level !== 'relaxed' && !isTaper && chance(0.15)) sessions.push(trailRun(longKm));
    else sessions.push(longRun(longKm, cfg, phase === 'Peak'));
  }

  // Quality sessions (reduced during taper).
  const qs = isTaper ? buildQualitySessions(cfg, weekIdx, phase).slice(0, 1) : buildQualitySessions(cfg, weekIdx, phase);
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

  // Long run → prefer a weekend day.
  const longSession = sessions.find(s => s.type === 'long' || s.type === 'trail');
  const weekendPref: Weekday[] = ['sun', 'sat'];
  let longDay: Weekday | undefined;
  if (longSession) {
    longDay = weekendPref.find(d => available.includes(d)) ?? available[available.length - 1];
    days[longDay] = longSession;
  }

  // Remaining sessions spread across the other available days, spacing quality apart.
  const remaining = sessions.filter(s => s !== longSession);
  const openDays = available.filter(d => d !== longDay);
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

  // ----- scale week-1 total to the requested starting distance -----
  let totalKm = sumKm(full);
  if (weekIdx === 0 && cfg.startDistanceKm && totalKm > 0) {
    const factor = cfg.startDistanceKm / totalKm;
    for (const d of WEEKDAYS) {
      const s = full[d];
      if (s.distanceKm) { s.distanceKm = round(s.distanceKm * factor, 0.5); }
    }
    totalKm = sumKm(full);
  }

  return { weekNumber: weekIdx + 1, phase, totalKm: round(totalKm, 0.5), days: full };
}

function sumKm(days: Record<Weekday, Session>): number {
  return WEEKDAYS.reduce((s, d) => s + (days[d].distanceKm || 0), 0);
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

// ---------- public API ----------
export function generateRunPlan(cfg: PlanConfig): PlanData {
  const weeks: PlanWeek[] = [];
  for (let i = 0; i < cfg.weeks; i++) weeks.push(assignWeek(cfg, i));
  const plan: PlanData = { weeks };
  applyFinalDay(plan, cfg);
  return plan;
}

// ---------- difficulty switching ----------
// Returns a harder or easier variant of a session, or the original when reset.
export function switchDifficulty(session: Session, dir: 'easier' | 'harder' | 'reset', cfg: PlanConfig): Session {
  if (dir === 'reset') { const { variant, ...rest } = session; return { ...rest, variant: null }; }
  const scale = dir === 'harder' ? 1.25 : 0.75;
  const next: Session = { ...session, variant: dir };
  if (next.distanceKm) next.distanceKm = round(next.distanceKm * scale, 0.5);
  if (next.timeMin) next.timeMin = Math.round(next.timeMin * scale);
  // Hill reps can escalate to a trail run (the hardest option).
  if (session.type === 'hill_reps' && dir === 'harder') {
    return { ...trailRun(round((session.distanceKm || 6) * 1.2, 0.5)), variant: 'harder' };
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
  p.set('type', 'run');
  const rt = sessionRunType(s.type);
  if (rt) p.set('runType', rt);
  if (s.distanceKm) p.set('distance', String(s.distanceKm));
  if (s.timeMin) p.set('time', String(s.timeMin));
  p.set('planId', planId);
  p.set('week', String(week));
  p.set('day', day);
  return `/add?${p.toString()}`;
}

/** Today's session for a plan, given its start date, or null if out of range. */
export function todaysSession(plan: { plan_data: PlanData; start_date: string; weeks: number }, todayISO: string):
  { week: number; day: Weekday; session: Session } | null {
  const daysSince = Math.floor((new Date(todayISO + 'T00:00:00').getTime() - new Date(plan.start_date + 'T00:00:00').getTime()) / 86400000);
  if (daysSince < 0) return null;
  const weekIdx = Math.floor(daysSince / 7);
  if (weekIdx >= plan.weeks) return null;
  const jsDay = new Date(todayISO + 'T00:00:00').getDay(); // 0 Sun .. 6 Sat
  const day = (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as Weekday[])[jsDay];
  const week = plan.plan_data.weeks[weekIdx];
  if (!week) return null;
  return { week: week.weekNumber, day, session: week.days[day] };
}
