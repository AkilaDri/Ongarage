import { useCallback, useRef } from 'react';

/** How far the owner has to keep scrolling the same way (px) before the title band folds away or comes back. */
const TRAVEL = 40;
/** The band's fold takes about this long (ms); the layout moves while it does. */
const FOLD_MS = 450;

/**
 * Folds the page's title band away as a list scrolls up and brings it back when it scrolls down, without the page shaking. The band is part of the layout, so
 * folding it moves the list under the finger and the scroll offset jumps; read naively, that jump looks like the owner scrolling the other way and the band
 * folds and unfolds again and again. This waits for `TRAVEL` px of steady scrolling in one direction, and ignores the offsets that arrive while the band is still
 * moving. Call the returned function with the scroll offset from `onScroll`; `onProgress(1)` means fold away, `onProgress(0)` means show.
 */
export const useHeaderCollapse = (onProgress?: (progress: number) => void) => {
  const cb = useRef(onProgress);
  cb.current = onProgress;
  const last = useRef(0);
  const hidden = useRef(false);
  const run = useRef(0);
  const lockedUntil = useRef(0);

  return useCallback((y: number) => {
    const dy = y - last.current;
    last.current = y;
    const change = (hide: boolean) => {
      hidden.current = hide;
      run.current = 0;
      lockedUntil.current = Date.now() + FOLD_MS;
      cb.current?.(hide ? 1 : 0);
    };
    // At the very top the band is always there.
    if (y <= 4) {
      if (hidden.current) change(false);
      run.current = 0;
      return;
    }
    // Offsets while the band is moving are the layout shifting, not the owner scrolling.
    if (Date.now() < lockedUntil.current) {
      run.current = 0;
      return;
    }
    if (Math.sign(dy) !== Math.sign(run.current)) run.current = 0;
    run.current += dy;
    if (run.current > TRAVEL && y > 60 && !hidden.current) change(true);
    else if (run.current < -TRAVEL && hidden.current) change(false);
  }, []);
};
