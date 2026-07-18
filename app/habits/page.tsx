'use client';
import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  Habit, HabitLog, HabitCategoryRow, HabitFrequencyType, HabitFrequencyChange, HabitTrackingStyle,
  HABIT_CATEGORY_LABELS, HABIT_CATEGORY_EMOJI, HABIT_CATEGORY_ORDER, HABIT_COLORS, HabitColorKey,
} from '@/types';
import { HABIT_PRESETS } from '@/lib/habitPresets';
import { todayLocalISO } from '@/lib/utils';
import { currentStreak, totalCompletions, periodProgress, addDaysISO, isPeriodBasedType } from '@/lib/habitStats';
import HabitListRow from '@/components/HabitListRow';
import HabitMonthCalendar from '@/components/HabitMonthCalendar';
import AccountSwitcher from '@/components/AccountSwitcher';
import HabitTabBox, { ApplyOption, FrequencyFields, StartDateFields, StartOption, resolveStartDate, CATEGORY_EMOJI_CHOICES } from '@/components/HabitTabBox';

type SortKey = 'name' | 'category' | 'colour' | 'frequency' | 'amount' | 'streak' | 'most_done' | 'completion' | 'time_of_day';

const SORT_KEY_LABELS: Record<SortKey, string> = {
  name: 'Alphabetical',
  category: 'Category',
  colour: 'Colour',
  frequency: 'Frequency',
  amount: 'Amount (goal)',
  streak: 'Current Streak',
  most_done: 'Most Often Done',
  completion: 'Completion % (this period)',
  time_of_day: 'Time of Day',
};
const SORT_KEY_ORDER: SortKey[] = ['name', 'category', 'colour', 'frequency', 'amount', 'streak', 'most_done', 'completion', 'time_of_day'];
const FREQUENCY_SORT_ORDER: HabitFrequencyType[] = ['daily', 'every_n_days', 'weekly', 'fortnightly', 'monthly', 'custom_days'];

