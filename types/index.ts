export type ExerciseType =
  | 'run'
  | 'sport'
  | 'hiit'
  | 'solo_fitness'
  | 'bike'
  | 'swim'
  | 'walk'
  | 'stretch'
  | 'water'
  | 'snow';

// Display order for UI
export const EXERCISE_TYPE_ORDER: ExerciseType[] = ['run', 'sport', 'hiit', 'solo_fitness', 'bike', 'swim', 'walk', 'stretch', 'water', 'snow'];

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  run: 'Run',
  sport: 'Sport',
  hiit: 'Gym Workout',
  solo_fitness: 'Fitness Training',
  bike: 'Bike',
  swim: 'Swim',
  walk: 'Walk / Hike',
  stretch: 'Stretch',
  water: 'Water',
  snow: 'Snow',
};

// Default emoji per exercise type — used unless a subtype below overrides it.
export const EXERCISE_TYPE_EMOJI: Record<ExerciseType, string> = {
  run: '🏃', sport: '🎽', hiit: '🏋️', solo_fitness: '💪', bike: '🚲', swim: '🏊', walk: '🚶', stretch: '🧘', water: '🌊', snow: '❄️',
};

// A handful of subtypes/run-styles get their own more specific emoji instead of
// inheriting their parent exercise type's default.
const SUBTYPE_EMOJI_OVERRIDES: Record<string, string> = {
  pool: '🏊‍♂️',
  snowboard: '🏂',
  skiing: '⛷️',
  beach: '🏃🏽‍♀️',
  football: '⚽',
  tennis: '🎾',
  netball: '🏐',
  volleyball: '🤾',
  golf: '⛳',
  turbo_touch: '🤾🏽‍♀️',
  padel: '👟',
  touch_rugby: '🫳',
  basketball: '🏀',
  cricket: '🏏',
  badminton: '🏸',
  rugby: '🏉',
  hockey: '🏑',
  frisbee: '🥏',
  table_tennis: '🏓',
  // Gym Workout subtypes
  hiit_workout: '🔥',
  strength: '🏋️',
  conditioning: '⚡',
  crossfit: '🏋️‍♀️',
  hyrox: '🏆',
  arms: '💪',
  legs: '🦵',
  back_shoulders: '🦍',
  core: '👊',
  row_indoor: '🚣',
  stair_climber: '🪜',
  ski_erg: '🎿',
  // Fitness Training subtypes
  boxing: '🥊',
  jump_rope: '🪢',
  dance: '🧑🏽‍🩰',
  skateboard: '🛹',
  rock_climbing: '🧗',
  trampoline: '🤸',
  martial_arts: '🥋',
  cleaning: '🧹',
  // Water subtypes
  kayak: '🛶',
  sailing: '⛵',
  surf: '🏄',
  rowing: '🚣‍♀️',
  waka_ama: '🏝️',
  sup: '🛥️',
  polo: '🤽',
  boogie_boarding: '🏖️',
  windsurfing: '🌬️',
  kitesurfing: '🪁',
  wakeboarding: '🚤',
  waterskiing: '🛟',
  diving: '🤿',
  spear_fishing: '🔱',
  fishing: '🎣',
  canyoning: '🧗‍♀️',
  coasteering: '🪨',
  rafting: '🛟',
  // Snow subtypes
  sledding: '🛷',
  skating: '⛸️',
  // Swim subtypes
  water_jogging: '💦',
  aqua_aerobics: '💧',
  // Fitness Training subtypes
  gymnastics: '🤸‍♂️',
  calisthenics: '🤸🏽',
  sandboarding: '🐫',
  unicycling: '🛞',
  archery: '🏹',
  slack_lining: '🤹',
  rollerskate: '🛼',
  abseiling: '🧗',
  athletics: '🏟️',
};

export function activityEmoji(type: ExerciseType, subtype?: string | null): string {
  if (subtype && SUBTYPE_EMOJI_OVERRIDES[subtype]) return SUBTYPE_EMOJI_OVERRIDES[subtype];
  return EXERCISE_TYPE_EMOJI[type];
}

