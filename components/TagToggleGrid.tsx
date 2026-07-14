'use client';

interface Props<T extends string> {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  emoji: Record<T, string>;
  selected: T[];
  onToggle: (key: T) => void;
}

/** A grid of multi-select tags — a doodle emoji above the word, and a small clickable
 *  circle underneath that fills in when selected. Used for Companions ("with friends") and
 *  Conditions ("rainy", "hot") on the Add/Edit forms — universal tags, not tied to exercise type. */
export default function TagToggleGrid<T extends string>({ label, options, labels, emoji, selected, onToggle }: Props<T>) {
  return (
    <div>
      <label className="label">{label} <span className="text-[#64748B]">(optional + multi-select)</span></label>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {options.map(key => {
          const active = selected.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <span className="text-xl leading-none">{emoji[key]}</span>
              <span className={`text-[10px] text-center leading-tight ${active ? 'text-white font-semibold' : 'text-[#94A3B8]'}`}>{labels[key]}</span>
              <span
                className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${active ? 'bg-blue-500 border-blue-500' : 'border-[#475569]'}`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
