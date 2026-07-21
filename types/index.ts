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
  hiit: 'Workout',
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
  gym: '💪',
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
  dance: '💃🏽',
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
  body_boarding: '🏖️',
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

export type RunType = 'long' | 'easy' | 'tempo' | 'fartlek' | 'speed_intervals' | 'hill_reps' | 'trail' | 'long_intervals' | 'push_buggy' | 'treadmill' | 'beach' | 'track' | 'road' | 'urban' | 'suburban' | 'cross_country' | 'mountain';

export const RUN_TYPE_LABELS: Record<RunType, string> = {
  long: 'Long',
  easy: 'Easy',
  tempo: 'Tempo',
  fartlek: 'Fartlek',
  speed_intervals: 'Sprint Reps',
  hill_reps: 'Hill Reps',
  trail: 'Trail',
  long_intervals: 'Long Intervals',
  push_buggy: 'Push Pram',
  treadmill: 'Treadmill',
  beach: 'Beach',
  track: 'Track',
  road: 'Road',
  urban: 'Urban',
  suburban: 'Suburban',
  cross_country: 'Cross Country',
  mountain: 'Mountain',
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
  suburban: '#A3E635',
  cross_country: '#84CC16',
  mountain: '#78716C',
};

// Run types split into two independently-selectable groups: pick at most one from each.
// e.g. Treadmill + Easy -> "Treadmill - Easy Run". Either group alone is also valid on its own
// (e.g. just Push Pram, or just Fartlek).
export const RUN_TYPE_TERRAIN: RunType[] = ['treadmill', 'trail', 'push_buggy', 'beach', 'urban', 'suburban', 'road', 'track', 'cross_country', 'mountain'];
export const RUN_TYPE_WORKOUT: RunType[] = ['easy', 'long', 'tempo', 'fartlek', 'speed_intervals', 'hill_reps', 'long_intervals'];

/** Run types with scripted rest breaks between reps. Total elapsed time ÷ total distance for
 *  one of these isn't a real continuous-effort pace (the rest is baked into the total time), so
 *  these are excluded from pace-based PBs — but not from distance/duration PBs, which are still accurate. */
export const REST_BREAK_RUN_TYPES: RunType[] = ['speed_intervals', 'hill_reps', 'long_intervals'];

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
export type SportStyle = 'indoor' | 'outdoor' | 'grass' | 'turf' | 'clay_dirt' | 'rooftop' | 'water' | 'beach' | 'mountain';
export type GymSubType = 'gym' | 'hiit_workout' | 'strength' | 'conditioning' | 'crossfit' | 'hyrox' | 'arms' | 'legs' | 'back_shoulders' | 'core' | 'row_indoor' | 'stair_climber' | 'ski_erg';
export type WaterSubType = 'kayak' | 'sailing' | 'surf' | 'rowing' | 'waka_ama' | 'sup' | 'body_boarding' | 'bodysurfing' | 'windsurfing' | 'kitesurfing' | 'wakeboarding' | 'waterskiing' | 'diving' | 'spear_fishing' | 'fishing' | 'rafting' | 'canyoning' | 'coasteering';
export type WaterStyle = 'recreational' | 'training' | 'competition' | 'whitewater' | 'hydrofoil' | 'park';
export type SnowSubType = 'snowboard' | 'skiing' | 'sledding' | 'skating' | 'snowshoeing' | 'alpine_climbing';
export type SnowStyle = 'downhill' | 'cross_country' | 'half_pipe' | 'freestyle' | 'park' | 'recreational' | 'training' | 'competition';
export type SwimSubType = 'ocean' | 'pool' | 'water_jogging' | 'aqua_aerobics';
export type SwimFocus = 'endurance' | 'sprint' | 'technique' | 'power' | 'recovery' | 'distance' | 'interval_set' | 'time_trial';
export type SwimStyle = 'mixed' | 'freestyle' | 'backstroke' | 'breaststroke' | 'butterfly' | 'im' | 'kick_only' | 'pull_only';
export type FitnessSubType = 'boxing' | 'jump_rope' | 'dance' | 'skateboard' | 'rock_climbing' | 'trampoline' | 'martial_arts' | 'cleaning' | 'gymnastics' | 'acrobats' | 'calisthenics' | 'sandboarding' | 'unicycling' | 'archery' | 'slack_lining' | 'rollerskate' | 'abseiling' | 'athletics' | 'obstacle_course' | 'extreme_air_sport';
export type BikeSubType = 'mtb' | 'road' | 'mixed_terrain' | 'commute' | 'electric' | 'indoor_spin' | 'bmx' | 'track' | 'bikepacking';
export type StretchSubType = 'pilates' | 'flexibility' | 'physio';
export type WalkSubType = 'multi_day' | 'stroll' | 'speed' | 'urban' | 'bush' | 'mountain' | 'farm' | 'road' | 'track_oval' | 'treadmill' | 'beach' | 'push_buggy';

