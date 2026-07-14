'use client';
import Link from 'next/link';
import { Activity } from '@/types';
import { PlanRecord } from '@/lib/runPlanGenerator';
import { formatDuration, formatDistance, formatPaceMinKm, localWeekKey, WeekStart, calcWeekStreak } from '@/lib/utils';
import { addDays, recapFor, recapWithComparison, upcomingCount } from '@/lib/recap';

interface Props {
  activities: Activity[];
  plans: PlanRecord[];
  weekStartDay: WeekStart;
  todayISO: string;
}

// Re-exported for LastWeekSummaryCard, which shares the same recap maths.
export { addDays, recapFor } from '@/lib/recap';

function fmt(d: string) { return d.split('-').reverse().join('/'); }

/** "+12% vs last week" style delta pill; green up, red down, nothing if no baseline. */
function Delta({ pct }: { pct: number | null }) {
  if (pct == null || pct === 0) return null;
  const up = pct > 0;
  return <span className={up ? 'text-green-400' : 'text-red-400'}> {up ? '↑' : '↓'}{Math.abs(pct)}%</span>;
}

export default function RecapCard({ activities, plans, weekStartDay, todayISO }: Props) {
  const dow = new Date(todayISO + 'T00:00:00').getDay(); // 0 = Sunday
  // The recap fires on whichever day starts the user's week — Monday by default, or Sunday
  // if they've set Week start day to Sunday in Settings.
  const isWeekStart = weekStartDay === 'sunday' ? dow === 0 : dow === 1;
  const isFirstOfMonth = todayISO.slice(8, 10) === '01';

  if (!isWeekStart && !isFirstOfMonth) return null;

  const cards: React.ReactNode[] = [];

  if (isWeekStart) {
    const thisWeekStart = localWeekKey(todayISO, weekStartDay);
    const lastWeekStart = addDays(thisWeekStart, -7);
    const lastWeekEnd = addDays(thisWeekStart, -1);
    const r = recapWithComparison(activities, plans, lastWeekStart, lastWeekEnd, 7);
    // A one-line preview of the week ahead.
    const upcoming = upcomingCount(plans, thisWeekStart, addDays(thisWeekStart, 6));
    // The user's week streak as of the week being recapped.
    const weekStreak = calcWeekStreak(activities.map(a => a.date), weekStartDay);
    cards.push(
      <div key="weekly" className="card mb-4">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Last Week's Recap — {fmt(lastWeekStart)} to {fmt(lastWeekEnd)}</p>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="stat-card"><div className="stat-value">{r.count}</div><div className="stat-label">Activities<Delta pct={r.countDelta} /></div></div>
          <div className="stat-card"><div className="stat-value">{r.km.toFixed(1)}</div><div className="stat-label">km<Delta pct={r.kmDelta} /></div></div>
          <div className="stat-card"><div className="stat-value">{formatDuration(r.mins)}</div><div className="stat-label">Time<Delta pct={r.minsDelta} /></div></div>
        </div>
        {r.topActivity && <p className="text-xs text-[#94A3B8] mb-1">🏆 Top session: <span className="text-white font-medium">{r.topActivity.name}</span> — {formatDuration(r.topActivity.duration_minutes)}{r.topActivity.distance_km ? ` · ${formatDistance(r.topActivity.distance_km, r.topActivity.exercise_type)}` : ''}</p>}
        {(r.topTypes.length > 0 || r.topSubtypes.length > 0) && (
          <p className="text-xs text-[#94A3B8] mb-1 truncate">
            {r.topTypes.map(t => `${t.emoji} ${t.label}`).join(', ')}
            {r.topTypes.length > 0 && r.topSubtypes.length > 0 ? ' · ' : ''}
            {r.topSubtypes.map(t => `${t.emoji} ${t.label}`).join(', ')}
          </p>
        )}
        {(r.maxHr || r.bestPace || r.intensityMins > 0) && (
          <p className="text-xs text-[#94A3B8] mb-1 truncate">
            {[
              r.maxHr ? `❤️ ${r.maxHr} bpm` : null,
              r.bestPace ? `⚡ ${formatPaceMinKm(r.bestPace)}` : null,
              r.intensityMins > 0 ? `🔥 ${r.intensityMins}m intensity` : null,
            ].filter(Boolean).join(' · ')}
          </p>
        )}
        {r.planned > 0 && <p className="text-xs text-[#94A3B8] mb-1">Plan sessions: {r.done}/{r.planned} completed</p>}
        {r.pbs.length > 0 && <p className="text-xs text-yellow-400 mb-1">⭐ {r.pbs.length} PB{r.pbs.length > 1 ? 's' : ''} hit!</p>}
        {weekStreak > 1 && <p className="text-xs text-yellow-400/90 mb-1">⚡ {weekStreak}-week streak going!</p>}
        {upcoming > 0 && <p className="text-xs text-[#64748B]">This week: {upcoming} session{upcoming > 1 ? 's' : ''} planned</p>}
        <Link href="/activity-log" className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block">View in Activity Log →</Link>
      </div>
    );
  }

  if (isFirstOfMonth) {
    const [y, m] = todayISO.split('-').map(Number);
    const lastMonthFirst = `${new Date(y, m - 2, 1).getFullYear()}-${String(new Date(y, m - 2, 1).getMonth() + 1).padStart(2, '0')}-01`;
    const lastMonthEnd = `${new Date(y, m - 1, 0).getFullYear()}-${String(new Date(y, m - 1, 0).getMonth() + 1).padStart(2, '0')}-${String(new Date(y, m - 1, 0).getDate()).padStart(2, '0')}`;
    // Days in last month, so the comparison window is the month before it.
    const lastMonthDays = new Date(y, m - 1, 0).getDate();
    const r = recapWithComparison(activities, plans, lastMonthFirst, lastMonthEnd, lastMonthDays);
    cards.push(
      <div key="monthly" className="card mb-4">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Last Month's Recap</p>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="stat-card"><div className="stat-value">{r.count}</div><div className="stat-label">Activities<Delta pct={r.countDelta} /></div></div>
          <div className="stat-card"><div className="stat-value">{r.km.toFixed(1)}</div><div className="stat-label">km<Delta pct={r.kmDelta} /></div></div>
          <div className="stat-card"><div className="stat-value">{formatDuration(r.mins)}</div><div className="stat-label">Time<Delta pct={r.minsDelta} /></div></div>
        </div>
        {r.topActivity && <p className="text-xs text-[#94A3B8] mb-1">🏆 Top session: <span className="text-white font-medium">{r.topActivity.name}</span> — {formatDuration(r.topActivity.duration_minutes)}{r.topActivity.distance_km ? ` · ${formatDistance(r.topActivity.distance_km, r.topActivity.exercise_type)}` : ''}</p>}
        {(r.topTypes.length > 0 || r.topSubtypes.length > 0) && (
          <p className="text-xs text-[#94A3B8] mb-1 truncate">
            {r.topTypes.map(t => `${t.emoji} ${t.label}`).join(', ')}
            {r.topTypes.length > 0 && r.topSubtypes.length > 0 ? ' · ' : ''}
            {r.topSubtypes.map(t => `${t.emoji} ${t.label}`).join(', ')}
          </p>
        )}
        {(r.maxHr || r.bestPace || r.intensityMins > 0) && (
          <p className="text-xs text-[#94A3B8] mb-1 truncate">
            {[
              r.maxHr ? `❤️ ${r.maxHr} bpm` : null,
              r.bestPace ? `⚡ ${formatPaceMinKm(r.bestPace)}` : null,
              r.intensityMins > 0 ? `🔥 ${r.intensityMins}m intensity` : null,
            ].filter(Boolean).join(' · ')}
          </p>
        )}
        {r.planned > 0 && <p className="text-xs text-[#94A3B8] mb-1">Plan sessions: {r.done}/{r.planned} completed</p>}
        {r.pbs.length > 0 && <p className="text-xs text-yellow-400 mb-1">⭐ {r.pbs.length} PB{r.pbs.length > 1 ? 's' : ''} hit!</p>}
        <Link href="/activity-log" className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block">View in Activity Log →</Link>
      </div>
    );
  }

  return <>{cards}</>;
}
