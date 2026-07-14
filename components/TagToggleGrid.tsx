'use client';
import type { LucideIcon } from 'lucide-react';

export interface TagOption {
  key: string;
  label: string;
  emoji: string;
  doodle?: LucideIcon; // takes over from `emoji` when supplied
  active: boolean;
  onToggle: () => void;
}

/** A grid of tags — a doodle above the word, and a small clickable circle underneath
 *  that fills in when selected. Used for the combined "who with / conditions" picker on
 *  the Add/Edit forms — universal tags, not tied to exercise type. */
export default function TagToggleGrid({ label, items }: { label: string; items: TagOption[] }) {
  return (
    <div>
      <label className="label">{label} <span className="text-[#64748B]">(optional)</span></label>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {items.map(({ key, label: itemLabel, emoji, doodle: Doodle, active, onToggle }) => (
          <button
            key={key}
            type="button"
            onClick={onToggle}
            className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            {Doodle ? <Doodle size={20} className={active ? 'text-white' : 'text-[#94A3B8]'} /> : <span className="text-xl leading-none">{emoji}</span>}
            <span className={`text-[10px] text-center leading-tight ${active ? 'text-white font-semibold' : 'text-[#94A3B8]'}`}>{itemLabel}</span>
            <span className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${active ? 'bg-blue-500 border-blue-500' : 'border-[#475569]'}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
