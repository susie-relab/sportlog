export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatPaceMinKm(paceMinKm: number): string {
  const mins = Math.floor(paceMinKm);
  const secs = Math.round((paceMinKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

export function formatPaceMinMile(paceMinKm: number): string {
  const paceMinMile = paceMinKm * 1.60934;
  const mins = Math.floor(paceMinMile);
  const secs = Math.round((paceMinMile - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}/mi`;
}

export function formatSpeedKmh(paceMinKm: number): string {
  if (!paceMinKm || paceMinKm === 0) return '—';
  const speed = 60 / paceMinKm;
  return `${speed.toFixed(1)} km/h`;
}

/** Today's date in the browser's local timezone, as YYYY-MM-DD. Avoids the
 * UTC off-by-one that `new Date().toISOString()` causes for timezones ahead
 * of UTC (e.g. NZT), where local "today" can already be UTC "tomorrow". */
export function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function formatShortDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

export function getStartOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function calcDayStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const unique = [...new Set(dates)].sort((a, b) => b.localeCompare(a));
  const today = new Date().toISOString().split('T')[0];
  const yesterday = daysAgo(1).split('T')[0];
  if (unique[0] !== today && unique[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1]);
    const curr = new Date(unique[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (Math.round(diff) === 1) streak++;
    else break;
  }
  return streak;
}

export function calcWeekStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const getWeekKey = (d: string) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(date);
    mon.setDate(diff);
    return mon.toISOString().split('T')[0];
  };
  const weeks = [...new Set(dates.map(getWeekKey))].sort((a, b) => b.localeCompare(a));
  const thisWeek = getWeekKey(new Date().toISOString().split('T')[0]);
  const lastWeek = getWeekKey(daysAgo(7).split('T')[0]);
  if (weeks[0] !== thisWeek && weeks[0] !== lastWeek) return 0;
  let streak = 1;
  for (let i = 1; i < weeks.length; i++) {
    const prev = new Date(weeks[i - 1]);
    const curr = new Date(weeks[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (Math.round(diff) === 7) streak++;
    else break;
  }
  return streak;
}
