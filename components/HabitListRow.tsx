'use client';
import { useRef, useState } from 'react';
import { SkipForward, GripVertical } from 'lucide-react';
import { Habit, HabitLog, HabitFrequencyType, HabitColorKey, HabitTrackingStyle, HABIT_COLORS } from '@/types';
import { todayLocalISO } from '@/lib/utils';
import { periodProgress, isSkippableFrequency, periodBoundsFor, addDaysISO } from '@/lib/habitStats';
import { ApplyOption, FrequencyApplyPicker, FrequencyFields, PencilIcon, TimeOfDayField, Tip } from '@/components/HabitTabBox';
import { currentStreak, frequencyLabel } from '@/lib/habitStats';

interface CategoryOption { key: string; label: string; emoji: string }

interface Props {
  habit: Habit;
  logs: HabitLog[];
  categories: CategoryOption[];
  onIncrement: () => void;
  onDecrement: () => void;
  onUpdateHabit: (patch: Partial<Habit>) => void;
  onChangeFrequency: (fields: {
    frequency_type: HabitFrequencyType; frequency_days: string | null;
    frequency_interval_days: number | null; target_per_period: number;
  }, applyOption: ApplyOption, customDate?: string) => void;
  onReorder: (toHabitId: string) => void;
  onMarkFailed: () => void;
  onSkip: () => void;
  onTick: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  daySkipped?: boolean;
}

type Mode = 'detail' | 'edit' | null;
type RevealSection = 'name' | 'colour' | 'category' | null;

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '');
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** One habit as a compact paint-style fill bar — a 30%-opacity wash of the habit's colour
 *  floods left-to-right as progress builds toward its planned total for the current tracking
 *  window. Tapping anywhere on the row (other than the +/- stepper or pencil) opens/closes the
 *  quick editor; press-and-hold anywhere else drags the row to reorder it within the full
 *  habit list (across every category). */
