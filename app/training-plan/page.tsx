'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { PlanRecord, PlanData, runPlanDisplayName, WEEKDAYS, isRunSession, planEndDateISO, todaysSession } from '@/lib/runPlanGenerator';
import { formatDate, todayLocalISO } from '@/lib/utils';
import PlanBuilder from '@/components/PlanBuilder';
import SportPlanBuilder from '@/components/SportPlanBuilder';
import CustomPlanBuilder from '@/components/CustomPlanBuilder';
import PlanView from '@/components/PlanView';
import GoalsPanel from '@/components/GoalsPanel';
import AccountSwitcher from '@/components/AccountSwitcher';

type Mode = 'plans' | 'goals';
type BuildKind = 'run' | 'sport' | 'custom';

function planProgress(p: PlanRecord) {
  // Includes Week 0 (lead-in) — a completed lead-in session still counts toward the total.
  const runs = p.plan_data.weeks.reduce((s, w) => s + WEEKDAYS.filter(d => isRunSession(w.days[d])).length, 0);
  const done = p.plan_data.weeks.reduce((s, w) => s + WEEKDAYS.filter(d => w.days[d].completed).length, 0);
  return { runs, done };
}

function planTitle(p: PlanRecord) {
  if (p.plan_kind === 'run') return runPlanDisplayName(p.distance, p.custom_distance_km);
  return p.name || 'Sport Plan';
}

function planTiming(p: PlanRecord): string {
  const today = todayLocalISO();
  const end = planEndDateISO(p);
  if (today < p.start_date) return `Starts ${formatDate(p.start_date)} · ends ${formatDate(end)}`;
  if (today > end) return `Ended ${formatDate(end)}`;
  const pos = todaysSession(p, today);
  const wk = pos ? Math.max(1, pos.week) : 1;
  return `Week ${wk} of ${p.weeks} · ends ${formatDate(end)}`;
}

