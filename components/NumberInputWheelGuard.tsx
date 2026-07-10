'use client';
import { useEffect } from 'react';

/** Stops the mouse wheel from silently changing a number input's value while scrolling
 *  past it — the up/down arrow buttons remain click-only, as intended. Mounted once. */
export default function NumberInputWheelGuard() {
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      if (e.target instanceof HTMLInputElement && e.target.type === 'number') {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', handler, { passive: false });
    return () => document.removeEventListener('wheel', handler);
  }, []);
  return null;
}
