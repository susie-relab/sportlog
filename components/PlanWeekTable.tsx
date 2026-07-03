'use client';
import { PlanData, PlanWeek, Session, SessionType, Weekday, WEEKDAYS, WEEKDAY_LABELS, WEEKDAY_SHORT } from '@/lib/runPlanGenerator';

export const SESSION_COLORS: Record<SessionType, string> = {
  rest: '#475569',
  crosstrain: '#64748B',
  easy: '#3B82F6',
  recovery: '#60A5FA',
  long: '#8B5CF6',
  tempo: '#F97316',
  fartlek: '#EAB308',
  progression: '#F59E0B',
  long_intervals: '#EF4444',
  sprint_reps: '#EC4899',
  hill_reps: '#14B8A6',
  trail: '#84CC16',
};

const PHASE_COLORS: Record<string, string> = {
  Base: '#3B82F6', Build: '#8B5CF6', Peak: '#F97316', Taper: '#22C55E',
};

function target(s: Session): string {
  if (s.distanceKm && s.timeMin) return `${s.distanceKm} km · ${s.timeMin} min`;
  if (s.distanceKm) return `${s.distanceKm} km`;
  if (s.timeMin) return `${s.timeMin} min`;
  return '';
}

interface Props {
  plan: PlanData;
  currentWeek?: number;
  labelOffset?: number; // -1 makes the first week read "Week 0" (non-Monday start)
  onDayClick?: (weekNumber: number, day: Weekday) => void;
}

function DayCell({ s, onClick, compact }: { s: Session; onClick?: () => void; compact?: boolean }) {
  const color = SESSION_COLORS[s.type];
  const isRest = s.type === 'rest';
  const isCross = s.type === 'crosstrain';
  const muted = isRest || isCross;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg p-2.5 border transition-colors ${
        s.completed ? 'border-green-600/60 bg-green-900/15' : 'border-[#293548] bg-[#0F172A] hover:border-[#475569]'
      } ${compact ? 'flex items-center gap-2' : ''}`}
    >
      {compact && <span className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: color }} />}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {!compact && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />}
          <span className={`text-xs font-semibold truncate ${muted ? 'text-[#64748B]' : 'text-white'}`}>{s.title}</span>
          {s.completed && <span className="text-green-400 text-xs ml-auto flex-shrink-0">✓</span>}
          {s.variant && <span className="text-[9px] uppercase text-[#64748B] flex-shrink-0">{s.variant}</span>}
        </div>
        {target(s) && <div className="text-xs font-bold mt-0.5" style={{ color }}>{target(s)}</div>}
        {!compact && s.detail && !muted && (
          <div className="text-[10px] text-[#64748B] mt-1 leading-snug line-clamp-2 whitespace-pre-line">{s.detail}</div>
        )}
      </div>
    </button>
  );
}

function WeekHeader({ w, labelOffset = 0 }: { w: PlanWeek; labelOffset?: number }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-bold text-white">Week {w.weekNumber + labelOffset}</span>
      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ background: PHASE_COLORS[w.phase] + '22', color: PHASE_COLORS[w.phase] }}>
        {w.phase} Phase
      </span>
      <span className="text-xs text-[#64748B] ml-auto">{w.totalKm} km</span>
    </div>
  );
}

export default function PlanWeekTable({ plan, currentWeek, labelOffset = 0, onDayClick }: Props) {
  return (
    <>
      {/* Desktop: full week × day table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-separate" style={{ borderSpacing: '4px' }}>
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wide px-2 py-2 w-32">Week &amp; Total (km)</th>
              {WEEKDAYS.map(d => (
                <th key={d} className="text-center text-xs font-semibold text-[#94A3B8] uppercase tracking-wide px-1 py-2">{WEEKDAY_SHORT[d]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.weeks.map(w => (
              <tr key={w.weekNumber} className={currentWeek === w.weekNumber ? 'ring-1 ring-blue-500/40' : ''}>
                <td className="align-top px-2 py-2 rounded-lg bg-[#0F172A] border border-[#293548]" style={{ minWidth: '8rem' }}>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-white">Week {w.weekNumber + labelOffset}</span>
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded self-start" style={{ background: PHASE_COLORS[w.phase] + '22', color: PHASE_COLORS[w.phase] }}>{w.phase}</span>
                    <span className="text-xs text-[#60A5FA] font-bold">{w.totalKm} km</span>
                  </div>
                </td>
                {WEEKDAYS.map(d => (
                  <td key={d} className="align-top" style={{ minWidth: '7rem' }}>
                    <DayCell s={w.days[d]} onClick={onDayClick ? () => onDayClick(w.weekNumber, d) : undefined} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked week cards */}
      <div className="md:hidden flex flex-col gap-4">
        {plan.weeks.map(w => (
          <div key={w.weekNumber} className={`rounded-xl border p-3 ${currentWeek === w.weekNumber ? 'border-blue-500/50 bg-blue-500/5' : 'border-[#293548] bg-[#141d2e]'}`}>
            <div className="mb-2.5"><WeekHeader w={w} labelOffset={labelOffset} /></div>
            <div className="flex flex-col gap-1.5">
              {WEEKDAYS.map(d => (
                <div key={d} className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase w-8 flex-shrink-0">{WEEKDAY_SHORT[d]}</span>
                  <div className="flex-1 min-w-0">
                    <DayCell s={w.days[d]} compact onClick={onDayClick ? () => onDayClick(w.weekNumber, d) : undefined} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export { target as sessionTarget, WEEKDAY_LABELS };
