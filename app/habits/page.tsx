'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  Habit, HabitLog, HabitCategory, HabitFrequencyType,
  HABIT_CATEGORY_LABELS, HABIT_CATEGORY_EMOJI, HABIT_CATEGORY_ORDER, HABIT_COLORS, HabitColorKey,
} from '@/types';
import { HABIT_PRESETS, HabitPreset } from '@/lib/habitPresets';
import { todayLocalISO } from '@/lib/utils';
import HabitListRow from '@/components/HabitListRow';
import HabitMonthCalendar from '@/components/HabitMonthCalendar';
import HabitTabBox from '@/components/HabitTabBox';

const WEEKDAY_OPTIONS: { key: string; label: string }[] = [
  { key: 'mon', label: 'M' }, { key: 'tue', label: 'T' }, { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' }, { key: 'fri', label: 'F' }, { key: 'sat', label: 'S' }, { key: 'sun', label: 'S' },
];

export default function HabitsPage() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<HabitCategory>('health');
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addStep, setAddStep] = useState<'presets' | 'custom'>('presets');
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<HabitCategory>('health');
  const [customColor, setCustomColor] = useState<HabitColorKey>('blue');
  const [customFrequency, setCustomFrequency] = useState<HabitFrequencyType>('daily');
  const [customDays, setCustomDays] = useState<string[]>([]);
  const [customTarget, setCustomTarget] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    const [{ data: h }, { data: l }] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).eq('archived', false).order('sort_order'),
      // A year back is enough range for streaks/best-streak and the month calendar without
      // pulling someone's entire multi-year history on every load.
      supabase.from('habit_logs').select('*').eq('user_id', user.id).gte('date', todayLocalISO().slice(0, 4) + '-01-01'),
    ]);
    setHabits((h as Habit[]) || []);
    setLogs((l as HabitLog[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const categoriesWithHabits = useMemo(() => {
    const present = new Set(habits.map(h => h.category));
    return HABIT_CATEGORY_ORDER.filter(c => present.has(c));
  }, [habits]);

  useEffect(() => {
    if (categoriesWithHabits.length > 0 && !categoriesWithHabits.includes(activeCategory)) {
      setActiveCategory(categoriesWithHabits[0]);
    }
  }, [categoriesWithHabits, activeCategory]);

  const habitsInCategory = habits.filter(h => h.category === activeCategory);

  useEffect(() => {
    if (habitsInCategory.length > 0 && !habitsInCategory.some(h => h.id === selectedHabitId)) {
      setSelectedHabitId(habitsInCategory[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, habits]);

  const logsByHabit = useMemo(() => {
    const map = new Map<string, HabitLog[]>();
    for (const l of logs) {
      if (!map.has(l.habit_id)) map.set(l.habit_id, []);
      map.get(l.habit_id)!.push(l);
    }
    return map;
  }, [logs]);

  const resetAddForm = () => {
    setAddStep('presets');
    setCustomName(''); setCustomCategory('health'); setCustomColor('blue');
    setCustomFrequency('daily'); setCustomDays([]); setCustomTarget('1');
    setError('');
  };

  const closeAdd = () => { setShowAdd(false); resetAddForm(); };

  const createHabit = async (fields: { name: string; category: HabitCategory; color: string; frequency_type: HabitFrequencyType; frequency_days: string | null; target_per_period: number }) => {
    if (!user) return;
    setSaving(true);
    setError('');
    const { data, error: dbErr } = await supabase.from('habits').insert({
      user_id: user.id,
      name: fields.name,
      category: fields.category,
      color: fields.color,
      frequency_type: fields.frequency_type,
      frequency_days: fields.frequency_days,
      target_per_period: fields.target_per_period,
      sort_order: habits.length,
      archived: false,
    }).select().single();
    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    if (data) {
      setHabits(prev => [...prev, data as Habit]);
      setActiveCategory(fields.category);
      closeAdd();
    }
  };

  const addPreset = (preset: HabitPreset) => createHabit({
    name: preset.name, category: preset.category, color: preset.color,
    frequency_type: 'daily', frequency_days: null, target_per_period: preset.target_per_period,
  });

  const submitCustom = () => {
    if (!customName.trim()) return setError('Please enter a habit name.');
    const target = parseInt(customTarget) || 1;
    createHabit({
      name: customName.trim(),
      category: customCategory,
      color: HABIT_COLORS[customColor],
      frequency_type: customFrequency,
      frequency_days: customFrequency === 'custom_days' ? (customDays.join(',') || null) : null,
      target_per_period: target,
    });
  };

  const moveHabit = async (id: string, direction: 'up' | 'down') => {
    const currentOrder = habits.filter(h => h.category === activeCategory);
    const from = currentOrder.findIndex(h => h.id === id);
    const to = direction === 'up' ? from - 1 : from + 1;
    if (from === -1 || to < 0 || to >= currentOrder.length) return;
    const reordered = [...currentOrder];
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    // Re-number just this category's habits, then merge back into the full list so other
    // categories' sort_order values are untouched.
    const updates = reordered.map((h, i) => ({ ...h, sort_order: i }));
    setHabits(prev => {
      const others = prev.filter(h => h.category !== activeCategory);
      return [...others, ...updates].sort((a, b) => a.sort_order - b.sort_order);
    });
    await Promise.all(updates.map(h => supabase.from('habits').update({ sort_order: h.sort_order }).eq('id', h.id)));
  };

  const updateHabit = async (habitId: string, patch: Partial<Habit>) => {
    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, ...patch } : h));
    await supabase.from('habits').update(patch).eq('id', habitId);
  };

  const logHabit = async (habit: Habit, date: string, count: number) => {
    if (!user) return;
    const existing = logsByHabit.get(habit.id)?.find(l => l.date === date);
    if (count <= 0) {
      if (existing) {
        setLogs(prev => prev.filter(l => l.id !== existing.id));
        await supabase.from('habit_logs').delete().eq('id', existing.id);
      }
      return;
    }
    if (existing) {
      setLogs(prev => prev.map(l => l.id === existing.id ? { ...l, count } : l));
      await supabase.from('habit_logs').update({ count }).eq('id', existing.id);
    } else {
      const { data } = await supabase.from('habit_logs').insert({
        habit_id: habit.id, user_id: user.id, date, count,
      }).select().single();
      if (data) setLogs(prev => [...prev, data as HabitLog]);
    }
  };

  /** Tap-to-cycle: 0 -> 1 -> 2 -> ... -> target -> 0. Shared by the calendar popover and
   *  each HabitListRow's day-boxes so the interaction is identical everywhere. */
  const cycleHabitLog = (habit: Habit, date: string) => {
    const current = logsByHabit.get(habit.id)?.find(l => l.date === date)?.count || 0;
    const next = current >= habit.target_per_period ? 0 : current + 1;
    logHabit(habit, date, next);
  };

  if (loading) return <div className="text-[#64748B] text-sm">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-white">Habits</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">+ Add Habit</button>
      </div>

      {habits.length === 0 ? (
        <div className="card text-[#64748B] text-sm">No habits yet — tap "+ Add Habit" to get started.</div>
      ) : (
        <>
          <HabitMonthCalendar habits={habits} logs={logs} onCycle={cycleHabitLog} />

          {/* Category tab strip */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
            {categoriesWithHabits.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  activeCategory === cat ? 'bg-[#293548] border-blue-500 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
                }`}
              >
                {HABIT_CATEGORY_EMOJI[cat]} {HABIT_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          <div className="mb-5">
            <HabitTabBox
              category={activeCategory}
              habits={habitsInCategory}
              logsByHabit={logsByHabit}
              selectedHabitId={selectedHabitId}
              onSelectHabit={setSelectedHabitId}
              onCreateHabit={fields => createHabit({ ...fields, category: activeCategory })}
              onMoveHabit={moveHabit}
              onUpdateHabit={updateHabit}
            />
          </div>

          <div className="flex flex-col gap-3 mb-5">
            {habitsInCategory.map(habit => (
              <HabitListRow
                key={habit.id}
                habit={habit}
                logs={logsByHabit.get(habit.id) || []}
                onCycle={date => cycleHabitLog(habit, date)}
                onSelect={() => setSelectedHabitId(habit.id)}
              />
            ))}
          </div>
        </>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeAdd} />
          <div className="relative w-full md:max-w-md max-h-[85vh] flex flex-col bg-[#1E293B] border border-[#334155] rounded-t-2xl md:rounded-2xl p-5 overflow-y-auto">
            {addStep === 'presets' ? (
              <>
                <h3 className="text-lg font-bold text-white mb-1">Add a Habit</h3>
                <p className="text-sm text-[#94A3B8] mb-4">Tap a recommended habit to add it, or make your own.</p>
                <div className="flex flex-col gap-4">
                  {HABIT_CATEGORY_ORDER.map(cat => {
                    const presets = HABIT_PRESETS.filter(p => p.category === cat);
                    if (presets.length === 0) return null;
                    return (
                      <div key={cat}>
                        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">{HABIT_CATEGORY_EMOJI[cat]} {HABIT_CATEGORY_LABELS[cat]}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {presets.map(p => (
                            <button
                              key={p.name}
                              onClick={() => addPreset(p)}
                              disabled={saving}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#334155] text-[#94A3B8] hover:border-[#475569] disabled:opacity-50"
                            >
                              <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: p.color }} />
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => setAddStep('custom')} className="btn-secondary w-full mt-5">+ Create Custom Habit</button>
                <button onClick={closeAdd} className="text-sm text-[#64748B] hover:text-white py-1 mt-2">Cancel</button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white mb-4">Custom Habit</h3>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="label">Name</label>
                    <input className="input" placeholder="e.g. Cold Showers" value={customName} onChange={e => setCustomName(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <div className="flex flex-wrap gap-1.5">
                      {HABIT_CATEGORY_ORDER.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setCustomCategory(cat)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${customCategory === cat ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}
                        >
                          {HABIT_CATEGORY_EMOJI[cat]} {HABIT_CATEGORY_LABELS[cat]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Colour</label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(HABIT_COLORS) as HabitColorKey[]).map(key => (
                        <button
                          key={key}
                          onClick={() => setCustomColor(key)}
                          aria-label={key}
                          className={`w-7 h-7 rounded-full border-2 ${customColor === key ? 'border-white' : 'border-transparent hover:border-[#475569]'}`}
                          style={{ background: HABIT_COLORS[key] }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Frequency</label>
                    <div className="flex gap-1.5">
                      {(['daily', 'weekly', 'custom_days'] as HabitFrequencyType[]).map(f => (
                        <button
                          key={f}
                          onClick={() => setCustomFrequency(f)}
                          className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${customFrequency === f ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}
                        >
                          {f === 'daily' ? 'Daily' : f === 'weekly' ? 'Weekly' : 'Specific Days'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {customFrequency === 'custom_days' && (
                    <div>
                      <label className="label">Which days</label>
                      <div className="flex gap-1.5">
                        {WEEKDAY_OPTIONS.map(d => {
                          const active = customDays.includes(d.key);
                          return (
                            <button
                              key={d.key}
                              onClick={() => setCustomDays(prev => active ? prev.filter(k => k !== d.key) : [...prev, d.key])}
                              className={`w-9 h-9 rounded-lg text-xs font-semibold border transition-all ${active ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="label">Times per {customFrequency === 'weekly' ? 'week' : 'day'}</label>
                    <input type="number" className="input" min="1" value={customTarget} onChange={e => setCustomTarget(e.target.value)} />
                  </div>
                  {error && <p className="text-red-400 text-sm">{error}</p>}
                  <button onClick={submitCustom} disabled={saving} className="btn-primary w-full mt-1">{saving ? 'Saving...' : 'Save Habit'}</button>
                  <button onClick={() => setAddStep('presets')} className="text-sm text-[#64748B] hover:text-white py-1">← Back</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
