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
  sport: '#F97316',
  hiit: '#EF4444',
  solo_fitness: '#A855F7',
  bike: '#EAB308',
  swim: '#06B6D4',
  walk: '#84CC16',
  stretch: '#22C55E',
  water_snow: '#0EA5E9',
};

export type RunType = 'long' | 'easy' | 'tempo' | 'fartlek' | 'speed_intervals' | 'hill_reps' | 'trail' | 'long_intervals';

export const RUN_TYPE_LABELS: Record<RunType, string> = {
  long: 'Long',
  easy: 'Easy',
  tempo: 'Tempo',
  fartlek: 'Fartlek',
  speed_intervals: 'Speed Intervals',
  hill_reps: 'Hill Reps',
  trail: 'Trail',
  long_intervals: 'Long Intervals',
};

export const RUN_TYPE_COLORS: Record<RunType, string> = {
  easy: '#93C5FD',
  long: '#3B82F6',
  tempo: '#1D4ED8',
  fartlek: '#60A5FA',
  speed_intervals: '#1E40AF',
  hill_reps: '#2563EB',
  trail: '#BFDBFE',
  long_intervals: '#1E3A8A',
};

// --- Subtypes (all optional) ---

export type SportSubType = 'football' | 'tennis' | 'netball' | 'volleyball' | 'golf' | 'turbo_touch' | 'padel' | 'touch_rugby' | 'basketball' | 'cricket' | 'badminton' | 'rugby' | 'hockey' | 'frisbee' | 'table_tennis';
export type GymSubType = 'hiit_workout' | 'strength' | 'conditioning' | 'crossfit' | 'hyrox' | 'arms' | 'legs' | 'back_shoulders' | 'core' | 'row_indoor' | 'stair_climber' | 'ski_erg';
export type WaterSnowSubType = 'kayak' | 'sailing' | 'surf' | 'rowing' | 'waka_ama' | 'sup' | 'snowboard' | 'skiing';
export type SwimSubType = 'ocean' | 'pool';
export type FitnessSubType = 'boxing' | 'jump_rope' | 'dance' | 'skateboard' | 'rock_climbing' | 'trampoline' | 'martial_arts' | 'cleaning';
export type BikeSubType = 'mtb' | 'commute' | 'road' | 'indoor_spin';
export type StretchSubType = 'pilates' | 'flexibility' | 'physio';

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
export const FITNESS_SUB_LABELS: Record<FitnessSubType, string> = {
  boxing: 'Boxing', jump_rope: 'Jump Rope', dance: 'Dance', skateboard: 'Skateboard',
  rock_climbing: 'Rock Climbing', trampoline: 'Trampoline', martial_arts: 'Martial Arts', cleaning: 'Cleaning',
};
export const BIKE_SUB_LABELS: Record<BikeSubType, string> = {
  mtb: 'MTB', commute: 'Commute', road: 'Road', indoor_spin: 'Indoor Spin',
};
export const STRETCH_SUB_LABELS: Record<StretchSubType, string> = {
  pilates: 'Pilates', flexibility: 'Flexibility', physio: 'Physio',
};

export interface Activity {
  id: string;
  user_id: string;
  name: string;
  exercise_type: ExerciseType;
  run_type?: RunType;
  sub_type?: string;
  duration_minutes: number;
  effort: number;
  distance_km?: number;
  notes?: string;
  intensity_minutes?: number;
  pace_min_km?: number;
  max_pace_min_km?: number;
  max_hr?: number;
  avg_hr?: number;
  is_pb: boolean;
  pb_description?: string;
  date: string;
  created_at: string;
}
