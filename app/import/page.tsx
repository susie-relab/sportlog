'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { ExerciseType, RunType } from '@/types';

function parseGarminCSV(text: string): Record<string, string>[] {
  // Normalise line endings
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalised.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
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
    headers.forEach((h, i) => { row[h] = (values[i] || '').replace(/^"|"$/g, '').trim(); });
    return row;
  });
}

function parseGarminDate(str: string): string | null {
  if (!str) return null;
  const s = str.trim();
  // NZ / DD/MM/YYYY
  const nz = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (nz) return `${nz[3]}-${nz[2].padStart(2,'0')}-${nz[1].padStart(2,'0')}`;
  // ISO: 2026-06-29 or 2026-06-29T10:30:00
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  return null;
}

function parseDuration(str: string): number {
  if (!str || str === '--' || str === '0') return 0;
  const s = str.trim();
  // Remove any trailing fractional seconds before splitting (e.g. "1:05:22.5" → "1:05:22")
  const clean = s.replace(/\.\d+$/, '');
  const parts = clean.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    // HH:MM:SS
    return Math.round(parts[0] * 60 + parts[1] + parts[2] / 60);
  }
  if (parts.length === 2) {
    // Garmin short activities: MM:SS (both parts < 60 likely means MM:SS)
    if (parts[0] < 24) {
      // Treat as MM:SS
      return Math.round(parts[0] + parts[1] / 60) || 1;
    }
    // Treat as H:MM
    return parts[0] * 60 + parts[1];
  }
  return parseInt(s) || 0;
}

function parsePace(str: string): number | undefined {
  if (!str || str === '--' || str === '') return undefined;
  const s = str.replace(/\/km|\/mi/g, '').trim();
  const parts = s.split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0]);
    const secs = parseFloat(parts[1]);
    if (isNaN(mins) || isNaN(secs)) return undefined;
    return mins + secs / 60;
  }
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
  const [result, setResult] = useState<{ imported: number; skipped: number; error?: string } | null>(null);
  const [error, setError] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setError('');
    f.text().then(text => {
      const rows = parseGarminCSV(text);
      setPreview(rows.slice(0, 3));
    });
  };

  const handleImport = async () => {
    if (!file || !user) return;
    setImporting(true);
    setError('');

    const text = await file.text();
    const rows = parseGarminCSV(text);

    type ActivityInsert = {
      user_id: string; name: string; exercise_type: ExerciseType; run_type: RunType | null;
      duration_minutes: number; effort: number; distance_km: number | null;
      pace_min_km: number | null; max_pace_min_km: number | null;
      avg_hr: number | null; max_hr: number | null; is_pb: boolean; date: string; notes: null;
    };

    const batch: ActivityInsert[] = rows.map(row => {
      const actType = row['Activity Type'] || row['activity_type'] || '';
      const name = row['Title Name'] || row['Activity Name'] || row['Title'] || row['name'] || 'Imported Activity';
      const dateStr = row['Date'] || row['date'] || row['Start Time'] || '';
      const durationStr = row['Time'] || row['Moving Time'] || row['Elapsed Time'] || row['duration'] || '';
      const distRaw = row['Distance'] || row['distance'] || '';
      const distKm = distRaw ? (parseFloat(distRaw.replace(/[^0-9.]/g, '')) || null) : null;
      const avgPaceStr = row['Avg Pace'] || row['Average Pace'] || '';
      const maxPaceStr = row['Best Pace'] || row['Max Pace'] || '';
      const avgHrRaw = parseInt(row['Avg HR'] || row['Average Heart Rate'] || '');
      const maxHrRaw = parseInt(row['Max HR'] || row['Max Heart Rate'] || '');

      const date = parseGarminDate(dateStr);
      if (!date) return null;

      const exerciseType = guessExerciseType(actType);
      const duration = parseDuration(durationStr);
      if (!duration || duration <= 0) return null;

      const pace = parsePace(avgPaceStr);
      const maxPace = parsePace(maxPaceStr);

      return {
        user_id: user.id,
        name: name || 'Imported Activity',
        exercise_type: exerciseType,
        run_type: exerciseType === 'run' ? guessRunType(name) : null,
        duration_minutes: duration,
        effort: 5,
        distance_km: distKm && distKm > 0 && distKm < 1000 ? Math.round(distKm * 100) / 100 : null,
        pace_min_km: pace && pace > 0 && pace < 100 ? Math.round(pace * 1000) / 1000 : null,
        max_pace_min_km: maxPace && maxPace > 0 && maxPace < 100 ? Math.round(maxPace * 1000) / 1000 : null,
        avg_hr: !isNaN(avgHrRaw) && avgHrRaw > 0 && avgHrRaw < 300 ? avgHrRaw : null,
        max_hr: !isNaN(maxHrRaw) && maxHrRaw > 0 && maxHrRaw < 300 ? maxHrRaw : null,
        is_pb: false,
        notes: null,
        date,
      };
    }).filter((r): r is ActivityInsert => r !== null);

    if (batch.length === 0) {
      setError('No valid activities found. Make sure you exported Activities CSV from Garmin Connect.');
      setImporting(false);
      return;
    }

    let imported = 0;
    let skipped = 0;
    let firstError = '';

    for (let i = 0; i < batch.length; i += 50) {
      const chunk = batch.slice(i, i + 50);
      const { error: dbErr, data } = await supabase.from('activities').insert(chunk).select();
      if (dbErr) {
        skipped += chunk.length;
        if (!firstError) firstError = dbErr.message;
      } else {
        imported += data?.length || 0;
      }
    }

    setResult({ imported, skipped, error: firstError || undefined });
    setImporting(false);
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white mb-2">Import Data</h1>
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
          <label className="label">Select CSV file</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="input py-2 cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-600 file:text-white file:cursor-pointer"
          />
        </div>

        {preview.length > 0 && (
          <div>
            <p className="text-xs text-[#64748B] mb-2">Preview (first 3 rows):</p>
            <div className="overflow-x-auto rounded-lg border border-[#334155]">
              <table className="text-xs w-full">
                <thead>
                  <tr className="text-[#64748B] border-b border-[#334155]">
                    {Object.keys(preview[0]).slice(0, 6).map(h => (
                      <th key={h} className="text-left px-2 py-1.5 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="text-[#94A3B8] border-b border-[#334155]/50 last:border-0">
                      {Object.values(row).slice(0, 6).map((v, j) => (
                        <td key={j} className="px-2 py-1.5 max-w-[100px] truncate">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[#475569] mt-1.5">
              {(() => {
                const text2 = file ? '' : '';
                const sample = preview[0];
                const hasDate = !!(sample['Date'] || sample['date']);
                const hasTime = !!(sample['Time'] || sample['Moving Time']);
                const hasTitle = !!(sample['Title Name'] || sample['Activity Name']);
                return `Detected: ${hasDate ? '✓ Date' : '✗ Date'} · ${hasTime ? '✓ Time' : '✗ Time'} · ${hasTitle ? '✓ Title' : '✗ Title'}`;
              })()}
            </p>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {result ? (
          <div className={`p-3 rounded-lg border text-sm ${result.imported > 0 ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
            {result.imported > 0 ? `✅ Imported ${result.imported} activities.` : '⚠️ Import failed.'}
            {result.skipped > 0 ? ` ${result.skipped} skipped.` : ''}
            {result.error && <p className="mt-1 text-xs opacity-75">Error: {result.error}</p>}
            {result.imported === 0 && (
              <p className="mt-2 text-xs opacity-75">
                Check that the CSV columns include Date, Time, and Title Name. If you see an error above, it may indicate a database issue.
              </p>
            )}
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
