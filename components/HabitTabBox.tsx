'use client';
import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  Habit, HabitLog, HabitFrequencyType, HabitColorKey,
  HABIT_COLORS, HABIT_FREQUENCY_LABELS, isHabitScheduledOn,
} from '@/types';
import { todayLocalISO } from '@/lib/utils';
import { getMonthDays, completionPctInRange, completionRatio, habitDayStats } from '@/lib/habitStats';

interface CategoryDef { key: string; label: string; emoji: string }

interface Props {
  categories: CategoryDef[];
  activeCategory: string;
  onSelectCategory: (key: string) => void;
  onReorderCategory: (fromKey: string, toKey: string) => void;
  categoryLabel: string;
  habits: Habit[];
  logsByHabit: Map<string, HabitLog[]>;
  selectedHabitId: string | null;
  onSelectHabit: (id: string) => void;
  onCreateHabit: (fields: {
    name: string; color: string; frequency_type: HabitFrequencyType;
    frequency_days: string | null; frequency_interval_days: number | null; target_per_period: number;
  }) => void;
  onMoveHabit: (id: string, direction: 'up' | 'down') => void;
  onUpdateHabit: (id: string, patch: Partial<Habit>) => void;
  onIncrementToday: (habit: Habit) => void;
  onDecrementToday: (habit: Habit) => void;
}

