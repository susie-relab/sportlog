-- Run this in Supabase SQL Editor to set up your database

-- Activities table
create table if not exists activities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  exercise_type text not null,
  run_type text,
  duration_minutes integer not null,
  effort integer not null check (effort between 1 and 11),
  distance_km numeric(8,2),
  notes text,
  intensity_minutes integer,
  pace_min_km numeric(5,3),
  max_pace_min_km numeric(5,3),
  max_hr integer,
  avg_hr integer,
  elevation_gain_m integer,
  sub_type text,
  note_hidden boolean not null default false,
  is_pb boolean default false,
  pb_description text,
  date date not null,
  created_at timestamptz default now()
);

-- Manual PBs table
create table if not exists manual_pbs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  date date not null,
  created_at timestamptz default now()
);

-- Row Level Security (keeps each user's data private)
alter table activities enable row level security;
alter table manual_pbs enable row level security;

-- Policies: users can only see and edit their own data
create policy "Users can manage their own activities"
  on activities for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own manual PBs"
  on manual_pbs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for fast date-based queries
create index if not exists activities_user_date on activities(user_id, date desc);

-- Goals / Training Plan table
create table if not exists goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  period text not null check (period in ('week','month','quarter','year')),
  activity_type text not null default 'all',
  target_runs integer,
  target_distance_km numeric(8,2),
  target_minutes integer,
  target_activities integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, period, activity_type)
);

alter table goals enable row level security;

create policy "Users can manage their own goals"
  on goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Standalone notes table
create table if not exists notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  body text not null,
  date date not null,
  sort_order integer not null default 0,
  hidden boolean not null default false,
  created_at timestamptz default now()
);

alter table notes enable row level security;

create policy "Users can manage their own notes"
  on notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists notes_user_date on notes(user_id, date desc);

-- Training plans table (run plan builder)
create table if not exists training_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_kind text not null default 'run',      -- 'run' (future: sport, etc.)
  distance text not null,                       -- 5k/10k/half/marathon/keep_fit/speed/ultra_*/custom
  custom_distance_km numeric(6,2) not null default 0, -- 0 for non-custom (keeps unique constraint reliable)
  level text not null,                          -- relaxed/moderate/tough
  weeks integer not null,
  days_per_week integer not null,               -- max runs/week
  days_per_week_min integer not null default 0, -- min runs/week (0/equal = exact count)
  train_days jsonb not null default '[]',       -- ['mon','wed',...]
  goal_time_seconds integer,
  start_distance_km numeric(6,2),
  long_run_cap_km numeric(6,2),                 -- optional user ceiling for long runs
  start_date date not null,
  name text,                                    -- optional user label (esp. sport/custom plans)
  active boolean not null default true,         -- run plans: only one active at a time (switching ends the other)
  plan_data jsonb not null,                     -- generated weeks + per-day sessions w/ completed state
  created_at timestamptz default now(),
  updated_at timestamptz default now()
  -- (multiple plans of any kind allowed; keyed by id)
);

alter table training_plans enable row level security;

create policy "Users can manage their own training plans"
  on training_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists training_plans_user on training_plans(user_id, created_at desc);

-- Migration: add days_per_week_min to training_plans (runs-per-week range)
-- alter table training_plans add column if not exists days_per_week_min integer not null default 0;

-- Migration: allow multiple plans of any kind + optional name
-- alter table training_plans drop constraint if exists training_plans_user_id_plan_kind_distance_custom_distance_km_key;
-- alter table training_plans add column if not exists name text;

-- Migration: add long_run_cap_km + active (multi-plan switch) to training_plans
-- alter table training_plans add column if not exists long_run_cap_km numeric(6,2);
-- alter table training_plans add column if not exists active boolean not null default true;

-- Migration: add sort_order to notes (reorder notes logged on the same date)
-- alter table notes add column if not exists sort_order integer not null default 0;

-- Migration: add sub_type column to activities
-- alter table activities add column if not exists sub_type text;

-- Migration: add elevation_gain_m column to activities
-- alter table activities add column if not exists elevation_gain_m integer;

-- Migration: hide/unhide notes (Notes tab). note_hidden on activities, hidden on notes.
-- alter table activities add column if not exists note_hidden boolean not null default false;
-- alter table notes add column if not exists hidden boolean not null default false;

-- Migration: second run type field, e.g. Treadmill + Easy -> "Treadmill - Easy Run"
-- alter table activities add column if not exists run_type_modifier text;

