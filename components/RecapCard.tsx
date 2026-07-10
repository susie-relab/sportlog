'use client';
import Link from 'next/link';
import { Activity } from '@/types';
import { PlanRecord, todaysSession, isRunSession } from '@/lib/runPlanGenerator';
import { formatDuration, localWeekKey, WeekStart } from '@/lib/utils';

interface Props {
  activities: Activity[];
  plans: PlanRecord[];
  weekStartDay: WeekStart;
  todayISO: string;
}

function addDays(dateISO: string, n: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function planStats(plans: PlanRecord[], start: string, end: string) {
  let planned = 0, done = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    for (const p of plans) {
      const pos = todaysSession(p, d);
      if (pos && isRunSession(pos.session)) {
        planned++;
        if (pos.session.completed) done++;
      }
    }
  }
  return { planned, done };
}

function recapFor(activities: Activity[], plans: PlanRecord[], start: string, end: string) {
  const inRange = activities.filter(a => a.date >= start && a.date <= end);
  const km = inRange.reduce((s, a) => s + (a.distance_km || 0), 0);
  const mins = inRange.reduce((s, a) => s + a.duration_minutes, 0);
  const pbs = inRange.filter(a => a.is_pb);
  const { planned, done } = planStats(plans, start, end);
  return { count: inRange.length, km, mins, pbs, planned, done };
}

function fmt(d: string) { return d.split('-').reverse().join('/'); }

export default function RecapCard({ activities, plans, weekStartDay, todayISO }: Props) {
  const dow = new Date(todayISO + 'T00:00:00').getDay(); // 0 = Sunday
  const isMonday = dow === 1;
  const isFirstOfMonth = todayISO.slice(8, 10) === '01';

  if (!isMonday && !isFirstOfMonth) return null;

  const cards: React.ReactNode[] = [];

  if (isMonday) {
    const thisWeekStart = localWeekKey(todayISO, weekStartDay);
    const lastWeekStart = addDays(thisWeekStart, -7);
    const lastWeekEnd = addDays(thisWeekStart, -1);
    const r = recapFor(activities, plans, lastWeekStart, lastWeekEnd);
    // A one-line preview of the week ahead.
    let upcoming = 0;
    for (let d = thisWeekStart; d <= addDays(thisWeekStart, 6); d = addDays(d, 1)) {
      for (const p of plans) {
        const pos = todaysSession(p, d);
        if (pos && isRunSession(pos.session)) upcoming++;
      }
    }
    cards.push(
      <div key="weekly" className="card mb-4">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Last Week's Recap — {fmt(lastWeekStart)} to {fmt(lastWeekEnd)}</p>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="stat-card"><div className="stat-value">{r.count}</div><div className="stat-label">Activities</div></div>
          <div className="stat-card"><div className="stat-value">{r.km.toFixed(1)}</div><div className="stat-label">km</div></div>
          <div className="stat-card"><div className="stat-value">{formatDuration(r.mins)}</div><div className="stat-label">Time</div></div>
        </div>
        {r.planned > 0 && <p className="text-xs text-[#94A3B8] mb-1">Plan sessions: {r.done}/{r.planned} completed</p>}
        {r.pbs.length > 0 && <p className="text-xs text-yellow-400 mb-1">⭐ {r.pbs.length} PB{r.pbs.length > 1 ? 's' : ''} hit!</p>}
        {upcoming > 0 && <p className="text-xs text-[#64748B]">This week: {upcoming} session{upcoming > 1 ? 's' : ''} planned</p>}
        <Link href="/activity-log" className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block">View in Activity Log →</Link>
      </div>
    );
  }

  if (isFirstOfMonth) {
    const [y, m] = todayISO.split('-').map(Number);
    const lastMonthFirst = `${new Date(y, m - 2, 1).getFullYear()}-${String(new Date(y, m - 2, 1).getMonth() + 1).padStart(2, '0')}-01`;
    const lastMonthEnd = `${new Date(y, m - 1, 0).getFullYear()}-${String(new Date(y, m - 1, 0).getMonth() + 1).padStart(2, '0')}-${String(new Date(y, m - 1, 0).getDate()).padStart(2, '0')}`;
    const r = recapFor(activities, plans, lastMonthFirst, lastMonthEnd);
    cards.push(
      <div key="monthly" className="card mb-4">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Last Month's Recap</p>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="stat-card"><div className="stat-value">{r.count}</div><div className="stat-label">Activities</div></div>
          <div className="stat-card"><div className="stat-value">{r.km.toFixed(1)}</div><div className="stat-label">km</div></div>
          <div className="stat-card"><div className="stat-value">{formatDuration(r.mins)}</div><div className="stat-label">Time</div></div>
        </div>
        {r.planned > 0 && <p className="text-xs text-[#94A3B8] mb-1">Plan sessions: {r.done}/{r.planned} completed</p>}
        {r.pbs.length > 0 && <p className="text-xs text-yellow-400 mb-1">⭐ {r.pbs.length} PB{r.pbs.length > 1 ? 's' : ''} hit!</p>}
        <Link href="/activity-log" className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block">View in Activity Log →</Link>
      </div>
    );
  }

  return <>{cards}</>;
}
