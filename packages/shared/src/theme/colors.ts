import { fontWeightOf } from './fonts';
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

/**
 * Text sizes the way Facebook's app sets them: body text and names are 15-16, the line under a name (time, place, count) 13, a caption or a count 12-13, a title 17-18. The sizes written in the
 * style sheets are smaller (mostly 10-14), so `themedStyles` maps each `fontSize` to the nearest Facebook size below and grows its `lineHeight` by the same ratio, in all four apps at once.
 * Change `facebookSize` to change every text at once. (Sizes written inline in JSX are not mapped.)
 */
export const facebookSize = (n: number): number => {
  if (n <= 10) return 12;
  if (n <= 11) return 13;
  if (n <= 11.5) return 13.5;
  if (n <= 12.5) return 14.5;
  if (n <= 13.5) return 15;
  if (n <= 14.5) return 16;
  if (n <= 15.5) return 17;
  if (n <= 17) return 18;
  return Math.round(n * 1.1);
};

const scaleFonts = <T extends object>(sheet: T): T => {
  const out: Record<string, unknown> = {};
  for (const [name, rawStyle] of Object.entries(sheet)) {
    // A text style written with one of the FONTS families also gets that family's weight (the system font takes its weight from fontWeight).
    const wt = rawStyle && typeof rawStyle === 'object' && !Array.isArray(rawStyle) ? fontWeightOf((rawStyle as { fontFamily?: unknown }).fontFamily) : undefined;
    const style = wt && !('fontWeight' in (rawStyle as object)) ? { ...(rawStyle as object), fontWeight: wt } : rawStyle;
    if (style && typeof style === 'object' && !Array.isArray(style) && ('fontSize' in style || 'lineHeight' in style)) {
      const st = style as { fontSize?: number; lineHeight?: number };
      const k = typeof st.fontSize === 'number' && st.fontSize > 0 ? facebookSize(st.fontSize) / st.fontSize : 1.1;
      out[name] = {
        ...st,
        ...(typeof st.fontSize === 'number' ? { fontSize: facebookSize(st.fontSize) } : null),
        ...(typeof st.lineHeight === 'number' ? { lineHeight: Math.round(st.lineHeight * k) } : null),
      };
    } else out[name] = style;
  }
  return out as T;
};

/**
 * The shape language of an app. 'material' is the Google look the apps are written in (small corners, thin grey outlines, a light shadow). 'pickme' reshapes every style sheet the way
 * PickMe looks: big rounded corners on cards, pill-shaped buttons and chips, no hard grey outlines (a very light edge instead) and a soft, wide shadow. Colours are not touched. An app picks its
 * shape once at start (`setAppShape`), before its first screen is drawn; the other apps keep 'material'.
 */
export type AppShape = 'material' | 'pickme';
let shape: AppShape = 'material';
export const setAppShape = (s: AppShape) => {
  shape = s;
};
export const getAppShape = () => shape;

const LIGHT_EDGE: Record<string, string> = { '#dadce0': '#eceff3', '#e8eaed': '#f1f3f4', '#d2e3fc': '#dbe8fd' };

const reshapePickMe = <T extends object>(sheet: T): T => {
  const out: Record<string, unknown> = {};
  for (const [name, style] of Object.entries(sheet)) {
    if (!style || typeof style !== 'object' || Array.isArray(style)) {
      out[name] = style;
      continue;
    }
    const st = { ...(style as Record<string, unknown>) };
    // Corners: a button or chip (a fixed height with side padding) becomes a pill; a card or panel gets a much bigger corner; a circle stays a circle.
    const r = st.borderRadius;
    if (typeof r === 'number' && r < 500) {
      const h = typeof st.height === 'number' ? st.height : typeof st.minHeight === 'number' ? st.minHeight : 0;
      const w = typeof st.width === 'number' ? st.width : 0;
      const circle = (h && w && h === w && r >= h / 2 - 1) || (h && r >= h / 2);
      if (!circle) {
        if (h >= 26 && h <= 64 && r >= 5 && r <= 16 && (st.paddingHorizontal !== undefined || st.flexDirection === 'row' || st.alignItems === 'center')) st.borderRadius = Math.round(h / 2);
        else if (r >= 5) st.borderRadius = Math.min(28, Math.round(r * 1.6));
      }
    }
    // Edges: the hard grey outline becomes a very light edge.
    if (typeof st.borderColor === 'string' && LIGHT_EDGE[st.borderColor.toLowerCase()]) st.borderColor = LIGHT_EDGE[st.borderColor.toLowerCase()];
    // Shadows: wide and soft instead of a thin tight one.
    if ('shadowColor' in st || 'elevation' in st) {
      const dark = current === 'dark';
      st.shadowColor = '#1f2937';
      st.shadowOffset = { width: 0, height: 6 };
      st.shadowOpacity = dark ? 0.4 : 0.1;
      st.shadowRadius = 14;
      st.elevation = 3;
    }
    out[name] = st;
  }
  return out as T;
};

// Lazily builds a style sheet per theme and serves whichever matches the active one (its text sizes set the Facebook way).
export function themedStyles<T extends object>(factory: () => T): T {
  const cache: Partial<Record<ThemeMode, T>> = {};
  return new Proxy({} as T, {
    get: (_, key) => {
      const sheet = (cache[current] ??= shape === 'pickme' ? reshapePickMe(scaleFonts(factory())) : scaleFonts(factory()));
      return sheet[key as keyof T];
    },
  });
}