-- Migration: keep the leftover seconds (0-59) alongside duration_minutes, so duration
-- and pace can be stored/displayed to sub-minute precision instead of always rounding down.
-- alter table activities add column if not exists duration_seconds smallint not null default 0;

-- Migration: swim focus (Endurance/Sprint/Technique/Power/Recovery/Distance/Interval Set/Time
-- Trial) and swim styles (Mixed/Freestyle/Backstroke/Breaststroke/Butterfly/IM/Kick-only/Pull-only
-- — comma-joined, multi-select)
-- alter table activities add column if not exists swim_focus text;
-- alter table activities add column if not exists swim_styles text;

-- Migration: allow effort up to 11 ("this one goes to eleven")
-- alter table activities drop constraint if exists activities_effort_check;
-- alter table activities add constraint activities_effort_check check (effort between 1 and 11);

-- Migration: sport focus (Game/Match, Training, Skills, Conditioning, Recovery) for team sports
-- alter table activities add column if not exists sport_focus text;

-- Migration: split "water_snow" into two standalone exercise types, "water" and "snow"
-- (Snow gained Sledding + Skating subtypes and a Style field: Downhill/Cross-country/Half-pipe/
-- Freestyle. Water gained Polo/Boogie Boarding/Bodysurfing/Windsurfing/Kitesurfing/Wakeboarding/
-- Waterskiing/Diving/Spear Fishing/Fishing. Swim gained Water Jogging/Aqua Aerobics. Fitness
-- Training gained Gymnastics/Calisthenics/Sandboarding/Unicycling/Axe Throwing/Archery/Slack-lining.)
-- alter table activities add column if not exists snow_styles text;
-- update activities set exercise_type = 'snow' where exercise_type = 'water_snow' and sub_type in ('snowboard', 'skiing');
-- update activities set exercise_type = 'water' where exercise_type = 'water_snow';

-- Migration: Sport Style field (Indoor/Outdoor/Grass/Turf/Clay-Dirt/Rooftop/Water/Beach — moved
-- off Sport Focus onto its own field), Water Style (Recreational/Training/Competition/Whitewater/
-- Hydrofoil/Park, multi-select), Rafting added as a Water activity type, and Snow Style gained
-- Recreational/Training/Competition alongside the existing Downhill/Cross-country/Half-pipe/Freestyle.
-- alter table activities add column if not exists sport_style text;
-- alter table activities add column if not exists water_styles text;

-- Migration: if goals table already exists, run these:
-- alter table goals add column if not exists activity_type text not null default 'all';
-- alter table goals drop constraint if exists goals_user_id_period_key;
-- alter table goals add constraint goals_user_id_period_activity_type_key unique (user_id, period, activity_type);

-- Migration: distinguish auto-detected PBs from manually-starred ones.
-- alter table activities add column if not exists pb_auto boolean not null default false;

