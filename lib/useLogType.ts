'use client';
import { useState, useEffect, useCallback } from 'react';
import { ExerciseType } from '@/types';

const key = (userId: string) => `sportlog_log_type_${userId}`;

export function useLogType(userId: string) {
  const [logType, setLogTypeState] = useState<ExerciseType>('run');

  useEffect(() => {
    if (!userId) return;
    const stored = localStorage.getItem(key(userId)) as ExerciseType | null;
    setLogTypeState(stored || 'run');
  }, [userId]);

  const setLogType = useCallback((t: ExerciseType) => {
    if (!userId) return;
    localStorage.setItem(key(userId), t);
    setLogTypeState(t);
    window.dispatchEvent(new CustomEvent('logtype-change', { detail: t }));
  }, [userId]);

  return { logType, setLogType };
}

export function getStoredLogType(userId?: string): ExerciseType {
  if (typeof window === 'undefined' || !userId) return 'run';
  return (localStorage.getItem(key(userId)) as ExerciseType) || 'run';
}
