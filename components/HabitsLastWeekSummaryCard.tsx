'use client';
import Link from 'next/link';
import { Habit, HabitLog } from '@/types';
import { completionPctInRange } from '@/lib/habitStats';
import { localWeekKey, WeekStart } from '@/lib/utils';
import { addDays } from './RecapCard';

interface Props {
  habits: Habit[];
  logsByHabit: Map<string, HabitLog[]>;
  weekStartDay: WeekStart;
  todayISO: string;
}

/** Habit-completion counterpart to LastWeekSummaryCard — same always-visible last-calendar-week
 *  placement, but summarizing habit completion % instead of activity stats. */
export default function HabitsLastWeekSummaryCard({ habits, logsByHabit, weekStartDay, todayISO }: Props) {
  if (habits.length === 0) return null;

  const thisWeekStart = localWeekKey(todayISO, weekStartDay);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const lastWeekEnd = addDays(thisWeekStart, -1);
  const fmt = (d: string) => d.split('-').reverse().join('/');

  const rows = habits
    .map(h => ({ h, pct: completionPctInRange(h, logsByHabit.get(h.id) || [], lastWeekStart, lastWeekEnd) }))
    .sort((a, b) => b.pct - a.pct);
  const avgPct = Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length);
  const top = rows.slice(0, 3).filter(r => r.pct > 0);

  return (
    <div className="card mb-5">
      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-3">Habits Last Week — {fmt(lastWeekStart)} to {fmt(lastWeekEnd)}</p>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="stat-card"><div className="stat-value">{avgPct}%</div><div className="stat-label">Avg Completion</div></div>
        <div className="stat-card"><div className="stat-value">{habits.length}</div><div className="stat-label">Habits</div></div>
      </div>
      {top.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1 text-xs text-[#94A3B8]">
          {top.map((r, i) => <span key={r.h.id}>{i + 1}. {r.h.name} ({r.pct}%)</span>)}
        </div>
      )}
      <Link href="/habits" className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block">View Habits →</Link>
    </div>
  );
}
