'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { ExerciseType, RunType } from '@/types';

function parseGarminCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    // Handle commas inside quoted fields
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    values.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] || '').replace(/^"|"$/g, ''); });
    return row;
  });
}

function parseGarminDate(str: string): string | null {
  if (!str) return null;
  // NZ format: 29/06/2026 or 29/06/2026 10:30:00
  const nz = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (nz) return `${nz[3]}-${nz[2].padStart(2,'0')}-${nz[1].padStart(2,'0')}`;
  // ISO format: 2026-06-29 or 2026-06-29T10:30:00
  const iso = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  return null;
}

function parseDuration(str: string): number {
  if (!str) return 0;
  const parts = str.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 60 + parts[1] + Math.round(parts[2] / 60);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseInt(str) || 0;
}

function parsePace(str: string): number | undefined {
  if (!str || str === '--') return undefined;
  const parts = str.split(':');
  if (parts.length === 2) return parseInt(parts[0]) + parseInt(parts[1]) / 60;
  return undefined;
}

function guessExerciseType(actType: string): ExerciseType {
  const t = actType.toLowerCase();
  if (t.includes('run') || t.includes('running') || t.includes('treadmill')) return 'run';
  if (t.includes('cycling') || t.includes('bike') || t.includes('biking') || t.includes('cycle')) return 'bike';
  if (t.includes('swim')) return 'swim';
  if (t.includes('hiit') || t.includes('cardio')) return 'hiit';
  if (t.includes('walk') || t.includes('hike') || t.includes('hiking')) return 'walk';
  if (t.includes('yoga') || t.includes('stretch') || t.includes('flexibility') || t.includes('pilates')) return 'stretch';
  if (t.includes('sport') || t.includes('soccer') || t.includes('football') || t.includes('tennis') || t.includes('basketball')) return 'sport';
  if (t.includes('strength') || t.includes('fitness') || t.includes('workout') || t.includes('training') || t.includes('individual')) return 'solo_fitness';
  return 'solo_fitness';
}

function guessRunType(name: string): RunType {
  const n = name.toLowerCase();
  if (n.includes('long') || n.includes('lsd')) return 'long';
  if (n.includes('tempo')) return 'tempo';
  if (n.includes('fartlek')) return 'fartlek';
  if (n.includes('interval') && (n.includes('speed') || n.includes('fast'))) return 'speed_intervals';
  if (n.includes('interval')) return 'long_intervals';
  if (n.includes('hill')) return 'hill_reps';
  if (n.includes('trail')) return 'trail';
  return 'easy';
}

export default function ImportPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    f.text().then(text => {
      const rows = parseGarminCSV(text);
      setPreview(rows.slice(0, 5));
    });
  };

  const handleImport = async () => {
    if (!file || !user) return;
    setImporting(true);
    setError('');

    const text = await file.text();
    const rows = parseGarminCSV(text);
    let imported = 0;
    let skipped = 0;

    type ActivityInsert = {
      user_id: string; name: string; exercise_type: ExerciseType; run_type: RunType | null;
      duration_minutes: number; effort: number; distance_km: number | null;
      pace_min_km: number | null; max_pace_min_km: number | null;
      avg_hr: number | null; max_hr: number | null; is_pb: boolean; date: string;
    };
    const batch: ActivityInsert[] = rows.map(row => {
      const actType = row['Activity Type'] || row['activity_type'] || '';
      const name = row['Title Name'] || row['Activity Name'] || row['Title'] || row['name'] || 'Imported Activity';
      const dateStr = row['Date'] || row['date'] || row['Start Time'] || '';
      const durationStr = row['Time'] || row['Moving Time'] || row['Elapsed Time'] || row['duration'] || '0';
      const distRaw = row['Distance'] || row['distance'] || '0';
      const distKm = parseFloat(distRaw.replace(/[^0-9.]/g, '')) || undefined;
      const avgPaceStr = row['Avg Pace'] || row['Average Pace'] || '';
      const maxPaceStr = row['Best Pace'] || row['Max Pace'] || '';
      const avgHr = parseInt(row['Avg HR'] || row['Average Heart Rate'] || '0') || undefined;
      const maxHr = parseInt(row['Max HR'] || row['Max Heart Rate'] || '0') || undefined;

      const date = parseGarminDate(dateStr);
      if (!date) return null;

      const exerciseType = guessExerciseType(actType);
      const duration = parseDuration(durationStr);
      if (duration === 0) return null;

      return {
        user_id: user.id,
        name,
        exercise_type: exerciseType,
        run_type: exerciseType === 'run' ? guessRunType(name) : null,
        duration_minutes: duration,
        effort: 5,
        distance_km: distKm && distKm > 0 ? distKm : null,
        pace_min_km: parsePace(avgPaceStr) ?? null,
        max_pace_min_km: parsePace(maxPaceStr) ?? null,
        avg_hr: avgHr ?? null,
        max_hr: maxHr ?? null,
        is_pb: false,
        date,
      };
    }).filter((r): r is ActivityInsert => r !== null);

    if (batch.length === 0) {
      setError('No valid activities found. Make sure you exported from Garmin Connect as CSV.');
      setImporting(false);
      return;
    }

    // Import in batches of 50
    for (let i = 0; i < batch.length; i += 50) {
      const chunk = batch.slice(i, i + 50);
      const { error: dbErr, data } = await supabase.from('activities').insert(chunk).select();
      if (dbErr) {
        skipped += chunk.length;
      } else {
        imported += data?.length || 0;
      }
    }

    setResult({ imported, skipped });
    setImporting(false);
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white mb-2">Import from Garmin</h1>
      <p className="text-sm text-[#64748B] mb-6">Import your Garmin Connect activity history via CSV export.</p>

      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-white mb-3">How to export from Garmin Connect</h2>
        <ol className="text-sm text-[#94A3B8] flex flex-col gap-2 list-decimal list-inside">
          <li>Go to <span className="text-blue-400">connect.garmin.com</span></li>
          <li>Click <strong className="text-white">Activities</strong> in the left sidebar</li>
          <li>Click the <strong className="text-white">Export CSV</strong> button (top right)</li>
          <li>Save the file and upload it below</li>
        </ol>
      </div>

      <div className="card flex flex-col gap-4">
        <div>
          <label className="label">Select Garmin CSV file</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="input py-2 cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-600 file:text-white file:cursor-pointer"
          />
        </div>

        {preview.length > 0 && (
          <div>
            <p className="text-xs text-[#64748B] mb-2">Preview (first 5 rows):</p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="text-[#64748B]">
                    {Object.keys(preview[0]).slice(0, 6).map(h => (
                      <th key={h} className="text-left pr-3 pb-1 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="text-[#94A3B8]">
                      {Object.values(row).slice(0, 6).map((v, j) => (
                        <td key={j} className="pr-3 py-0.5 truncate max-w-[100px]">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {result ? (
          <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-300 text-sm">
            ✅ Imported {result.imported} activities.{result.skipped > 0 ? ` ${result.skipped} skipped.` : ''}
          </div>
        ) : (
          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="btn-primary"
          >
            {importing ? 'Importing...' : 'Import Activities'}
          </button>
        )}
      </div>
    </div>
  );
}