export const EXERCISE_TYPE_COLORS: Record<ExerciseType, string> = {
  run: '#3B82F6',
  sport: '#84CC16',
  hiit: '#EF4444',
  solo_fitness: '#A855F7',
  bike: '#EAB308',
  swim: '#06B6D4',
  walk: '#F97316',
  stretch: '#22C55E',
  water: '#0EA5E9',
  snow: '#CBD5E1',
};

export type RunType = 'long' | 'easy' | 'tempo' | 'fartlek' | 'speed_intervals' | 'hill_reps' | 'trail' | 'long_intervals' | 'push_buggy' | 'treadmill' | 'beach' | 'track' | 'road' | 'urban' | 'cross_country';

export const RUN_TYPE_LABELS: Record<RunType, string> = {
  long: 'Long',
  easy: 'Easy',
  tempo: 'Tempo',
  fartlek: 'Fartlek',
  speed_intervals: 'Sprint Reps',
  hill_reps: 'Hill Reps',
  trail: 'Trail',
  long_intervals: 'Long Intervals',
  push_buggy: 'Push Buggy',
  treadmill: 'Treadmill',
  beach: 'Beach',
  track: 'Track',
  road: 'Road',
  urban: 'Urban',
  cross_country: 'Cross Country',
};

export const RUN_TYPE_COLORS: Record<RunType, string> = {
  easy: '#93C5FD',
  long: '#3B82F6',
  tempo: '#1D4ED8',
  fartlek: '#60A5FA',
  speed_intervals: '#1E40AF',
  hill_reps: '#2563EB',
  trail: '#BFDBFE',
  treadmill: '#7C3AED',
  long_intervals: '#1E3A8A',
  push_buggy: '#7DD3FC',
  beach: '#FBBF24',
  track: '#F472B6',
  road: '#94A3B8',
  urban: '#22C55E',
  cross_country: '#84CC16',
};

// Run types split into two independently-selectable groups: pick at most one from each.
// e.g. Treadmill + Easy -> "Treadmill - Easy Run". Either group alone is also valid on its own
// (e.g. just Push Buggy, or just Fartlek).
export const RUN_TYPE_TERRAIN: RunType[] = ['treadmill', 'trail', 'push_buggy', 'beach', 'urban', 'road', 'track', 'cross_country'];
export const RUN_TYPE_WORKOUT: RunType[] = ['easy', 'long', 'tempo', 'fartlek', 'speed_intervals', 'hill_reps', 'long_intervals'];

/** Combined display label for a run's two optional type fields, workout first then
 *  style, e.g. "Tempo - Treadmill", or just "Push Buggy" / "Fartlek" when only one is
 *  set. No trailing "Run" — the exercise-type badge already shows that. */
export function combinedRunTypeLabel(runType?: RunType | null, runTypeModifier?: RunType | null): string | null {
  if (runType && runTypeModifier) {
    const terrain = RUN_TYPE_TERRAIN.includes(runTypeModifier) ? runTypeModifier : runType;
    const workout = terrain === runType ? runTypeModifier : runType;
    return `${RUN_TYPE_LABELS[workout]} - ${RUN_TYPE_LABELS[terrain]}`;
  }
  if (runType) return RUN_TYPE_LABELS[runType];
  if (runTypeModifier) return RUN_TYPE_LABELS[runTypeModifier];
  return null;
}

// --- Subtypes (all optional) ---

