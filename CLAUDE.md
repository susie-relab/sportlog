@AGENTS.md

# SportLog (SportLogRun) — Project Context

## App & Stack
- Next.js App Router, TypeScript, Tailwind CSS
- Backend: Supabase Postgres with Row Level Security
- Deploy: Vercel, connected to GitHub repo susie-relab/sportlog
- Local repo: ~/fitlog
- Dev server: npm run dev (port 3000)
- Typecheck: npx tsc --noEmit

## Theme & Styling
- Dark blue theme: background #0F172A, cards #1E293B, borders #334155
- Text: white #F1F5F9, muted #94A3B8, dimmed #64748B
- Accent: blue-500 for active/focus states
- Use existing `.card` class for all cards/modals
- Tailwind only — no custom CSS unless absolutely necessary

## Database Conventions
- All migrations go in supabase-schema.sql as commented-out blocks
- Susie runs migrations manually in the Supabase SQL editor
- Always paste raw migration SQL as plain text in chat — never only inside tool options
- RLS enabled on every table with per-user policies

## Key Features Built
- Activity log (runs, workouts, sports, swims, bikes, walks, etc.)
- Run Log with PB tracking
- Training Plan builder (multi-sport, PDF export, share image)
- Habit tracker (full: categories, streaks, frequency history, calendar, stats)
- Strava connect + auto-import + dedup review (needs migration + env vars to go live)
- Dashboard with training month calendar, habit stats, plan day sheet
- Recap emails (automated, Supabase edge function)
- Scroll picker for Distance/Elevation/HR with age+effort HR suggestions
- Custom SVG condition icons (muddy, sunrise, sunset, morning, afternoon, night)

## Habits System
- Tables: habits, habit_logs, habit_frequency_history
- Frequency types: daily, weekly, every_n_days, custom_days, monthly
- Sentinel counts: -1 = failed ("didn't happen"), -2 = skipped
- Streak freeze / grace day support
- Bulk edit mode, multi-criteria sort, archive/pause toggle
- HabitListRow: tap = toggle detail/edit panel, hold = drag reorder
- HabitTabBox: category tabs + stats grid + edit panel
- HabitMonthCalendar: density-filled circles per day, day popover with skip all / skip focus

## Add Tab (app/add/page.tsx)
- "More optional details" button has SVG tick-mark rays around it (all 4 edges + corners)
- Optional details are wrapped in a thin blue box (border-blue-500/30, bg-blue-500/5)
- Expanded details: pace, conditions, weather, notes/highlights, heart rate, elevation, description

## Coding Rules
- Typecheck before every push
- Commit and push after each completed feature
- No comments unless the WHY is non-obvious
- No unused imports, no backwards-compat hacks
- Prefer editing existing files over creating new ones

## Important Preferences
- Always preview custom SVG icons large in browser and confirm before committing/pushing
- On the test account: save real activities and edits — never inject temp DOM or auto-revert
- Show images/assets in chat before saving files anywhere
- Migration SQL always as plain chat text
- Short, direct responses — no trailing summaries of what was just done

## Origin Story

**Original prompt — 30 June 2026:**

> A pretty blue design for the web app. Make it an Exercise app instead of just run. I want 6 main pages/tabs: add exercise, stats from last 14 days (rolling), total stats, PB's, activity log, and run log.
>
> Add exercise: Type box for name of activity > Select exercise type [run, sport, HIIT workout, stretch, bike, swim, or solo fitness training] > IF RUN then select run type [long, easy, tempo, fartlek, speed intervals, hill reps, trail, or long intervals] > type time (hrs or/and mins) > select effort /10 > click save. And optional selections for distance [a scroll for distance (kms)], type box for notes/highlights, intensity minutes, pace, max pace, max hr, avg hr, & select star emoji that says PB in the star [if it's a personal best - and a type box below to say what type of PB.]
>
> - can each sport type be a different colour (different oranges, yellows, greens)
> - and can each run type be a different colour blue
>
> Stats from last 14 days: total activities, total of each exercise type, total distance, total minutes, total intensity minutes.
>
> Total stats: same data types as 14 days but with options for all time / past 12 months / past 6 months / past 1 month. Graphs for month on month for each data type.
>
> PB's: all personal bests recorded. Longest distance PB, best pace for each distance (100m–50km). Best month of each stat: most runs, most activities, most intensity minutes, most run distance, most activity distance.
>
> Activity log: quick stat line of past 30 days at top. All activities ordered by most recent, with filter by exercise type and search by name.
>
> Run log: week and 30-day stats (total distance, total time, avg distance, avg time, number of each run type). Filter by run type, search box. View all runs / past week / past 30 days / current month.

**Follow-up prompts:**
- Move activity log and run log to 2nd and 3rd tabs. Must be able to edit activity in both logs.
- Add: Dash tab (home, replaces 14-day stats) with summary card — runs done, km covered, next goal, progress, day streak, week streak. Training Plan tab — set targets for week/month/quarter/year with progress bars on Dash. Streaks — consecutive days & weeks. Charts on Run Log — distance-over-time line graph with filters. Notes Log tab — scrollable training diary of all activity notes. Import tab (CSV/Garmin). Distance field: scroll + typeable (e.g. 3.33km). Unsaved-changes warning when switching tabs.

## Queued / Upcoming Work
- Strava sync: needs DB migration + STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET env vars on Vercel to go live
- Add tab queue: plan-match prompt, duplicate detection, home/away field for Sport type
- Custom training plan builder (Plan tab — spec exists, not yet built)
