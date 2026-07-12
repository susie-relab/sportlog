'use client';
import { useEffect, useRef } from 'react';

interface Props {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  itemHeight?: number;
  height?: number;
  width?: number;
}

/** One scrollable "spin wheel" column of numbers, snapping to the centered row.
 *  Scrolling and tapping a row are both valid ways to select a value. */
export default function NumberWheelColumn({ values, value, onChange, format, itemHeight = 40, height = 200, width }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitted = useRef(value);
  const padding = (height - itemHeight) / 2;

  const indexOf = (v: number) => {
    let closest = 0, closestDiff = Infinity;
    values.forEach((val, i) => {
      const diff = Math.abs(val - v);
      if (diff < closestDiff) { closestDiff = diff; closest = i; }
    });
    return closest;
  };

  const scrollToIndex = (i: number, smooth = true) => {
    ref.current?.scrollTo({ top: i * itemHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToIndex(indexOf(value), false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sync the wheel when `value` changes from outside this column (e.g. the
  // user typed a new number) — but skip the sync we caused ourselves via scroll/click.
  useEffect(() => {
    if (value !== lastEmitted.current) {
      scrollToIndex(indexOf(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleScroll = () => {
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      if (!ref.current) return;
      const i = Math.max(0, Math.min(values.length - 1, Math.round(ref.current.scrollTop / itemHeight)));
      if (values[i] !== value) { lastEmitted.current = values[i]; onChange(values[i]); }
    }, 100);
  };

  const handleClick = (i: number) => {
    scrollToIndex(i);
    lastEmitted.current = values[i];
    onChange(values[i]);
  };

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="overflow-y-scroll snap-y snap-mandatory no-scrollbar"
      style={{ height, width }}
    >
      <div style={{ height: padding }} />
      {values.map((v, i) => (
        <div
          key={v}
          onClick={() => handleClick(i)}
          className={`flex items-center justify-center snap-center cursor-pointer text-lg transition-colors ${v === value ? 'text-white font-bold' : 'text-[#64748B]'}`}
          style={{ height: itemHeight }}
        >
          {format ? format(v) : v}
        </div>
      ))}
      <div style={{ height: padding }} />
    </div>
  );
}