export type SportSubType = 'football' | 'tennis' | 'netball' | 'volleyball' | 'golf' | 'turbo_touch' | 'padel' | 'touch_rugby' | 'basketball' | 'cricket' | 'badminton' | 'rugby' | 'hockey' | 'frisbee' | 'table_tennis';
export type SportFocus = 'game' | 'training' | 'skills' | 'conditioning' | 'recovery' | 'competition' | 'casual' | 'warm_up';
export type SportStyle = 'indoor' | 'outdoor' | 'grass' | 'turf' | 'clay_dirt' | 'rooftop' | 'water' | 'beach';
export type GymSubType = 'hiit_workout' | 'strength' | 'conditioning' | 'crossfit' | 'hyrox' | 'arms' | 'legs' | 'back_shoulders' | 'core' | 'row_indoor' | 'stair_climber' | 'ski_erg';
export type WaterSubType = 'kayak' | 'sailing' | 'surf' | 'rowing' | 'waka_ama' | 'sup' | 'polo' | 'boogie_boarding' | 'bodysurfing' | 'windsurfing' | 'kitesurfing' | 'wakeboarding' | 'waterskiing' | 'diving' | 'spear_fishing' | 'fishing' | 'canyoning' | 'coasteering' | 'rafting';
export type WaterStyle = 'recreational' | 'training' | 'competition' | 'whitewater' | 'hydrofoil' | 'park';
export type SnowSubType = 'snowboard' | 'skiing' | 'sledding' | 'skating';
export type SnowStyle = 'downhill' | 'cross_country' | 'half_pipe' | 'freestyle' | 'recreational' | 'training' | 'competition';
export type SwimSubType = 'ocean' | 'pool' | 'water_jogging' | 'aqua_aerobics';
export type SwimFocus = 'endurance' | 'sprint' | 'technique' | 'power' | 'recovery' | 'distance' | 'interval_set' | 'time_trial';
export type SwimStyle = 'mixed' | 'freestyle' | 'backstroke' | 'breaststroke' | 'butterfly' | 'im' | 'kick_only' | 'pull_only';
export type FitnessSubType = 'boxing' | 'jump_rope' | 'dance' | 'skateboard' | 'rock_climbing' | 'trampoline' | 'martial_arts' | 'cleaning' | 'gymnastics' | 'calisthenics' | 'sandboarding' | 'unicycling' | 'archery' | 'slack_lining' | 'rollerskate' | 'abseiling' | 'athletics';
export type BikeSubType = 'mtb' | 'road' | 'mixed_terrain' | 'commute' | 'electric' | 'indoor_spin' | 'bmx' | 'track' | 'bikepacking';
export type StretchSubType = 'pilates' | 'flexibility' | 'physio';
export type WalkSubType = 'multi_day' | 'outdoor' | 'treadmill' | 'speed' | 'stroll' | 'beach' | 'push_buggy';

