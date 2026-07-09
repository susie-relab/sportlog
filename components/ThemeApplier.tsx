'use client';
import { useEffect } from 'react';
import { useAuth } from './AuthProvider';

/** Applies the user's theme preference (user_metadata.theme) to <html data-theme>,
 *  which the light-theme CSS overrides in globals.css key off. Mounted once, globally. */
export default function ThemeApplier() {
  const { user } = useAuth();
  const theme = user?.user_metadata?.theme === 'light' ? 'light' : 'dark';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return null;
}