// --- Companions & conditions — universal tags, apply to any exercise type ---

export type Companion = 'team' | 'friends' | 'family' | 'kids' | 'pets' | 'partner';
export const COMPANION_LABELS: Record<Companion, string> = {
  team: 'With Team', friends: 'With Friend/s', family: 'With Fam', kids: 'With Kid/s', pets: 'With Pet/s', partner: 'With Partner',
};
export const COMPANION_EMOJI: Record<Companion, string> = {
  team: '🤝', friends: '👫', family: '👪', kids: '🧒', pets: '🐾', partner: '❤️',
};

export type WeatherCondition = 'rainy' | 'sunny' | 'windy' | 'cloudy' | 'muddy' | 'dusty' | 'foggy' | 'snowy' | 'stormy' | 'freezing' | 'cold' | 'hot' | 'humid' | 'sunrise' | 'morning' | 'afternoon' | 'sunset' | 'night';
export const CONDITION_LABELS: Record<WeatherCondition, string> = {
  rainy: 'Rainy', sunny: 'Sunny', windy: 'Windy', cloudy: 'Cloudy', muddy: 'Muddy', dusty: 'Dusty',
  foggy: 'Foggy', snowy: 'Snowy', stormy: 'Stormy', freezing: 'Freezing', cold: 'Cold', hot: 'Hot', humid: 'Humid',
  sunrise: 'Sunrise', morning: 'Morning', afternoon: 'Afternoon', sunset: 'Sunset', night: 'Night',
};
// Plain glyph icons (no smiley/photographic-style faces) so they read as simple sketch-style
// doodles rather than emoji reactions. "muddy" uses a hand-drawn splat doodle (see
// CONDITION_ICON_OVERRIDES in lib/conditionIcons.tsx) instead of an emoji.
export const CONDITION_EMOJI: Record<WeatherCondition, string> = {
  rainy: '🌧️', sunny: '☀️', windy: '💨', cloudy: '☁️', muddy: '', dusty: '🌪️',
  foggy: '🌫️', snowy: '🌨️', stormy: '⛈️', freezing: '🧊', cold: '❄️', hot: '🌡️', humid: '💧',
  sunrise: '🌅', morning: '🌄', afternoon: '🌇', sunset: '🌆', night: '🌙',
};

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
  rooftop: 'Rooftop', water: 'Water', beach: 'Beach', mountain: 'Mountain',
};
export const SPORT_STYLE_COLORS: Record<SportStyle, string> = {
  indoor: '#A78BFA', outdoor: '#4ADE80', grass: '#22C55E', turf: '#84CC16', clay_dirt: '#C2410C',
  rooftop: '#38BDF8', water: '#0EA5E9', beach: '#FBBF24', mountain: '#78716C',
};
export const GYM_SUB_LABELS: Record<GymSubType, string> = {
  gym: 'Gym', hiit_workout: 'HIIT', strength: 'Strength', conditioning: 'Conditioning',
  crossfit: 'CrossFit', hyrox: 'Hyrox', arms: 'Arms', legs: 'Legs',
  back_shoulders: 'Back & Shoulders', core: 'Core', row_indoor: 'Row Indoor',
  stair_climber: 'Stair Climber', ski_erg: 'Ski Erg',
};
export const WATER_SUB_LABELS: Record<WaterSubType, string> = {
  kayak: 'Kayak', sailing: 'Sailing', surf: 'Surf', rowing: 'Rowing', waka_ama: 'Waka Ama', sup: 'SUP',
  body_boarding: 'Bodyboarding', bodysurfing: 'Bodysurfing', windsurfing: 'Windsurfing',
  kitesurfing: 'Kitesurfing', wakeboarding: 'Wakeboarding', waterskiing: 'Waterskiing', diving: 'Diving',
  spear_fishing: 'Spear Fishing', fishing: 'Fishing', rafting: 'Rafting', canyoning: 'Canyoning', coasteering: 'Coasteering',
};
export const WATER_STYLE_LABELS: Record<WaterStyle, string> = {
  recreational: 'Recreational', training: 'Training', competition: 'Competition',
  whitewater: 'Whitewater', hydrofoil: 'Hydrofoil', park: 'Park',
};
export const SNOW_SUB_LABELS: Record<SnowSubType, string> = {
  snowboard: 'Snowboard', skiing: 'Skiing', sledding: 'Sledding', skating: 'Skating',
  snowshoeing: 'Snowshoeing', alpine_climbing: 'Alpine Climbing',
};
export const SNOW_STYLE_LABELS: Record<SnowStyle, string> = {
  downhill: 'Downhill', cross_country: 'Cross-country', half_pipe: 'Half-pipe', freestyle: 'Freestyle', park: 'Park',
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
export const SWIM_STYLE_COLORS: Record<SwimStyle, string> = {
  mixed: '#A78BFA', freestyle: '#22D3EE', backstroke: '#38BDF8', breaststroke: '#34D399', butterfly: '#FB923C', im: '#F472B6',
  kick_only: '#FACC15', pull_only: '#818CF8',
};
export const FITNESS_SUB_LABELS: Record<FitnessSubType, string> = {
  boxing: 'Boxing', jump_rope: 'Jump Rope', dance: 'Dance', skateboard: 'Skateboard',
  rock_climbing: 'Rock Climbing', trampoline: 'Trampoline', martial_arts: 'Martial Arts', cleaning: 'Cleaning',
  gymnastics: 'Gymnastics', acrobats: 'Acrobats', calisthenics: 'Calisthenics', sandboarding: 'Sandboarding', unicycling: 'Unicycling',
  archery: 'Archery', slack_lining: 'Slacklining',
  rollerskate: 'Rollerskate', abseiling: 'Abseiling', athletics: 'Athletics', obstacle_course: 'Obstacle Course',
  extreme_air_sport: 'Extreme Air Sport',
};
export const BIKE_SUB_LABELS: Record<BikeSubType, string> = {
  mixed_terrain: 'Mixed Terrain', mtb: 'MTB', road: 'Road', commute: 'Commute', electric: 'Electric',
  indoor_spin: 'Indoor Spin', bmx: 'BMX', track: 'Track', bikepacking: 'Bikepacking',
};
export const STRETCH_SUB_LABELS: Record<StretchSubType, string> = {
  pilates: 'Pilates', flexibility: 'Flexibility', physio: 'Physio',
};
export const WALK_SUB_LABELS: Record<WalkSubType, string> = {
  multi_day: 'Multi-day', stroll: 'Stroll', speed: 'Speed', urban: 'Urban', bush: 'Bush',
  mountain: 'Mountain', farm: 'Farm', road: 'Road', track_oval: 'Track / Oval',
  treadmill: 'Treadmill', beach: 'Beach', push_buggy: 'Push Buggy',
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

// Which exercise type each subtype key belongs to — used to group "By Subtype" PBs under
// their parent exercise type once that type has enough of its own subtypes with PBs.
const SUBTYPE_PARENT_TYPE: Record<string, ExerciseType> = {
  ...Object.fromEntries(Object.keys(SPORT_SUB_LABELS).map(k => [k, 'sport' as ExerciseType])),
  ...Object.fromEntries(Object.keys(GYM_SUB_LABELS).map(k => [k, 'hiit' as ExerciseType])),
  ...Object.fromEntries(Object.keys(WATER_SUB_LABELS).map(k => [k, 'water' as ExerciseType])),
  ...Object.fromEntries(Object.keys(SNOW_SUB_LABELS).map(k => [k, 'snow' as ExerciseType])),
  ...Object.fromEntries(Object.keys(SWIM_SUB_LABELS).map(k => [k, 'swim' as ExerciseType])),
  ...Object.fromEntries(Object.keys(FITNESS_SUB_LABELS).map(k => [k, 'solo_fitness' as ExerciseType])),
  ...Object.fromEntries(Object.keys(BIKE_SUB_LABELS).map(k => [k, 'bike' as ExerciseType])),
  ...Object.fromEntries(Object.keys(STRETCH_SUB_LABELS).map(k => [k, 'stretch' as ExerciseType])),
  ...Object.fromEntries(Object.keys(WALK_SUB_LABELS).map(k => [k, 'walk' as ExerciseType])),
};
export function subtypeParentType(subtypeKey: string): ExerciseType | undefined {
  return SUBTYPE_PARENT_TYPE[subtypeKey];
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

/** An activity's subtype keys — run_type/run_type_modifier for runs, the (possibly
 *  comma-joined) sub_type for everything else. Shared by top-N counts and by the
 *  This Year totals tile matcher below. */
export function activitySubKeys(a: Activity): string[] {
  return a.exercise_type === 'run'
    ? [a.run_type, a.run_type_modifier].filter(Boolean) as string[]
    : (a.sub_type ? a.sub_type.split(',').map(s => s.trim()).filter(Boolean) : []);
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
    for (const sk of activitySubKeys(a)) {
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

/** One tile in the Dash "This Year" totals card — a FavouriteItem key (bare type,
 *  e.g. "bike", or "type:subtype", e.g. "sport:football") plus which metric to total. */
export interface YearTotalTile {
  key: string;
  metric: 'distance' | 'count' | 'both';
}

export const DEFAULT_YEAR_TOTAL_TILES: YearTotalTile[] = [
  { key: 'run', metric: 'distance' },
  { key: 'bike', metric: 'distance' },
  { key: 'swim', metric: 'distance' },
  { key: 'sport:football', metric: 'count' },
];

export const MAX_YEAR_TOTAL_TILES = 10;

/** Whether an activity counts toward a YearTotalTile's key — bare type matches any
 *  activity of that type, "type:subtype" also requires the subtype to be present. */
export function activityMatchesFavouriteKey(a: Activity, key: string): boolean {
  const sep = key.indexOf(':');
  const type = (sep === -1 ? key : key.slice(0, sep)) as ExerciseType;
  if (a.exercise_type !== type) return false;
  if (sep === -1) return true;
  return activitySubKeys(a).includes(key.slice(sep + 1));
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
  companions?: string; // comma-joined Companion keys — multi-select, applies to any exercise type
  conditions?: string; // comma-joined WeatherCondition keys — multi-select, applies to any exercise type
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
  pb_auto?: boolean; // true if is_pb was set automatically by detectAutoPBs, not the manual star toggle
  pb_description?: string;
  note_hidden?: boolean;
  image_urls?: string[] | null;
  thumbnail_urls?: string[] | null; // small (~240px) variant of image_urls, same order — falls back to image_urls for older rows
  date: string;
  created_at: string;
}

// --- Habit tracker ---

// The app's built-in categories. Users can also create their own on the fly (see
// HabitCategoryRow below) — a habit's `category` column holds either one of these fixed
// keys or a habit_categories.id, so it's typed as a plain string, not this union.
export type HabitCategory = 'health' | 'nutrition' | 'lifestyle' | 'self_care' | 'sleep' | 'phone_use' | 'spiritual' | 'home' | 'fitness' | 'connection';

export const HABIT_CATEGORY_LABELS: Record<HabitCategory, string> = {
  health: 'Health', nutrition: 'Nutrition', lifestyle: 'Lifestyle', self_care: 'Self-Care', sleep: 'Sleep',
  phone_use: 'Phone Use', spiritual: 'Spiritual', home: 'Home', fitness: 'Fitness', connection: 'Connection',
};
export const HABIT_CATEGORY_EMOJI: Record<HabitCategory, string> = {
  health: '😁', nutrition: '🥑', lifestyle: '🌱', self_care: '🧽', sleep: '💤',
  phone_use: '📵', spiritual: '🙏', home: '🏠', fitness: '💪', connection: '🤝',
};
export const HABIT_CATEGORY_ORDER: HabitCategory[] = ['health', 'nutrition', 'lifestyle', 'self_care', 'sleep', 'phone_use', 'spiritual', 'home', 'fitness', 'connection'];

/** A user-created habit category (unlimited, in addition to the fixed ones above). */
export interface HabitCategoryRow {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  sort_order: number;
  archived: boolean;
  created_at: string;
}

export const HABIT_COLORS = {
  lightblue: '#93C5FD', blue: '#60A5FA', azure: '#0000FF', navy: '#1E3A8A',
  aqua: '#2FA8C4', darkturquoise: '#155E63', forest: '#15803D', green: '#4ADE80', lime: '#A3E635',
  yellow: '#FACC15', cream: '#F5E6C8', orange: '#FB923C', rust: '#C2410C',
  brown: '#92400E', hotpink: '#EC4899', pink: '#F472B6',
  plum: '#7E22CE', purple: '#C084FC', slate: '#94A3B8', bluegrey: '#5B7B99',
} as const;
export type HabitColorKey = keyof typeof HABIT_COLORS;

export type HabitFrequencyType = 'daily' | 'every_n_days' | 'weekly' | 'fortnightly' | 'monthly' | 'custom_days';

export const HABIT_FREQUENCY_LABELS: Record<HabitFrequencyType, string> = {
  daily: 'Daily', every_n_days: 'Every N Days', weekly: 'Weekly', fortnightly: 'Fortnightly',
  monthly: 'Monthly', custom_days: 'Specific Days',
};

// How a habit is logged day-to-day: 'count' = tap a +/- stepper any number of times (e.g.
// Cups of Water); 'tick' = one tap marks it done, no stepper (e.g. Wake before 7am); 'both' =
// a tick for the common "did it once" case, but the stepper is still there for extra reps in
// the same day (e.g. Church — tick for one service, or tap the stepper twice for two).
export type HabitTrackingStyle = 'count' | 'tick' | 'both';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  category: string; // a HabitCategory key, or a habit_categories.id for user-created categories
  color: string; // hex
  frequency_type: HabitFrequencyType;
  frequency_days?: string | null; // comma-joined weekday keys ('mon,wed,fri'), only used for 'custom_days'
  frequency_interval_days?: number | null; // e.g. 2 for "every 2 days" — only used for 'every_n_days'
  target_per_period: number; // the goal amount for whichever period frequency_type defines
  tracking_style?: HabitTrackingStyle | null; // null/undefined on older rows == 'count'
  sort_order: number;
  archived: boolean;
  start_date?: string | null; // YYYY-MM-DD — habit doesn't apply/show before this date; null = always applied
  time_of_day?: string | null; // 'HH:00' 24hr, hour increments only — a reminder/planning cue, not enforced
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  count: number;
  // True right after a tick/✕ tap — locks the +/- stepper until the same button is tapped
  // again to undo it. Manual stepper taps never set this.
  locked?: boolean;
}

// A dated frequency/target that was (or will be) in effect for a habit, e.g. "5/7 days from
// 1 June" then "7/7 days from 1 Sept" — lets stats resolve the *correct historical* target
// for any given day rather than judging every past day against whatever the habit's
// settings happen to be right now. One row per period; a period runs from its own
// effective_date up to (exclusive of) the next row's effective_date, or to today for the
// latest row. A habit with no rows here has never had its frequency changed — every stats
// function falls back to the habit's own current fields in that case.
export interface HabitFrequencyChange {
  id: string;
  habit_id: string;
  user_id: string;
  effective_date: string; // YYYY-MM-DD — this period's fields apply from this date onward
  frequency_type: HabitFrequencyType;
  frequency_days?: string | null;
  frequency_interval_days?: number | null;
  target_per_period: number;
  created_at: string;
}

// The subset of a Habit's fields that determine scheduling/target — a Habit already
// satisfies this structurally, so every existing isHabitScheduledOn(habit, date) call site
// keeps working unchanged; resolveFrequencyAt (lib/habitStats.ts) builds one of these from
// historical rows for date-specific lookups.
export interface HabitFrequencyConfig {
  frequency_type: HabitFrequencyType;
  frequency_days?: string | null;
  frequency_interval_days?: number | null;
  target_per_period: number;
  start_date?: string | null;
}

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type HabitWeekday = typeof WEEKDAY_KEYS[number];
const JS_DAY_TO_WEEKDAY_KEY: HabitWeekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Whether a habit is scheduled on a given local date — false before its start_date (if set),
 *  otherwise true for 'daily'/'weekly' (frequency_days unset means every day), or checked
 *  against frequency_days for 'custom_days'. */
export function isHabitScheduledOn(habit: HabitFrequencyConfig, dateISO: string): boolean {
  if (habit.start_date && dateISO < habit.start_date) return false;
  if (habit.frequency_type !== 'custom_days' || !habit.frequency_days) return true;
  const [y, m, d] = dateISO.split('-').map(Number);
  const jsDay = new Date(y, m - 1, d).getDay();
  const key = JS_DAY_TO_WEEKDAY_KEY[jsDay];
  return habit.frequency_days.split(',').map(s => s.trim()).includes(key);
}
