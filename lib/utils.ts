/** Open the native calendar popup on click, not just when the tiny icon is clicked. */
export function openDatePicker(e: { currentTarget: HTMLInputElement }): void {
  try { (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch { /* not supported */ }
}

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

/** Add N days to a local YYYY-MM-DD date, staying in local calendar dates (matches how
 *  activity dates are stored). Avoids UTC round-trip bugs that shift the day in timezones
 *  ahead of UTC (e.g. NZ), which made streaks reset mid-afternoon. */
function addDaysLocalISO(dateISO: string, n: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Monday-start week key for a local YYYY-MM-DD date. */
function localWeekKey(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  dt.setDate(dt.getDate() - day + (day === 0 ? -6 : 1));
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function calcDayStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const unique = [...new Set(dates)].sort((a, b) => b.localeCompare(a));
  const today = todayLocalISO();
  const yesterday = addDaysLocalISO(today, -1);
  if (unique[0] !== today && unique[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    if (addDaysLocalISO(unique[i - 1], -1) === unique[i]) streak++;
    else break;
  }
  return streak;
}

export function calcWeekStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const weeks = [...new Set(dates.map(localWeekKey))].sort((a, b) => b.localeCompare(a));
  const thisWeek = localWeekKey(todayLocalISO());
  const lastWeek = addDaysLocalISO(thisWeek, -7);
  if (weeks[0] !== thisWeek && weeks[0] !== lastWeek) return 0;
  let streak = 1;
  for (let i = 1; i < weeks.length; i++) {
    if (addDaysLocalISO(weeks[i - 1], -7) === weeks[i]) streak++;
    else break;
  }
  return streak;
}
