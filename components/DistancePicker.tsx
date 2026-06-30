'use client';
import { useEffect, useRef, useState } from 'react';

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 5;

const DISTANCES = Array.from({ length: 1600 }, (_, i) =>
  parseFloat(((i + 1) * 0.1).toFixed(1))
);

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export default function DistancePicker({ value, onChange }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [textInput, setTextInput] = useState(value);

  const selectedIndex = value
    ? DISTANCES.findIndex(d => d === parseFloat(value))
    : -1;

  useEffect(() => {
    setTextInput(value);
  }, [value]);

  useEffect(() => {
    if (isOpen && listRef.current && selectedIndex >= 0) {
      listRef.current.scrollTop = selectedIndex * ITEM_HEIGHT - ITEM_HEIGHT * 2;
    }
  }, [isOpen, selectedIndex]);

  const handleScroll = () => {
    if (!listRef.current) return;
    const index = Math.round(listRef.current.scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(DISTANCES.length - 1, index));
    onChange(String(DISTANCES[clamped]));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setTextInput(v);
    const num = parseFloat(v);
    if (!isNaN(num) && num > 0 && num <= 160) {
      onChange(String(Math.round(num * 100) / 100));
    } else if (v === '' || v === '0') {
      onChange('');
    }
  };

  const handleTextBlur = () => {
    const num = parseFloat(textInput);
    if (isNaN(num) || num <= 0 || num > 160) {
      setTextInput(value);
    }
  };

  return (
    <div className="relative">
      {/* Single unified box */}
      <div className="flex items-center rounded-lg border border-[#334155] bg-[#0F172A] focus-within:border-[#475569] overflow-hidden">
        <input
          type="number"
          className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder-[#475569] outline-none min-w-0"
          placeholder="Distance km"
          min="0.01"
          max="160"
          step="0.01"
          value={textInput}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
        />
        <span className="text-xs text-[#475569] pr-2 flex-shrink-0">km</span>
        <div className="w-px h-6 bg-[#334155] flex-shrink-0" />
        <button
          type="button"
          onClick={() => setIsOpen(v => !v)}
          title="Open scroll picker"
          className={`px-3 py-2.5 text-xs font-medium transition-colors flex-shrink-0 ${
            isOpen ? 'text-blue-400' : 'text-[#64748B] hover:text-white'
          }`}
        >
          ☰
        </button>
      </div>

      {/* Scroll picker dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 right-0 mt-1 w-40 rounded-xl border border-[#334155] overflow-hidden shadow-xl"
          style={{ background: '#0F172A' }}
        >
          <button
            type="button"
            onClick={() => { onChange(''); setTextInput(''); setIsOpen(false); }}
            className="w-full px-3 py-2 text-xs text-[#64748B] hover:text-white hover:bg-[#1E293B] border-b border-[#334155] text-left"
          >
            Clear distance
          </button>

          <div className="relative" style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}>
            <div
              className="absolute left-0 right-0 pointer-events-none z-10"
              style={{
                top: ITEM_HEIGHT * 2, height: ITEM_HEIGHT,
                background: 'rgba(59,130,246,0.15)',
                borderTop: '1px solid rgba(59,130,246,0.3)',
                borderBottom: '1px solid rgba(59,130,246,0.3)',
              }}
            />
            <div className="absolute top-0 left-0 right-0 pointer-events-none z-10"
              style={{ height: ITEM_HEIGHT * 2, background: 'linear-gradient(to bottom, #0F172A, transparent)' }} />
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
              style={{ height: ITEM_HEIGHT * 2, background: 'linear-gradient(to top, #0F172A, transparent)' }} />
            <div
              ref={listRef}
              onScroll={handleScroll}
              className="h-full overflow-y-auto scrollbar-hide"
              style={{ scrollSnapType: 'y mandatory' }}
            >
              <div style={{ height: ITEM_HEIGHT * 2 }} />
              {DISTANCES.map(d => {
                const isSelected = value && parseFloat(value) === d;
                return (
                  <div
                    key={d}
                    onClick={() => { onChange(String(d)); setTextInput(String(d)); setIsOpen(false); }}
                    className="flex items-center justify-center cursor-pointer"
                    style={{
                      height: ITEM_HEIGHT, scrollSnapAlign: 'center',
                      color: isSelected ? '#60A5FA' : '#94A3B8',
                      fontWeight: isSelected ? 600 : 400,
                      fontSize: isSelected ? '0.9rem' : '0.8rem',
                    }}
                  >
                    {d % 1 === 0 ? `${d}.0` : d} km
                  </div>
                );
              })}
              <div style={{ height: ITEM_HEIGHT * 2 }} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full py-2 text-xs font-semibold text-blue-400 hover:text-blue-300 border-t border-[#334155]"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