export const SPORT_SUB_LABELS: Record<SportSubType, string> = {
  football: 'Football', tennis: 'Tennis', netball: 'Netball', volleyball: 'Volleyball',
  golf: 'Golf', turbo_touch: 'Turbo Touch', padel: 'Padel', touch_rugby: 'Touch Rugby',
  basketball: 'Basketball', cricket: 'Cricket', badminton: 'Badminton', rugby: 'Rugby',
  hockey: 'Hockey', frisbee: 'Frisbee', table_tennis: 'Table Tennis',
};
export const SPORT_FOCUS_LABELS: Record<SportFocus, string> = {
  game: 'Game / Match', training: 'Training', skills: 'Skills', conditioning: 'Conditioning', recovery: 'Recovery',
  // key stays 'competition' so already-saved activities keep their label
  competition: 'Tournament', casual: 'Casual', warm_up: 'Warm-up',
};
export const SPORT_STYLE_LABELS: Record<SportStyle, string> = {
  indoor: 'Indoor', outdoor: 'Outdoor', grass: 'Grass', turf: 'Turf', clay_dirt: 'Clay / Dirt',
  rooftop: 'Rooftop', water: 'Water', beach: 'Beach',
};
export const GYM_SUB_LABELS: Record<GymSubType, string> = {
  hiit_workout: 'HIIT', strength: 'Strength', conditioning: 'Conditioning',
  crossfit: 'CrossFit', hyrox: 'Hyrox', arms: 'Arms', legs: 'Legs',
  back_shoulders: 'Back & Shoulders', core: 'Core', row_indoor: 'Row Indoor',
  stair_climber: 'Stair Climber', ski_erg: 'Ski Erg',
};
export const WATER_SUB_LABELS: Record<WaterSubType, string> = {
  kayak: 'Kayak', sailing: 'Sailing', surf: 'Surf', rowing: 'Rowing', waka_ama: 'Waka Ama', sup: 'SUP',
  polo: 'Polo', boogie_boarding: 'Boogie-Boarding', bodysurfing: 'Bodysurfing', windsurfing: 'Windsurfing',
  kitesurfing: 'Kitesurfing', wakeboarding: 'Wakeboarding', waterskiing: 'Waterskiing', diving: 'Diving',
  spear_fishing: 'Spear Fishing', fishing: 'Fishing', canyoning: 'Canyoning', coasteering: 'Coasteering',
  rafting: 'Rafting',
};
export const WATER_STYLE_LABELS: Record<WaterStyle, string> = {
  recreational: 'Recreational', training: 'Training', competition: 'Competition',
  whitewater: 'Whitewater', hydrofoil: 'Hydrofoil', park: 'Park',
};
export const SNOW_SUB_LABELS: Record<SnowSubType, string> = {
  snowboard: 'Snowboard', skiing: 'Skiing', sledding: 'Sledding', skating: 'Skating',
};
export const SNOW_STYLE_LABELS: Record<SnowStyle, string> = {
  downhill: 'Downhill', cross_country: 'Cross-country', half_pipe: 'Half-pipe', freestyle: 'Freestyle',
  recreational: 'Recreational', training: 'Training', competition: 'Competition',
};
export const SWIM_SUB_LABELS: Record<SwimSubType, string> = {
  ocean: 'Ocean', pool: 'Pool', water_jogging: 'Water Jogging', aqua_aerobics: 'Aqua Aerobics',
};
export const SWIM_FOCUS_LABELS: Record<SwimFocus, string> = {
  endurance: 'Endurance', sprint: 'Sprint', technique: 'Technique', power: 'Power', recovery: 'Recovery',
  distance: 'Distance', interval_set: 'Interval Set', time_trial: 'Time Trial',
};
export const SWIM_STYLE_LABELS: Record<SwimStyle, string> = {
  mixed: 'Mixed', freestyle: 'Freestyle', backstroke: 'Backstroke', breaststroke: 'Breaststroke', butterfly: 'Butterfly', im: 'Individual Medley',
  kick_only: 'Kick-only', pull_only: 'Pull-only',
};
export const FITNESS_SUB_LABELS: Record<FitnessSubType, string> = {
  boxing: 'Boxing', jump_rope: 'Jump Rope', dance: 'Dance', skateboard: 'Skateboard',
  rock_climbing: 'Rock Climbing', trampoline: 'Trampoline', martial_arts: 'Martial Arts', cleaning: 'Cleaning',
  gymnastics: 'Gymnastics', calisthenics: 'Calisthenics', sandboarding: 'Sandboarding', unicycling: 'Unicycling',
  archery: 'Archery', slack_lining: 'Slacklining',
  rollerskate: 'Rollerskate', abseiling: 'Abseiling', athletics: 'Athletics',
};
export const BIKE_SUB_LABELS: Record<BikeSubType, string> = {
  mtb: 'MTB', road: 'Road', mixed_terrain: 'Mixed Terrain', commute: 'Commute', electric: 'Electric',
  indoor_spin: 'Indoor Spin', bmx: 'BMX', track: 'Track', bikepacking: 'Bikepacking',
};
export const STRETCH_SUB_LABELS: Record<StretchSubType, string> = {
  pilates: 'Pilates', flexibility: 'Flexibility', physio: 'Physio',
};
export const WALK_SUB_LABELS: Record<WalkSubType, string> = {
  multi_day: 'Multi-day', outdoor: 'Outdoor', treadmill: 'Treadmill', speed: 'Speed', stroll: 'Stroll',
  beach: 'Beach', push_buggy: 'Push Buggy',
};

