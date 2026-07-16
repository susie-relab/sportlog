'use client';
import { useRef, useState } from 'react';
import { X, SkipForward } from 'lucide-react';
import {
  Habit, HabitLog, HabitFrequencyType, HabitColorKey,
  HABIT_COLORS, HABIT_FREQUENCY_LABELS, isHabitScheduledOn,
} from '@/types';
import { todayLocalISO } from '@/lib/utils';
import { getMonthDays, completionPctInRange, completionRatio, habitDayStats, addDaysISO, displayTarget } from '@/lib/habitStats';

interface CategoryDef { key: string; label: string; emoji: string; isCustom: boolean; habitCount: number }

export type StartOption = 'today' | 'tomorrow' | 'date';

interface Props {
  categories: CategoryDef[];
  activeCategory: string;
  onSelectCategory: (key: string) => void;
  onReorderCategory: (fromKey: string, toKey: string) => void;
  onRenameCategory: (key: string, newName: string) => void;
  onRemoveCategory: (key: string) => void;
  onCreateCategory: (name: string, emoji: string) => void;
  categoryLabel: string;
  habits: Habit[];
  logsByHabit: Map<string, HabitLog[]>;
  selectedHabitId: string | null;
  onSelectHabit: (id: string) => void;
  onCreateHabit: (fields: {
    name: string; color: string; frequency_type: HabitFrequencyType;
    frequency_days: string | null; frequency_interval_days: number | null; target_per_period: number;
    start_date: string; time_of_day: string | null;
  }) => void;
  onReorderHabit: (fromId: string, toId: string) => void;
  onUpdateHabit: (id: string, patch: Partial<Habit>) => void;
  onArchiveHabit: (id: string) => void;
  onDeleteHabit: (id: string) => void;
  onIncrementToday: (habit: Habit) => void;
  onDecrementToday: (habit: Habit) => void;
  onMarkFailedToday: (habit: Habit) => void;
  onSkipToday: (habit: Habit) => void;
}

const WEEKDAY_OPTIONS = [
  { key: 'mon', label: 'M' }, { key: 'tue', label: 'T' }, { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' }, { key: 'fri', label: 'F' }, { key: 'sat', label: 'S' }, { key: 'sun', label: 'S' },
];

const FREQUENCY_ORDER: HabitFrequencyType[] = ['daily', 'every_n_days', 'weekly', 'fortnightly', 'monthly', 'custom_days'];

const CATEGORY_EMOJI_CHOICES = ['⭐', '🎯', '💡', '🎨', '🎵', '📚', '🏠', '🚗', '💰', '🎮', '🐶', '🌟', '🔥', '✨', '🧠', '🧺'];

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '');
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

/** Press-and-hold drag handle — replaces up/down arrow buttons for reordering list rows. */
export function SortHandleIcon() {
  return (
    <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor">
      <path d="M7 0 3 4h8L7 0Z" />
      <rect x="2" y="7" width="10" height="1.5" rx="0.75" />
      <rect x="2" y="10.25" width="10" height="1.5" rx="0.75" />
      <rect x="2" y="13.5" width="10" height="1.5" rx="0.75" />
      <path d="M7 20 3 16h8l-4 4Z" />
    </svg>
  );
}

function frequencyLabel(habit: Habit): string {
  if (habit.frequency_type === 'custom_days' && habit.frequency_days) {
    return habit.frequency_days.split(',').map(k => k[0].toUpperCase() + k.slice(1, 3)).join(', ');
  }
  if (habit.frequency_type === 'every_n_days') return `Every ${habit.frequency_interval_days || 2} days`;
  return HABIT_FREQUENCY_LABELS[habit.frequency_type];
}

export function targetUnitLabel(frequency: HabitFrequencyType, intervalDays: string): string {
  switch (frequency) {
    case 'every_n_days': return `${intervalDays || 2} days`;
    case 'weekly': return 'week';
    case 'fortnightly': return 'fortnight';
    case 'monthly': return 'month';
    default: return 'day';
  }
}

/** Resolves a StartOption + optional picked date into the actual YYYY-MM-DD to store. */
export function resolveStartDate(option: StartOption, dateValue: string, todayISO: string): string {
  if (option === 'today') return todayISO;
  if (option === 'tomorrow') return addDaysISO(todayISO, 1);
  return dateValue || todayISO;
}

