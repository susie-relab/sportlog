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

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });
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
