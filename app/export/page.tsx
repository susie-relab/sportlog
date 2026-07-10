'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Activity } from '@/types';
import { activitiesToCsv, downloadCsv } from '@/lib/exportCsv';
import { openDatePicker } from '@/lib/utils';

type ExportFilter = 'all' | 'run' | 'year' | 'custom';

export default function ExportPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<ExportFilter>('all');
  const [year, setYear] = useState(new Date().getFullYear());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState('');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const handleExport = async () => {
    if (!user) return;
    setLoading(true);
    setResult('');

    let query = supabase.from('activities').select('*').eq('user_id', user.id).order('date', { ascending: false });

    if (filter === 'run') query = query.eq('exercise_type', 'run');
    if (filter === 'year') {
      query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
    }
    if (filter === 'custom') {
      if (dateFrom) query = query.gte('date', dateFrom);
      if (dateTo) query = query.lte('date', dateTo);
    }

    const { data, error } = await query;
    setLoading(false);

    if (error || !data) {
      setResult('Error fetching data. Please try again.');
      return;
    }

    if (data.length === 0) {
      setResult('No activities found for the selected filter.');
      return;
    }

    const csv = activitiesToCsv(data as Activity[], filter === 'run' ? 'runs' : 'activities');
    const label = filter === 'run' ? 'runs' : filter === 'year' ? `${year}` : filter === 'custom' ? 'custom' : 'all';
    downloadCsv(csv, `sportlog-${label}-${new Date().toISOString().split('T')[0]}.csv`);
    setResult(`✅ Exported ${data.length} activities.`);
  };

  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-1">Export Data</h1>
      <p className="text-sm text-[#64748B] mb-6">Download your activity data as a CSV file.</p>

      <div className="card flex flex-col gap-5">
        <div>
          <label className="label">What to export</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['all', 'All Activities'],
              ['run', 'Runs Only'],
              ['year', 'By Year'],
              ['custom', 'Date Range'],
            ] as [ExportFilter, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all text-left ${
                  filter === val
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filter === 'year' && (
          <div>
            <label className="label">Year</label>
            <select className="input" value={year} onChange={e => setYear(parseInt(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        {filter === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">From</label>
              <input type="date" className="input" value={dateFrom} onClick={openDatePicker} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" className="input" value={dateTo} onClick={openDatePicker} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        )}

        {result && (
          <p className={`text-sm ${result.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{result}</p>
        )}

        <button onClick={handleExport} disabled={loading} className="btn-primary">
          {loading ? 'Preparing...' : 'Download CSV'}
        </button>
      </div>

      <div className="card mt-5">
        <h2 className="text-sm font-semibold text-white mb-2">Exported columns</h2>
        <p className="text-xs text-[#64748B] leading-relaxed">
          Date · Name · Exercise Type · Run Type · Duration · Distance · Effort · Avg Pace · Max Pace · Avg HR · Max HR · Intensity Mins · Is PB · PB Description · Notes
        </p>
      </div>
    </div>
  );
}