-- Migration: per-distance-bucket PB overrides — hide a wrongly-attributed auto PB, or
-- replace it with your own time (optionally linked to the activity the real effort happened
-- during, e.g. a 1km split inside a longer run — the activity's own pace/distance totals
-- don't have to match, since this is a manually-entered result).
-- create table if not exists distance_pb_overrides (
--   id uuid default gen_random_uuid() primary key,
--   user_id uuid references auth.users(id) on delete cascade not null,
--   distance_km numeric(6,2) not null,
--   status text not null check (status in ('hidden', 'custom')),
--   custom_time_seconds integer,
--   custom_note text,
--   activity_id uuid references activities(id) on delete set null,
--   created_at timestamptz default now(),
--   unique (user_id, distance_km)
-- );
-- alter table distance_pb_overrides enable row level security;
-- create policy "Users can manage their own distance PB overrides"
--   on distance_pb_overrides for all
--   using (auth.uid() = user_id)
--   with check (auth.uid() = user_id);

-- Migration: optional distance/duration on manual PBs.
-- alter table manual_pbs add column if not exists distance_km numeric(8,2);
-- alter table manual_pbs add column if not exists duration_minutes integer;

-- Migration: Strava sync — one connected Strava account per user, a marker on
-- activities imported from Strava (so re-syncing never double-imports), and a review
-- queue for incoming Strava activities that look like they might already be logged.
-- alter table activities add column if not exists strava_activity_id bigint;
-- create unique index if not exists activities_user_strava_activity_id_key
--   on activities(user_id, strava_activity_id) where strava_activity_id is not null;
--
-- create table if not exists strava_connections (
--   user_id uuid primary key references auth.users(id) on delete cascade,
--   strava_athlete_id bigint not null,
--   access_token text not null,
--   refresh_token text not null,
--   expires_at bigint not null,
--   last_synced_at timestamptz,
--   created_at timestamptz default now()
-- );
-- alter table strava_connections enable row level security;
-- create policy "Users can manage their own strava connection"
--   on strava_connections for all
--   using (auth.uid() = user_id)
--   with check (auth.uid() = user_id);
--
-- create table if not exists strava_pending_duplicates (
--   id uuid default gen_random_uuid() primary key,
--   user_id uuid references auth.users(id) on delete cascade not null,
--   strava_activity_id bigint not null,
--   strava_data jsonb not null,
--   matched_activity_id uuid references activities(id) on delete set null,
--   status text not null default 'pending' check (status in ('pending', 'saved', 'skipped', 'replaced')),
--   created_at timestamptz default now(),
--   unique (user_id, strava_activity_id)
-- );
-- alter table strava_pending_duplicates enable row level security;
-- create policy "Users can manage their own strava duplicate review queue"
--   on strava_pending_duplicates for all
--   using (auth.uid() = user_id)
--   with check (auth.uid() = user_id);

-- Migration: store the connected Strava athlete's display name so the Profile
-- card can show "Connected as <name>" instead of just an athlete ID.
-- alter table strava_connections add column if not exists strava_athlete_name text;

-- Migration: companions & weather conditions — universal tags on any activity
-- (comma-joined keys, same pattern as swim_styles/snow_styles/water_styles).
-- alter table activities add column if not exists companions text;
-- alter table activities add column if not exists conditions text;

-- Migration: habit tracker — user-created habits + one log row per habit per day.
-- create table if not exists habits (
--   id uuid default gen_random_uuid() primary key,
--   user_id uuid references auth.users(id) on delete cascade not null,
--   name text not null,
--   category text not null,               -- 'health' | 'lifestyle' | 'self_care' | 'sleep' | 'phone_use' | 'spiritual' | 'custom'
--   color text not null,                  -- hex, user-editable
--   frequency_type text not null default 'daily',  -- 'daily' | 'weekly' | 'custom_days'
--   frequency_days text,                  -- comma-joined weekday keys ('mon,wed,fri'), null = every applicable day
--   target_per_period integer not null default 1,  -- times per day (daily) or per week (weekly)
--   sort_order integer not null default 0,
--   archived boolean not null default false,
--   created_at timestamptz default now()
-- );
-- alter table habits enable row level security;
-- create policy "Users can manage their own habits"
--   on habits for all
--   using (auth.uid() = user_id)
--   with check (auth.uid() = user_id);
-- create index if not exists habits_user on habits(user_id, sort_order);
--
-- create table if not exists habit_logs (
--   id uuid default gen_random_uuid() primary key,
--   habit_id uuid references habits(id) on delete cascade not null,
--   user_id uuid references auth.users(id) on delete cascade not null,
--   date date not null,
--   count integer not null default 0,     -- completions logged that day
--   unique (habit_id, date)
-- );
-- alter table habit_logs enable row level security;
-- create policy "Users can manage their own habit logs"
--   on habit_logs for all
--   using (auth.uid() = user_id)
--   with check (auth.uid() = user_id);
-- create index if not exists habit_logs_habit_date on habit_logs(habit_id, date);

-- Migration: habit frequency options — every N days / fortnightly / monthly, in addition to
-- the existing daily / weekly / custom_days.
-- alter table habits add column if not exists frequency_interval_days integer;

-- Migration: user-defined habit categories, on top of the built-in fixed ones — a habit's
-- `category` column can hold either a fixed category key (e.g. 'health') or one of these
-- rows' id, so no change to the habits table is needed.
-- create table if not exists habit_categories (
--   id uuid default gen_random_uuid() primary key,
--   user_id uuid references auth.users(id) on delete cascade not null,
--   name text not null,
--   emoji text not null default '⭐',
--   sort_order integer not null default 0,
--   created_at timestamptz default now()
-- );
-- alter table habit_categories enable row level security;
-- create policy "Users can manage their own habit categories"
--   on habit_categories for all
--   using (auth.uid() = user_id)
--   with check (auth.uid() = user_id);
-- create index if not exists habit_categories_user on habit_categories(user_id, sort_order);

-- Migration: habit start date — a habit doesn't apply/show on the calendar or progress bars
-- before this date. Null means it always applied (existing habits are unaffected).
-- alter table habits add column if not exists start_date date;

-- Migration: habit time-of-day — an optional reminder/planning cue (hour increments only,
-- e.g. '08:00'), not enforced anywhere; null means no time set.
-- alter table habits add column if not exists time_of_day text;
