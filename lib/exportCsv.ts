import { Activity, RUN_TYPE_LABELS, subTypeLabel } from '@/types';

const RUNS_HEADERS = [
  'Date', 'Name', 'Exercise Type', 'Run Type', 'Duration (min)',
  'Distance (km)', 'Effort', 'Avg Pace (min/km)', 'Max Pace (min/km)',
  'Avg HR', 'Max HR', 'Intensity Mins', 'Is PB', 'PB Description', 'Notes',
];

const ACTIVITIES_HEADERS = [
  'Date', 'Name', 'Exercise Type', 'Subtype', 'Run Style', 'Duration (min)',
  'Distance (km)', 'Effort', 'Avg Pace (min/km)', 'Max Pace (min/km)',
  'Avg HR', 'Max HR', 'Intensity Mins', 'Is PB', 'PB Description', 'Notes',
];

function formatPace(v: number | null | undefined): string {
  if (!v) return '';
  const m = Math.floor(v);
  const s = Math.round((v - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function escapeCell(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return '';
  const str = String(v);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** mode 'runs' (Run Log export) keeps a single Run Type column. mode 'activities' (Activity Log
 *  export, mixed exercise types) splits that into a generic Subtype column plus a Run Style
 *  column for the run-only terrain/equipment modifier. */
export function activitiesToCsv(activities: Activity[], mode: 'runs' | 'activities' = 'runs'): string {
  const rows = activities.map(a => {
    const typeCells = mode === 'activities'
      ? [a.exercise_type === 'run' ? (a.run_type ? RUN_TYPE_LABELS[a.run_type] : '') : subTypeLabel(a.sub_type), a.run_type_modifier ? RUN_TYPE_LABELS[a.run_type_modifier] : '']
      : [a.run_type || ''];
    return [
      a.date,
      a.name,
      a.exercise_type,
      ...typeCells,
      a.duration_minutes,
      a.distance_km ?? '',
      a.effort,
      formatPace(a.pace_min_km),
      formatPace(a.max_pace_min_km),
      a.avg_hr ?? '',
      a.max_hr ?? '',
      a.intensity_minutes ?? '',
      a.is_pb ? 'Yes' : '',
      a.pb_description || '',
      a.notes || '',
    ].map(escapeCell).join(',');
  });

  const headers = mode === 'activities' ? ACTIVITIES_HEADERS : RUNS_HEADERS;
  return [headers.join(','), ...rows].join('\n');
}

export function downloadCsv(csv: string, filename: string) {
  // Prefix a UTF-8 BOM so Excel on Windows renders accents/emoji/em-dashes correctly
  // instead of mojibake (it otherwise assumes the system default codepage, not UTF-8).
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
