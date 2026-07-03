'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { ExerciseType, EXERCISE_TYPE_COLORS } from '@/types';

type Period = 'week' | 'month' | 'quarter' | 'year';
type ActivityFilter = 'all' | ExerciseType;

interface Goal {
  id?: string;
  period: Period;
  activity_type: ActivityFilter;
  target_runs?: number | null;
  target_distance_km?: number | null;
  target_minutes?: number | null;
  target_activities?: number | null;
}

const PERIODS: { value: Period; label: string; sublabel: string }[] = [
  { value: 'week', label: 'Weekly', sublabel: 'Resets every Monday' },
  { value: 'month', label: 'Monthly', sublabel: 'Resets 1st of each month' },
  { value: 'quarter', label: 'Quarterly', sublabel: 'Every 3 months' },
  { value: 'year', label: 'Yearly', sublabel: 'Jan–Dec' },
];

const ACTIVITY_TYPES: { value: ActivityFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All Activities', color: '#3B82F6' },
  { value: 'run', label: 'Run', color: EXERCISE_TYPE_COLORS['run'] },
  { value: 'walk', label: 'Walk', color: EXERCISE_TYPE_COLORS['walk'] },
  { value: 'bike', label: 'Bike', color: EXERCISE_TYPE_COLORS['bike'] },
  { value: 'swim', label: 'Swim', color: EXERCISE_TYPE_COLORS['swim'] },
  { value: 'hiit', label: 'Gym Workout', color: EXERCISE_TYPE_COLORS['hiit'] },
  { value: 'sport', label: 'Sport', color: EXERCISE_TYPE_COLORS['sport'] },
  { value: 'stretch', label: 'Stretch', color: EXERCISE_TYPE_COLORS['stretch'] },
  { value: 'solo_fitness', label: 'Fitness Training', color: EXERCISE_TYPE_COLORS['solo_fitness'] },
];

const goalKey = (period: Period, actType: ActivityFilter) => `${period}__${actType}`;
const empty = (period: Period, actType: ActivityFilter): Goal => ({
  period, activity_type: actType,
  target_runs: null, target_distance_km: null, target_minutes: null, target_activities: null,
});

