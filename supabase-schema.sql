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

-- Migration: if goals table already exists, run these:
-- alter table goals add column if not exists activity_type text not null default 'all';
-- alter table goals drop constraint if exists goals_user_id_period_key;
-- alter table goals add constraint goals_user_id_period_activity_type_key unique (user_id, period, activity_type);
