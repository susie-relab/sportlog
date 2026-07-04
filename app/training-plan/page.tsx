'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { PlanRecord, RUN_DISTANCE_LABELS, WEEKDAYS, isRunSession } from '@/lib/runPlanGenerator';
import PlanBuilder from '@/components/PlanBuilder';
import SportPlanBuilder from '@/components/SportPlanBuilder';
import CustomPlanBuilder from '@/components/CustomPlanBuilder';
import PlanView from '@/components/PlanView';
import GoalsPanel from '@/components/GoalsPanel';

type Mode = 'plans' | 'goals';
type BuildKind = 'run' | 'sport' | 'custom';

function planProgress(p: PlanRecord) {
  const realWeeks = p.plan_data.weeks.filter(w => w.weekNumber > 0);
  const runs = realWeeks.reduce((s, w) => s + WEEKDAYS.filter(d => isRunSession(w.days[d])).length, 0);
  const done = realWeeks.reduce((s, w) => s + WEEKDAYS.filter(d => w.days[d].completed).length, 0);
  return { runs, done };
}

function planTitle(p: PlanRecord) {
  if (p.plan_kind === 'run') return `${RUN_DISTANCE_LABELS[p.distance]}${p.distance === 'custom' && p.custom_distance_km ? ` (${p.custom_distance_km} km)` : ''}`;
  return p.name || 'Sport Plan';
}

