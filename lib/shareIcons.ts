import {
  Footprints, Trophy, Dumbbell, Bike, Waves, PersonStanding, Snowflake, Flame,
  Calendar, TrendingUp, type LucideIcon,
} from 'lucide-react';
import type { ExerciseType } from '@/types';

export const EXERCISE_TYPE_ICONS: Record<ExerciseType, LucideIcon> = {
  run: Footprints,
  sport: Trophy,
  hiit: Flame,
  solo_fitness: Dumbbell,
  bike: Bike,
  swim: Waves,
  walk: PersonStanding,
  stretch: PersonStanding,
  water: Waves,
  snow: Snowflake,
};

export const WEEK_SHARE_ICON: LucideIcon = Calendar;
export const THIRTY_DAY_SHARE_ICON: LucideIcon = TrendingUp;
export const PB_SHARE_ICON: LucideIcon = Trophy;