const TIME_OF_DAY_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
  const label = hour === 0 ? '12:00 AM' : hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`;
  return { value: `${String(hour).padStart(2, '0')}:00`, label };
});

/** Optional hour-increment time-of-day cue for a habit (e.g. "take vitamins at 8am") — purely
 *  informational, not enforced anywhere, so a plain select is enough (no need for a full
 *  scroll-picker like Distance/Elevation). */
export function TimeOfDayField({ value, setValue }: { value: string; setValue: (v: string) => void }) {
  return (
    <div>
      <label className="label">Time of day (optional)</label>
      <select className="input" value={value} onChange={e => setValue(e.target.value)}>
        <option value="">No specific time</option>
        {TIME_OF_DAY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/** Frequency + goal-amount picker shared by the "add a habit" and per-habit "edit" forms. */
export function FrequencyFields({
  frequency, setFrequency, days, setDays, intervalDays, setIntervalDays, target, setTarget,
}: {
  frequency: HabitFrequencyType; setFrequency: (f: HabitFrequencyType) => void;
  days: string[]; setDays: (updater: (prev: string[]) => string[]) => void;
  intervalDays: string; setIntervalDays: (v: string) => void;
  target: string; setTarget: (v: string) => void;
}) {
  return (
    <>
      <div>
        <label className="label">Frequency</label>
        <div className="flex flex-wrap gap-1.5">
          {FREQUENCY_ORDER.map(f => (
            <button
              key={f}
              onClick={() => setFrequency(f)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${frequency === f ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}
            >
              {HABIT_FREQUENCY_LABELS[f]}
            </button>
          ))}
        </div>
      </div>
      {frequency === 'every_n_days' && (
        <div>
          <label className="label">Every how many days</label>
          <input type="number" className="input" min="2" value={intervalDays} onChange={e => setIntervalDays(e.target.value)} />
        </div>
      )}
      {frequency === 'custom_days' && (
        <div>
          <label className="label">Which days</label>
          <div className="flex gap-1.5">
            {WEEKDAY_OPTIONS.map(d => {
              const active = days.includes(d.key);
              return (
                <button
                  key={d.key}
                  onClick={() => setDays(prev => active ? prev.filter(k => k !== d.key) : [...prev, d.key])}
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
        <label className="label">Goal amount (per {targetUnitLabel(frequency, intervalDays)})</label>
        <input type="number" className="input" min="1" value={target} onChange={e => setTarget(e.target.value)} />
      </div>
    </>
  );
}

/** Today / Tomorrow / pick-a-date picker for when a newly-created habit should start applying —
 *  shared by every "add a habit" form so it doesn't show up on the calendar before that date. */
export function StartDateFields({
  option, setOption, dateValue, setDateValue,
}: {
  option: StartOption; setOption: (o: StartOption) => void;
  dateValue: string; setDateValue: (v: string) => void;
}) {
  return (
    <div>
      <label className="label">Starts</label>
      <div className="flex gap-1.5 mb-2">
        {(['today', 'tomorrow', 'date'] as StartOption[]).map(o => (
          <button
            key={o}
            onClick={() => setOption(o)}
            className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${option === o ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}
          >
            {o === 'today' ? 'Today' : o === 'tomorrow' ? 'Tomorrow' : 'Pick Date'}
          </button>
        ))}
      </div>
      {option === 'date' && (
        <input type="date" className="input" value={dateValue} onChange={e => setDateValue(e.target.value)} />
      )}
    </div>
  );
}

/** Per-category box: switch between category boxes (top row) then between that category's
 *  habits (tab row below a divider), showing the selected habit's repeat/target, overview %,
 *  a streak/completion stats grid, and a circular-day history calendar. Two pencils: one next
 *  to "Repeat" opens an edit panel to add a habit or reorder/edit existing ones in this
 *  category; one top-right opens a panel to manage categories themselves (add/rename/remove/
 *  reorder). */
export default function HabitTabBox({
  categories, activeCategory, onSelectCategory, onReorderCategory, onRenameCategory, onRemoveCategory, onCreateCategory,
  categoryLabel, habits, logsByHabit, selectedHabitId, onSelectHabit, onCreateHabit, onReorderHabit, onUpdateHabit, onArchiveHabit, onDeleteHabit, onIncrementToday, onDecrementToday, onMarkFailedToday, onSkipToday,
}: Props) {
  const [showEdit, setShowEdit] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const categoryDragRef = useRef<{ fromKey: string; moved: boolean } | null>(null);
  const habitManageDragRef = useRef<{ fromId: string } | null>(null);
  const categoryManageDragRef = useRef<{ fromKey: string } | null>(null);

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<HabitColorKey>('blue');
  const [newFrequency, setNewFrequency] = useState<HabitFrequencyType>('daily');
  const [newDays, setNewDays] = useState<string[]>([]);
  const [newInterval, setNewInterval] = useState('2');
  const [newTarget, setNewTarget] = useState('1');
  const [newStartOption, setNewStartOption] = useState<StartOption>('today');
  const [newStartDate, setNewStartDate] = useState('');
  const [newTimeOfDay, setNewTimeOfDay] = useState('');

  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<HabitColorKey>('blue');
  const [editFrequency, setEditFrequency] = useState<HabitFrequencyType>('daily');
  const [editDays, setEditDays] = useState<string[]>([]);
  const [editInterval, setEditInterval] = useState('2');
  const [editTarget, setEditTarget] = useState('1');
  const [editTimeOfDay, setEditTimeOfDay] = useState('');

  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('⭐');

  const todayISO = todayLocalISO();
  const year = Number(todayISO.slice(0, 4));
  const month0 = Number(todayISO.slice(5, 7)) - 1;
  const monthDays = getMonthDays(year, month0);

  const selected = habits.find(h => h.id === selectedHabitId) || habits[0];
  const logs = selected ? logsByHabit.get(selected.id) || [] : [];
  const logsByDate = new Map(logs.map(l => [l.date, l]));

  const monthPct = selected ? completionPctInRange(selected, logs, `${year}-${String(month0 + 1).padStart(2, '0')}-01`, todayISO) : 0;
  const yearPct = selected ? completionPctInRange(selected, logs, `${year}-01-01`, todayISO) : 0;
  const dayStats = selected ? habitDayStats(selected, logs, todayISO) : null;

  const resetNewForm = () => {
    setNewName(''); setNewColor('blue'); setNewFrequency('daily'); setNewDays([]); setNewInterval('2'); setNewTarget('1');
    setNewStartOption('today'); setNewStartDate(''); setNewTimeOfDay('');
  };

  const submitNew = () => {
    if (!newName.trim()) return;
    onCreateHabit({
      name: newName.trim(),
      color: HABIT_COLORS[newColor],
      frequency_type: newFrequency,
      frequency_days: newFrequency === 'custom_days' ? (newDays.join(',') || null) : null,
      frequency_interval_days: newFrequency === 'every_n_days' ? (parseInt(newInterval) || 2) : null,
      target_per_period: parseInt(newTarget) || 1,
      start_date: resolveStartDate(newStartOption, newStartDate, todayISO),
      time_of_day: newTimeOfDay || null,
    });
    resetNewForm();
  };

  const startEditing = (h: Habit) => {
    setExpandedId(h.id);
    setEditName(h.name);
    const colorKey = (Object.keys(HABIT_COLORS) as HabitColorKey[]).find(k => HABIT_COLORS[k] === h.color) || 'blue';
    setEditColor(colorKey);
    setEditFrequency(h.frequency_type);
    setEditDays(h.frequency_days ? h.frequency_days.split(',') : []);
    setEditInterval(String(h.frequency_interval_days || 2));
    setEditTarget(String(h.target_per_period));
    setEditTimeOfDay(h.time_of_day || '');
  };

  // Press-and-hold drag to reorder category tabs — a tap (no movement) selects the category
  // instead. The box currently under the pointer gets a ring highlight so it's clear where
  // the dragged tab will land, cleared again on drop.
  const handleCategoryPointerDown = (key: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    categoryDragRef.current = { fromKey: key, moved: false };
    window.addEventListener('pointermove', handleCategoryPointerMove);
    window.addEventListener('pointerup', handleCategoryPointerUp);
  };
  const handleCategoryPointerMove = (e: PointerEvent) => {
    const drag = categoryDragRef.current;
    if (!drag) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const overEl = el?.closest('[data-category-key]') as HTMLElement | null;
    document.querySelectorAll('[data-category-key]').forEach(t => t.classList.remove('ring-2', 'ring-blue-400', 'ring-inset'));
    if (overEl && overEl.dataset.categoryKey !== drag.fromKey) {
      drag.moved = true;
      overEl.classList.add('ring-2', 'ring-blue-400', 'ring-inset');
    }
  };
  const handleCategoryPointerUp = (e: PointerEvent) => {
    const drag = categoryDragRef.current;
    categoryDragRef.current = null;
    window.removeEventListener('pointermove', handleCategoryPointerMove);
    window.removeEventListener('pointerup', handleCategoryPointerUp);
    document.querySelectorAll('[data-category-key]').forEach(t => t.classList.remove('ring-2', 'ring-blue-400', 'ring-inset'));
    if (!drag) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const overEl = el?.closest('[data-category-key]') as HTMLElement | null;
    const toKey = overEl?.dataset.categoryKey;
    if (drag.moved && toKey && toKey !== drag.fromKey) onReorderCategory(drag.fromKey, toKey);
    else onSelectCategory(drag.fromKey);
  };

  // Press-and-hold drag on the sort handle to reorder habits within the "Reorder & Edit" list —
  // unlike the tab strip, the handle is a dedicated small icon so a plain tap on the row (the
  // Edit link) is never mistaken for a drag.
  const handleHabitManagePointerDown = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    habitManageDragRef.current = { fromId: id };
    (e.currentTarget.closest('[data-habit-manage-key]') as HTMLElement | null)?.classList.add('ring-2', 'ring-amber-400', 'ring-inset');
    window.addEventListener('pointermove', handleHabitManagePointerMove);
    window.addEventListener('pointerup', handleHabitManagePointerUp);
  };
  const handleHabitManagePointerMove = (e: PointerEvent) => {
    const drag = habitManageDragRef.current;
    if (!drag) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const overEl = el?.closest('[data-habit-manage-key]') as HTMLElement | null;
    document.querySelectorAll('[data-habit-manage-key]').forEach(t => {
      if (t.getAttribute('data-habit-manage-key') !== drag.fromId) t.classList.remove('ring-2', 'ring-blue-400', 'ring-inset');
    });
    if (overEl && overEl.dataset.habitManageKey !== drag.fromId) {
      overEl.classList.add('ring-2', 'ring-blue-400', 'ring-inset');
    }
  };
  const handleHabitManagePointerUp = (e: PointerEvent) => {
    const drag = habitManageDragRef.current;
    habitManageDragRef.current = null;
    window.removeEventListener('pointermove', handleHabitManagePointerMove);
    window.removeEventListener('pointerup', handleHabitManagePointerUp);
    document.querySelectorAll('[data-habit-manage-key]').forEach(t => t.classList.remove('ring-2', 'ring-blue-400', 'ring-amber-400', 'ring-inset'));
    if (!drag) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const overEl = el?.closest('[data-habit-manage-key]') as HTMLElement | null;
    const toId = overEl?.dataset.habitManageKey;
    if (toId && toId !== drag.fromId) onReorderHabit(drag.fromId, toId);
  };

  // Same pattern for the "Manage Categories" panel's reorder list. The dragged row keeps an
  // amber ring for the whole drag so it's clear what's moving, separate from the blue ring
  // marking whichever row is currently under the pointer as the drop target.
  const handleCategoryManagePointerDown = (key: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    categoryManageDragRef.current = { fromKey: key };
    (e.currentTarget.closest('[data-category-manage-key]') as HTMLElement | null)?.classList.add('ring-2', 'ring-amber-400', 'ring-inset');
    window.addEventListener('pointermove', handleCategoryManagePointerMove);
    window.addEventListener('pointerup', handleCategoryManagePointerUp);
  };
  const handleCategoryManagePointerMove = (e: PointerEvent) => {
    const drag = categoryManageDragRef.current;
    if (!drag) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const overEl = el?.closest('[data-category-manage-key]') as HTMLElement | null;
    document.querySelectorAll('[data-category-manage-key]').forEach(t => {
      if (t.getAttribute('data-category-manage-key') !== drag.fromKey) t.classList.remove('ring-2', 'ring-blue-400', 'ring-inset');
    });
    if (overEl && overEl.dataset.categoryManageKey !== drag.fromKey) {
      overEl.classList.add('ring-2', 'ring-blue-400', 'ring-inset');
    }
  };
  const handleCategoryManagePointerUp = (e: PointerEvent) => {
    const drag = categoryManageDragRef.current;
    categoryManageDragRef.current = null;
    window.removeEventListener('pointermove', handleCategoryManagePointerMove);
    window.removeEventListener('pointerup', handleCategoryManagePointerUp);
    document.querySelectorAll('[data-category-manage-key]').forEach(t => t.classList.remove('ring-2', 'ring-blue-400', 'ring-amber-400', 'ring-inset'));
    if (!drag) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const overEl = el?.closest('[data-category-manage-key]') as HTMLElement | null;
    const toKey = overEl?.dataset.categoryManageKey;
    if (toKey && toKey !== drag.fromKey) onReorderCategory(drag.fromKey, toKey);
  };

  const saveEditing = (habitId: string) => {
    if (!editName.trim()) return;
    onUpdateHabit(habitId, {
      name: editName.trim(),
      color: HABIT_COLORS[editColor],
      frequency_type: editFrequency,
      frequency_days: editFrequency === 'custom_days' ? (editDays.join(',') || null) : null,
      frequency_interval_days: editFrequency === 'every_n_days' ? (parseInt(editInterval) || 2) : null,
      target_per_period: parseInt(editTarget) || 1,
      time_of_day: editTimeOfDay || null,
    });
    setExpandedId(null);
  };

  const submitNewCategory = () => {
    if (!newCatName.trim()) return;
    onCreateCategory(newCatName.trim(), newCatEmoji || '⭐');
    setNewCatName(''); setNewCatEmoji('⭐');
  };

  if (!selected) return null;

  return (
    <div className="card relative">
      <button
        onClick={() => setShowManageCategories(true)}
        aria-label="Manage categories"
        className="absolute top-4 right-4 p-1.5 rounded-lg text-[#64748B] hover:text-white hover:bg-[#334155] z-10"
      >
        <PencilIcon />
      </button>

      <div className="flex flex-wrap gap-1.5 mb-3 pr-10">
        {categories.filter(c => c.habitCount > 0).map(c => {
          const active = activeCategory === c.key;
          return (
            <button
              key={c.key}
              data-category-key={c.key}
              onPointerDown={handleCategoryPointerDown(c.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors select-none ${
                active ? 'bg-[#293548] border-blue-500 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
              }`}
              style={{ touchAction: 'none' }}
            >
              {c.emoji} {c.label}
            </button>
          );
        })}
      </div>
      <div className="border-b border-[#334155] mb-3" />

      <div className="custom-scroll flex overflow-x-auto mb-4 -mx-1 px-1">
        {habits.map((h, i) => {
          const active = selected.id === h.id;
          const nextActive = i < habits.length - 1 && habits[i + 1].id === selected.id;
          return (
            <button
              key={h.id}
              onClick={() => onSelectHabit(h.id)}
              style={active ? ({ '--tab-color': '#3B82F6' } as React.CSSProperties) : undefined}
              className={`flex-shrink-0 px-3 py-2 text-sm font-medium transition-colors ${
                active ? 'habit-tab-active text-white' : `text-[#94A3B8] hover:text-white border-r ${nextActive ? 'border-r-blue-500' : 'border-r-[#334155]'} ${i === 0 ? 'border-l border-l-[#334155]' : ''}`
              }`}
            >
              <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: h.color }} />
              {h.name}
            </button>
          );
        })}
      </div>

      <div className="relative text-center mb-4">
        <button
          onClick={() => { setShowEdit(true); if (selected) startEditing(selected); }}
          aria-label="Edit habits"
          className="absolute right-0 top-0 p-1.5 rounded-lg text-[#64748B] hover:text-white hover:bg-[#334155]"
        >
          <PencilIcon />
        </button>
        <p className="text-xs text-[#64748B] mb-0.5">Repeat</p>
        <p className="text-sm font-medium text-white mb-3">
          {frequencyLabel(selected)}
          {selected.time_of_day && <span className="text-[#64748B] font-normal"> · {TIME_OF_DAY_OPTIONS.find(o => o.value === selected.time_of_day)?.label}</span>}
        </p>
        <p className="text-xs text-[#64748B] mb-0.5">Target</p>
        <p className="text-sm font-medium text-white">{displayTarget(selected).amount} / {displayTarget(selected).unit}</p>
      </div>

      <div className="flex flex-col items-center gap-2 mb-5 px-3 py-2 rounded-lg bg-black/20">
        <span className="text-xs font-medium text-[#94A3B8]">Today</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onDecrementToday(selected)}
            disabled={(logsByDate.get(todayISO)?.count || 0) <= 0}
            title="Reduce"
            aria-label="Remove one for today"
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-[#334155] text-white hover:bg-[#475569] disabled:opacity-30"
          >
            −
          </button>
          <span className="text-sm font-semibold text-white w-4 text-center">{Math.max(0, logsByDate.get(todayISO)?.count || 0)}</span>
          <button
            onClick={() => onIncrementToday(selected)}
            title="Add"
            aria-label="Add one for today"
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-[#334155] text-white hover:bg-[#475569]"
          >
            +
          </button>
          <button
            onClick={() => onMarkFailedToday(selected)}
            title="Didn't happen"
            aria-label="Didn't happen"
            className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${logsByDate.get(todayISO)?.count === -1 ? 'bg-red-500/80 text-white' : 'bg-[#334155] text-white hover:bg-[#475569]'}`}
          >
            ×
          </button>
          <button
            onClick={() => onSkipToday(selected)}
            title="Skip for today"
            aria-label="Skip for today"
            className={`w-7 h-7 rounded-full flex items-center justify-center ${logsByDate.get(todayISO)?.count === -2 ? 'bg-slate-400/80 text-white' : 'bg-[#334155] text-white hover:bg-[#475569]'}`}
          >
            <SkipForward size={14} fill="currentColor" />
          </button>
        </div>
      </div>

      <div className="text-center mb-5">
      <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-1">Overview</p>
      <p className="text-5xl font-bold text-white mb-1">{monthPct}%</p>
      <div className="flex justify-center gap-4 text-sm text-[#94A3B8]">
        <span>Month <span className="text-white font-semibold">{monthPct}%</span></span>
        <span>Year <span className="text-white font-semibold">{yearPct}%</span></span>
      </div>
      </div>

      {dayStats && (
        <div className="flex flex-col gap-2 mb-5">
          <div className="grid grid-cols-2 gap-2">
            <div className="stat-card"><p className="text-2xl font-bold text-white">{dayStats.currentStreak}</p><p className="text-xs text-[#64748B]">Current Streak</p></div>
            <div className="stat-card"><p className="text-2xl font-bold text-white">{dayStats.longestStreak}</p><p className="text-xs text-[#64748B]">Longest Streak</p></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="stat-card"><p className="text-2xl font-bold text-white">{dayStats.daysAchieved}</p><p className="text-xs text-[#64748B]">Achieved</p></div>
            <div className="stat-card"><p className="text-2xl font-bold text-white">{dayStats.daysPartial}</p><p className="text-xs text-[#64748B]">Partly Done</p></div>
            <div className="stat-card"><p className="text-2xl font-bold text-white">{dayStats.daysIncomplete}</p><p className="text-xs text-[#64748B]">Incomplete</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="stat-card"><p className="text-2xl font-bold text-white">{dayStats.daysSkipped}</p><p className="text-xs text-[#64748B]">Days Skipped</p></div>
            <div className="stat-card"><p className="text-2xl font-bold text-white">{dayStats.daysStacked}</p><p className="text-xs text-[#64748B]">Days Stacked</p></div>
          </div>
        </div>
      )}

      <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-2">History</p>
      <div className="flex flex-wrap gap-1.5">
        {monthDays.map(date => {
          const scheduled = isHabitScheduledOn(selected, date);
          const log = logsByDate.get(date);
          const ratio = completionRatio(selected, log);
          const isFuture = date > todayISO;
          const dayNum = Number(date.slice(8, 10));
          return (
            <span
              key={date}
              title={date}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-medium flex-shrink-0"
              style={{
                background: !isFuture && ratio > 0 ? hexToRgba(selected.color, Math.max(0.2, ratio)) : 'transparent',
                border: `1px solid ${scheduled ? (ratio > 0 ? selected.color : '#334155') : 'transparent'}`,
                color: ratio >= 0.5 ? '#0F172A' : '#94A3B8',
                opacity: isFuture ? 0.35 : 1,
              }}
            >
              {dayNum}
            </span>
          );
        })}
      </div>

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowEdit(false); setExpandedId(null); }} />
          <div className="custom-scroll relative w-full md:max-w-md max-h-[85vh] flex flex-col bg-[#1E293B] border border-[#334155] rounded-t-2xl md:rounded-2xl p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Edit {categoryLabel}</h3>
              <button onClick={() => { setShowEdit(false); setExpandedId(null); }} className="p-1 rounded-lg hover:bg-[#334155] text-[#94A3B8]"><X size={18} /></button>
            </div>

            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Reorder &amp; Edit</p>
            <div className="flex flex-col gap-2 mb-5">
              {habits.map((h) => (
                <div key={h.id} data-habit-manage-key={h.id} className="rounded-lg border border-[#334155] transition-shadow">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <button
                      onPointerDown={handleHabitManagePointerDown(h.id)}
                      aria-label="Drag to reorder"
                      className="text-[#64748B] hover:text-white cursor-grab active:cursor-grabbing flex-shrink-0"
                      style={{ touchAction: 'none' }}
                    >
                      <SortHandleIcon />
                    </button>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: h.color }} />
                    <span className="text-sm text-white flex-1 truncate">{h.name}</span>
                    <button
                      onClick={() => expandedId === h.id ? setExpandedId(null) : startEditing(h)}
                      className="text-xs font-medium text-blue-400 hover:text-blue-300 flex-shrink-0"
                    >
                      {expandedId === h.id ? 'Close' : 'Edit'}
                    </button>
                  </div>
                  {expandedId === h.id && (
                    <div className="px-3 pb-3 flex flex-col gap-3 border-t border-[#334155] pt-3">
                      <div>
                        <label className="label">Name</label>
                        <input className="input" value={editName} onChange={e => setEditName(e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Colour</label>
                        <div className="grid grid-cols-10 gap-2">
                          {(Object.keys(HABIT_COLORS) as HabitColorKey[]).map(key => (
                            <button
                              key={key}
                              onClick={() => setEditColor(key)}
                              aria-label={key}
                              className={`w-6 h-6 rounded-full border-2 ${editColor === key ? 'border-white' : 'border-transparent hover:border-[#475569]'}`}
                              style={{ background: HABIT_COLORS[key] }}
                            />
                          ))}
                        </div>
                      </div>
                      <FrequencyFields
                        frequency={editFrequency} setFrequency={setEditFrequency}
                        days={editDays} setDays={setEditDays}
                        intervalDays={editInterval} setIntervalDays={setEditInterval}
                        target={editTarget} setTarget={setEditTarget}
                      />
                      <TimeOfDayField value={editTimeOfDay} setValue={setEditTimeOfDay} />
                      <div className="flex gap-2">
                        <button onClick={() => saveEditing(h.id)} className="btn-primary flex-1">Save</button>
                        <button onClick={() => { onArchiveHabit(h.id); setExpandedId(null); }} className="text-sm text-[#94A3B8] hover:text-white px-2">Pause</button>
                        <button onClick={() => { onDeleteHabit(h.id); setExpandedId(null); }} className="text-sm text-red-400 hover:text-red-300 px-2">Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Add a Habit to {categoryLabel}</p>
            <div className="flex flex-col gap-3">
              <input className="input" placeholder="Habit name" value={newName} onChange={e => setNewName(e.target.value)} />
              <div>
                <label className="label">Colour</label>
                <div className="grid grid-cols-10 gap-2">
                  {(Object.keys(HABIT_COLORS) as HabitColorKey[]).map(key => (
                    <button
                      key={key}
                      onClick={() => setNewColor(key)}
                      aria-label={key}
                      className={`w-7 h-7 rounded-full border-2 ${newColor === key ? 'border-white' : 'border-transparent hover:border-[#475569]'}`}
                      style={{ background: HABIT_COLORS[key] }}
                    />
                  ))}
                </div>
              </div>
              <FrequencyFields
                frequency={newFrequency} setFrequency={setNewFrequency}
                days={newDays} setDays={setNewDays}
                intervalDays={newInterval} setIntervalDays={setNewInterval}
                target={newTarget} setTarget={setNewTarget}
              />
              <TimeOfDayField value={newTimeOfDay} setValue={setNewTimeOfDay} />
              <StartDateFields option={newStartOption} setOption={setNewStartOption} dateValue={newStartDate} setDateValue={setNewStartDate} />
              <button onClick={submitNew} className="btn-primary w-full">+ Add Habit</button>
            </div>
          </div>
        </div>
      )}

      {showManageCategories && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowManageCategories(false); setRenamingKey(null); }} />
          <div className="custom-scroll relative w-full md:max-w-md max-h-[85vh] flex flex-col bg-[#1E293B] border border-[#334155] rounded-t-2xl md:rounded-2xl p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Manage Categories</h3>
              <button onClick={() => { setShowManageCategories(false); setRenamingKey(null); }} className="p-1 rounded-lg hover:bg-[#334155] text-[#94A3B8]"><X size={18} /></button>
            </div>

            <div className="flex flex-col gap-2 mb-5">
              {categories.map((c) => (
                <div key={c.key} data-category-manage-key={c.key} className="rounded-lg border border-[#334155] px-3 py-2 flex items-center gap-2 transition-shadow">
                  <button
                    onPointerDown={handleCategoryManagePointerDown(c.key)}
                    aria-label="Drag to reorder"
                    className="text-[#64748B] hover:text-white cursor-grab active:cursor-grabbing flex-shrink-0"
                    style={{ touchAction: 'none' }}
                  >
                    <SortHandleIcon />
                  </button>
                  <span className="flex-shrink-0">{c.emoji}</span>
                  {renamingKey === c.key ? (
                    <input className="input flex-1" value={renameValue} onChange={e => setRenameValue(e.target.value)} />
                  ) : (
                    <span className="flex-1 text-sm text-white truncate">
                      {c.label}
                      {!c.isCustom && <span className="text-[10px] text-[#64748B] ml-1.5">(built-in)</span>}
                    </span>
                  )}
                  {c.isCustom && (
                    renamingKey === c.key ? (
                      <>
                        <button onClick={() => { onRenameCategory(c.key, renameValue.trim() || c.label); setRenamingKey(null); }} className="text-xs font-medium text-blue-400 hover:text-blue-300 flex-shrink-0">Save</button>
                        <button onClick={() => setRenamingKey(null)} className="text-xs text-[#64748B] hover:text-white flex-shrink-0">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setRenamingKey(c.key); setRenameValue(c.label); }} className="text-xs font-medium text-blue-400 hover:text-blue-300 flex-shrink-0">Rename</button>
                        <button
                          onClick={() => onRemoveCategory(c.key)}
                          disabled={c.habitCount > 0}
                          title={c.habitCount > 0 ? 'Move or delete its habits first' : 'Remove category'}
                          className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          Remove
                        </button>
                      </>
                    )
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Add a Category</p>
            <div className="flex flex-col gap-3">
              <input className="input" placeholder="e.g. Finances" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
              <div>
                <label className="label">Emoji</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {CATEGORY_EMOJI_CHOICES.map(e => (
                    <button
                      key={e}
                      onClick={() => setNewCatEmoji(e)}
                      className={`w-8 h-8 rounded-lg text-base flex items-center justify-center border transition-all ${newCatEmoji === e ? 'border-blue-500 bg-blue-500/20' : 'border-[#334155] hover:border-[#475569]'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <input className="input" maxLength={4} value={newCatEmoji} onChange={e => setNewCatEmoji(e.target.value)} />
              </div>
              <button onClick={submitNewCategory} disabled={!newCatName.trim()} className="btn-primary w-full disabled:opacity-50">+ Add Category</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
