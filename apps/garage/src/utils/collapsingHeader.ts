import { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/** The scroll distance the headers need to be fully gone. Each header moves by its own height over this range. */
export const HEADER_SCROLL = 56;

/**
 * Headers that leave with the list: they scroll up and away as the list scrolls up, and come back as soon as it moves
 * back down (a "quick return" header). `shift` runs from 0 (showing) to HEADER_SCROLL (gone); it only drives transforms,
 * so nothing is re-laid out while scrolling.
 */
export const useCollapsingHeader = () => {
  const shift = useRef(new Animated.Value(0)).current;
  const now = useRef(0);
  const lastY = useRef(0);
  // true while the header is gliding back (or has come back) because the list was dragged down.
  const returning = useRef(false);
  useEffect(() => {
    const id = shift.addListener(({ value }) => (now.current = value));
    return () => shift.removeListener(id);
  }, [shift]);
  /** The list's scroll position, on every scroll event. */
  const onScrollY = useCallback(
    (y: number) => {
      const delta = y - lastY.current;
      lastY.current = y;
      if (y <= 0) {
        returning.current = false;
        shift.stopAnimation();
        shift.setValue(0);
        return;
      }
      // The first drag down brings the whole header back at once, however far the list has scrolled.
      if (delta < -1) {
        if (!returning.current) {
          returning.current = true;
          Animated.timing(shift, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
        }
        return;
      }
      if (delta > 0) {
        returning.current = false;
        shift.stopAnimation();
        shift.setValue(Math.min(HEADER_SCROLL, Math.max(0, now.current + delta)));
      }
    },
    [shift]
  );
  /** A discrete change (a sheet pulled up or down): glide to hidden or shown. */
  const setShown = useCallback(
    (visible: boolean) => {
      Animated.timing(shift, { toValue: visible ? 0 : HEADER_SCROLL, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    },
    [shift]
  );
  /** Back to showing, with the scroll position forgotten (another page, another list). */
  const reset = useCallback(() => {
    lastY.current = 0;
    returning.current = false;
    shift.stopAnimation();
    shift.setValue(0);
  }, [shift]);
  return { shift, onScrollY, setShown, reset };
};
