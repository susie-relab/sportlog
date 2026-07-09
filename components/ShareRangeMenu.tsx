'use client';
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Activity } from '@/types';
import { useAuth } from './AuthProvider';
import ShareCard, { ShareStat } from './ShareCard';
import { formatDuration, formatPaceMinKm, todayLocalISO, localWeekKey } from '@/lib/utils';

type RangeKey = 'wtd' | 'past7' | 'lastWeek' | 'mtd' | 'past30' | 'lastMonth';

const RANGE_LABELS: Record<RangeKey, string> = {
  wtd: 'Week to Date',
  past7: 'Past 7 Days',
  lastWeek: 'Last Week',
  mtd: 'Month to Date',
  past30: 'Past 30 Days',
  lastMonth: 'Last Month',
};
const RANGE_ORDER: RangeKey[] = ['wtd', 'past7', 'lastWeek', 'mtd', 'past30', 'lastMonth'];

function addDays(dateISO: string, n: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function monthRange(dateISO: string, monthsBack: number): { start: string; end: string } {
  const [y, m] = dateISO.split('-').map(Number);
  const first = new Date(y, m - 1 - monthsBack, 1);
  const last = new Date(y, m - monthsBack, 0);
  const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  return { start: fmt(first), end: fmt(last) };
}

interface Props {
  activities: Activity[];
  icon: LucideIcon;
  accentColor: string;
  nounSingular: string; // "Run" or "Activity"
  nounPlural: string;   // "Runs" or "Activities"
  showPace?: boolean;
  defaultScopeKey: string;
}

export default function ShareRangeMenu({ activities, icon, accentColor, nounSingular, nounPlural, showPace, defaultScopeKey }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<RangeKey | null>(null);

  const weekStartPref = user?.user_metadata?.week_start_day === 'sunday' ? 'sunday' : 'monday';
  const today = todayLocalISO();

  const rangeBounds = (key: RangeKey): { start: string; end: string } => {
    const thisWeekStart = localWeekKey(today, weekStartPref);
    switch (key) {
      case 'wtd': return { start: thisWeekStart, end: today };
      case 'past7': return { start: addDays(today, -6), end: today };
      case 'lastWeek': return { start: addDays(thisWeekStart, -7), end: addDays(thisWeekStart, -1) };
      case 'mtd': return { start: today.slice(0, 7) + '-01', end: today };
      case 'past30': return { start: addDays(today, -29), end: today };
      case 'lastMonth': return monthRange(today, 1);
    }
  };

  const buildStats = (key: RangeKey) => {
    const { start, end } = rangeBounds(key);
    const inRange = activities.filter(a => a.date >= start && a.date <= end);
    const dist = inRange.reduce((s, a) => s + (a.distance_km || 0), 0);
    const mins = inRange.reduce((s, a) => s + a.duration_minutes, 0);
    const paces = inRange.filter(a => a.pace_min_km).map(a => a.pace_min_km!);
    const avgPace = paces.length ? paces.reduce((s, p) => s + p, 0) / paces.length : null;
    const longest = Math.max(0, ...inRange.map(a => a.distance_km || 0));
    const dateLabel = start === end ? start.split('-').reverse().join('/') : `${start.split('-').reverse().join('/')} – ${end.split('-').reverse().join('/')}`;
    const stats: ShareStat[] = [
      { label: nounPlural, value: String(inRange.length) },
      dist > 0 ? { label: 'Distance', value: `${dist.toFixed(1)} km` } : null,
      { label: 'Time', value: formatDuration(mins) },
      showPace && avgPace ? { label: 'Avg Pace', value: formatPaceMinKm(avgPace) } : null,
      longest > 0 ? { label: `Longest ${nounSingular}`, value: `${longest.toFixed(1)} km` } : null,
    ].filter(Boolean) as ShareStat[];
    return { stats, dateLabel };
  };

  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen(o => !o)} className="btn-secondary text-sm flex items-center gap-1.5">↗ Share</button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-50 w-44 bg-[#1E293B] border border-[#334155] rounded-lg shadow-lg overflow-hidden">
            {RANGE_ORDER.map(key => (
              <button
                key={key}
                onClick={() => { setRange(key); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-[#94A3B8] hover:bg-[#293548] hover:text-white transition-colors"
              >
                {RANGE_LABELS[key]}
              </button>
            ))}
          </div>
        </>
      )}
      {range && (() => {
        const { stats, dateLabel } = buildStats(range);
        return (
          <ShareCard
            badge={RANGE_LABELS[range]}
            title=""
            icon={icon}
            availableStats={stats}
            dateLabel={dateLabel}
            accentColor={accentColor}
            defaultScopes={[{ key: `${defaultScopeKey}:${range}`, label: RANGE_LABELS[range] }]}
            onClose={() => setRange(null)}
          />
        );
      })()}
    </div>
  );
}