function PlanCard({ p, onClick, onSwitch, onDeactivate, onActivate, onDelete, onDuplicate }: {
  p: PlanRecord; onClick: () => void;
  onSwitch?: () => void; onDeactivate: () => void; onActivate: () => void; onDelete: () => void; onDuplicate: () => void;
}) {
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
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-[#64748B]">{done} of {runs} {noun} completed</p>
          <p className="text-xs text-[#475569]">{planTiming(p)}</p>
        </div>
      </button>
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {p.active ? (
          <button onClick={onDeactivate} className="text-xs text-[#64748B] hover:text-white transition-colors px-2 py-1.5">Deactivate</button>
        ) : onSwitch ? (
          <button onClick={onSwitch} className="btn-secondary text-xs px-3 py-1.5">↻ Switch to this plan</button>
        ) : (
          <button onClick={onActivate} className="text-xs text-[#64748B] hover:text-white transition-colors px-2 py-1.5">Reactivate</button>
        )}
        <button onClick={onDuplicate} className="text-xs text-[#64748B] hover:text-white transition-colors px-2 py-1.5">⧉ Duplicate</button>
        <button onClick={onDelete} className="text-xs text-red-500/70 hover:text-red-400 transition-colors px-2 py-1.5 ml-auto">Delete</button>
      </div>
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
  const [pendingAction, setPendingAction] = useState<{ kind: 'switch' | 'deactivate' | 'activate' | 'delete'; plan: PlanRecord } | null>(null);

  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('training_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = (data as PlanRecord[]) || [];
        setPlans(list);
        setLoading(false);
        const params = new URLSearchParams(window.location.search);
        const planId = params.get('plan');
        if (planId) {
          const match = list.find(p => p.id === planId);
          if (match) {
            setSelected(match);
            if (params.get('celebrate') === '1') setCelebrate(true);
          }
        }
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
  };

  const handleDuplicate = async (p: PlanRecord) => {
    if (!user) return;
    // Fresh copy: clear all completed flags so progress starts at zero.
    const freshData: PlanData = {
      ...p.plan_data,
      weeks: p.plan_data.weeks.map(w => ({
        ...w, days: Object.fromEntries(WEEKDAYS.map(d => [d, { ...w.days[d], completed: false, completedActivityId: null }])) as typeof w.days,
      })),
    };
    const baseName = p.plan_kind === 'run' ? runPlanDisplayName(p.distance, p.custom_distance_km) : (p.name || 'Plan');
    const willActivate = p.plan_kind === 'run' ? !plans.some(x => x.plan_kind === 'run' && x.active) : true;
    const payload = {
      user_id: user.id, plan_kind: p.plan_kind, distance: p.distance, custom_distance_km: p.custom_distance_km,
      level: p.level, weeks: p.weeks, days_per_week: p.days_per_week, days_per_week_min: p.days_per_week_min,
      train_days: p.train_days, goal_time_seconds: p.goal_time_seconds, start_distance_km: p.start_distance_km,
      long_run_cap_km: p.long_run_cap_km ?? null, start_date: p.start_date, name: `${baseName} (copy)`,
      active: willActivate, plan_data: freshData, updated_at: new Date().toISOString(),
    };
    const { data } = await supabase.from('training_plans').insert(payload).select().single();
    if (data) setPlans(prev => [data as PlanRecord, ...prev]);
  };

  const setActiveFlag = async (plan: PlanRecord, active: boolean) => {
    setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, active } : p));
    setSelected(prev => (prev && prev.id === plan.id ? { ...prev, active } : prev));
    await supabase.from('training_plans').update({ active }).eq('id', plan.id);
  };

  const runPendingAction = async () => {
    if (!pendingAction) return;
    const { kind, plan } = pendingAction;
    if (kind === 'delete') await handleDelete(plan.id);
    else if (kind === 'switch') await handleSwitch(plan);
    else if (kind === 'deactivate') await setActiveFlag(plan, false);
    else if (kind === 'activate') await setActiveFlag(plan, true);
    setPendingAction(null);
  };

  const cancelBuild = () => { setBuildKind(null); setEditing(null); };

  if (loading) return <div className="text-[#64748B] text-sm">Loading...</div>;

  // Building / editing — pick the right builder by kind
  const activeKind: BuildKind = editing ? (editing.plan_kind as BuildKind) : (buildKind ?? 'run');
  if (buildKind || editing) {
    return (
      <div className="max-w-2xl lg:max-w-4xl mx-auto">
        {activeKind === 'custom' ? <CustomPlanBuilder existing={editing} onSaved={handleSaved} onCancel={cancelBuild} />
          : activeKind === 'sport' ? <SportPlanBuilder existing={editing} onSaved={handleSaved} onCancel={cancelBuild} />
          : <PlanBuilder existing={editing} hasActiveRunPlan={!!activeRunPlan} onSaved={handleSaved} onCancel={cancelBuild} />}
      </div>
    );
  }

  // Viewing a single plan
  if (selected) {
    return (
      <div className="max-w-3xl lg:max-w-5xl mx-auto">
        <PlanView
          plan={selected}
          onChange={updated => { setSelected(updated); setPlans(prev => prev.map(p => p.id === updated.id ? updated : p)); }}
          onEdit={() => setEditing(selected)}
          onDelete={() => handleDelete(selected.id)}
          onBack={() => setSelected(null)}
          onSwitchToThis={selected.plan_kind === 'run' ? () => setPendingAction({ kind: 'switch', plan: selected }) : undefined}
          autoCelebrate={celebrate}
        />
      </div>
    );
  }

  const chooseCard = (
    <div className="card">
      <p className="text-sm font-semibold text-white mb-3">Customisable plan options:</p>
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
    <div className="max-w-2xl lg:max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h1 className="text-xl font-bold text-white">Training Plan</h1>
        <AccountSwitcher compact />
      </div>

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
                        {active.map(p => (
                          <PlanCard key={p.id} p={p} onClick={() => setSelected(p)}
                            onDeactivate={() => setPendingAction({ kind: 'deactivate', plan: p })}
                            onActivate={() => setPendingAction({ kind: 'activate', plan: p })}
                            onDelete={() => setPendingAction({ kind: 'delete', plan: p })} onDuplicate={() => handleDuplicate(p)} />
                        ))}
                      </div>
                    )}
                    {inactive.length > 0 && (
                      <div className="flex flex-col gap-3 mt-2">
                        <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold">{active.length > 0 ? 'Other Plans' : 'All Plans'}</p>
                        {inactive.map(p => (
                          <PlanCard key={p.id} p={p} onClick={() => setSelected(p)}
                            onSwitch={p.plan_kind === 'run' ? () => setPendingAction({ kind: 'switch', plan: p }) : undefined}
                            onDeactivate={() => setPendingAction({ kind: 'deactivate', plan: p })}
                            onActivate={() => setPendingAction({ kind: 'activate', plan: p })}
                            onDelete={() => setPendingAction({ kind: 'delete', plan: p })} onDuplicate={() => handleDuplicate(p)} />
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

      {/* Unified confirm modal */}
      {pendingAction && (() => {
        const { kind, plan } = pendingAction;
        const copy = {
          switch: {
            title: 'Switch to this plan?',
            body: activeRunPlan && activeRunPlan.id !== plan.id
              ? <>This will end your current run plan, <strong className="text-white">{planTitle(activeRunPlan)}</strong>, and make <strong className="text-white">{planTitle(plan)}</strong> active.</>
              : <>This will make <strong className="text-white">{planTitle(plan)}</strong> your active run plan.</>,
            cta: 'Switch', danger: false,
          },
          deactivate: {
            title: 'Deactivate this plan?',
            body: <>It&apos;ll move to Other Plans and stop showing on your Dash. Your progress is kept — you can reactivate it anytime.</>,
            cta: 'Deactivate', danger: false,
          },
          activate: {
            title: 'Reactivate this plan?',
            body: <>It&apos;ll show as active again and appear on your Dash.</>,
            cta: 'Reactivate', danger: false,
          },
          delete: {
            title: 'Delete this plan?',
            body: <>This permanently deletes <strong className="text-white">{planTitle(plan)}</strong> and all its progress. This can&apos;t be undone.</>,
            cta: 'Delete', danger: true,
          },
        }[kind];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6 max-w-sm w-full">
              <h2 className="text-white font-bold text-lg mb-2">{copy.title}</h2>
              <p className="text-[#94A3B8] text-sm mb-5">{copy.body}</p>
              <div className="flex gap-3">
                <button onClick={() => setPendingAction(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={runPendingAction} className={`flex-1 py-2.5 rounded-lg font-semibold text-sm ${copy.danger ? 'bg-red-900/50 border border-red-700 text-red-200' : 'btn-primary'}`}>{copy.cta}</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
