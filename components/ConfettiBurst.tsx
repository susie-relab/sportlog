'use client';
import { useMemo } from 'react';

interface Props {
  color: string;
  count?: number;
}

/** A brief full-screen confetti burst in the given colour. Unmount after ~2s. */
export default function ConfettiBurst({ color, count = 46 }: Props) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.25,
    duration: 1.5 + Math.random() * 1.1,
    width: 5 + Math.random() * 6,
    height: 8 + Math.random() * 6,
    faded: Math.random() > 0.5,
  })), [count]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {pieces.map(p => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            top: '-12px',
            left: `${p.left}%`,
            width: p.width,
            height: p.height,
            background: p.faded ? color + 'aa' : color,
            borderRadius: 2,
            animationName: 'confetti-fall',
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            animationTimingFunction: 'ease-in',
            animationFillMode: 'forwards',
          }}
        />
      ))}
    </div>
  );
}
