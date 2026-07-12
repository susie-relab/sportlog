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
 *  whatever is currently set and closes it. No card chrome — just the floating
 *  wheel columns over the page. */
export default function ScrollFieldPicker({ label, unit, value, onChange, max, decimals = 0, suggestion, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [whole, setWhole] = useState(0);
  const [frac, setFrac] = useState(0);
  const [focused, setFocused] = useState(false);
  const [wholeText, setWholeText] = useState('');
  const [fracText, setFracText] = useState('');

  useEffect(() => {
    if (!focused) {
      setWholeText(String(whole));
      setFracText(String(frac).padStart(2, '0'));
    }
  }, [whole, frac, focused]);

  const openPicker = () => {
    const parsed = value ? parseFloat(value) : (suggestion ?? 0);
    setWhole(Math.floor(parsed));
    setFrac(Math.round((parsed - Math.floor(parsed)) * 100));
    setOpen(true);
  };

  const handleWholeText = (v: string) => {
    setWholeText(v);
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= 0 && n <= max) setWhole(n);
  };

  const handleFracText = (v: string) => {
    setFracText(v);
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= 0 && n <= 99) setFrac(n);
  };

  const commitAndClose = () => {
    const final = decimals === 2 ? whole + frac / 100 : whole;
    onChange(final > 0 || value ? String(decimals === 2 ? Math.round(final * 100) / 100 : final) : '');
    setOpen(false);
  };

  const wholeValues = range(0, max);
  const fracValues = range(0, 99);
  const wholeWidth = Math.max(48, String(max).length * 22 + 20);
  const fracWidth = 56;

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={commitAndClose}
        >
          <div className="relative" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-1">
              <NumberWheelColumn values={wholeValues} value={whole} onChange={setWhole} width={wholeWidth} />
              {decimals === 2 && (
                <>
                  <span className="text-white text-lg pb-1">.</span>
                  <NumberWheelColumn values={fracValues} value={frac} onChange={setFrac} format={v => String(v).padStart(2, '0')} width={fracWidth} />
                </>
              )}
              {unit && <span className="text-[#64748B] text-sm ml-1">{unit}</span>}
            </div>
            <div className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 flex items-center justify-center gap-1">
              <input
                type="text"
                inputMode="numeric"
                value={wholeText}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onChange={e => handleWholeText(e.target.value)}
                style={{ width: wholeWidth }}
                className="pointer-events-auto bg-transparent text-white text-lg font-bold text-center outline-none"
              />
              {decimals === 2 && (
                <>
                  <span className="text-white text-lg pb-1 invisible">.</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={fracText}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onChange={e => handleFracText(e.target.value)}
                    style={{ width: fracWidth }}
                    className="pointer-events-auto bg-transparent text-white text-lg font-bold text-center outline-none"
                  />
                </>
              )}
              {unit && <span className="text-transparent text-sm ml-1 select-none">{unit}</span>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
