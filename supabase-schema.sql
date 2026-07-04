-- Run this in Supabase SQL Editor to set up your database

-- Activities table
create table if not exists activities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  exercise_type text not null,
  run_type text,
  duration_minutes integer not null,
  effort integer not null check (effort between 1 and 10),
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

-- Migration: if goals table already exists, run these:
-- alter table goals add column if not exists activity_type text not null default 'all';
-- alter table goals drop constraint if exists goals_user_id_period_key;
-- alter table goals add constraint goals_user_id_period_activity_type_key unique (user_id, period, activity_type);
