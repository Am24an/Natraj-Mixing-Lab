import { useEffect } from 'react';
import { usePreferences } from '@/stores/editorStore';
import type { Theme } from '@/types';

interface ThemeProviderProps {
  children: React.ReactNode;
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const preferences = usePreferences();

  useEffect(() => {
    const resolved = resolveTheme(preferences.theme);
    document.documentElement.setAttribute('data-theme', resolved);
  }, [preferences.theme]);

  // Listen for system theme changes when 'system' is selected
  useEffect(() => {
    if (preferences.theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [preferences.theme]);

  return <>{children}</>;
}
