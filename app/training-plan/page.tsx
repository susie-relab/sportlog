'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { PlanRecord, RUN_DISTANCE_LABELS, WEEKDAYS, isRunSession } from '@/lib/runPlanGenerator';
import PlanBuilder from '@/components/PlanBuilder';
import CustomPlanBuilder from '@/components/CustomPlanBuilder';
import PlanView from '@/components/PlanView';
import GoalsPanel from '@/components/GoalsPanel';

type Mode = 'plans' | 'goals';

function planProgress(p: PlanRecord) {
  const realWeeks = p.plan_data.weeks.filter(w => w.weekNumber > 0);
  const runs = realWeeks.reduce((s, w) => s + WEEKDAYS.filter(d => isRunSession(w.days[d])).length, 0);
  const done = realWeeks.reduce((s, w) => s + WEEKDAYS.filter(d => w.days[d].completed).length, 0);
  return { runs, done };
}

function planTitle(p: PlanRecord) {
  if (p.plan_kind === 'run') return `${RUN_DISTANCE_LABELS[p.distance]}${p.distance === 'custom' && p.custom_distance_km ? ` (${p.custom_distance_km} km)` : ''}`;
  return p.name || 'Custom Plan';
}

export default function PlanPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('plans');
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PlanRecord | null>(null);
  const [buildKind, setBuildKind] = useState<'run' | 'custom' | null>(null);
  const [choosing, setChoosing] = useState(false);
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
    setBuildKind(null);
    setEditing(null);
    setSelected(rec);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('training_plans').delete().eq('id', id);
    setPlans(prev => prev.filter(p => p.id !== id));
    setSelected(null);
  };

  const cancelBuild = () => { setBuildKind(null); setEditing(null); };

  if (loading) return <div className="text-[#64748B] text-sm">Loading...</div>;

  // Building / editing — pick the right builder by kind
  const activeKind = editing ? (editing.plan_kind === 'run' ? 'run' : 'custom') : buildKind;
  if (buildKind || editing) {
    return (
      <div className="max-w-2xl mx-auto">
        {activeKind === 'custom'
          ? <CustomPlanBuilder existing={editing} onSaved={handleSaved} onCancel={cancelBuild} />
          : <PlanBuilder existing={editing} onSaved={handleSaved} onCancel={cancelBuild} />}
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

  const chooseCard = (
    <div className="card">
      <p className="text-sm font-semibold text-white mb-3">What kind of plan?</p>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => { setChoosing(false); setBuildKind('run'); }} className="py-4 rounded-lg border border-[#334155] hover:border-blue-500 text-white text-sm font-semibold transition-colors">
          🏃 Run plan
          <span className="block text-xs text-[#64748B] font-normal mt-1">5K → ultra, auto-generated</span>
        </button>
        <button onClick={() => { setChoosing(false); setBuildKind('custom'); }} className="py-4 rounded-lg border border-[#334155] hover:border-blue-500 text-white text-sm font-semibold transition-colors">
          🎯 Custom mix
          <span className="block text-xs text-[#64748B] font-normal mt-1">Any sports & activities</span>
        </button>
      </div>
      <button onClick={() => setChoosing(false)} className="w-full mt-3 text-xs text-[#64748B] hover:text-white">Cancel</button>
    </div>
  );

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
          {choosing && chooseCard}
          {plans.length === 0 && !choosing ? (
            <div className="card text-center py-8">
              <p className="text-white font-semibold mb-1">No training plans yet</p>
              <p className="text-[#64748B] text-sm mb-4">Build an auto-generated run plan, or a custom mix of any sports and activities.</p>
              <button onClick={() => setChoosing(true)} className="btn-primary">+ Create a plan</button>
            </div>
          ) : !choosing ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#64748B]">{plans.length} saved plan{plans.length > 1 ? 's' : ''}</p>
                <button onClick={() => setChoosing(true)} className="btn-primary text-sm px-4 py-2">+ New plan</button>
              </div>
              {plans.map(p => {
                const { runs, done } = planProgress(p);
                const pct = runs > 0 ? Math.round((done / runs) * 100) : 0;
                const noun = p.plan_kind === 'run' ? 'runs' : 'sessions';
                return (
                  <button key={p.id} onClick={() => setSelected(p)}
                    className="card text-left hover:border-[#475569] transition-colors">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="font-bold text-white truncate">{planTitle(p)}</span>
                      <span className="text-xs text-[#64748B] capitalize flex-shrink-0">{p.level} · {p.weeks} wks</span>
                    </div>
                    <div className="w-full bg-[#0F172A] rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-[#64748B] mt-1.5">{done} of {runs} {noun} completed</p>
                  </button>
                );
              })}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
