'use client';
import { useState } from 'react';
import { Habit, HabitLog } from '@/types';
import { currentStreak, bestStreak, completionPctInRange, addDaysISO } from '@/lib/habitStats';
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  habits: Habit[];
  logs: HabitLog[];
  todayISO: string;
}

interface Insight {
  kind: 'nudge' | 'tip' | 'praise';
  text: string;
  habitName?: string;
  habitColor?: string;
}

function computeInsights(habits: Habit[], logs: HabitLog[], todayISO: string): Insight[] {
  const insights: Insight[] = [];

  for (const h of habits) {
    const hLogs = logs.filter(l => l.habit_id === h.id);
    const streak = currentStreak(h, hLogs, todayISO, []);
    const best = bestStreak(h, hLogs, []);
    const weekPct = completionPctInRange(h, hLogs, addDaysISO(todayISO, -6), todayISO);
    const monthPct = completionPctInRange(h, hLogs, addDaysISO(todayISO, -29), todayISO);
    const prevMonthPct = completionPctInRange(h, hLogs, addDaysISO(todayISO, -59), addDaysISO(todayISO, -30));

    // Streak at best
    if (streak > 0 && streak === best && best >= 7) {
      insights.push({ kind: 'praise', text: `${h.name} is at an all-time streak high — ${streak} in a row! Keep it going.`, habitName: h.name, habitColor: h.color });
    }

    // Near best streak
    if (streak > 0 && best > 0 && streak >= best - 2 && streak < best && best >= 5) {
      insights.push({ kind: 'nudge', text: `You're ${best - streak} away from your ${h.name} best streak (${best}). So close!`, habitName: h.name, habitColor: h.color });
    }

    // Declining trend
    if (monthPct < prevMonthPct - 0.2 && prevMonthPct >= 0.5 && monthPct < 0.6) {
      insights.push({ kind: 'nudge', text: `${h.name} has dropped from ${Math.round(prevMonthPct * 100)}% last month to ${Math.round(monthPct * 100)}% this month. Worth a reset?`, habitName: h.name, habitColor: h.color });
    }

    // Improving trend
    if (monthPct > prevMonthPct + 0.2 && monthPct >= 0.7) {
      insights.push({ kind: 'praise', text: `${h.name} is up to ${Math.round(monthPct * 100)}% this month — a solid improvement.`, habitName: h.name, habitColor: h.color });
    }

    // Strong week
    if (weekPct >= 1.0 && streak >= 5) {
      insights.push({ kind: 'praise', text: `Perfect week for ${h.name} and a ${streak}-day streak. You're in a great rhythm.`, habitName: h.name, habitColor: h.color });
    }

    // Struggling week
    if (weekPct < 0.4 && monthPct >= 0.6) {
      insights.push({ kind: 'nudge', text: `${h.name} is at ${Math.round(weekPct * 100)}% this week — below your usual ${Math.round(monthPct * 100)}%. A small reset this week could help.`, habitName: h.name, habitColor: h.color });
    }
  }

  // Cross-habit coaching summary
  const monthPcts = habits.map(h => completionPctInRange(h, logs.filter(l => l.habit_id === h.id), addDaysISO(todayISO, -29), todayISO));
  const avgMonthPct = monthPcts.length > 0 ? monthPcts.reduce((s, p) => s + p, 0) / monthPcts.length : 0;
  const topHabit = habits.reduce<{ h: Habit | null; pct: number }>((best, h, i) => monthPcts[i] > best.pct ? { h, pct: monthPcts[i] } : best, { h: null, pct: -1 });
  const weakHabit = habits.reduce<{ h: Habit | null; pct: number }>((worst, h, i) => monthPcts[i] < worst.pct ? { h, pct: monthPcts[i] } : worst, { h: null, pct: 2 });

  if (avgMonthPct >= 0.8 && habits.length >= 2) {
    insights.unshift({ kind: 'praise', text: `Great month overall — averaging ${Math.round(avgMonthPct * 100)}% across all your habits. Consistency is compounding.`, habitColor: '#22C55E' });
  } else if (avgMonthPct >= 0.5 && habits.length >= 2) {
    insights.unshift({ kind: 'tip', text: `You're at ${Math.round(avgMonthPct * 100)}% overall this month. Consistency over intensity — small wins stack up.`, habitColor: '#3B82F6' });
  }

  if (topHabit.h && topHabit.pct >= 0.9 && habits.length >= 3) {
    insights.push({ kind: 'praise', text: `${topHabit.h.name} is your strongest habit at ${Math.round(topHabit.pct * 100)}% — what's making it stick?`, habitName: topHabit.h.name, habitColor: topHabit.h.color });
  }

  if (weakHabit.h && weakHabit.pct < 0.4 && habits.length >= 3) {
    insights.push({ kind: 'tip', text: `${weakHabit.h.name} is the hardest one right now (${Math.round(weakHabit.pct * 100)}%). Try anchoring it to something you already do daily.`, habitName: weakHabit.h.name, habitColor: weakHabit.h.color });
  }

  // Deduplicate by habit name — keep first occurrence only
  const seen = new Set<string>();
  return insights.filter(ins => {
    const key = ins.habitName ?? '_global';
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

const KIND_STYLES: Record<Insight['kind'], { dot: string; label: string }> = {
  praise: { dot: '#22C55E', label: '✓' },
  nudge:  { dot: '#F59E0B', label: '!' },
  tip:    { dot: '#3B82F6', label: '💡' },
};

export default function HabitInsightsCard({ habits, logs, todayISO }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (habits.length < 2) return null;

  const insights = computeInsights(habits, logs, todayISO);
  if (insights.length === 0) return null;

  const preview = insights.slice(0, 2);
  const rest = insights.slice(2);

  return (
    <div className="card mb-5">
      <button className="flex items-center justify-between w-full mb-3" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wide">Habit Insights</h2>
          <span className="text-xs font-semibold text-white bg-[#1E293B] px-1.5 py-0.5 rounded-full border border-[#334155]">
            {insights.length}
          </span>
        </div>
        {rest.length > 0 && (expanded ? <ChevronUp size={14} className="text-[#64748B]" /> : <ChevronDown size={14} className="text-[#64748B]" />)}
      </button>
      <div className="flex flex-col gap-2.5">
        {preview.map((ins, i) => <InsightRow key={i} ins={ins} />)}
        {expanded && rest.map((ins, i) => <InsightRow key={i + 2} ins={ins} />)}
        {!expanded && rest.length > 0 && (
          <button onClick={() => setExpanded(true)} className="text-xs text-[#64748B] hover:text-blue-400 transition-colors text-left">
            + {rest.length} more insight{rest.length > 1 ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  );
}

function InsightRow({ ins }: { ins: Insight }) {
  const style = KIND_STYLES[ins.kind];
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: ins.habitColor ?? style.dot }} />
      <p className="text-sm text-[#94A3B8] leading-snug">{ins.text}</p>
    </div>
  );
}
