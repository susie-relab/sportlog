'use client';
import { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  runsCompleted: number;
  totalRuns: number;
  cwDone: number;
  cwTotal: number;
  currentWeekNo: number;
  totalWeeks: number;
  missed: number;
  isPaused: boolean;
  isRun: boolean;
  onShowRecommendation: () => void;
}

interface Insight {
  kind: 'praise' | 'nudge' | 'tip';
  text: string;
}

function computeInsights(props: Props): Insight[] {
  const { runsCompleted, totalRuns, cwDone, cwTotal, currentWeekNo, totalWeeks, missed, isPaused, isRun } = props;
  const insights: Insight[] = [];
  const noun = isRun ? 'run' : 'session';
  const Noun = isRun ? 'Run' : 'Session';

  if (isPaused) {
    insights.push({ kind: 'tip', text: 'Plan is paused — your calendar will shift forward automatically when you resume.' });
    return insights;
  }

  const adherence = totalRuns > 0 ? runsCompleted / totalRuns : 0;
  const weeksLeft = Math.max(0, totalWeeks - currentWeekNo);
  const isComplete = totalRuns > 0 && runsCompleted >= totalRuns;

  if (isComplete) {
    insights.push({ kind: 'praise', text: `Plan complete — ${runsCompleted} ${noun}s done. Brilliant effort.` });
    return insights;
  }

  if (runsCompleted === 0 && totalRuns > 0) {
    insights.push({ kind: 'tip', text: `No ${noun}s logged yet — tap any session to get started.` });
  }

  if (missed >= 3) {
    insights.push({ kind: 'nudge', text: `${missed} sessions missed in a row. A reduced week or plan adjustment might help — see the recommendation above.` });
  } else if (missed === 2) {
    insights.push({ kind: 'nudge', text: `You've missed the last 2 sessions. Tap "⚡ See recommendation" to adjust your plan.` });
  }

  if (adherence >= 0.85 && runsCompleted >= 5) {
    insights.push({ kind: 'praise', text: `${Math.round(adherence * 100)}% adherence overall — you're building real consistency.` });
  } else if (adherence >= 0.6 && adherence < 0.85 && runsCompleted >= 4) {
    insights.push({ kind: 'tip', text: `${Math.round(adherence * 100)}% completion so far. Solid — aim for a strong finish.` });
  } else if (adherence < 0.5 && runsCompleted >= 4) {
    insights.push({ kind: 'tip', text: `Completion is at ${Math.round(adherence * 100)}%. Even 2–3 ${noun}s a week adds up — consistency beats perfection.` });
  }

  if (cwTotal > 0 && cwDone >= cwTotal) {
    insights.push({ kind: 'praise', text: `This week is already done — every ${noun} ticked off. Great rhythm.` });
  } else if (cwTotal > 0 && cwDone > 0 && cwDone < cwTotal) {
    const left = cwTotal - cwDone;
    insights.push({ kind: 'tip', text: `${left} ${noun}${left === 1 ? '' : 's'} still to go this week — you've got this.` });
  }

  if (weeksLeft === 1 && !isComplete) {
    insights.push({ kind: 'nudge', text: `Final week — trust your training and finish strong.` });
  } else if (weeksLeft === 2 && !isComplete) {
    insights.push({ kind: 'tip', text: `Two weeks left. Stay consistent and you'll arrive at the start line ready.` });
  }

  if (runsCompleted >= 10 && adherence >= 0.75) {
    insights.push({ kind: 'praise', text: `${runsCompleted} ${noun}s logged. The habit is forming — keep stacking.` });
  }

  return insights.slice(0, 5);
}

const KIND_DOT: Record<string, string> = { praise: '#22C55E', nudge: '#F59E0B', tip: '#3B82F6' };

export default function PlanInsightsCard(props: Props) {
  const [expanded, setExpanded] = useState(false);
  const insights = computeInsights(props);
  if (insights.length === 0) return null;

  const preview = insights.slice(0, 2);
  const rest = insights.slice(2);

  return (
    <div className="card plan-no-print">
      <button className="flex items-center justify-between w-full mb-3" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wide">Plan Insights</h2>
          <span className="text-xs font-semibold text-white bg-[#1E293B] px-1.5 py-0.5 rounded-full border border-[#334155]">
            {insights.length}
          </span>
        </div>
        {rest.length > 0 && (expanded ? <ChevronUp size={14} className="text-[#64748B]" /> : <ChevronDown size={14} className="text-[#64748B]" />)}
      </button>
      <div className="flex flex-col gap-2.5">
        {preview.map((ins, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: KIND_DOT[ins.kind] }} />
            <p className="text-sm text-[#94A3B8] leading-snug">{ins.text}</p>
          </div>
        ))}
        {expanded && rest.map((ins, i) => (
          <div key={i + 2} className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: KIND_DOT[ins.kind] }} />
            <p className="text-sm text-[#94A3B8] leading-snug">{ins.text}</p>
          </div>
        ))}
        {!expanded && rest.length > 0 && (
          <button onClick={() => setExpanded(true)} className="text-xs text-[#64748B] hover:text-blue-400 transition-colors text-left">
            + {rest.length} more insight{rest.length > 1 ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  );
}
