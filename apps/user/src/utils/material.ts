import { Colors, getThemeMode } from '@ongarage/shared';

// Google Material look for the owner app: a light grey page so white cards stand out, 12px
// corners, a thin outline and a light elevation on every card.

/** The page colour behind cards: a clear light grey in day mode, the body colour in dark mode. */
export const pageBg = () => (getThemeMode() === 'dark' ? Colors.bgBody : '#f0f0f0');

/** The thin outline of a Material card. */
export const outline = () => (getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0');

/**
 * The shadow of the cards of a list, PickMe style: a soft, wide, faint one on a light grey page, so every white card stands off the page and the next one. It is a
 * boxShadow because the app shape rule (setAppShape) rewrites every style written with shadow keys. It is kept close to the card (small offset and blur): a scrolling
 * list cuts off whatever is drawn outside it, which showed as a hard vertical edge next to the cards when the shadow spread wide.
 */
export const cardGlow = () =>
  ({ boxShadow: getThemeMode() === 'dark' ? '0 10px 18px -8px rgba(0, 0, 0, 0.75), 0 1px 3px rgba(0, 0, 0, 0.5)' : '0 2px 12px rgba(0, 0, 0, 0.09), 0 1px 2px rgba(0, 0, 0, 0.05)' }) as object;

/** Material elevation 1. */
export const elevation1 = () =>
  ({ shadowColor: '#3c4043', shadowOffset: { width: 0, height: 1 }, shadowOpacity: getThemeMode() === 'dark' ? 0.4 : 0.15, shadowRadius: 3, elevation: 1 }) as const;