// All subtype labels in one map + a helper to display a (possibly comma-joined) sub_type value.
const ALL_SUB_LABELS: Record<string, string> = {
  ...SPORT_SUB_LABELS, ...GYM_SUB_LABELS, ...WATER_SUB_LABELS, ...SNOW_SUB_LABELS, ...SWIM_SUB_LABELS,
  ...FITNESS_SUB_LABELS, ...BIKE_SUB_LABELS, ...STRETCH_SUB_LABELS, ...WALK_SUB_LABELS,
};
export function subTypeLabel(subType?: string | null): string {
  if (!subType) return '';
  return subType.split(',').map(k => ALL_SUB_LABELS[k.trim()] ?? k.trim()).join(', ');
}

/** Combined display label for a sport activity's three optional fields, e.g.
 *  "Football - Training | Turf" — sport type and focus dash-joined, style appended
 *  after a pipe. Any subset of the three can be missing. No trailing "Sport" —
 *  the exercise-type badge already shows that. */
export function combinedSportLabel(subType?: string | null, focus?: SportFocus | null, style?: SportStyle | null): string | null {
  const dashParts = [subType ? subTypeLabel(subType) : null, focus ? SPORT_FOCUS_LABELS[focus] : null].filter(Boolean);
  const base = dashParts.join(' - ');
  if (style) return base ? `${base} | ${SPORT_STYLE_LABELS[style]}` : SPORT_STYLE_LABELS[style];
  return base || null;
}

/** The type/focus part ("Football - Game / Match") and the style part ("Turf")
 *  split out, so the UI can render the style smaller / in a different colour. */
export function sportLabelParts(subType?: string | null, focus?: SportFocus | null, style?: SportStyle | null): { base: string | null; style: string | null } {
  const dashParts = [subType ? subTypeLabel(subType) : null, focus ? SPORT_FOCUS_LABELS[focus] : null].filter(Boolean);
  return { base: dashParts.join(' - ') || null, style: style ? SPORT_STYLE_LABELS[style] : null };
}

// Effort (1-11) -> % of theoretical max HR, used to seed the Max HR scroll-picker suggestion.
const MAX_HR_EFFORT_PCT: Record<number, number> = {
  1: 0.55, 2: 0.62, 3: 0.67, 4: 0.78, 5: 0.84, 6: 0.89, 7: 0.92, 8: 0.96, 9: 0.99, 10: 1.00, 11: 1.02,
};
// Effort (1-11) -> % of theoretical max HR, used to seed the Avg HR scroll-picker suggestion.
const AVG_HR_EFFORT_PCT: Record<number, number> = {
  1: 0.45, 2: 0.52, 3: 0.58, 4: 0.67, 5: 0.71, 6: 0.75, 7: 0.78, 8: 0.81, 9: 0.84, 10: 0.87, 11: 0.90,
};

/** Max HR scroll-picker starting suggestion: 208 - 0.7*age, scaled by the selected effort's %.
 *  Falls back to 175 if the profile has no age set. */
export function suggestedMaxHr(age: number | null | undefined, effort: number | null | undefined): number {
  if (!age) return 175;
  const pct = effort && MAX_HR_EFFORT_PCT[effort] ? MAX_HR_EFFORT_PCT[effort] : 1;
  return Math.round((208 - 0.7 * age) * pct);
}

/** Avg HR scroll-picker starting suggestion: same base max-HR formula, scaled by a lower
 *  effort-based %. Falls back to 128 if the profile has no age set. */
export function suggestedAvgHr(age: number | null | undefined, effort: number | null | undefined): number {
  if (!age) return 128;
  const pct = effort && AVG_HR_EFFORT_PCT[effort] ? AVG_HR_EFFORT_PCT[effort] : 0.71;
  return Math.round((208 - 0.7 * age) * pct);
}

/** A single pickable "activity" for favourites/top-5 — either a bare exercise type
 *  (key === type, e.g. "bike") or a specific subtype/run-style (key === "type:subtype",
 *  e.g. "bike:commute", "run:beach"). */
export interface FavouriteItem {
  key: string;
  type: ExerciseType;
  subtype?: string;
  label: string;
  emoji: string;
}

/** Every bare type plus every one of its subtypes (and, for Run, its Run Style options) —
 *  the full picklist for the Profile favourites editor and for matching top-5 counts back
 *  to a display label/emoji. */