function PlanCard({ p, onClick, onSwitch }: { p: PlanRecord; onClick: () => void; onSwitch?: () => void }) {
  const { runs, done } = planProgress(p);
  const pct = runs > 0 ? Math.round((done / runs) * 100) : 0;
  const noun = p.plan_kind === 'run' ? 'runs' : 'sessions';
  return (
    <div className={`card ${p.active ? '' : 'opacity-80'}`}>
      <button onClick={onClick} className="w-full text-left">
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-white truncate">{planTitle(p)}</span>
            {p.active && <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 flex-shrink-0">Active</span>}
            {!p.active && <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#334155] text-[#94A3B8] flex-shrink-0">Ended</span>}
          </div>
          <span className="text-xs text-[#64748B] capitalize flex-shrink-0">{p.level} · {p.weeks} wks</span>
        </div>
        <div className="w-full bg-[#0F172A] rounded-full h-2 overflow-hidden">
          <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-[#64748B] mt-1.5">{done} of {runs} {noun} completed</p>
      </button>
      {onSwitch && (
        <button onClick={onSwitch} className="btn-secondary text-xs px-3 py-1.5 mt-3 w-full">↻ Switch to this plan</button>
      )}
    </div>
  );
}

export default function PlanPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('plans');
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PlanRecord | null>(null);
  const [buildKind, setBuildKind] = useState<BuildKind | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [editing, setEditing] = useState<PlanRecord | null>(null);
  const [switchTarget, setSwitchTarget] = useState<PlanRecord | null>(null);

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

  const activeRunPlan = plans.find(p => p.plan_kind === 'run' && p.active);

  const handleSwitch = async (target: PlanRecord) => {
    const updates = [supabase.from('training_plans').update({ active: true }).eq('id', target.id)];
    if (activeRunPlan && activeRunPlan.id !== target.id) {
      updates.push(supabase.from('training_plans').update({ active: false }).eq('id', activeRunPlan.id));
    }
    await Promise.all(updates);
    const applyFlags = (p: PlanRecord) => {
      if (p.id === target.id) return { ...p, active: true };
      if (activeRunPlan && p.id === activeRunPlan.id) return { ...p, active: false };
      return p;
    };
    setPlans(prev => prev.map(applyFlags));
    setSelected(prev => (prev ? applyFlags(prev) : prev));
    setSwitchTarget(null);
  };

  const cancelBuild = () => { setBuildKind(null); setEditing(null); };

  if (loading) return <div className="text-[#64748B] text-sm">Loading...</div>;

  // Building / editing — pick the right builder by kind
  const activeKind: BuildKind = editing ? (editing.plan_kind as BuildKind) : (buildKind ?? 'run');
  if (buildKind || editing) {
    return (
      <div className="max-w-2xl mx-auto">
        {activeKind === 'custom' ? <CustomPlanBuilder existing={editing} onSaved={handleSaved} onCancel={cancelBuild} />
          : activeKind === 'sport' ? <SportPlanBuilder existing={editing} onSaved={handleSaved} onCancel={cancelBuild} />
          : <PlanBuilder existing={editing} hasActiveRunPlan={!!activeRunPlan} onSaved={handleSaved} onCancel={cancelBuild} />}
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
          onSwitchToThis={selected.plan_kind === 'run' ? () => setSwitchTarget(selected) : undefined}
        />
      </div>
    );
  }

  const chooseCard = (
    <div className="card">
      <p className="text-sm font-semibold text-white mb-3">What kind of plan?</p>
      <div className="flex flex-col gap-2">
        <button onClick={() => { setChoosing(false); setBuildKind('run'); }} className="py-3 px-4 rounded-lg border border-[#334155] hover:border-blue-500 text-white text-sm font-semibold transition-colors text-left">
          🏃 Run plan
          <span className="block text-xs text-[#64748B] font-normal mt-0.5">5K → ultra, auto-generated weekly runs</span>
        </button>
        <button onClick={() => { setChoosing(false); setBuildKind('sport'); }} className="py-3 px-4 rounded-lg border border-[#334155] hover:border-blue-500 text-white text-sm font-semibold transition-colors text-left">
          🎯 Sport plan
          <span className="block text-xs text-[#64748B] font-normal mt-0.5">One sport — pick session types (game, training, conditioning…) per day</span>
        </button>
        <button onClick={() => { setChoosing(false); setBuildKind('custom'); }} className="py-3 px-4 rounded-lg border border-[#334155] hover:border-blue-500 text-white text-sm font-semibold transition-colors text-left">
          🔀 Multi-sport plan
          <span className="block text-xs text-[#64748B] font-normal mt-0.5">Mix any sports & activities with weekly quantities</span>
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
              <p className="text-[#64748B] text-sm mb-4">Build an auto-generated run plan, a single-sport plan with session types, or a multi-sport mix.</p>
              <button onClick={() => setChoosing(true)} className="btn-primary">+ Create a plan</button>
            </div>
          ) : !choosing ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#64748B]">{plans.length} saved plan{plans.length > 1 ? 's' : ''}</p>
                <button onClick={() => setChoosing(true)} className="btn-primary text-sm px-4 py-2">+ New plan</button>
              </div>
              {(() => {
                const active = plans.filter(p => p.active);
                const inactive = plans.filter(p => !p.active);
                return (
                  <>
                    {active.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold">Active</p>
                        {active.map(p => <PlanCard key={p.id} p={p} onClick={() => setSelected(p)} />)}
                      </div>
                    )}
                    {inactive.length > 0 && (
                      <div className="flex flex-col gap-3 mt-2">
                        <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold">{active.length > 0 ? 'Other Plans' : 'All Plans'}</p>
                        {inactive.map(p => (
                          <PlanCard key={p.id} p={p} onClick={() => setSelected(p)}
                            onSwitch={p.plan_kind === 'run' ? () => setSwitchTarget(p) : undefined} />
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          ) : null}
        </div>
      )}

      {/* Switch confirmation */}
      {switchTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6 max-w-sm w-full">
            <h2 className="text-white font-bold text-lg mb-2">Switch to this plan?</h2>
            <p className="text-[#94A3B8] text-sm mb-5">
              {activeRunPlan
                ? <>This will end your current run plan, <strong className="text-white">{planTitle(activeRunPlan)}</strong>.</>
                : 'This will make it your active run plan.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setSwitchTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleSwitch(switchTarget)} className="btn-primary flex-1">Switch</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
