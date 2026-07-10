export type ExerciseType =
  | 'run'
  | 'sport'
  | 'hiit'
  | 'solo_fitness'
  | 'bike'
  | 'swim'
  | 'walk'
  | 'stretch'
  | 'water_snow';

// Display order for UI
export const EXERCISE_TYPE_ORDER: ExerciseType[] = ['run', 'sport', 'hiit', 'solo_fitness', 'bike', 'swim', 'walk', 'stretch', 'water_snow'];

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  run: 'Run',
  sport: 'Sport',
  hiit: 'Gym Workout',
  solo_fitness: 'Fitness Training',
  bike: 'Bike',
  swim: 'Swim',
  walk: 'Walk / Hike',
  stretch: 'Stretch',
  water_snow: 'Water / Snow',
};

export const EXERCISE_TYPE_COLORS: Record<ExerciseType, string> = {
  run: '#3B82F6',
  sport: '#84CC16',
  hiit: '#EF4444',
  solo_fitness: '#A855F7',
  bike: '#EAB308',
  swim: '#06B6D4',
  walk: '#F97316',
  stretch: '#22C55E',
  water_snow: '#0EA5E9',
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

/** Combined display label for a run's two optional type fields, e.g. "Treadmill - Easy Run",
 *  or just "Push Buggy" / "Fartlek" when only one is set. */
export function combinedRunTypeLabel(runType?: RunType | null, runTypeModifier?: RunType | null): string | null {
  if (runType && runTypeModifier) {
    const terrain = RUN_TYPE_TERRAIN.includes(runTypeModifier) ? runTypeModifier : runType;
    const workout = terrain === runType ? runTypeModifier : runType;
    return `${RUN_TYPE_LABELS[terrain]} - ${RUN_TYPE_LABELS[workout]} Run`;
  }
  if (runType) return RUN_TYPE_LABELS[runType];
  if (runTypeModifier) return RUN_TYPE_LABELS[runTypeModifier];
  return null;
}

// --- Subtypes (all optional) ---

export type SportSubType = 'football' | 'tennis' | 'netball' | 'volleyball' | 'golf' | 'turbo_touch' | 'padel' | 'touch_rugby' | 'basketball' | 'cricket' | 'badminton' | 'rugby' | 'hockey' | 'frisbee' | 'table_tennis';
export type GymSubType = 'hiit_workout' | 'strength' | 'conditioning' | 'crossfit' | 'hyrox' | 'arms' | 'legs' | 'back_shoulders' | 'core' | 'row_indoor' | 'stair_climber' | 'ski_erg';
export type WaterSnowSubType = 'kayak' | 'sailing' | 'surf' | 'rowing' | 'waka_ama' | 'sup' | 'snowboard' | 'skiing';
export type SwimSubType = 'ocean' | 'pool';
export type SwimFocus = 'endurance' | 'sprint' | 'technique' | 'power' | 'recovery' | 'distance' | 'interval_set' | 'time_trial';
export type SwimStyle = 'mixed' | 'freestyle' | 'backstroke' | 'breaststroke' | 'butterfly' | 'im' | 'kick_only' | 'pull_only';
export type FitnessSubType = 'boxing' | 'jump_rope' | 'dance' | 'skateboard' | 'rock_climbing' | 'trampoline' | 'martial_arts' | 'cleaning';
export type BikeSubType = 'mtb' | 'road' | 'mixed_terrain' | 'commute' | 'electric' | 'indoor_spin' | 'bmx' | 'track' | 'bikepacking';
export type StretchSubType = 'pilates' | 'flexibility' | 'physio';
export type WalkSubType = 'multi_day' | 'outdoor' | 'treadmill' | 'speed' | 'stroll';

export const SPORT_SUB_LABELS: Record<SportSubType, string> = {
  football: 'Football', tennis: 'Tennis', netball: 'Netball', volleyball: 'Volleyball',
  golf: 'Golf', turbo_touch: 'Turbo Touch', padel: 'Padel', touch_rugby: 'Touch Rugby',
  basketball: 'Basketball', cricket: 'Cricket', badminton: 'Badminton', rugby: 'Rugby',
  hockey: 'Hockey', frisbee: 'Frisbee', table_tennis: 'Table Tennis',
};
export const GYM_SUB_LABELS: Record<GymSubType, string> = {
  hiit_workout: 'HIIT', strength: 'Strength', conditioning: 'Conditioning',
  crossfit: 'CrossFit', hyrox: 'Hyrox', arms: 'Arms', legs: 'Legs',
  back_shoulders: 'Back & Shoulders', core: 'Core', row_indoor: 'Row Indoor',
  stair_climber: 'Stair Climber', ski_erg: 'Ski Erg',
};
export const WATER_SNOW_SUB_LABELS: Record<WaterSnowSubType, string> = {
  kayak: 'Kayak', sailing: 'Sailing', surf: 'Surf', rowing: 'Rowing',
  waka_ama: 'Waka Ama', sup: 'SUP', snowboard: 'Snowboard', skiing: 'Skiing',
};
export const SWIM_SUB_LABELS: Record<SwimSubType, string> = { ocean: 'Ocean', pool: 'Pool' };
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
};

// All subtype labels in one map + a helper to display a (possibly comma-joined) sub_type value.
const ALL_SUB_LABELS: Record<string, string> = {
  ...SPORT_SUB_LABELS, ...GYM_SUB_LABELS, ...WATER_SNOW_SUB_LABELS, ...SWIM_SUB_LABELS,
  ...FITNESS_SUB_LABELS, ...BIKE_SUB_LABELS, ...STRETCH_SUB_LABELS, ...WALK_SUB_LABELS,
};
export function subTypeLabel(subType?: string | null): string {
  if (!subType) return '';
  return subType.split(',').map(k => ALL_SUB_LABELS[k.trim()] ?? k.trim()).join(', ');
}

export interface Activity {
  id: string;
  user_id: string;
  name: string;
  exercise_type: ExerciseType;
  run_type?: RunType;
  run_type_modifier?: RunType;
  sub_type?: string;
  swim_focus?: SwimFocus;
  swim_styles?: string; // comma-joined SwimStyle keys — multi-select, like sub_type for hiit
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