export default function HabitsPage() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [frequencyHistory, setFrequencyHistory] = useState<HabitFrequencyChange[]>([]);
  const [customCategories, setCustomCategories] = useState<HabitCategoryRow[]>([]);
  const [archivedCategories, setArchivedCategories] = useState<HabitCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('health');
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedHabits, setArchivedHabits] = useState<Habit[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkColorPicker, setBulkColorPicker] = useState(false);
  const [bulkCategoryPicker, setBulkCategoryPicker] = useState(false);
  const [bulkFrequencyPicker, setBulkFrequencyPicker] = useState(false);
  const [bulkFrequency, setBulkFrequency] = useState<HabitFrequencyType>('daily');
  const [bulkDays, setBulkDays] = useState<string[]>([]);
  const [bulkInterval, setBulkInterval] = useState('2');
  const [bulkTarget, setBulkTarget] = useState('1');
  const [showSort, setShowSort] = useState(false);
  const [sortCriteria, setSortCriteria] = useState<{ key: SortKey; dir: 'asc' | 'desc' }[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [addStep, setAddStep] = useState<'presets' | 'custom'>('presets');
  const [selectedPresetNames, setSelectedPresetNames] = useState<Set<string>>(new Set());
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
  const [customTrackingStyle, setCustomTrackingStyle] = useState<HabitTrackingStyle>('count');
  const [customStartOption, setCustomStartOption] = useState<StartOption>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [presetsStartOption, setPresetsStartOption] = useState<StartOption>('today');
  const [presetsStartDate, setPresetsStartDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    const [{ data: h }, { data: l }, { data: c }, { data: f }] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).eq('archived', false).order('sort_order'),
      // A year back is enough range for streaks/best-streak and the month calendar without
      // pulling someone's entire multi-year history on every load.
      supabase.from('habit_logs').select('*').eq('user_id', user.id).gte('date', todayLocalISO().slice(0, 4) + '-01-01'),
      supabase.from('habit_categories').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('habit_frequency_changes').select('*').eq('user_id', user.id),
    ]);
    setHabits((h as Habit[]) || []);
    setLogs((l as HabitLog[]) || []);
    const allCats = (c as HabitCategoryRow[]) || [];
    setCustomCategories(allCats.filter(cat => !cat.archived));
    setArchivedCategories(allCats.filter(cat => cat.archived));
    setFrequencyHistory((f as HabitFrequencyChange[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // Every selectable category — the fixed built-ins plus any the user has created — reordered
  // by the user's saved drag order (user_metadata.habit_category_order), falling back to
  // fixed-then-custom-by-creation-order for any category not yet in that preference.
  const categoryOrderPref: string[] = user?.user_metadata?.habit_category_order || [];
  const allCategoryDefs = useMemo(() => {
    const base = [
      ...HABIT_CATEGORY_ORDER.map(key => ({ key, label: HABIT_CATEGORY_LABELS[key], emoji: HABIT_CATEGORY_EMOJI[key] })),
      ...customCategories.map(c => ({ key: c.id, label: c.name, emoji: c.emoji })),
    ];
    if (categoryOrderPref.length === 0) return base;
    const byKey = new Map(base.map(d => [d.key, d]));
    const ordered = categoryOrderPref.map(k => byKey.get(k)).filter((d): d is typeof base[number] => !!d);
    const remaining = base.filter(d => !categoryOrderPref.includes(d.key));
    return [...ordered, ...remaining];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customCategories, JSON.stringify(categoryOrderPref)]);
  const categoryDefByKey = useMemo(() => new Map(allCategoryDefs.map(d => [d.key, d])), [allCategoryDefs]);

  const persistCategoryOrder = (reordered: string[]) => {
    supabase.auth.updateUser({ data: { ...user?.user_metadata, habit_category_order: reordered } });
  };

  const reorderCategories = (fromKey: string, toKey: string) => {
    const allKeys = allCategoryDefs.map(d => d.key);
    const from = allKeys.indexOf(fromKey);
    const to = allKeys.indexOf(toKey);
    if (from === -1 || to === -1) return;
    const reordered = [...allKeys];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    persistCategoryOrder(reordered);
  };

  const renameCategory = async (key: string, newName: string) => {
    setCustomCategories(prev => prev.map(c => c.id === key ? { ...c, name: newName } : c));
    await supabase.from('habit_categories').update({ name: newName }).eq('id', key);
  };

  const removeCategory = async (key: string) => {
    if (habits.some(h => h.category === key)) return; // guard even if the UI's disabled check is bypassed
    setCustomCategories(prev => prev.filter(c => c.id !== key));
    await supabase.from('habit_categories').delete().eq('id', key);
    if (categoryOrderPref.includes(key)) persistCategoryOrder(categoryOrderPref.filter(k => k !== key));
  };

  // Archiving a category hides it (like archiving a habit) without losing it — unlike Remove,
  // it can be brought back later with the same name/emoji. Same "must be empty first" guard as
  // Remove, since an archived category drops out of the tab list entirely and any habit still
  // pointing at it would be left with no visible category.
  const archiveCategory = async (key: string) => {
    if (habits.some(h => h.category === key)) return;
    const row = customCategories.find(c => c.id === key);
    if (!row) return;
    setCustomCategories(prev => prev.filter(c => c.id !== key));
    setArchivedCategories(prev => [...prev, { ...row, archived: true }]);
    await supabase.from('habit_categories').update({ archived: true }).eq('id', key);
    if (categoryOrderPref.includes(key)) persistCategoryOrder(categoryOrderPref.filter(k => k !== key));
  };

  const unarchiveCategory = async (key: string) => {
    const row = archivedCategories.find(c => c.id === key);
    if (!row) return;
    setArchivedCategories(prev => prev.filter(c => c.id !== key));
    setCustomCategories(prev => [...prev, { ...row, archived: false }]);
    await supabase.from('habit_categories').update({ archived: false }).eq('id', key);
  };

  // Clones just the category "shell" (name + emoji) as a new custom category — not the habits
  // inside it. Works from any category, built-in or custom, since it never touches the source.
  const duplicateCategory = async (key: string) => {
    const def = allCategoryDefs.find(d => d.key === key);
    if (!def) return;
    await createCategoryWithFields(`${def.label} copy`, def.emoji);
  };

  const manageCategories = useMemo(() => {
    const fixedKeys = new Set<string>(HABIT_CATEGORY_ORDER);
    const habitCounts = new Map<string, number>();
    for (const h of habits) habitCounts.set(h.category, (habitCounts.get(h.category) || 0) + 1);
    return allCategoryDefs.map(d => ({ ...d, isCustom: !fixedKeys.has(d.key), habitCount: habitCounts.get(d.key) || 0 }));
  }, [allCategoryDefs, habits]);

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
    setSelectedPresetNames(new Set());
    setCustomName(''); setCustomCategory('health'); setCustomColor('blue');
    setCustomFrequency('daily'); setCustomDays([]); setCustomInterval('2'); setCustomTarget('1'); setCustomTrackingStyle('count');
    setCustomStartOption('today'); setCustomStartDate('');
    setPresetsStartOption('today'); setPresetsStartDate('');
    setShowAddCategory(false); setNewCategoryName(''); setNewCategoryEmoji('⭐');
    setError('');
  };

  const closeAdd = () => { setShowAdd(false); resetAddForm(); };

  const createCategoryWithFields = async (name: string, emoji: string): Promise<HabitCategoryRow | null> => {
    if (!user || !name.trim()) return null;
    const { data } = await supabase.from('habit_categories').insert({
      user_id: user.id,
      name: name.trim(),
      emoji: emoji || '⭐',
      sort_order: customCategories.length,
    }).select().single();
    if (data) {
      const row = data as HabitCategoryRow;
      setCustomCategories(prev => [...prev, row]);
      return row;
    }
    return null;
  };

  // Used by the Manage Categories panel — just creates it, doesn't touch the "add habit" form.
  const createCategoryFromManagePanel = (name: string, emoji: string) => { createCategoryWithFields(name, emoji); };

  const createCategory = async () => {
    const row = await createCategoryWithFields(newCategoryName, newCategoryEmoji);
    if (row) {
      setCustomCategory(row.id); // immediately select the new category for the habit being created
      setNewCategoryName(''); setNewCategoryEmoji('⭐');
      setShowAddCategory(false);
    }
  };

  const createHabit = async (fields: {
    name: string; category: string; color: string; frequency_type: HabitFrequencyType;
    frequency_days: string | null; frequency_interval_days: number | null; target_per_period: number;
    tracking_style?: HabitTrackingStyle; start_date?: string; time_of_day?: string | null;
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
      tracking_style: fields.tracking_style || 'count',
      start_date: fields.start_date || todayLocalISO(),
      time_of_day: fields.time_of_day || null,
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

  const togglePreset = (name: string) => {
    setSelectedPresetNames(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const addSelectedPresets = async () => {
    if (!user) return;
    const toAdd = HABIT_PRESETS.filter(p => selectedPresetNames.has(p.name));
    if (toAdd.length === 0) { closeAdd(); return; }
    setSaving(true);
    setError('');
    const startDate = resolveStartDate(presetsStartOption, presetsStartDate, todayLocalISO());
    const { data, error: dbErr } = await supabase.from('habits').insert(
      toAdd.map((p, i) => ({
        user_id: user.id,
        name: p.name,
        category: p.category,
        color: p.color,
        frequency_type: 'daily',
        frequency_days: null,
        frequency_interval_days: null,
        target_per_period: p.target_per_period,
        start_date: startDate,
        sort_order: habits.length + i,
        archived: false,
      }))
    ).select();
    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    if (data) {
      setHabits(prev => [...prev, ...(data as Habit[])]);
      setActiveCategory(toAdd[0].category);
    }
    closeAdd();
  };

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
      tracking_style: customTrackingStyle,
      start_date: resolveStartDate(customStartOption, customStartDate, todayLocalISO()),
    });
  };

  // Renumbers every habit's sort_order to match its position in `ordered`, so the flat
  // habit-list's global order and each category's tab-box order stay consistent with each
  // other (both are just this same array filtered/sliced, not independently maintained).
  const persistHabitOrder = async (ordered: Habit[]) => {
    const withOrder = ordered.map((h, i) => ({ ...h, sort_order: i }));
    setHabits(withOrder);
    await Promise.all(withOrder.map(h => supabase.from('habits').update({ sort_order: h.sort_order }).eq('id', h.id)));
  };

  // Up/down in the tab box's edit panel — moves a habit past its nearest neighbour *within
  // the same category*, skipping over any other categories' habits interleaved between them.
  // Press-and-hold drag reorder on the flat habit list below — reorders across categories too.
  const reorderAllHabits = (fromId: string, toId: string) => {
    const from = habits.findIndex(h => h.id === fromId);
    const to = habits.findIndex(h => h.id === toId);
    if (from === -1 || to === -1) return;
    const reordered = [...habits];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    persistHabitOrder(reordered);
  };

  const updateHabit = async (habitId: string, patch: Partial<Habit>) => {
    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, ...patch } : h));
    await supabase.from('habits').update(patch).eq('id', habitId);
  };

  // Changing a habit's frequency/goal asks *when* the new setting should start applying
  // (see FrequencyApplyPicker) instead of silently rewriting every past day's stats.
  // "Beginning of habit" collapses any existing history — the new setting now covers the
  // whole habit uniformly. Any other choice seeds the *old* settings as a historical row
  // (only on the very first change) so past days keep being judged by them, then adds a new
  // row for the new settings starting on the chosen date. The habit's own current fields are
  // updated immediately in every case — see the "tomorrow" caveat in FrequencyApplyPicker's
  // helper text: today/this-week stats intentionally use the current fields, not history.
  const changeHabitFrequency = async (
    habit: Habit,
    fields: { frequency_type: HabitFrequencyType; frequency_days: string | null; frequency_interval_days: number | null; target_per_period: number },
    applyOption: ApplyOption,
    customDate?: string,
  ) => {
    if (!user) return;
    const todayISO = todayLocalISO();

    if (applyOption === 'start') {
      setFrequencyHistory(prev => prev.filter(fh => fh.habit_id !== habit.id));
      await supabase.from('habit_frequency_changes').delete().eq('habit_id', habit.id);
      await updateHabit(habit.id, fields);
      return;
    }

    const effectiveDate = applyOption === 'today' ? todayISO
      : applyOption === 'tomorrow' ? addDaysISO(todayISO, 1)
      : (customDate || todayISO);

    const existingForHabit = frequencyHistory.filter(fh => fh.habit_id === habit.id);
    const rowsToInsert: Array<{
      habit_id: string; user_id: string; effective_date: string;
      frequency_type: HabitFrequencyType; frequency_days: string | null;
      frequency_interval_days: number | null; target_per_period: number;
    }> = [];

    // First-ever change for this habit: seed a row with the *old* settings from the habit's
    // start date, so days before the new effective_date still resolve to what was actually
    // in effect then, rather than falling through to the habit's (about-to-change) current fields.
    if (existingForHabit.length === 0) {
      rowsToInsert.push({
        habit_id: habit.id, user_id: user.id, effective_date: habit.start_date || todayISO,
        frequency_type: habit.frequency_type, frequency_days: habit.frequency_days ?? null,
        frequency_interval_days: habit.frequency_interval_days ?? null, target_per_period: habit.target_per_period,
      });
    }
    rowsToInsert.push({
      habit_id: habit.id, user_id: user.id, effective_date: effectiveDate,
      frequency_type: fields.frequency_type, frequency_days: fields.frequency_days,
      frequency_interval_days: fields.frequency_interval_days, target_per_period: fields.target_per_period,
    });

    const { data } = await supabase.from('habit_frequency_changes').insert(rowsToInsert).select();
    if (data) setFrequencyHistory(prev => [...prev, ...(data as HabitFrequencyChange[])]);
    await updateHabit(habit.id, fields);
  };

  // Archiving a habit pauses it (hides it everywhere) without losing its history, unlike a
  // hard delete — it just drops out of the loaded `habits` list, same as the DB query filters.
  const archiveHabit = async (habitId: string) => {
    setHabits(prev => prev.filter(h => h.id !== habitId));
    await supabase.from('habits').update({ archived: true }).eq('id', habitId);
  };

  const loadArchived = async () => {
    if (!user) return;
    const { data } = await supabase.from('habits').select('*').eq('user_id', user.id).eq('archived', true).order('name');
    setArchivedHabits((data as Habit[]) || []);
  };

  const unarchiveHabit = async (habitId: string) => {
    const habit = archivedHabits.find(h => h.id === habitId);
    if (!habit) return;
    setArchivedHabits(prev => prev.filter(h => h.id !== habitId));
    setHabits(prev => [...prev, { ...habit, archived: false }]);
    await supabase.from('habits').update({ archived: false }).eq('id', habitId);
  };

  // Unlike archiving, this permanently removes the habit and its logs (cascades via FK) —
  // used for both an active habit's own delete button and an archived habit's "Delete forever".
  const deleteHabit = async (habitId: string) => {
    if (!confirm('Delete this habit and all its history? This can\'t be undone.')) return;
    setHabits(prev => prev.filter(h => h.id !== habitId));
    setArchivedHabits(prev => prev.filter(h => h.id !== habitId));
    await supabase.from('habits').delete().eq('id', habitId);
  };

  const toggleBulkSelected = (id: string) => {
    setBulkSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exitBulkMode = () => {
    setBulkMode(false);
    setBulkSelected(new Set());
    setBulkColorPicker(false);
    setBulkCategoryPicker(false);
  };

  const bulkSetCategory = (category: string) => {
    setHabits(prev => prev.map(h => bulkSelected.has(h.id) ? { ...h, category } : h));
    bulkSelected.forEach(id => { supabase.from('habits').update({ category }).eq('id', id); });
    setBulkCategoryPicker(false);
    exitBulkMode();
  };

  const bulkSetColor = (color: string) => {
    setHabits(prev => prev.map(h => bulkSelected.has(h.id) ? { ...h, color } : h));
    bulkSelected.forEach(id => { supabase.from('habits').update({ color }).eq('id', id); });
    setBulkColorPicker(false);
    exitBulkMode();
  };

  const bulkDelete = () => {
    if (bulkSelected.size === 0) return;
    if (!confirm(`Delete ${bulkSelected.size} habit(s) and all their history? This can't be undone.`)) return;
    setHabits(prev => prev.filter(h => !bulkSelected.has(h.id)));
    bulkSelected.forEach(id => { supabase.from('habits').delete().eq('id', id); });
    exitBulkMode();
  };

  const bulkPause = () => {
    if (bulkSelected.size === 0) return;
    setHabits(prev => prev.filter(h => !bulkSelected.has(h.id)));
    bulkSelected.forEach(id => { supabase.from('habits').update({ archived: true }).eq('id', id); });
    exitBulkMode();
  };

  const bulkSkipToday = () => {
    habits.filter(h => bulkSelected.has(h.id)).forEach(h => skipToday(h));
    exitBulkMode();
  };
  const bulkAddToday = () => {
    habits.filter(h => bulkSelected.has(h.id)).forEach(h => incrementToday(h));
    exitBulkMode();
  };
  const bulkReduceToday = () => {
    habits.filter(h => bulkSelected.has(h.id)).forEach(h => decrementToday(h));
    exitBulkMode();
  };

  const bulkSetFrequency = () => {
    const patch: Partial<Habit> = {
      frequency_type: bulkFrequency,
      frequency_days: bulkFrequency === 'custom_days' ? (bulkDays.join(',') || null) : null,
      frequency_interval_days: bulkFrequency === 'every_n_days' ? (parseInt(bulkInterval) || 2) : null,
      target_per_period: parseInt(bulkTarget) || 1,
    };
    setHabits(prev => prev.map(h => bulkSelected.has(h.id) ? { ...h, ...patch } : h));
    bulkSelected.forEach(id => { supabase.from('habits').update(patch).eq('id', id); });
    setBulkFrequencyPicker(false);
    exitBulkMode();
  };

  // Multi-criteria sort: criteria are applied in priority order (first = highest priority),
  // producing one combined comparator. Applying persists the result via the same sort_order
  // path manual drag-reorder uses, so dragging afterwards still works normally.
  const sortMetric = (key: SortKey, h: Habit): number | string => {
    switch (key) {
      case 'name': return h.name.toLowerCase();
      case 'category': return categoryDefByKey.get(h.category)?.label.toLowerCase() || h.category;
      case 'colour': return h.color;
      case 'frequency': return FREQUENCY_SORT_ORDER.indexOf(h.frequency_type);
      case 'amount': return h.target_per_period;
      case 'streak': return currentStreak(h, logsByHabit.get(h.id) || [], todayLocalISO(), frequencyHistory);
      case 'most_done': return totalCompletions(logsByHabit.get(h.id) || []);
      case 'completion': return periodProgress(h, logsByHabit.get(h.id) || [], todayLocalISO()).pct;
      // Habits with no time set sort after every timed habit, regardless of direction.
      case 'time_of_day': return h.time_of_day || '99:99';
    }
  };

  const applySort = () => {
    if (sortCriteria.length === 0) { setShowSort(false); return; }
    const sorted = [...habits].sort((a, b) => {
      for (const { key, dir } of sortCriteria) {
        const va = sortMetric(key, a);
        const vb = sortMetric(key, b);
        let cmp = 0;
        if (typeof va === 'string' && typeof vb === 'string') cmp = va.localeCompare(vb);
        else cmp = (va as number) - (vb as number);
        if (dir === 'desc') cmp = -cmp;
        if (cmp !== 0) return cmp;
      }
      return 0;
    });
    persistHabitOrder(sorted);
    setShowSort(false);
  };

  const addSortCriterion = (key: SortKey) => {
    setSortCriteria(prev => prev.some(c => c.key === key) ? prev : [...prev, { key, dir: 'asc' }]);
  };
  const removeSortCriterion = (key: SortKey) => setSortCriteria(prev => prev.filter(c => c.key !== key));
  const toggleSortDir = (key: SortKey) => setSortCriteria(prev => prev.map(c => c.key === key ? { ...c, dir: c.dir === 'asc' ? 'desc' : 'asc' } : c));
  const moveSortCriterion = (key: SortKey, delta: number) => {
    setSortCriteria(prev => {
      const i = prev.findIndex(c => c.key === key);
      const j = i + delta;
      if (i === -1 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
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

  /** Tap-to-cycle: 0 -> 1 -> 2 -> ... -> target -> 0. Used by the month calendar's day popover. */
  const cycleHabitLog = (habit: Habit, date: string) => {
    const current = Math.max(0, logsByHabit.get(habit.id)?.find(l => l.date === date)?.count || 0);
    const next = current >= habit.target_per_period ? 0 : current + 1;
    logHabit(habit, date, next);
  };

  /** +/- steppers on the tab box and progress rows — a second, more precise way to log a
   *  completion for today alongside the calendar's tap-to-cycle. Clamping a negative "didn't
   *  happen" sentinel to 0 here means tapping + after marking a fail just starts counting up,
   *  which naturally overwrites the fail mark via logHabit's normal upsert. */
  const incrementToday = (habit: Habit) => {
    const current = Math.max(0, logsByHabit.get(habit.id)?.find(l => l.date === todayLocalISO())?.count || 0);
    logHabit(habit, todayLocalISO(), current + 1);
  };
  const decrementToday = (habit: Habit) => {
    const current = Math.max(0, logsByHabit.get(habit.id)?.find(l => l.date === todayLocalISO())?.count || 0);
    logHabit(habit, todayLocalISO(), Math.max(0, current - 1));
  };

  // Shared by "Didn't happen" (-1) and "Skip for today" (-2) — both are sentinel counts
  // distinguishing an explicit mark from a day that's simply not logged yet. Tapping the same
  // sentinel again clears it back to unlogged. Setting either sentinel also locks the day's
  // +/- stepper (cleared when the sentinel itself is cleared).
  const setSentinelToday = async (habit: Habit, sentinel: -1 | -2) => {
    if (!user) return;
    const todayISO = todayLocalISO();
    const existing = logsByHabit.get(habit.id)?.find(l => l.date === todayISO);
    if (existing?.count === sentinel) {
      setLogs(prev => prev.filter(l => l.id !== existing.id));
      await supabase.from('habit_logs').delete().eq('id', existing.id);
      return;
    }
    if (existing) {
      setLogs(prev => prev.map(l => l.id === existing.id ? { ...l, count: sentinel, locked: true } : l));
      await supabase.from('habit_logs').update({ count: sentinel, locked: true }).eq('id', existing.id);
    } else {
      const { data } = await supabase.from('habit_logs').insert({
        habit_id: habit.id, user_id: user.id, date: todayISO, count: sentinel, locked: true,
      }).select().single();
      if (data) setLogs(prev => [...prev, data as HabitLog]);
    }
  };
  const markFailedToday = (habit: Habit) => setSentinelToday(habit, -1);
  const skipToday = (habit: Habit) => setSentinelToday(habit, -2);

  /** Tick (✓ done): sets today's count to the day's target (daily/custom-day habits) or just
   *  1 (week/month/every-N-days habits — a single day's contribution toward the period total,
   *  not the whole period target) and locks the stepper. Tapping tick again while it's the
   *  active lock just undoes the lock — the logged count is left as-is so the user can still
   *  fine-tune it with the stepper afterwards. */
  const tickHabitToday = async (habit: Habit) => {
    if (!user) return;
    const todayISO = todayLocalISO();
    const existing = logsByHabit.get(habit.id)?.find(l => l.date === todayISO);
    const tickCount = isPeriodBasedType(habit.frequency_type) ? 1 : habit.target_per_period;
    if (existing?.locked && existing.count === tickCount) {
      setLogs(prev => prev.map(l => l.id === existing.id ? { ...l, locked: false } : l));
      await supabase.from('habit_logs').update({ locked: false }).eq('id', existing.id);
      return;
    }
    if (existing) {
      setLogs(prev => prev.map(l => l.id === existing.id ? { ...l, count: tickCount, locked: true } : l));
      await supabase.from('habit_logs').update({ count: tickCount, locked: true }).eq('id', existing.id);
    } else {
      const { data } = await supabase.from('habit_logs').insert({
        habit_id: habit.id, user_id: user.id, date: todayISO, count: tickCount, locked: true,
      }).select().single();
      if (data) setLogs(prev => [...prev, data as HabitLog]);
    }
  };

  if (loading) return <div className="text-[#64748B] text-sm">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5 gap-2 flex-wrap">
        <h1 className="text-xl font-bold text-white">Habits</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => { setShowArchived(true); loadArchived(); }} className="text-sm text-[#64748B] hover:text-white">Paused</button>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">+ Add Habit</button>
          <AccountSwitcher compact />
        </div>
      </div>

      {showArchived && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowArchived(false)} />
          <div className="custom-scroll relative w-full md:max-w-md max-h-[85vh] flex flex-col bg-[#1E293B] border border-[#334155] rounded-t-2xl md:rounded-2xl p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Paused Habits</h3>
              <button onClick={() => setShowArchived(false)} className="p-1 rounded-lg hover:bg-[#334155] text-[#94A3B8]"><X size={18} /></button>
            </div>
            {archivedHabits.length === 0 ? (
              <p className="text-sm text-[#64748B]">No paused habits — habits paused via a habit's edit panel show up here to bring back.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {archivedHabits.map(h => (
                  <div key={h.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[#334155]">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: h.color }} />
                      <span className="text-sm text-white truncate">{h.name}</span>
                    </span>
                    <span className="flex items-center gap-3 flex-shrink-0">
                      <button onClick={() => unarchiveHabit(h.id)} className="text-xs font-medium text-blue-400 hover:text-blue-300">Unpause</button>
                      <button onClick={() => deleteHabit(h.id)} className="text-xs font-medium text-red-400 hover:text-red-300">Delete forever</button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {habits.length === 0 ? (
        <div className="card text-[#64748B] text-sm">No habits yet — tap "+ Add Habit" to get started.</div>
      ) : (
        <>
          <HabitMonthCalendar habits={habits} logs={logs} frequencyHistory={frequencyHistory} onCycle={cycleHabitLog} />

          <div className="mb-5">
            <HabitTabBox
              categories={manageCategories}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              onReorderCategory={reorderCategories}
              onRenameCategory={renameCategory}
              onRemoveCategory={removeCategory}
              onArchiveCategory={archiveCategory}
              onDuplicateCategory={duplicateCategory}
              archivedCategories={archivedCategories.map(c => ({ key: c.id, label: c.name, emoji: c.emoji }))}
              onUnarchiveCategory={unarchiveCategory}
              onCreateCategory={createCategoryFromManagePanel}
              categoryLabel={categoryDefByKey.get(activeCategory)?.label || ''}
              habits={habitsInCategory}
              logsByHabit={logsByHabit}
              frequencyHistory={frequencyHistory}
              selectedHabitId={selectedHabitId}
              onSelectHabit={setSelectedHabitId}
              onCreateHabit={fields => createHabit({ ...fields, category: activeCategory })}
              onReorderHabit={reorderAllHabits}
              onArchiveHabit={archiveHabit}
              onDeleteHabit={deleteHabit}
              onUpdateHabit={updateHabit}
              onChangeFrequency={changeHabitFrequency}
              onIncrementToday={incrementToday}
              onDecrementToday={decrementToday}
              onMarkFailedToday={markFailedToday}
              onSkipToday={skipToday}
              onTickToday={tickHabitToday}
            />
          </div>

          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => (bulkMode ? exitBulkMode() : setBulkMode(true))} className="text-sm text-[#64748B] hover:text-white">{bulkMode ? 'Cancel' : 'Select'}</button>
            <button onClick={() => setShowSort(v => !v)} className="text-sm text-[#64748B] hover:text-white">Sort</button>
          </div>

          {showSort && (
            <div className="card mb-3 flex flex-col gap-3">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Sort by (priority order)</p>
              {sortCriteria.length === 0 ? (
                <p className="text-xs text-[#64748B]">No criteria added yet — pick one below.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {sortCriteria.map((c, i) => (
                    <div key={c.key} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#334155]">
                      <span className="text-xs font-semibold text-[#64748B] w-4">{i + 1}.</span>
                      <span className="text-sm text-white flex-1">{SORT_KEY_LABELS[c.key]}</span>
                      <button onClick={() => toggleSortDir(c.key)} className="text-xs font-medium text-blue-400 hover:text-blue-300 px-1.5">
                        {c.dir === 'asc' ? 'Asc ↑' : 'Desc ↓'}
                      </button>
                      <button onClick={() => moveSortCriterion(c.key, -1)} disabled={i === 0} className="text-[#94A3B8] hover:text-white disabled:opacity-30 px-1">▲</button>
                      <button onClick={() => moveSortCriterion(c.key, 1)} disabled={i === sortCriteria.length - 1} className="text-[#94A3B8] hover:text-white disabled:opacity-30 px-1">▼</button>
                      <button onClick={() => removeSortCriterion(c.key)} className="text-red-400 hover:text-red-300 px-1">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {SORT_KEY_ORDER.filter(k => !sortCriteria.some(c => c.key === k)).map(k => (
                  <button
                    key={k}
                    onClick={() => addSortCriterion(k)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-dashed border-[#334155] text-[#94A3B8] hover:border-[#475569] hover:text-white"
                  >
                    + {SORT_KEY_LABELS[k]}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={applySort} disabled={sortCriteria.length === 0} className="btn-primary flex-1 disabled:opacity-40">Apply</button>
                <button onClick={() => setSortCriteria([])} className="text-sm text-[#64748B] hover:text-white px-3">Clear</button>
              </div>
              <p className="text-[11px] text-[#64748B]">Applying reorders the list — you can still drag habits to fine-tune afterwards.</p>
            </div>
          )}

          {bulkMode && (
            <div className="card mb-3 flex flex-col gap-3">
              <p className="text-sm text-white font-medium">{bulkSelected.size} selected</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setBulkCategoryPicker(v => !v)} disabled={bulkSelected.size === 0} className="btn-secondary text-sm disabled:opacity-40">Change Category</button>
                <button onClick={() => setBulkColorPicker(v => !v)} disabled={bulkSelected.size === 0} className="btn-secondary text-sm disabled:opacity-40">Change Colour</button>
                <button onClick={() => setBulkFrequencyPicker(v => !v)} disabled={bulkSelected.size === 0} className="btn-secondary text-sm disabled:opacity-40">Change Frequency</button>
                <button onClick={bulkAddToday} disabled={bulkSelected.size === 0} className="btn-secondary text-sm disabled:opacity-40">Add (Today)</button>
                <button onClick={bulkReduceToday} disabled={bulkSelected.size === 0} className="btn-secondary text-sm disabled:opacity-40">Decrease (Today)</button>
                <button onClick={bulkSkipToday} disabled={bulkSelected.size === 0} className="btn-secondary text-sm disabled:opacity-40">Skip for Today</button>
                <button onClick={bulkPause} disabled={bulkSelected.size === 0} className="btn-secondary text-sm disabled:opacity-40">Pause</button>
                <button onClick={bulkDelete} disabled={bulkSelected.size === 0} className="text-sm font-medium text-red-400 hover:text-red-300 disabled:opacity-40 px-2">Delete</button>
              </div>
              {bulkCategoryPicker && (
                <div className="flex flex-wrap gap-1.5">
                  {manageCategories.map(c => (
                    <button
                      key={c.key}
                      onClick={() => bulkSetCategory(c.key)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#334155] text-[#94A3B8] hover:border-[#475569]"
                    >
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              )}
              {bulkColorPicker && (
                <div className="grid grid-cols-10 gap-2">
                  {(Object.keys(HABIT_COLORS) as HabitColorKey[]).map(key => (
                    <button
                      key={key}
                      onClick={() => bulkSetColor(HABIT_COLORS[key])}
                      aria-label={key}
                      className="w-7 h-7 rounded-full border-2 border-transparent hover:border-white"
                      style={{ background: HABIT_COLORS[key] }}
                    />
                  ))}
                </div>
              )}
              {bulkFrequencyPicker && (
                <div className="flex flex-col gap-3">
                  <FrequencyFields
                    frequency={bulkFrequency} setFrequency={setBulkFrequency}
                    days={bulkDays} setDays={setBulkDays}
                    intervalDays={bulkInterval} setIntervalDays={setBulkInterval}
                    target={bulkTarget} setTarget={setBulkTarget}
                  />
                  <button onClick={bulkSetFrequency} className="btn-primary w-full">Apply to {bulkSelected.size} habit(s)</button>
                </div>
              )}
            </div>
          )}

          {/* All habits across every category — press and hold (not the day-tap/stepper/pencil
              controls) to drag and reorder. The category tabs above only affect the tab box. */}
          <div className="flex flex-col gap-1.5 mb-5">
            {bulkMode ? habits.map(habit => {
              const checked = bulkSelected.has(habit.id);
              return (
                <button
                  key={habit.id}
                  onClick={() => toggleBulkSelected(habit.id)}
                  className={`card p-3 flex items-center gap-3 text-left transition-colors ${checked ? 'border-blue-500 bg-blue-500/10' : ''}`}
                >
                  <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${checked ? 'border-blue-500 bg-blue-500' : 'border-[#334155]'}`}>
                    {checked && <span className="text-white text-xs">✓</span>}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: habit.color }} />
                  <span className="text-sm text-white truncate">{habit.name}</span>
                </button>
              );
            }) : habits.map(habit => (
              <HabitListRow
                key={habit.id}
                habit={habit}
                logs={logsByHabit.get(habit.id) || []}
                categories={manageCategories}
                onIncrement={() => incrementToday(habit)}
                onDecrement={() => decrementToday(habit)}
                onMarkFailed={() => markFailedToday(habit)}
                onSkip={() => skipToday(habit)}
                onTick={() => tickHabitToday(habit)}
                onUpdateHabit={patch => updateHabit(habit.id, patch)}
                onChangeFrequency={(fields, applyOption, customDate) => changeHabitFrequency(habit, fields, applyOption, customDate)}
                onReorder={toId => reorderAllHabits(habit.id, toId)}
                onArchive={() => archiveHabit(habit.id)}
                onDelete={() => deleteHabit(habit.id)}
              />
            ))}
          </div>
        </>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeAdd} />
          <div className="custom-scroll relative w-full md:max-w-md max-h-[85vh] flex flex-col bg-[#1E293B] border border-[#334155] rounded-t-2xl md:rounded-2xl p-5 overflow-y-auto">
            <button onClick={closeAdd} aria-label="Close" className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[#334155] text-[#94A3B8] hover:text-white z-10">
              <X size={18} />
            </button>
            {addStep === 'presets' ? (
              <>
                <h3 className="text-lg font-bold text-white mb-1 pr-8">Add a Habit</h3>
                <p className="text-sm text-[#94A3B8] mb-4">Select all the habits you want to add, then tap Done.</p>
                <div className="flex flex-col gap-4">
                  {HABIT_CATEGORY_ORDER.map(cat => {
                    const presets = HABIT_PRESETS.filter(p => p.category === cat);
                    if (presets.length === 0) return null;
                    return (
                      <div key={cat}>
                        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">{HABIT_CATEGORY_EMOJI[cat]} {HABIT_CATEGORY_LABELS[cat]}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {presets.map(p => {
                            const selected = selectedPresetNames.has(p.name);
                            return (
                              <button
                                key={p.name}
                                onClick={() => togglePreset(p.name)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${selected ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}
                              >
                                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: p.color }} />
                                {selected ? '✓ ' : ''}{p.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {selectedPresetNames.size > 0 && (
                  <div className="mt-4">
                    <StartDateFields option={presetsStartOption} setOption={setPresetsStartOption} dateValue={presetsStartDate} setDateValue={setPresetsStartDate} />
                  </div>
                )}
                <button onClick={() => setAddStep('custom')} className="btn-secondary w-full mt-5">+ Create Custom Habit</button>
                <button onClick={addSelectedPresets} disabled={saving} className="btn-primary w-full mt-2">
                  {saving ? 'Adding...' : selectedPresetNames.size > 0 ? `Done — Add ${selectedPresetNames.size}` : 'Done'}
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white mb-4 pr-8">Custom Habit</h3>
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
                              {CATEGORY_EMOJI_CHOICES.map(e => (
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
                    <div className="grid grid-cols-10 gap-2">
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
                    trackingStyle={customTrackingStyle} setTrackingStyle={setCustomTrackingStyle}
                  />
                  <StartDateFields option={customStartOption} setOption={setCustomStartOption} dateValue={customStartDate} setDateValue={setCustomStartDate} />
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
