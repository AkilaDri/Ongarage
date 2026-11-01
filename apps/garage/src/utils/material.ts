import { Colors, getThemeMode } from '@ongarage/shared';

// Google Material look for the garage app: a light grey page so white cards stand out, 12px
// corners, a thin outline and a light elevation on every card.

/** The page colour behind cards: a clear light grey in day mode, the body colour in dark mode. */
export const pageBg = () => (getThemeMode() === 'dark' ? Colors.bgBody : '#f0f0f0');

/** The thin outline of a Material card. */
export const outline = () => (getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0');

/** Material elevation 1. */
export const elevation1 = () =>
  ({ shadowColor: '#3c4043', shadowOffset: { width: 0, height: 1 }, shadowOpacity: getThemeMode() === 'dark' ? 0.4 : 0.15, shadowRadius: 3, elevation: 1 }) as const;
