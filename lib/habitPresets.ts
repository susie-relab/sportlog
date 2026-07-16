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
  { name: 'Sunlight Time', category: 'health', color: HABIT_COLORS.yellow, target_per_period: 1 },

  // Nutrition
  { name: 'Only Healthy Meals', category: 'nutrition', color: HABIT_COLORS.lime, target_per_period: 1 },
  { name: '5+ Veges', category: 'nutrition', color: HABIT_COLORS.green, target_per_period: 1 },
  { name: 'Fruit', category: 'nutrition', color: HABIT_COLORS.pink, target_per_period: 1 },
  { name: 'Home Cooked Only', category: 'nutrition', color: HABIT_COLORS.forest, target_per_period: 1 },
  { name: 'No Sugar', category: 'nutrition', color: HABIT_COLORS.crimson, target_per_period: 1 },
  { name: 'No Alcohol', category: 'nutrition', color: HABIT_COLORS.slate, target_per_period: 1 },
  { name: 'No Buying Out', category: 'nutrition', color: HABIT_COLORS.brown, target_per_period: 1 },

  // Lifestyle
  { name: 'Always 5 Mins+ Early', category: 'lifestyle', color: HABIT_COLORS.azure, target_per_period: 1 },
  { name: 'Set Out Tmrw Outfits', category: 'lifestyle', color: HABIT_COLORS.purple, target_per_period: 1 },
  { name: 'Plan Tomorrow', category: 'lifestyle', color: HABIT_COLORS.azure, target_per_period: 1 },
  { name: 'Reading', category: 'lifestyle', color: HABIT_COLORS.purple, target_per_period: 1 },
  { name: 'Journaling', category: 'lifestyle', color: HABIT_COLORS.pink, target_per_period: 1 },
  { name: 'Gratitude', category: 'lifestyle', color: HABIT_COLORS.hotpink, target_per_period: 1 },
  { name: 'Play Musical Instrument', category: 'lifestyle', color: HABIT_COLORS.purple, target_per_period: 1 },
  { name: 'Language Learning', category: 'lifestyle', color: HABIT_COLORS.teal, target_per_period: 1 },
  { name: 'Hobby', category: 'lifestyle', color: HABIT_COLORS.lime, target_per_period: 1 },

  // Self-care
  { name: 'Daily Shower', category: 'self_care', color: HABIT_COLORS.blue, target_per_period: 1 },
  { name: 'Moisturise', category: 'self_care', color: HABIT_COLORS.pink, target_per_period: 1 },
  { name: 'Apply SPF', category: 'self_care', color: HABIT_COLORS.yellow, target_per_period: 1 },
  { name: 'Skincare', category: 'self_care', color: HABIT_COLORS.pink, target_per_period: 1 },
  { name: 'Shave', category: 'self_care', color: HABIT_COLORS.slate, target_per_period: 1 },
  { name: 'Exfoliate', category: 'self_care', color: HABIT_COLORS.orange, target_per_period: 1 },

  // Sleep
  { name: '8+ Hrs Sleep', category: 'sleep', color: HABIT_COLORS.blue, target_per_period: 1 },
  { name: 'In Bed Before 11pm', category: 'sleep', color: HABIT_COLORS.slate, target_per_period: 1 },
  { name: 'Wake Up Before 7am', category: 'sleep', color: HABIT_COLORS.yellow, target_per_period: 1 },
  { name: 'No Snooze', category: 'sleep', color: HABIT_COLORS.red, target_per_period: 1 },
  { name: 'No Late Caffeine', category: 'sleep', color: HABIT_COLORS.orange, target_per_period: 1 },

  // Phone use
  { name: 'No Phone Before Bed', category: 'phone_use', color: HABIT_COLORS.red, target_per_period: 1 },
  { name: 'No Phone First Hour', category: 'phone_use', color: HABIT_COLORS.orange, target_per_period: 1 },
  { name: 'Screen Time Under Limit', category: 'phone_use', color: HABIT_COLORS.yellow, target_per_period: 1 },

  // Spiritual
  { name: 'Bible Reading', category: 'spiritual', color: HABIT_COLORS.purple, target_per_period: 1 },
  { name: 'Prayer', category: 'spiritual', color: HABIT_COLORS.blue, target_per_period: 1 },
  { name: 'Being Still with God', category: 'spiritual', color: HABIT_COLORS.teal, target_per_period: 1 },
  { name: 'Church', category: 'spiritual', color: HABIT_COLORS.pink, target_per_period: 1 },
  { name: 'Fellowship', category: 'spiritual', color: HABIT_COLORS.blue, target_per_period: 1 },
  { name: 'Bible Study', category: 'spiritual', color: HABIT_COLORS.purple, target_per_period: 1 },
  { name: 'Memorise Scripture', category: 'spiritual', color: HABIT_COLORS.teal, target_per_period: 1 },
  { name: 'Volunteer', category: 'spiritual', color: HABIT_COLORS.green, target_per_period: 1 },
  { name: 'Meditation', category: 'spiritual', color: HABIT_COLORS.purple, target_per_period: 1 },

  // Home
  { name: 'Make Bed', category: 'home', color: HABIT_COLORS.brown, target_per_period: 1 },
  { name: 'Daily Dishes', category: 'home', color: HABIT_COLORS.bluegrey, target_per_period: 1 },
  { name: 'Nightly Tidy', category: 'home', color: HABIT_COLORS.forest, target_per_period: 1 },
  { name: 'Water Plants', category: 'home', color: HABIT_COLORS.green, target_per_period: 1 },
  { name: 'Laundry', category: 'home', color: HABIT_COLORS.bluegrey, target_per_period: 1 },
  { name: 'Fold Washing', category: 'home', color: HABIT_COLORS.slate, target_per_period: 1 },
  { name: 'Rubbish Out', category: 'home', color: HABIT_COLORS.brown, target_per_period: 1 },

  // Fitness
  { name: '10,000+ Steps', category: 'fitness', color: HABIT_COLORS.rust, target_per_period: 1 },
  { name: '30 Mins+ Exercise', category: 'fitness', color: HABIT_COLORS.navy, target_per_period: 1 },
  { name: 'Morning Exercise', category: 'fitness', color: HABIT_COLORS.rust, target_per_period: 1 },
  { name: 'Exercise Commute', category: 'fitness', color: HABIT_COLORS.navy, target_per_period: 1 },
  { name: 'Stretching', category: 'fitness', color: HABIT_COLORS.green, target_per_period: 1 },
  { name: 'Posture Exercises', category: 'fitness', color: HABIT_COLORS.bluegrey, target_per_period: 1 },
  { name: 'Cold Plunge', category: 'fitness', color: HABIT_COLORS.azure, target_per_period: 1 },

  // Connection
  { name: 'Friend Catch-up', category: 'connection', color: HABIT_COLORS.hotpink, target_per_period: 1 },
  { name: 'Make Others Hotdrinks', category: 'connection', color: HABIT_COLORS.orange, target_per_period: 1 },
  { name: 'Friends Outing', category: 'connection', color: HABIT_COLORS.pink, target_per_period: 1 },
  { name: 'Call a Friend', category: 'connection', color: HABIT_COLORS.azure, target_per_period: 1 },
  { name: 'Call a Family Member', category: 'connection', color: HABIT_COLORS.navy, target_per_period: 1 },
  { name: 'Friend Check-in Txt', category: 'connection', color: HABIT_COLORS.teal, target_per_period: 1 },
  { name: 'Send Birthday Msgs', category: 'connection', color: HABIT_COLORS.hotpink, target_per_period: 1 },
  { name: 'Send a Meme', category: 'connection', color: HABIT_COLORS.lime, target_per_period: 1 },
  { name: 'Host Gathering', category: 'connection', color: HABIT_COLORS.orange, target_per_period: 1 },
  { name: 'Visit Elderly', category: 'connection', color: HABIT_COLORS.slate, target_per_period: 1 },
  { name: 'Date Night', category: 'connection', color: HABIT_COLORS.crimson, target_per_period: 1 },
];
