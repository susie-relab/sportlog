'use client';
import { useEffect, useRef, useState } from 'react';
import NumberWheelColumn, { NumberWheelColumnHandle } from './NumberWheelColumn';

interface Props {
  label: string;
  unit?: string;
  value: string; // stored string, e.g. '' | '150' | '12.34'
  onChange: (v: string) => void;
  max: number;
  min?: number; // lower bound of the whole-number wheel, default 0
  decimals?: 0 | 2; // 0 = integer (HR, Elevation), 2 = whole + hundredths (Distance)
  suggestion?: number; // seeds the wheel(s) when the field is currently empty
  preferSuggestion?: boolean; // re-seed to the (possibly just-updated) suggestion every time the
                               // picker is opened, instead of only when the field is empty — e.g.
                               // Heart Rate should reflect a newly-changed Effort as soon as you tap in
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
export default function ScrollFieldPicker({ label, unit, value, onChange, max, min = 0, decimals = 0, suggestion, preferSuggestion, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [whole, setWhole] = useState(0);
  const [frac, setFrac] = useState(0);
  const [focused, setFocused] = useState(false);
  const [wholeText, setWholeText] = useState('');
  const [fracText, setFracText] = useState('');
  const wholeInputRef = useRef<HTMLInputElement>(null);
  const fracInputRef = useRef<HTMLInputElement>(null);
  const wholeColumnRef = useRef<NumberWheelColumnHandle>(null);
  const fracColumnRef = useRef<NumberWheelColumnHandle>(null);

  useEffect(() => {
    if (!focused) {
      setWholeText(String(whole));
      setFracText(String(frac).padStart(2, '0'));
    }
  }, [whole, frac, focused]);

  // Land the cursor (with the existing value pre-selected) straight in the whole-number
  // input as soon as the picker opens, so a single tap-to-open is immediately followed by
  // typing the new value — no extra tap needed to focus/clear the field first.
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => wholeInputRef.current?.select());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  const openPicker = () => {
    const parsed = (preferSuggestion && suggestion != null) ? suggestion : (value ? parseFloat(value) : (suggestion ?? min));
    setWhole(Math.max(min, Math.floor(parsed)));
    setFrac(Math.round((parsed - Math.floor(parsed)) * 100));
    setOpen(true);
  };

  const handleFracText = (v: string) => {
    setFracText(v);
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= 0 && n <= 99) setFrac(n);
  };

  // Typing a "." (or a whole value with one already in it, e.g. pasting "2.5") splits at the
  // dot and hands the remainder to the fraction field — handled here in onChange, not just
  // onKeyDown, so it also covers paste/autofill/IME input that never fires a normal keydown.
  const handleWholeText = (v: string) => {
    if (decimals === 2 && v.includes('.')) {
      const [wholePart, fracPart] = v.split('.');
      setWholeText(wholePart);
      const wn = parseInt(wholePart || '0', 10);
      if (!isNaN(wn) && wn >= min && wn <= max) setWhole(wn);
      if (fracPart) handleFracText(fracPart.slice(0, 2));
      requestAnimationFrame(() => fracInputRef.current?.focus());
      return;
    }
    setWholeText(v);
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= min && n <= max) setWhole(n);
  };

  const commitAndClose = () => {
    // Backspacing the whole-number field down to empty (it can't reach below `min` any other
    // way, e.g. HR's min=28) is how you clear the field back to "no value" entirely.
    if (wholeText.trim() === '') {
      onChange('');
      setOpen(false);
      return;
    }
    // A single fraction digit left at commit time (e.g. typed "2.5" and stopped) reads as
    // tenths, not hundredths — "5" means .50, matching how people actually write decimals.
    // A second typed digit ("2.05" or "2.50") always wins since fracText is then 2 chars.
    const effectiveFrac = (decimals === 2 && fracText.length === 1) ? frac * 10 : frac;
    const final = decimals === 2 ? whole + effectiveFrac / 100 : whole;
    onChange(final > 0 || value ? String(decimals === 2 ? Math.round(final * 100) / 100 : final) : '');
    setOpen(false);
  };

  const wholeValues = range(min, max);
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
          <div className="relative bg-[#1E293B] border border-[#334155] rounded-xl p-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="relative">
            <div className="flex items-center justify-center gap-1">
              <NumberWheelColumn ref={wholeColumnRef} values={wholeValues} value={whole} onChange={setWhole} width={wholeWidth} />
              {decimals === 2 && (
                <>
                  <span className="text-white text-lg pb-1">.</span>
                  <NumberWheelColumn ref={fracColumnRef} values={fracValues} value={frac} onChange={setFrac} format={v => String(v).padStart(2, '0')} width={fracWidth} />
                </>
              )}
              {unit && <span className="text-[#64748B] text-sm ml-1">{unit}</span>}
            </div>
            <div className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 flex items-center justify-center gap-1">
              <input
                ref={wholeInputRef}
                type="text"
                inputMode="numeric"
                value={wholeText}
                onFocus={e => { setFocused(true); e.target.select(); }}
                onBlur={() => setFocused(false)}
                onChange={e => handleWholeText(e.target.value)}
                onKeyDown={e => {
                  if (decimals === 2 && (e.key === '.' || e.key === ',')) {
                    e.preventDefault();
                    fracInputRef.current?.focus();
                  } else if (e.key === 'Enter') {
                    commitAndClose();
                  }
                }}
                onWheel={e => { e.preventDefault(); wholeColumnRef.current?.scrollByDelta(e.deltaY); }}
                style={{ width: wholeWidth }}
                className="wheel-input pointer-events-auto bg-[#1E293B] text-white text-lg font-bold text-center outline-none"
              />
              {decimals === 2 && (
                <>
                  <span className="text-white text-lg pb-1 invisible">.</span>
                  <input
                    ref={fracInputRef}
                    type="text"
                    inputMode="numeric"
                    value={fracText}
                    onFocus={e => { setFocused(true); e.target.select(); }}
                    onBlur={() => setFocused(false)}
                    onChange={e => handleFracText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commitAndClose(); }}
                    onWheel={e => { e.preventDefault(); fracColumnRef.current?.scrollByDelta(e.deltaY); }}
                    style={{ width: fracWidth }}
                    className="wheel-input pointer-events-auto bg-[#1E293B] text-white text-lg font-bold text-center outline-none"
                  />
                </>
              )}
              {unit && <span className="text-transparent text-sm ml-1 select-none">{unit}</span>}
            </div>
            </div>
            <div className="flex justify-center mt-2">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="text-xs text-[#64748B] hover:text-[#94A3B8] underline"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
