'use client';
import { useEffect, useState } from 'react';
import NumberWheelColumn from './NumberWheelColumn';

interface Props {
  label: string;
  unit?: string;
  value: string; // stored string, e.g. '' | '150' | '12.34'
  onChange: (v: string) => void;
  max: number;
  decimals?: 0 | 2; // 0 = integer (HR, Elevation), 2 = whole + hundredths (Distance)
  suggestion?: number; // seeds the wheel(s) when the field is currently empty
  placeholder?: string;
}

function range(min: number, max: number): number[] {
  const out: number[] = [];
  for (let i = min; i <= max; i++) out.push(i);
  return out;
}

/** A pop-out scroll-to-click number picker — replaces a plain number input for
 *  Distance / Elevation / Heart Rate fields. Scrolling, tapping a row, or typing
 *  directly into the centered value all work; tapping outside the popup commits
 *  whatever is currently set and closes it. */
export default function ScrollFieldPicker({ label, unit, value, onChange, max, decimals = 0, suggestion, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [whole, setWhole] = useState(0);
  const [frac, setFrac] = useState(0);
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!focused) {
      setText(decimals === 2 ? `${whole}.${String(frac).padStart(2, '0')}` : String(whole));
    }
  }, [whole, frac, focused, decimals]);

  const openPicker = () => {
    const parsed = value ? parseFloat(value) : (suggestion ?? 0);
    setWhole(Math.floor(parsed));
    setFrac(Math.round((parsed - Math.floor(parsed)) * 100));
    setOpen(true);
  };

  const handleTextChange = (v: string) => {
    setText(v);
    const num = parseFloat(v);
    if (!isNaN(num) && num >= 0) {
      const w = Math.min(max, Math.floor(num));
      setWhole(w);
      if (decimals === 2) setFrac(Math.round((num - Math.floor(num)) * 100));
    }
  };

  const commitAndClose = () => {
    const final = decimals === 2 ? whole + frac / 100 : whole;
    onChange(final > 0 || value ? String(decimals === 2 ? Math.round(final * 100) / 100 : final) : '');
    setOpen(false);
  };

  const wholeValues = range(0, max);
  const fracValues = range(0, 99);

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className="input text-left flex items-center justify-between"
      >
        <span className={value ? 'text-white' : 'text-[#475569]'}>
          {value ? `${value}${unit ? ` ${unit}` : ''}` : (placeholder || 'Tap to set')}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={commitAndClose}
        >
          <div
            className="rounded-2xl p-4 w-72 max-w-[90vw] bg-[#0F172A]/40 backdrop-blur-xl border border-white/10 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-white mb-2 text-center">{label}</p>
            <div className="relative">
              <div className="flex items-center justify-center gap-1">
                <NumberWheelColumn values={wholeValues} value={whole} onChange={setWhole} />
                {decimals === 2 && (
                  <>
                    <span className="text-white text-lg pb-1">.</span>
                    <NumberWheelColumn values={fracValues} value={frac} onChange={setFrac} format={v => String(v).padStart(2, '0')} />
                  </>
                )}
              </div>
              <div className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 h-10 flex items-center justify-center">
                <div className="pointer-events-auto flex items-center justify-center gap-1.5 bg-[#1E293B]/90 border border-[#334155] rounded-lg px-3 h-10 min-w-[55%]">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={text}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onChange={e => handleTextChange(e.target.value)}
                    className="bg-transparent text-white text-lg font-bold text-center outline-none w-full min-w-0"
                  />
                  {unit && <span className="text-[#64748B] text-sm flex-shrink-0">{unit}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
