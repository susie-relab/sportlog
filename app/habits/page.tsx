'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  Habit, HabitLog, HabitCategoryRow, HabitFrequencyType,
  HABIT_CATEGORY_LABELS, HABIT_CATEGORY_EMOJI, HABIT_CATEGORY_ORDER, HABIT_COLORS, HabitColorKey,
} from '@/types';
import { HABIT_PRESETS, HabitPreset } from '@/lib/habitPresets';
import { todayLocalISO } from '@/lib/utils';
import HabitListRow from '@/components/HabitListRow';
import HabitMonthCalendar from '@/components/HabitMonthCalendar';
import HabitTabBox, { FrequencyFields } from '@/components/HabitTabBox';

export default function HabitsPage() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [customCategories, setCustomCategories] = useState<HabitCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('health');
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addStep, setAddStep] = useState<'presets' | 'custom'>('presets');
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<string>('health');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryEmoji, setNewCategoryEmoji] = useState('⭐');
  const [customColor, setCustomColor] = useState<HabitColorKey>('blue');
  const [customFrequency, setCustomFrequency] = useState<HabitFrequencyType>('daily');
  const [customDays, setCustomDays] = useState<string[]>([]);
  const [customInterval, setCustomInterval] = useState('2');
  const [customTarget, setCustomTarget] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    const [{ data: h }, { data: l }, { data: c }] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).eq('archived', false).order('sort_order'),
      // A year back is enough range for streaks/best-streak and the month calendar without
      // pulling someone's entire multi-year history on every load.
      supabase.from('habit_logs').select('*').eq('user_id', user.id).gte('date', todayLocalISO().slice(0, 4) + '-01-01'),
      supabase.from('habit_categories').select('*').eq('user_id', user.id).order('sort_order'),
    ]);
    setHabits((h as Habit[]) || []);
    setLogs((l as HabitLog[]) || []);
    setCustomCategories((c as HabitCategoryRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // Every selectable category — the fixed built-ins plus any the user has created — in a
  // stable order: fixed first, then custom ones in creation order.
  const allCategoryDefs = useMemo(() => [
    ...HABIT_CATEGORY_ORDER.map(key => ({ key, label: HABIT_CATEGORY_LABELS[key], emoji: HABIT_CATEGORY_EMOJI[key] })),
    ...customCategories.map(c => ({ key: c.id, label: c.name, emoji: c.emoji })),
  ], [customCategories]);
  const categoryDefByKey = useMemo(() => new Map(allCategoryDefs.map(d => [d.key, d])), [allCategoryDefs]);

  const categoriesWithHabits = useMemo(() => {
    const present = new Set(habits.map(h => h.category));
    return allCategoryDefs.filter(d => present.has(d.key)).map(d => d.key);
  }, [habits, allCategoryDefs]);

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
    setCustomFrequency('daily'); setCustomDays([]); setCustomInterval('2'); setCustomTarget('1');
    setShowAddCategory(false); setNewCategoryName(''); setNewCategoryEmoji('⭐');
    setError('');
  };

  const closeAdd = () => { setShowAdd(false); resetAddForm(); };

  const createCategory = async () => {
    if (!user || !newCategoryName.trim()) return;
    const { data } = await supabase.from('habit_categories').insert({
      user_id: user.id,
      name: newCategoryName.trim(),
      emoji: newCategoryEmoji || '⭐',
      sort_order: customCategories.length,
    }).select().single();
    if (data) {
      const row = data as HabitCategoryRow;
      setCustomCategories(prev => [...prev, row]);
      setCustomCategory(row.id); // immediately select the new category for the habit being created
      setNewCategoryName(''); setNewCategoryEmoji('⭐');
      setShowAddCategory(false);
    }
  };

  const createHabit = async (fields: {
    name: string; category: string; color: string; frequency_type: HabitFrequencyType;
    frequency_days: string | null; frequency_interval_days: number | null; target_per_period: number;
  }) => {
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
      frequency_interval_days: fields.frequency_interval_days,
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
    frequency_type: 'daily', frequency_days: null, frequency_interval_days: null, target_per_period: preset.target_per_period,
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
      frequency_interval_days: customFrequency === 'every_n_days' ? (parseInt(customInterval) || 2) : null,
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

          {/* Category tab strip — browser-tab style: line divider between tabs, underline on the active one */}
          <div className="flex overflow-x-auto mb-4 -mx-1 px-1 divide-x divide-[#334155] border-b border-[#334155]">
            {categoriesWithHabits.map(cat => {
              const def = categoryDefByKey.get(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-shrink-0 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeCategory === cat ? 'border-blue-500 text-white' : 'border-transparent text-[#94A3B8] hover:text-white'
                  }`}
                >
                  {def?.emoji} {def?.label}
                </button>
              );
            })}
          </div>

          <div className="mb-5">
            <HabitTabBox
              categoryLabel={categoryDefByKey.get(activeCategory)?.label || ''}
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
                onUpdateHabit={patch => updateHabit(habit.id, patch)}
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
                      {allCategoryDefs.map(def => (
                        <button
                          key={def.key}
                          onClick={() => setCustomCategory(def.key)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${customCategory === def.key ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}
                        >
                          {def.emoji} {def.label}
                        </button>
                      ))}
                      <button
                        onClick={() => setShowAddCategory(true)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-dashed border-[#334155] text-[#94A3B8] hover:border-[#475569] hover:text-white transition-all"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {showAddCategory && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setShowAddCategory(false)}>
                      <div className="absolute inset-0 bg-black/70" />
                      <div className="relative w-full max-w-xs bg-[#1E293B] border border-[#334155] rounded-2xl p-4" onClick={e => e.stopPropagation()}>
                        <h4 className="text-sm font-bold text-white mb-3">New Category</h4>
                        <div className="flex flex-col gap-3">
                          <div>
                            <label className="label">Name</label>
                            <input className="input" placeholder="e.g. Finances" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                          </div>
                          <div>
                            <label className="label">Emoji</label>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {['⭐', '🎯', '💡', '🎨', '🎵', '📚', '🏠', '🚗', '💰', '🎮', '🐶', '🌟', '🔥', '✨', '🧠', '🧺'].map(e => (
                                <button
                                  key={e}
                                  onClick={() => setNewCategoryEmoji(e)}
                                  className={`w-8 h-8 rounded-lg text-base flex items-center justify-center border transition-all ${newCategoryEmoji === e ? 'border-blue-500 bg-blue-500/20' : 'border-[#334155] hover:border-[#475569]'}`}
                                >
                                  {e}
                                </button>
                              ))}
                            </div>
                            <input className="input" maxLength={4} value={newCategoryEmoji} onChange={e => setNewCategoryEmoji(e.target.value)} />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={createCategory} disabled={!newCategoryName.trim()} className="btn-primary flex-1 disabled:opacity-50">Add Category</button>
                            <button onClick={() => setShowAddCategory(false)} className="text-sm text-[#64748B] hover:text-white px-3">Cancel</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
                  <FrequencyFields
                    frequency={customFrequency} setFrequency={setCustomFrequency}
                    days={customDays} setDays={setCustomDays}
                    intervalDays={customInterval} setIntervalDays={setCustomInterval}
                    target={customTarget} setTarget={setCustomTarget}
                  />
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
