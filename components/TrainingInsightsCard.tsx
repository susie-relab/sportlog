'use client';
import { useState, useEffect, useCallback } from 'react';
import { Lightbulb, RefreshCw } from 'lucide-react';
import { Activity } from '@/types';

interface Props {
  activities: Activity[];
}

export default function TrainingInsightsCard({ activities }: Props) {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const recent = activities.filter(a => a.date >= twoWeeksAgo).slice(0, 30);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.fetch('/api/training-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activities: recent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Request failed');
      setInsights(data.insights ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities.length]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="card mt-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wide flex items-center gap-1.5">
          <Lightbulb size={14} className="text-yellow-400" />
          Training Insights
        </h2>
        <button
          onClick={load}
          disabled={loading}
          className="text-[#64748B] hover:text-[#94A3B8] transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-4 bg-[#293548] rounded animate-pulse" style={{ width: `${70 + i * 8}%` }} />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {!loading && !error && (
        <ul className="flex flex-col gap-2">
          {insights.map((tip, i) => (
            <li key={i} className="flex gap-2 text-sm text-[#CBD5E1]">
              <span className="text-yellow-400 flex-shrink-0 mt-0.5">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
