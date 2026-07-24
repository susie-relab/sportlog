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

## Queued / Upcoming Work
- Strava sync: needs DB migration + STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET env vars on Vercel to go live
- Add tab queue: plan-match prompt, duplicate detection, home/away field for Sport type
- Custom training plan builder (Plan tab — spec exists, not yet built)
