import { HabitCategory, HABIT_COLORS } from '@/types';

export interface HabitPreset {
  name: string;
  category: HabitCategory;
  color: string;
  target_per_period: number;
}

/** Built-in recommended habits, shown grouped by category when adding a new habit —
 *  tapping one quick-fills the create-habit form instead of starting from a blank slate. */
export const HABIT_PRESETS: HabitPreset[] = [
  // Health
  { name: 'Cups of Water', category: 'health', color: HABIT_COLORS.blue, target_per_period: 8 },
  { name: 'Vitamins', category: 'health', color: HABIT_COLORS.orange, target_per_period: 1 },
  { name: 'Meds', category: 'health', color: HABIT_COLORS.red, target_per_period: 1 },
  { name: 'Teeth', category: 'health', color: HABIT_COLORS.teal, target_per_period: 2 },
  { name: 'Floss', category: 'health', color: HABIT_COLORS.teal, target_per_period: 1 },

  // Nutrition
  { name: 'Only Healthy Meals', category: 'nutrition', color: HABIT_COLORS.lime, target_per_period: 1 },
  { name: '5+ Veges', category: 'nutrition', color: HABIT_COLORS.green, target_per_period: 1 },

  // Lifestyle
  { name: 'Reading', category: 'lifestyle', color: HABIT_COLORS.purple, target_per_period: 1 },
  { name: 'Journaling', category: 'lifestyle', color: HABIT_COLORS.pink, target_per_period: 1 },
  { name: 'No Alcohol', category: 'lifestyle', color: HABIT_COLORS.slate, target_per_period: 1 },

  // Self-care
  { name: 'Daily Shower', category: 'self_care', color: HABIT_COLORS.blue, target_per_period: 1 },
  { name: 'Skincare', category: 'self_care', color: HABIT_COLORS.pink, target_per_period: 1 },
  { name: 'Stretching', category: 'self_care', color: HABIT_COLORS.green, target_per_period: 1 },

  // Sleep
  { name: 'Consistent Bedtime', category: 'sleep', color: HABIT_COLORS.slate, target_per_period: 1 },
  { name: 'No Late Caffeine', category: 'sleep', color: HABIT_COLORS.orange, target_per_period: 1 },
  { name: '8+ Hrs Sleep', category: 'sleep', color: HABIT_COLORS.blue, target_per_period: 1 },
  { name: 'Wake Up Before 7am', category: 'sleep', color: HABIT_COLORS.yellow, target_per_period: 1 },

  // Phone use
  { name: 'No Phone Before Bed', category: 'phone_use', color: HABIT_COLORS.red, target_per_period: 1 },
  { name: 'No Phone First Hour', category: 'phone_use', color: HABIT_COLORS.orange, target_per_period: 1 },
  { name: 'Screen Time Under Limit', category: 'phone_use', color: HABIT_COLORS.yellow, target_per_period: 1 },

  // Spiritual
  { name: 'Bible Reading', category: 'spiritual', color: HABIT_COLORS.purple, target_per_period: 1 },
  { name: 'Prayer', category: 'spiritual', color: HABIT_COLORS.blue, target_per_period: 1 },
  { name: 'Being Still with God', category: 'spiritual', color: HABIT_COLORS.teal, target_per_period: 1 },
  { name: 'Church', category: 'spiritual', color: HABIT_COLORS.pink, target_per_period: 1 },
  { name: 'Meditation', category: 'spiritual', color: HABIT_COLORS.purple, target_per_period: 1 },
];
