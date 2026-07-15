'use client';
import Link from 'next/link';
import { Activity } from '@/types';
import { PlanRecord } from '@/lib/runPlanGenerator';
import { formatDuration, formatPaceMinKm, localWeekKey, WeekStart } from '@/lib/utils';
import { addDays, recapFor } from './RecapCard';

interface Props {
  activities: Activity[];
  plans: PlanRecord[];
  weekStartDay: WeekStart;
  todayISO: string;
}

/** Always-visible last-calendar-week summary — sits below the 14-day breakdown, complementing
 *  RecapCard's Monday/1st-of-month popups which only appear on those specific days. */
export default function LastWeekSummaryCard({ activities, plans, weekStartDay, todayISO }: Props) {
  const thisWeekStart = localWeekKey(todayISO, weekStartDay);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const lastWeekEnd = addDays(thisWeekStart, -1);
  const r = recapFor(activities, plans, lastWeekStart, lastWeekEnd);
  const fmt = (d: string) => d.split('-').reverse().join('/');

  return (
    <div className="card mb-5">
      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-3">Last Week — {fmt(lastWeekStart)} to {fmt(lastWeekEnd)}</p>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="stat-card"><div className="stat-value">{r.count}</div><div className="stat-label">Activities</div></div>
        <div className="stat-card"><div className="stat-value">{r.km.toFixed(1)}</div><div className="stat-label">km</div></div>
        <div className="stat-card"><div className="stat-value">{formatDuration(r.mins)}</div><div className="stat-label">Time</div></div>
      </div>
      {(r.topTypes.length > 0 || r.topSubtypes.length > 0) && (
        <p className="text-xs text-[#94A3B8] mb-1 truncate">
          {r.topTypes.map((t, i) => `${i + 1}. ${t.emoji} ${t.label}`).join(', ')}
          {r.topTypes.length > 0 && r.topSubtypes.length > 0 ? ' | ' : ''}
          {r.topSubtypes.map((t, i) => `#${i + 1} ${t.emoji} ${t.label}`).join(', ')}
        </p>
      )}
      {(r.maxHr || r.bestPace || r.intensityMins > 0) && (
        <p className="text-xs text-[#94A3B8] mb-1 truncate">
          {[
            r.maxHr ? `❤️ Max HR: ${r.maxHr} bpm` : null,
            r.bestPace ? `⚡ Best pace achieved: ${formatPaceMinKm(r.bestPace)}` : null,
            r.intensityMins > 0 ? `🔥 Total intensity mins: ${r.intensityMins}` : null,
          ].filter(Boolean).join(' · ')}
        </p>
      )}
      {r.planned > 0 && <p className="text-xs text-[#94A3B8] mb-1">Plan sessions: {r.done}/{r.planned} completed</p>}
      {r.pbs.length > 0 && <p className="text-xs text-yellow-400 mb-1">⭐ {r.pbs.length} PB{r.pbs.length > 1 ? 's' : ''} hit!</p>}
      <Link href="/activity-log" className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block">View in Activity Log →</Link>
    </div>
  );
}
