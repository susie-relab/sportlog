export type ExerciseType =
  | 'run'
  | 'sport'
  | 'hiit'
  | 'stretch'
  | 'bike'
  | 'swim'
  | 'solo_fitness'
  | 'walk';

export type RunType =
  | 'long'
  | 'easy'
  | 'tempo'
  | 'fartlek'
  | 'speed_intervals'
  | 'hill_reps'
  | 'trail'
  | 'long_intervals';

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  run: 'Run',
  sport: 'Sport',
  hiit: 'HIIT Workout',
  stretch: 'Stretch',
  bike: 'Bike',
  swim: 'Swim',
  solo_fitness: 'Solo Fitness Training',
  walk: 'Walk / Hike',
};

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

export const EXERCISE_TYPE_COLORS: Record<ExerciseType, string> = {
  run: '#3B82F6',
  sport: '#F97316',
  hiit: '#EF4444',
  stretch: '#22C55E',
  bike: '#EAB308',
  swim: '#06B6D4',
  solo_fitness: '#A855F7',
  walk: '#84CC16',
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

export interface Activity {
  id: string;
  user_id: string;
  name: string;
  exercise_type: ExerciseType;
  run_type?: RunType;
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
