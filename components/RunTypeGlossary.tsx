'use client';
import { useState } from 'react';
import { SESSION_COLORS } from './PlanWeekTable';

const GLOSSARY: { key: keyof typeof SESSION_COLORS; name: string; desc: string }[] = [
  { key: 'rest', name: 'Rest', desc: 'Take a day off — let your body recover from hard days and long runs.' },
  { key: 'crosstrain', name: 'Cross Train', desc: 'A day off, OR light cross training (swim, cycle, yoga), OR strength work. If you must run, keep it a very easy recovery jog.' },
  { key: 'easy', name: 'Easy Run', desc: 'Run at a comfortable pace — you should be able to hold a conversation.' },
  { key: 'recovery', name: 'Recovery Run', desc: 'A short, very easy run to shake out the legs after a hard session.' },
  { key: 'tempo', name: 'Tempo Run', desc: 'Steady, "comfortably hard" pace — you should be able to talk in short sentences. Always with a warm-up and cooldown.' },
  { key: 'fartlek', name: 'Fartlek', desc: 'Steady running with random fast surges — pick a point ahead and run to it hard, then ease off.' },
  { key: 'progression', name: 'Progression Run', desc: 'Steady pace, getting faster each km. Your last km should be your fastest.' },
  { key: 'long_intervals', name: 'Long Intervals', desc: 'Reps of 400 m–1.5 km at ~75% intensity with jog recovery. Sometimes mixed blocks (e.g. 3 x 800 m + 4 x 400 m).' },
  { key: 'sprint_reps', name: 'Sprint Reps', desc: 'Short, fast reps — shuttles, pyramids, 50/100/200 m sprints — with full recovery between.' },
  { key: 'hill_reps', name: 'Hill Repeats', desc: 'Run up a hill hard, jog/walk back down, repeat. Short reps, long reps, or time-based.' },
  { key: 'long', name: 'Long Run', desc: 'Your weekly distance builder at a comfortable pace. Variants: progression, sprint finish, or race pace.' },
  { key: 'trail', name: 'Trail Run', desc: 'Hilly off-road running — the hardest terrain option. Run by effort, hike the steep bits.' },
];

export default function RunTypeGlossary() {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between text-sm font-semibold text-[#94A3B8] uppercase tracking-wide hover:text-white transition-colors">
        <span>{open ? '▼' : '▶'} Run Type Guide</span>
      </button>
      {open && (
        <div className="mt-4 flex flex-col gap-3">
          {GLOSSARY.map(g => (
            <div key={g.key} className="flex gap-3">
              <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: SESSION_COLORS[g.key] }} />
              <div>
                <span className="text-sm font-semibold text-white">{g.name}</span>
                <p className="text-xs text-[#94A3B8] leading-relaxed mt-0.5">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
