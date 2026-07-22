'use client';
import { useState } from 'react';
import {
  PlanData, PlanConfig, Weekday, WEEKDAYS, isRunSession,
  applyEasierToWeek, switchDifficulty,
} from '@/lib/runPlanGenerator';
import { sessionTarget, sessionColor } from './PlanWeekTable';

interface Props {
  data: PlanData;
  weekNumber: number;
  cfg: PlanConfig;
  planName: string;
  todayISO: string;
  onApply: (newData: PlanData) => void;
  onClose: () => void;
}

/** Shown after 2+ consecutive missed sessions — offers to lower the load on the next
 *  session, preview+apply an easier version of the rest of the week, or dismiss. */
export default function PlanRecommendationSheet({ data, weekNumber, cfg, planName, todayISO, onApply, onClose }: Props) {
  const [step, setStep] = useState<'options' | 'preview'>('options');
  const week = data.weeks.find(w => w.weekNumber === weekNumber);
  if (!week) return null;

  // Days left in the week including today (Mon=0 … Sun=6)
  const dayOfWeekMon0 = (new Date(todayISO).getDay() + 6) % 7;
  const calendarDaysLeft = 7 - dayOfWeekMon0;

  const allRemaining: Weekday[] = WEEKDAYS.filter(d => isRunSession(week.days[d]) && !week.days[d].completed);
  // Cap to 1 session per remaining calendar day
  const remainingDays = allRemaining.slice(0, calendarDaysLeft);
  const nextDay = remainingDays[0];
  const nextSession = nextDay ? week.days[nextDay] : null;
  const nextEased = nextSession ? switchDifficulty(nextSession, 'easier', cfg) : null;

  const applyNextOnly = () => {
    if (!nextDay) return;
    onApply(applyEasierToWeek(data, weekNumber, [nextDay], cfg));
    onClose();
  };

  const applyRestOfWeek = () => {
    onApply(applyEasierToWeek(data, weekNumber, remainingDays, cfg));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="custom-scroll relative w-full md:max-w-md max-h-[85vh] flex flex-col bg-[#1E293B] border border-[#334155] rounded-t-2xl md:rounded-2xl p-5 overflow-y-auto">
        {step === 'options' ? (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] mb-1">{planName}</p>
            <h3 className="text-lg font-bold text-white">Looks like you've missed a couple of sessions</h3>
            <p className="text-sm text-[#94A3B8] mt-1.5 leading-relaxed">No worries — here's what we suggest for the {calendarDaysLeft === 1 ? 'rest of today' : `${calendarDaysLeft} days left this week`}.</p>

            <div className="flex flex-col gap-2 mt-4">
              {nextSession && nextEased && (
                <button onClick={applyNextOnly} className="btn-secondary w-full text-left py-3">
                  <span className="block font-semibold text-white">Lower the load</span>
                  <span className="block text-xs text-[#94A3B8] mt-0.5">
                    Ease your next session ({nextSession.title}) to {sessionTarget(nextEased)}
                  </span>
                </button>
              )}

              {remainingDays.length > 0 && (
                <button onClick={() => setStep('preview')} className="btn-secondary w-full text-left py-3">
                  <span className="block font-semibold text-white">Adjust the rest of this week</span>
                  <span className="block text-xs text-[#94A3B8] mt-0.5">Preview an easier version of {remainingDays.length} remaining session{remainingDays.length > 1 ? 's' : ''}</span>
                </button>
              )}

              <button onClick={onClose} className="btn-primary w-full py-3">Keep going, I got this</button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] mb-1">{planName}</p>
            <h3 className="text-lg font-bold text-white">Suggested changes</h3>
            <p className="text-sm text-[#94A3B8] mt-1.5 leading-relaxed">Here's the rest of this week, eased off a bit — apply it, or leave your plan as is.</p>

            <div className="flex flex-col gap-2 mt-4">
              {remainingDays.map(d => {
                const before = week.days[d];
                const after = switchDifficulty(before, 'easier', cfg);
                return (
                  <div key={d} className="rounded-lg border border-[#334155] bg-[#0F172A] p-2.5">
                    <p className="text-xs font-semibold text-white">{before.title}</p>
                    <p className="text-xs mt-0.5">
                      <span className="text-[#64748B] line-through mr-1.5">{sessionTarget(before)}</span>
                      <span style={{ color: sessionColor(after) }} className="font-semibold">{sessionTarget(after)}</span>
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep('options')} className="btn-secondary flex-1">Back</button>
              <button onClick={onClose} className="btn-secondary flex-1">Leave as is</button>
              <button onClick={applyRestOfWeek} className="btn-primary flex-1">Apply</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
