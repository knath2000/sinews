import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { darkTheme, lightTheme, Theme } from './tokens';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  themeMode: 'light',
  isDark: false,
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [forcedMode, setForcedMode] = useState<ThemeMode | null>(null);

  const themeMode = forcedMode ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const isDark = themeMode === 'dark';

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setForcedMode(mode);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themeMode, isDark, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

export function setSystemAppearance(mode: 'light' | 'dark') {
  SystemUI.setBackgroundColorAsync(mode === 'dark' ? darkTheme.bg : lightTheme.bg);
}
