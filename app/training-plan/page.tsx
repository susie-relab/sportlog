'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { PlanRecord, RUN_DISTANCE_LABELS, WEEKDAYS, isRunSession } from '@/lib/runPlanGenerator';
import PlanBuilder from '@/components/PlanBuilder';
import PlanView from '@/components/PlanView';
import GoalsPanel from '@/components/GoalsPanel';

type Mode = 'plans' | 'goals';

function planProgress(p: PlanRecord) {
  const runs = p.plan_data.weeks.reduce((s, w) => s + WEEKDAYS.filter(d => isRunSession(w.days[d])).length, 0);
  const done = p.plan_data.weeks.reduce((s, w) => s + WEEKDAYS.filter(d => w.days[d].completed).length, 0);
  return { runs, done };
}

export default function PlanPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('plans');
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PlanRecord | null>(null);
  const [building, setBuilding] = useState(false);
  const [editing, setEditing] = useState<PlanRecord | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('training_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => {
        setPlans((data as PlanRecord[]) || []);
        setLoading(false);
      });
  }, [user]);

  const handleSaved = (rec: PlanRecord) => {
    setPlans(prev => {
      const exists = prev.some(p => p.id === rec.id);
      return exists ? prev.map(p => p.id === rec.id ? rec : p) : [rec, ...prev];
    });
    setBuilding(false);
    setEditing(null);
    setSelected(rec);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('training_plans').delete().eq('id', id);
    setPlans(prev => prev.filter(p => p.id !== id));
    setSelected(null);
  };

  if (loading) return <div className="text-[#64748B] text-sm">Loading...</div>;

  // Building / editing
  if (building || editing) {
    return (
      <div className="max-w-2xl mx-auto">
        <PlanBuilder existing={editing} onSaved={handleSaved} onCancel={() => { setBuilding(false); setEditing(null); }} />
      </div>
    );
  }

  // Viewing a single plan
  if (selected) {
    return (
      <div className="max-w-3xl mx-auto">
        <PlanView
          plan={selected}
          onChange={updated => { setSelected(updated); setPlans(prev => prev.map(p => p.id === updated.id ? updated : p)); }}
          onEdit={() => setEditing(selected)}
          onDelete={() => handleDelete(selected.id)}
          onBack={() => setSelected(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-4">Training Plan</h1>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-1.5 mb-6 p-1 bg-[#0F172A] rounded-xl border border-[#293548]">
        <button onClick={() => setMode('plans')}
          className={`py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'plans' ? 'bg-blue-600 text-white' : 'text-[#94A3B8] hover:text-white'}`}>
          Training Plans
        </button>
        <button onClick={() => setMode('goals')}
          className={`py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'goals' ? 'bg-blue-600 text-white' : 'text-[#94A3B8] hover:text-white'}`}>
          Goals
        </button>
      </div>

      {mode === 'goals' ? <GoalsPanel /> : (
        <div className="flex flex-col gap-4">
          {plans.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-white font-semibold mb-1">No training plans yet</p>
              <p className="text-[#64748B] text-sm mb-4">Build a custom run plan — pick a distance, difficulty, and how many weeks you've got.</p>
              <button onClick={() => setBuilding(true)} className="btn-primary">+ Create a plan</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#64748B]">{plans.length} saved plan{plans.length > 1 ? 's' : ''}</p>
                <button onClick={() => setBuilding(true)} className="btn-primary text-sm px-4 py-2">+ New plan</button>
              </div>
              {plans.map(p => {
                const { runs, done } = planProgress(p);
                const pct = runs > 0 ? Math.round((done / runs) * 100) : 0;
                return (
                  <button key={p.id} onClick={() => setSelected(p)}
                    className="card text-left hover:border-[#475569] transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white">{RUN_DISTANCE_LABELS[p.distance]}{p.distance === 'custom' && p.custom_distance_km ? ` (${p.custom_distance_km} km)` : ''}</span>
                      <span className="text-xs text-[#64748B] capitalize">{p.level} · {p.weeks} wks · {p.days_per_week_min && p.days_per_week_min > 0 && p.days_per_week_min !== p.days_per_week ? `${p.days_per_week_min}–${p.days_per_week}` : p.days_per_week}/wk</span>
                    </div>
                    <div className="w-full bg-[#0F172A] rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-[#64748B] mt-1.5">{done} of {runs} runs completed</p>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