export function allFavouriteItems(): FavouriteItem[] {
  const items: FavouriteItem[] = EXERCISE_TYPE_ORDER.map(type => ({
    key: type, type, label: type === 'run' ? 'Running' : EXERCISE_TYPE_LABELS[type], emoji: activityEmoji(type),
  }));
  const subMaps: [ExerciseType, Record<string, string>][] = [
    ['sport', SPORT_SUB_LABELS], ['hiit', GYM_SUB_LABELS], ['water', WATER_SUB_LABELS], ['snow', SNOW_SUB_LABELS],
    ['swim', SWIM_SUB_LABELS], ['solo_fitness', FITNESS_SUB_LABELS], ['bike', BIKE_SUB_LABELS],
    ['stretch', STRETCH_SUB_LABELS], ['walk', WALK_SUB_LABELS],
  ];
  for (const [type, map] of subMaps) {
    for (const [key, label] of Object.entries(map)) {
      items.push({ key: `${type}:${key}`, type, subtype: key, label, emoji: activityEmoji(type, key) });
    }
  }
  // Run has no free-text sub_type — its Run Style (terrain/workout) fills the same role here.
  // Subtypes of running always include "Running" in the label, e.g. "Beach Running", "Tempo Running".
  for (const key of [...RUN_TYPE_TERRAIN, ...RUN_TYPE_WORKOUT]) {
    items.push({ key: `run:${key}`, type: 'run', subtype: key, label: `${RUN_TYPE_LABELS[key]} Running`, emoji: activityEmoji('run', key) });
  }
  return items;
}

/** Counts of logged activities over the last N months, by bare type and by specific
 *  subtype (only activities that actually have one) — used for "Top 5" on Profile/Dash. */
export function topActivityCounts(activities: Activity[], months = 3) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffISO = cutoff.toISOString().split('T')[0];
  const recent = activities.filter(a => a.date >= cutoffISO);
  const registry = new Map(allFavouriteItems().map(i => [i.key, i]));

  const typeCounts = new Map<string, number>();
  const subtypeCounts = new Map<string, number>();
  for (const a of recent) {
    typeCounts.set(a.exercise_type, (typeCounts.get(a.exercise_type) || 0) + 1);
    const subKeys = a.exercise_type === 'run'
      ? [a.run_type, a.run_type_modifier].filter(Boolean) as string[]
      : (a.sub_type ? a.sub_type.split(',').map(s => s.trim()).filter(Boolean) : []);
    for (const sk of subKeys) {
      const key = `${a.exercise_type}:${sk}`;
      subtypeCounts.set(key, (subtypeCounts.get(key) || 0) + 1);
    }
  }
  const topN = (counts: Map<string, number>, n: number) =>
    Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([key, count]) => ({ item: registry.get(key) ?? { key, type: key as ExerciseType, label: key, emoji: '🏅' }, count }));

  return { topTypes: topN(typeCounts, 5), topSubtypes: topN(subtypeCounts, 5) };
}

export interface Activity {
  id: string;
  user_id: string;
  name: string;
  exercise_type: ExerciseType;
  run_type?: RunType;
  run_type_modifier?: RunType;
  sub_type?: string;
  sport_focus?: SportFocus;
  sport_style?: SportStyle;
  swim_focus?: SwimFocus;
  swim_styles?: string; // comma-joined SwimStyle keys — multi-select, like sub_type for hiit
  snow_styles?: string; // comma-joined SnowStyle keys — multi-select, like swim_styles
  water_styles?: string; // comma-joined WaterStyle keys — multi-select, like swim_styles
  duration_minutes: number;
  duration_seconds?: number; // leftover seconds (0-59) on top of duration_minutes
  effort: number;
  distance_km?: number;
  notes?: string;
  intensity_minutes?: number;
  pace_min_km?: number;
  max_pace_min_km?: number;
  elevation_gain_m?: number;
  max_hr?: number;
  avg_hr?: number;
  is_pb: boolean;
  pb_description?: string;
  note_hidden?: boolean;
  image_urls?: string[] | null;
  date: string;
  created_at: string;
}
