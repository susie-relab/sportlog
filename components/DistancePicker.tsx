'use client';
import { useEffect, useRef, useState } from 'react';

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 5;

// Generate 0.1 to 160 in 0.1 steps
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

  const selectedIndex = value
    ? DISTANCES.findIndex(d => d === parseFloat(value))
    : -1;

  // Scroll to selected when opening
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

  const displayValue = value ? `${value} km` : '— Select distance —';

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input text-left flex items-center justify-between"
        style={{ cursor: 'pointer' }}
      >
        <span className={value ? 'text-white' : 'text-[#475569]'}>{displayValue}</span>
        <span className="text-[#64748B] text-xs ml-2">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Scroll picker dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl border border-[#334155] overflow-hidden"
          style={{ background: '#0F172A' }}
        >
          {/* Clear option */}
          <button
            type="button"
            onClick={() => { onChange(''); setIsOpen(false); }}
            className="w-full px-4 py-2 text-sm text-[#64748B] hover:text-white hover:bg-[#1E293B] border-b border-[#334155] text-left"
          >
            Clear distance
          </button>

          {/* Scroll container */}
          <div className="relative" style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}>
            {/* Highlight band for selected item */}
            <div
              className="absolute left-0 right-0 pointer-events-none z-10 rounded"
              style={{
                top: ITEM_HEIGHT * 2,
                height: ITEM_HEIGHT,
                background: 'rgba(59,130,246,0.15)',
                borderTop: '1px solid rgba(59,130,246,0.3)',
                borderBottom: '1px solid rgba(59,130,246,0.3)',
              }}
            />

            {/* Top fade */}
            <div
              className="absolute top-0 left-0 right-0 pointer-events-none z-10"
              style={{
                height: ITEM_HEIGHT * 2,
                background: 'linear-gradient(to bottom, #0F172A, transparent)',
              }}
            />

            {/* Bottom fade */}
            <div
              className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
              style={{
                height: ITEM_HEIGHT * 2,
                background: 'linear-gradient(to top, #0F172A, transparent)',
              }}
            />

            {/* Scrollable list */}
            <div
              ref={listRef}
              onScroll={handleScroll}
              className="h-full overflow-y-auto scrollbar-hide"
              style={{ scrollSnapType: 'y mandatory' }}
            >
              {/* Top padding */}
              <div style={{ height: ITEM_HEIGHT * 2 }} />

              {DISTANCES.map(d => {
                const isSelected = value && parseFloat(value) === d;
                return (
                  <div
                    key={d}
                    onClick={() => { onChange(String(d)); setIsOpen(false); }}
                    className="flex items-center justify-center cursor-pointer transition-colors"
                    style={{
                      height: ITEM_HEIGHT,
                      scrollSnapAlign: 'center',
                      color: isSelected ? '#60A5FA' : '#94A3B8',
                      fontWeight: isSelected ? 600 : 400,
                      fontSize: isSelected ? '0.95rem' : '0.875rem',
                    }}
                  >
                    {d % 1 === 0 ? `${d}.0` : d} km
                  </div>
                );
              })}

              {/* Bottom padding */}
              <div style={{ height: ITEM_HEIGHT * 2 }} />
            </div>
          </div>

          {/* Done button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full py-2.5 text-sm font-semibold text-blue-400 hover:text-blue-300 border-t border-[#334155]"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
