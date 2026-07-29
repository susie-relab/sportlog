'use client';
import { useState, useEffect, useCallback } from 'react';
import { ExerciseType } from '@/types';

const KEY = 'sportlog_log_type';

export function useLogType() {
  const [logType, setLogTypeState] = useState<ExerciseType>('run');

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as ExerciseType | null;
    if (stored) setLogTypeState(stored);
  }, []);

  const setLogType = useCallback((t: ExerciseType) => {
    localStorage.setItem(KEY, t);
    setLogTypeState(t);
    window.dispatchEvent(new CustomEvent('logtype-change', { detail: t }));
  }, []);

  return { logType, setLogType };
}

export function getStoredLogType(): ExerciseType {
  if (typeof window === 'undefined') return 'run';
  return (localStorage.getItem(KEY) as ExerciseType) || 'run';
}
