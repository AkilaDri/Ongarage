export type ThemeMode = 'dark' | 'light';

const dark = {
  // Background
  bgBody: '#07090e',
  bgCard: '#0f172a',
  bgCardHover: '#1e293b',
  bgDark: '#030712',
  sheetBg: '#07090e',
  mapBg: '#0b1120',
  barBg: 'rgba(7, 9, 14, 0.96)',
  cardGlass: 'rgba(15, 23, 42, 0.92)',
  overlay: 'rgba(3, 7, 18, 0.82)',
  glassBg: 'rgba(30, 41, 59, 0.5)',
  glassBorder: 'rgba(255, 255, 255, 0.25)',
  subtleFill: 'rgba(255, 255, 255, 0.05)',
  subtleBorder: 'rgba(255, 255, 255, 0.15)',

  // Text
  textMain: '#f8fafc',
  textSoft: '#cbd5e1',
  textMuted: '#94a3b8',

  // Primary Colors
  primary: '#38bdf8',
  primaryLight: '#0ea5e9',

  // Status Colors
  success: '#10b981',
  successText: '#34d399',
  warning: '#f59e0b',
  error: '#ef4444',
  errorText: '#f87171',
  red: '#dc2626',

  // Borders
  borderColor: 'rgba(255, 255, 255, 0.08)',
};

export type Palette = typeof dark;

const light: Palette = {
  bgBody: '#f1f5f9',
  bgCard: '#ffffff',
  bgCardHover: '#e2e8f0',
  bgDark: '#eef2f7',
  sheetBg: '#f8fafc',
  mapBg: '#dbe4ee',
  barBg: 'rgba(255, 255, 255, 0.97)',
  cardGlass: 'rgba(255, 255, 255, 0.95)',
  overlay: 'rgba(15, 23, 42, 0.45)',
  glassBg: 'rgba(255, 255, 255, 0.75)',
  glassBorder: 'rgba(15, 23, 42, 0.12)',
  subtleFill: 'rgba(15, 23, 42, 0.04)',
  subtleBorder: 'rgba(15, 23, 42, 0.14)',

  textMain: '#0f172a',
  textSoft: '#334155',
  textMuted: '#64748b',

  primary: '#0284c7',
  primaryLight: '#0ea5e9',

  success: '#059669',
  successText: '#047857',
  warning: '#d97706',
  error: '#dc2626',
  errorText: '#dc2626',
  red: '#dc2626',

  borderColor: 'rgba(15, 23, 42, 0.1)',
};

const PALETTES: Record<ThemeMode, Palette> = { dark, light };

let current: ThemeMode = 'dark';

export const getThemeMode = () => current;

// Called by ThemeProvider before it re-renders the tree, so every Colors read and
// every themedStyles() lookup during that render already sees the new palette.
export const setThemeMode = (mode: ThemeMode) => {
  current = mode;
};

export const Colors: Palette = new Proxy({} as Palette, {
  get: (_, key) => PALETTES[current][key as keyof Palette],
});

// Lazily builds a style sheet per theme and serves whichever matches the active one.
export function themedStyles<T extends object>(factory: () => T): T {
  const cache: Partial<Record<ThemeMode, T>> = {};
  return new Proxy({} as T, {
    get: (_, key) => {
      const sheet = (cache[current] ??= factory());
      return sheet[key as keyof T];
    },
  });
}