const WEEKDAY_OPTIONS = [
  { key: 'mon', label: 'M' }, { key: 'tue', label: 'T' }, { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' }, { key: 'fri', label: 'F' }, { key: 'sat', label: 'S' }, { key: 'sun', label: 'S' },
];

const FREQUENCY_ORDER: HabitFrequencyType[] = ['daily', 'every_n_days', 'weekly', 'fortnightly', 'monthly', 'custom_days'];

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

/** Per-category box: tab-switch between the category's habits (like YearTotalsCard),
 *  showing the selected habit's repeat/target, overview %, a streak/completion stats grid,
 *  and a circular-day history calendar. The pencil opens an edit panel to add a habit or
 *  reorder/edit existing ones (including frequency and day-of-week schedule). */
export default function HabitTabBox({ categories, activeCategory, onSelectCategory, onReorderCategory, categoryLabel, habits, logsByHabit, selectedHabitId, onSelectHabit, onCreateHabit, onMoveHabit, onUpdateHabit, onIncrementToday, onDecrementToday }: Props) {
  const [showEdit, setShowEdit] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const categoryDragRef = useRef<{ fromKey: string; moved: boolean } | null>(null);

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<HabitColorKey>('blue');
  const [newFrequency, setNewFrequency] = useState<HabitFrequencyType>('daily');
  const [newDays, setNewDays] = useState<string[]>([]);
  const [newInterval, setNewInterval] = useState('2');
  const [newTarget, setNewTarget] = useState('1');

  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<HabitColorKey>('blue');
  const [editFrequency, setEditFrequency] = useState<HabitFrequencyType>('daily');
  const [editDays, setEditDays] = useState<string[]>([]);
  const [editInterval, setEditInterval] = useState('2');
  const [editTarget, setEditTarget] = useState('1');

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
  };

  // Press-and-hold drag to reorder category tabs — a tap (no movement) selects the category
  // instead. The row currently under the pointer gets a ring highlight so it's clear where
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

  const saveEditing = (habitId: string) => {
    if (!editName.trim()) return;
    onUpdateHabit(habitId, {
      name: editName.trim(),
      color: HABIT_COLORS[editColor],
      frequency_type: editFrequency,
      frequency_days: editFrequency === 'custom_days' ? (editDays.join(',') || null) : null,
      frequency_interval_days: editFrequency === 'every_n_days' ? (parseInt(editInterval) || 2) : null,
      target_per_period: parseInt(editTarget) || 1,
    });
    setExpandedId(null);
  };

  if (!selected) return null;

  return (
    <div className="card relative">
      <button
        onClick={() => setShowEdit(true)}
        aria-label="Edit habits"
        className="absolute top-4 right-4 p-1.5 rounded-lg text-[#64748B] hover:text-white hover:bg-[#334155] z-10"
      >
        <PencilIcon />
      </button>

      <div className="flex overflow-x-auto mb-3 pr-10 -mx-1 px-1">
        {categories.map((c, i) => {
          const active = activeCategory === c.key;
          const nextActive = i < categories.length - 1 && categories[i + 1].key === activeCategory;
          return (
            <button
              key={c.key}
              data-category-key={c.key}
              onPointerDown={handleCategoryPointerDown(c.key)}
              className={`flex-shrink-0 px-3 py-2 text-sm font-medium border-r transition-colors select-none ${
                active ? 'text-white' : 'text-[#94A3B8] hover:text-white'
              } ${active || nextActive ? 'border-r-blue-500' : 'border-r-[#334155]'} ${
                i === 0 ? `border-l ${active ? 'border-l-blue-500' : 'border-l-[#334155]'}` : ''
              }`}
              style={{ touchAction: 'none' }}
            >
              {c.emoji} {c.label}
            </button>
          );
        })}
      </div>
      <div className="border-b border-[#334155] mb-3" />

      <div className="flex overflow-x-auto mb-4 pr-10 -mx-1 px-1">
        {habits.map((h, i) => {
          const active = selected.id === h.id;
          const nextActive = i < habits.length - 1 && habits[i + 1].id === selected.id;
          return (
            <button
              key={h.id}
              onClick={() => onSelectHabit(h.id)}
              className={`flex-shrink-0 px-3 py-2 text-sm font-medium border-r transition-colors ${
                active ? 'text-white' : 'text-[#94A3B8] hover:text-white'
              } ${active || nextActive ? 'border-r-blue-500' : 'border-r-[#334155]'} ${
                i === 0 ? `border-l ${active ? 'border-l-blue-500' : 'border-l-[#334155]'}` : ''
              }`}
            >
              <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: h.color }} />
              {h.name}
            </button>
          );
        })}
      </div>

      <div className="text-center mb-4">
        <p className="text-xs text-[#64748B] mb-0.5">Repeat</p>
        <p className="text-sm font-medium text-white mb-3">{frequencyLabel(selected)}</p>
        <p className="text-xs text-[#64748B] mb-0.5">Target</p>
        <p className="text-sm font-medium text-white">{selected.target_per_period} / {targetUnitLabel(selected.frequency_type, String(selected.frequency_interval_days || 2))}</p>
      </div>

      <div className="flex flex-col items-center gap-2 mb-5 px-3 py-2 rounded-lg bg-black/20">
        <span className="text-xs font-medium text-[#94A3B8]">Today</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onDecrementToday(selected)}
            disabled={(logsByDate.get(todayISO)?.count || 0) <= 0}
            aria-label="Remove one for today"
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-[#334155] text-white hover:bg-[#475569] disabled:opacity-30"
          >
            −
          </button>
          <span className="text-sm font-semibold text-white w-4 text-center">{logsByDate.get(todayISO)?.count || 0}</span>
          <button
            onClick={() => onIncrementToday(selected)}
            aria-label="Add one for today"
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-[#334155] text-white hover:bg-[#475569]"
          >
            +
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
        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="stat-card"><p className="text-2xl font-bold text-white">{dayStats.currentStreak}</p><p className="text-xs text-[#64748B]">Current Streak</p></div>
          <div className="stat-card"><p className="text-2xl font-bold text-white">{dayStats.longestStreak}</p><p className="text-xs text-[#64748B]">Longest Streak</p></div>
          <div className="stat-card"><p className="text-2xl font-bold text-white">{dayStats.daysCompleted}</p><p className="text-xs text-[#64748B]">Days Completed</p></div>
          <div className="stat-card"><p className="text-2xl font-bold text-white">{dayStats.daysFailed}</p><p className="text-xs text-[#64748B]">Days Failed</p></div>
          <div className="stat-card"><p className="text-2xl font-bold text-white">{dayStats.daysSkipped}</p><p className="text-xs text-[#64748B]">Days Skipped</p></div>
          <div className="stat-card"><p className="text-2xl font-bold text-white">{dayStats.daysStacked}</p><p className="text-xs text-[#64748B]">Days Stacked</p></div>
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
          <div className="relative w-full md:max-w-md max-h-[85vh] flex flex-col bg-[#1E293B] border border-[#334155] rounded-t-2xl md:rounded-2xl p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Edit {categoryLabel}</h3>
              <button onClick={() => { setShowEdit(false); setExpandedId(null); }} className="p-1 rounded-lg hover:bg-[#334155] text-[#94A3B8]"><X size={18} /></button>
            </div>

            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Reorder &amp; Edit</p>
            <div className="flex flex-col gap-2 mb-5">
              {habits.map((h, i) => (
                <div key={h.id} className="rounded-lg border border-[#334155]">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="flex flex-col">
                      <button disabled={i === 0} onClick={() => onMoveHabit(h.id, 'up')} className="text-[#64748B] hover:text-white disabled:opacity-20 leading-none text-xs">▲</button>
                      <button disabled={i === habits.length - 1} onClick={() => onMoveHabit(h.id, 'down')} className="text-[#64748B] hover:text-white disabled:opacity-20 leading-none text-xs">▼</button>
                    </div>
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
                        <div className="flex flex-wrap gap-2">
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
                      <button onClick={() => saveEditing(h.id)} className="btn-primary w-full">Save</button>
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
                <div className="flex flex-wrap gap-2">
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
              <button onClick={submitNew} className="btn-primary w-full">+ Add Habit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