export default function HabitListRow({ habit, logs, categories, onIncrement, onDecrement, onMarkFailed, onSkip, onTick, onUpdateHabit, onChangeFrequency, onReorder, onArchive, onDelete, onDuplicate, daySkipped }: Props) {
  const [mode, setMode] = useState<Mode>(null);
  const [dragging, setDragging] = useState(false);
  const dragMovedRef = useRef(false);
  const draggingRef = useRef(false);
  const [frequency, setFrequency] = useState<HabitFrequencyType>(habit.frequency_type);
  const [days, setDays] = useState<string[]>(habit.frequency_days ? habit.frequency_days.split(',') : []);
  const [intervalDays, setIntervalDays] = useState(String(habit.frequency_interval_days || 2));
  const [target, setTarget] = useState(String(habit.target_per_period));
  const [trackingStyle, setTrackingStyle] = useState<HabitTrackingStyle>(habit.tracking_style || 'count');
  const [timeOfDay, setTimeOfDay] = useState(habit.time_of_day || '');
  const [revealed, setRevealed] = useState<RevealSection>(null);
  const [nameValue, setNameValue] = useState(habit.name);
  const [descValue, setDescValue] = useState(habit.description || '');
  const [showApplyPicker, setShowApplyPicker] = useState(false);
  const [applyOption, setApplyOption] = useState<ApplyOption>('today');
  const [applyCustomDate, setApplyCustomDate] = useState('');

  const todayISO = todayLocalISO();
  const { pct, sum, target: periodTarget, periodLabel } = periodProgress(habit, logs, todayISO);
  const todayLog = logs.find(l => l.date === todayISO);
  const rawTodayCount = todayLog?.count || 0;
  const isFailedToday = rawTodayCount === -1;
  const isSkippedToday = rawTodayCount === -2;
  const todayCount = (isFailedToday || isSkippedToday) ? 0 : rawTodayCount;
  const isLockedToday = !!todayLog?.locked;
  const isTickedToday = isLockedToday && todayCount > 0;
  const trackingStyleActive = habit.tracking_style || 'count';
  const canSkip = isSkippableFrequency(habit.frequency_type);
  const isLastDayOfPeriod = canSkip && periodBoundsFor(habit, todayISO)[1] === todayISO;
  // "Last chance tomorrow" warning: show when tomorrow is the final day of the period AND the
  // frequency interval is ≥ 3 days (so every_n_days/2 is excluded, weekly/fortnightly/monthly
  // and every_n_days/3+ get it). Not shown when today IS the last day (that one blocks skip entirely).
  const tomorrowIsLastDay = canSkip && !isLastDayOfPeriod &&
    addDaysISO(todayISO, 1) === periodBoundsFor(habit, todayISO)[1] &&
    (habit.frequency_type !== 'every_n_days' || (habit.frequency_interval_days || 2) >= 3);
  const [showLastDayNotice, setShowLastDayNotice] = useState(false);
  const [showTomorrowWarning, setShowTomorrowWarning] = useState(false);

  const close = () => { setMode(null); setRevealed(null); setShowApplyPicker(false); };

  // Tap on the row body → detail view. Second tap collapses.
  const toggleDetail = () => setMode(prev => prev === 'detail' ? null : 'detail');

  // Pencil button → edit mode, refreshing all form fields first.
  const openEditor = () => {
    setFrequency(habit.frequency_type);
    setDays(habit.frequency_days ? habit.frequency_days.split(',') : []);
    setIntervalDays(String(habit.frequency_interval_days || 2));
    setTarget(String(habit.target_per_period));
    setTrackingStyle(habit.tracking_style || 'count');
    setTimeOfDay(habit.time_of_day || '');
    setNameValue(habit.name);
    setDescValue(habit.description || '');
    setRevealed(null);
    setShowApplyPicker(false);
    setMode('edit');
  };

  const saveName = () => {
    const patch: Partial<Habit> = {};
    if (nameValue.trim() && nameValue.trim() !== habit.name) patch.name = nameValue.trim();
    const newDesc = descValue.trim() || null;
    if (newDesc !== (habit.description || null)) patch.description = newDesc;
    if (Object.keys(patch).length) onUpdateHabit(patch);
    setRevealed(null);
  };

  const save = () => {
    const newFreq = {
      frequency_type: frequency,
      frequency_days: frequency === 'custom_days' ? (days.join(',') || null) : null,
      frequency_interval_days: frequency === 'every_n_days' ? (parseInt(intervalDays) || 2) : null,
      target_per_period: parseInt(target) || 1,
    };
    const freqChanged = habit.frequency_type !== newFreq.frequency_type
      || (habit.frequency_days || null) !== newFreq.frequency_days
      || (habit.frequency_interval_days || null) !== newFreq.frequency_interval_days
      || habit.target_per_period !== newFreq.target_per_period;

    onUpdateHabit({ time_of_day: timeOfDay || null, tracking_style: trackingStyle });

    if (freqChanged) {
      setApplyOption('today');
      setApplyCustomDate('');
      setShowApplyPicker(true);
      return;
    }
    setMode(null);
  };

  const confirmApplyFrequency = () => {
    const newFreq = {
      frequency_type: frequency,
      frequency_days: frequency === 'custom_days' ? (days.join(',') || null) : null,
      frequency_interval_days: frequency === 'every_n_days' ? (parseInt(intervalDays) || 2) : null,
      target_per_period: parseInt(target) || 1,
    };
    onChangeFrequency(newFreq, applyOption, applyOption === 'custom' ? applyCustomDate : undefined);
    setShowApplyPicker(false);
    setMode(null);
  };

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    dragMovedRef.current = false;
    setDragging(true);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left > 44) return;
    startDrag(e);
  };
  const handlePointerMove = (e: PointerEvent) => {
    if (!draggingRef.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const overRow = el?.closest('[data-habit-key]') as HTMLElement | null;
    // Highlight whichever row is currently under the pointer so it's clear where the
    // dragged habit will land, clearing any previous highlight first.
    document.querySelectorAll('[data-habit-key]').forEach(r => r.classList.remove('ring-2', 'ring-blue-400', 'ring-inset'));
    if (overRow && overRow.dataset.habitKey !== habit.id) {
      dragMovedRef.current = true;
      overRow.classList.add('ring-2', 'ring-blue-400', 'ring-inset');
    }
  };
  const handlePointerUp = (e: PointerEvent) => {
    const moved = dragMovedRef.current;
    draggingRef.current = false;
    setDragging(false);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    document.querySelectorAll('[data-habit-key]').forEach(r => r.classList.remove('ring-2', 'ring-blue-400', 'ring-inset'));
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const overId = (el?.closest('[data-habit-key]') as HTMLElement | null)?.dataset.habitKey;
    if (moved && overId && overId !== habit.id) onReorder(overId);
    else toggleDetail();
  };

  return (
    <div
      data-habit-key={habit.id}
      className={`bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden transition-opacity ${dragging ? 'opacity-60' : ''}`}
    >
      <div
        onPointerDown={handlePointerDown}
        onClick={e => { if (!(e.target as HTMLElement).closest('button')) toggleDetail(); }}
        className="relative h-9 select-none cursor-pointer"
        style={{ background: '#1E293B', touchAction: 'none' }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.max(pct, pct > 0 ? 6 : 0)}%`, background: hexToRgba(habit.color, 0.3) }}
        />
        {pct > 0 && pct < 100 && (
          <div
            className="absolute top-1/2 rounded-full blur-md pointer-events-none"
            style={{
              left: `${pct}%`, width: 22, height: 22, transform: 'translate(-50%, -50%)',
              background: hexToRgba(habit.color, 0.45),
            }}
          />
        )}

        <div className="relative z-10 h-full flex items-center justify-between px-3 gap-2">
          <span className="text-sm font-semibold text-white truncate min-w-0 flex-1">{habit.name}</span>
          <div className={`flex items-center gap-1.5 flex-shrink-0 ${daySkipped ? 'opacity-30 pointer-events-none' : ''}`}>
            <span className="text-[10px] text-[#94A3B8] hidden sm:inline">{daySkipped ? 'day skipped' : `${sum}/${periodTarget} · ${periodLabel}`}</span>
            {trackingStyleActive !== 'tick' && (
              <>
                <Tip label="Decrease">
                  <button
                    onClick={e => { e.stopPropagation(); onDecrement(); }}
                    onPointerDown={e => e.stopPropagation()}
                    disabled={isLockedToday || todayCount <= 0}
                    aria-label="Remove one for today"
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-black/25 text-white hover:bg-black/40 disabled:opacity-30"
                  >
                    −
                  </button>
                </Tip>
                <span className="text-xs font-semibold text-white w-3 text-center">{todayCount}</span>
                <Tip label="Add">
                  <button
                    onClick={e => { e.stopPropagation(); onIncrement(); }}
                    onPointerDown={e => e.stopPropagation()}
                    disabled={isLockedToday}
                    aria-label="Add one for today"
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-black/25 text-white hover:bg-black/40 disabled:opacity-30"
                  >
                    +
                  </button>
                </Tip>
              </>
            )}
            {(trackingStyleActive === 'tick' || trackingStyleActive === 'both') && (
              <Tip label="Done">
                <button
                  onClick={e => { e.stopPropagation(); onTick(); }}
                  onPointerDown={e => e.stopPropagation()}
                  aria-label="Mark done"
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isTickedToday ? 'bg-green-500/80 text-white' : 'bg-black/25 text-white/70 hover:bg-black/40'}`}
                >
                  ✓
                </button>
              </Tip>
            )}
            <Tip label="Didn't happen">
              <button
                onClick={e => { e.stopPropagation(); onMarkFailed(); }}
                onPointerDown={e => e.stopPropagation()}
                aria-label="Didn't happen"
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isFailedToday ? 'bg-red-500/80 text-white' : 'bg-black/25 text-white/70 hover:bg-black/40'}`}
              >
                ×
              </button>
            </Tip>
            {canSkip && (
            <Tip label="Skip for today">
              <button
                onClick={e => {
                  e.stopPropagation();
                  if (isLastDayOfPeriod && !isSkippedToday) { setShowLastDayNotice(true); return; }
                  if (tomorrowIsLastDay && !isSkippedToday) { setShowTomorrowWarning(true); return; }
                  onSkip();
                }}
                onPointerDown={e => e.stopPropagation()}
                aria-label="Skip for today"
                className={`w-5 h-5 rounded-full flex items-center justify-center ${isSkippedToday ? 'bg-slate-400/80 text-white' : 'bg-black/25 text-white/70 hover:bg-black/40'}`}
              >
                <SkipForward size={11} fill="currentColor" />
              </button>
            </Tip>
            )}
            {showLastDayNotice && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={e => { e.stopPropagation(); setShowLastDayNotice(false); }}>
                <div className="card max-w-xs text-center" onClick={e => e.stopPropagation()}>
                  <p className="text-sm text-white leading-relaxed">
                    Today is the last opportunity to complete this habit — unable to skip. Mark as didn&apos;t complete if you can&apos;t do it today.
                  </p>
                  <button onClick={() => setShowLastDayNotice(false)} className="btn-secondary w-full mt-3 text-sm">OK</button>
                </div>
              </div>
            )}
            {showTomorrowWarning && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={e => { e.stopPropagation(); setShowTomorrowWarning(false); }}>
                <div className="card max-w-xs text-center" onClick={e => e.stopPropagation()}>
                  <p className="text-sm text-white leading-relaxed">
                    Last chance to complete this habit is tomorrow. Skip today anyway?
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setShowTomorrowWarning(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
                    <button onClick={() => { setShowTomorrowWarning(false); onSkip(); }} className="btn-primary flex-1 text-sm">Skip</button>
                  </div>
                </div>
              </div>
            )}
            <button
              onPointerDown={e => { e.stopPropagation(); startDrag(e); }}
              onClick={e => e.stopPropagation()}
              aria-label="Drag to reorder"
              className="w-5 h-5 rounded-full flex items-center justify-center text-white/50 hover:text-white bg-black/25 hover:bg-black/40 cursor-grab active:cursor-grabbing"
              style={{ touchAction: 'none' }}
            >
              <GripVertical size={11} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); openEditor(); }}
              onPointerDown={e => e.stopPropagation()}
              aria-label="Edit habit"
              className="w-5 h-5 rounded-full flex items-center justify-center text-white/70 hover:text-white bg-black/25 hover:bg-black/40"
            >
              <PencilIcon />
            </button>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: hexToRgba(habit.color, 0.9), color: '#0F172A' }}
            >
              {pct}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Detail view ── */}
      {mode === 'detail' && (() => {
        const catDef = categories.find(c => c.key === habit.category);
        const streak = currentStreak(habit, logs, todayLocalISO(), []);
        const TOD_LABELS: Record<string, string> = { morning: '🌅 Morning', daytime: '☀️ Daytime', night: '🌙 Night time' };
        const STYLE_LABELS: Record<string, string> = { count: 'Count (+/−)', tick: 'Tick (once)', both: 'Tick or count' };
        return (
          <div className="p-4 border-t border-[#334155] flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ background: habit.color }} />
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-white leading-snug">{habit.name}</p>
                {habit.description && (
                  <p className="text-sm text-[#94A3B8] mt-1 leading-relaxed">{habit.description}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-[#64748B] uppercase tracking-wide font-semibold">Category</span>
                <p className="text-white mt-0.5">{catDef ? `${catDef.emoji} ${catDef.label}` : habit.category}</p>
              </div>
              <div>
                <span className="text-[#64748B] uppercase tracking-wide font-semibold">Repeat</span>
                <p className="text-white mt-0.5">{frequencyLabel(habit)}</p>
              </div>
              <div>
                <span className="text-[#64748B] uppercase tracking-wide font-semibold">Tracking</span>
                <p className="text-white mt-0.5">{STYLE_LABELS[habit.tracking_style || 'count']}</p>
              </div>
              {habit.time_of_day && TOD_LABELS[habit.time_of_day] && (
                <div>
                  <span className="text-[#64748B] uppercase tracking-wide font-semibold">Time</span>
                  <p className="text-white mt-0.5">{TOD_LABELS[habit.time_of_day]}</p>
                </div>
              )}
              <div>
                <span className="text-[#64748B] uppercase tracking-wide font-semibold">Streak</span>
                <p className="text-white mt-0.5">{streak > 0 ? `🔥 ${streak}` : '—'}</p>
              </div>
              <div>
                <span className="text-[#64748B] uppercase tracking-wide font-semibold">Progress</span>
                <p className="text-white mt-0.5">{sum}/{periodTarget} this {periodLabel}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={openEditor} className="btn-secondary text-xs px-3 py-1.5">Edit</button>
              <button onClick={close} className="text-xs text-[#64748B] hover:text-white px-3">Close</button>
            </div>
          </div>
        );
      })()}

      {/* ── Edit panel ── */}
      {mode === 'edit' && (
        <div className="p-3 border-t border-[#334155] flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(['name', 'colour', 'category'] as const).map(section => (
              <button
                key={section}
                onClick={() => setRevealed(prev => prev === section ? null : section)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${revealed === section ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}
              >
                {section === 'name' ? 'Edit name' : section === 'colour' ? 'Change colour' : 'Swap category'}
              </button>
            ))}
          </div>

          {revealed === 'name' && (
            <div className="flex flex-col gap-2">
              <input className="input" value={nameValue} onChange={e => setNameValue(e.target.value)} placeholder="Habit name" />
              <textarea
                className="input resize-none text-sm"
                rows={2}
                value={descValue}
                onChange={e => setDescValue(e.target.value)}
                placeholder="Description (optional)"
              />
              <button onClick={saveName} className="btn-primary px-3 text-sm self-start">Save</button>
            </div>
          )}

          {revealed === 'colour' && (
            <div className="grid grid-cols-10 gap-2">
              {(Object.keys(HABIT_COLORS) as HabitColorKey[]).map(key => (
                <button
                  key={key}
                  onClick={() => { onUpdateHabit({ color: HABIT_COLORS[key] }); setRevealed(null); }}
                  aria-label={key}
                  className={`w-6 h-6 rounded-full border-2 ${habit.color === HABIT_COLORS[key] ? 'border-white' : 'border-transparent hover:border-[#475569]'}`}
                  style={{ background: HABIT_COLORS[key] }}
                />
              ))}
            </div>
          )}

          {revealed === 'category' && (
            <div className="flex flex-wrap gap-1.5">
              {categories.map(c => (
                <button
                  key={c.key}
                  onClick={() => { onUpdateHabit({ category: c.key }); setRevealed(null); }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${habit.category === c.key ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          )}

          <FrequencyFields
            frequency={frequency} setFrequency={setFrequency}
            days={days} setDays={setDays}
            intervalDays={intervalDays} setIntervalDays={setIntervalDays}
            target={target} setTarget={setTarget}
            trackingStyle={trackingStyle} setTrackingStyle={setTrackingStyle}
          />
          <TimeOfDayField value={timeOfDay} setValue={setTimeOfDay} />
          {showApplyPicker ? (
            <FrequencyApplyPicker
              option={applyOption} setOption={setApplyOption}
              customDate={applyCustomDate} setCustomDate={setApplyCustomDate}
              onConfirm={confirmApplyFrequency} onCancel={() => setShowApplyPicker(false)}
            />
          ) : (
            <div className="flex gap-2">
              <button onClick={save} className="btn-primary flex-1">Save</button>
              <button onClick={close} className="text-sm text-[#64748B] hover:text-white px-3">Cancel</button>
              {onDuplicate && <button onClick={onDuplicate} className="text-sm text-[#94A3B8] hover:text-white px-2">Duplicate</button>}
              <button onClick={onArchive} className="text-sm text-[#94A3B8] hover:text-white px-2">Pause</button>
              <button onClick={onDelete} className="text-sm text-red-400 hover:text-red-300 px-2">Delete</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
