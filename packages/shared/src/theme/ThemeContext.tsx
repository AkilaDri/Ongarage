import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getThemeMode, setThemeMode, type ThemeMode } from './colors';

const STORAGE_KEY = 'ongarage.themeMode';

type ThemeState = { mode: ThemeMode; isDark: boolean; setMode: (mode: ThemeMode) => void; toggle: () => void };

const ThemeContext = createContext<ThemeState | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(getThemeMode());

  const setMode = useCallback((next: ThemeMode) => {
    setThemeMode(next);
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark') {
          setThemeMode(saved);
          setModeState(saved);
        }
      })
      .catch(() => {});
  }, []);

  const toggle = useCallback(() => setMode(getThemeMode() === 'dark' ? 'light' : 'dark'), [setMode]);

  return <ThemeContext.Provider value={{ mode, isDark: mode === 'dark', setMode, toggle }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