export default function GoalsPanel() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Record<string, Goal>>({});
  const [activePeriod, setActivePeriod] = useState<Period>('week');
  const [activeType, setActiveType] = useState<ActivityFilter>('all');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('goals').select('*').eq('user_id', user.id).then(({ data }) => {
      if (data) {
        const map: Record<string, Goal> = {};
        for (const g of data) {
          const key = goalKey(g.period as Period, (g.activity_type || 'all') as ActivityFilter);
          map[key] = g as Goal;
        }
        setGoals(map);
      }
      setLoading(false);
    });
  }, [user]);

  const key = goalKey(activePeriod, activeType);
  const goal = goals[key] || empty(activePeriod, activeType);

  const update = (field: keyof Goal, val: string) => {
    const num = val === '' ? null : parseFloat(val) || null;
    setGoals(prev => ({ ...prev, [key]: { ...goal, [field]: num } }));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      user_id: user!.id, period: activePeriod, activity_type: activeType,
      target_runs: goal.target_runs ?? null, target_distance_km: goal.target_distance_km ?? null,
      target_minutes: goal.target_minutes ?? null, target_activities: goal.target_activities ?? null,
    };
    const { data, error } = await supabase.from('goals').upsert(payload, { onConflict: 'user_id,period,activity_type' }).select().single();
    setSaving(false);
    if (!error && data) {
      setGoals(prev => ({ ...prev, [key]: data as Goal }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleClear = async () => {
    setGoals(prev => ({ ...prev, [key]: empty(activePeriod, activeType) }));
    await supabase.from('goals').upsert(
      { user_id: user!.id, period: activePeriod, activity_type: activeType, target_runs: null, target_distance_km: null, target_minutes: null, target_activities: null },
      { onConflict: 'user_id,period,activity_type' }
    );
  };

  const hasGoals = (g: Goal | undefined) => !!(g?.target_runs || g?.target_distance_km || g?.target_minutes || g?.target_activities);
  const activeTypeInfo = ACTIVITY_TYPES.find(t => t.value === activeType)!;
  const activePeriodInfo = PERIODS.find(p => p.value === activePeriod)!;

  if (loading) return <div className="text-[#64748B] text-sm">Loading...</div>;

  return (
    <div>
      <p className="text-sm text-[#64748B] mb-5">Set targets to track on your Dash. All fields optional.</p>

      <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-2">Period</p>
      <div className="grid grid-cols-4 gap-1.5 mb-5">
        {PERIODS.map(p => {
          const hasAny = ACTIVITY_TYPES.some(t => hasGoals(goals[goalKey(p.value, t.value)]));
          return (
            <button key={p.value} onClick={() => setActivePeriod(p.value)}
              className={`py-2 rounded-lg text-sm font-semibold border transition-all relative ${
                activePeriod === p.value ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
              }`}>
              {p.label}
              {hasAny && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400" />}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-2">Activity Type</p>
      <div className="grid grid-cols-3 gap-1.5 mb-5">
        {ACTIVITY_TYPES.map(t => {
          const isActive = activeType === t.value;
          const hasSet = hasGoals(goals[goalKey(activePeriod, t.value)]);
          return (
            <button key={t.value} onClick={() => setActiveType(t.value)}
              className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all relative ${
                isActive ? 'text-white border-2' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
              }`}
              style={isActive ? { borderColor: t.color, background: t.color + '22' } : {}}>
              {t.label}
              {hasSet && !isActive && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400" />}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-[#475569] mb-4">
        {activePeriodInfo.label} · {activeTypeInfo.label} · <span className="text-[#334155]">{activePeriodInfo.sublabel}</span>
      </p>

      <div className="card flex flex-col gap-4">
        {(activeType === 'all' || activeType === 'run') && (
          <div>
            <label className="label">Target Runs</label>
            <input type="number" className="input" placeholder="e.g. 4" min="0" value={goal.target_runs ?? ''} onChange={e => update('target_runs', e.target.value)} />
          </div>
        )}
        <div>
          <label className="label">Target Distance (km)</label>
          <input type="number" className="input" placeholder="e.g. 50" min="0" step="0.1" value={goal.target_distance_km ?? ''} onChange={e => update('target_distance_km', e.target.value)} />
        </div>
        <div>
          <label className="label">Target Time (minutes)</label>
          <input type="number" className="input" placeholder="e.g. 300" min="0" value={goal.target_minutes ?? ''} onChange={e => update('target_minutes', e.target.value)} />
          {goal.target_minutes ? <p className="text-xs text-[#475569] mt-1">= {Math.floor(goal.target_minutes / 60)}h {goal.target_minutes % 60}m</p> : null}
        </div>
        <div>
          <label className="label">Target Activities</label>
          <input type="number" className="input" placeholder="e.g. 6" min="0" value={goal.target_activities ?? ''} onChange={e => update('target_activities', e.target.value)} />
        </div>

        {saved && <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-300 text-sm">✅ Goals saved!</div>}

        <div className="flex gap-2 mt-1">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Goals'}</button>
          {hasGoals(goal) && <button onClick={handleClear} className="btn-secondary px-4 text-sm">Clear</button>}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">All Goals — {activePeriodInfo.label}</h2>
        <div className="flex flex-col gap-2">
          {ACTIVITY_TYPES.map(t => {
            const g = goals[goalKey(activePeriod, t.value)];
            if (!g || !hasGoals(g)) return null;
            return (
              <button key={t.value} onClick={() => setActiveType(t.value)}
                className="flex items-start justify-between py-2.5 px-3 rounded-lg border border-[#334155] bg-[#1E293B] text-left hover:border-[#475569] transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
                  <span className="text-sm font-medium text-white">{t.label}</span>
                </div>
                <div className="text-right flex flex-col gap-0.5">
                  {g.target_runs ? <span className="text-xs text-blue-400">{g.target_runs} runs</span> : null}
                  {g.target_distance_km ? <span className="text-xs text-blue-300">{g.target_distance_km} km</span> : null}
                  {g.target_minutes ? <span className="text-xs text-[#94A3B8]">{Math.floor(g.target_minutes/60)}h {g.target_minutes%60}m</span> : null}
                  {g.target_activities ? <span className="text-xs text-green-400">{g.target_activities} activities</span> : null}
                </div>
              </button>
            );
          })}
          {ACTIVITY_TYPES.every(t => !hasGoals(goals[goalKey(activePeriod, t.value)])) && (
            <p className="text-sm text-[#475569]">No goals set for {activePeriodInfo.label.toLowerCase()} yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
