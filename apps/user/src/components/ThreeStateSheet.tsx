import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, View, type ScrollView, type ViewStyle } from 'react-native';
import { Colors, getThemeMode, themedStyles } from '@ongarage/shared';

export type SheetState = 'peek' | 'collapsed' | 'expanded';

export type SheetApi = {
  state: SheetState;
  /** 0 when minimised → 1 once the list has room (fades the list in and the peek strip out). */
  reveal: Animated.AnimatedInterpolation<number>;
  scrollRef: React.RefObject<ScrollView | null>;
  /** Pass to the ScrollView inside, so the sheet knows when the list is at the top. */
  onScroll: (y: number) => void;
};

/**
 * A full-width bottom sheet with three heights — peek (minimised), collapsed, expanded —
 * dragged like the category browse sheet: it follows the finger, a flick down minimises,
 * a flick up steps up, a slow drag snaps to the nearest. While expanded the list inside
 * scrolls first and only a drag from its top moves the sheet.
 */
export const ThreeStateSheet: React.FC<{
  /** Height of the area the sheet sits in (the expanded height). */
  areaHeight: number;
  peekHeight: number;
  collapsedRatio?: number;
  /** Space to leave at the bottom (the tab bar floats over the screen). */
  bottomInset?: number;
  /** Shown while minimised (fades out as the sheet opens). */
  peek: React.ReactNode;
  /** Called whenever the sheet settles on a new height. */
  onStateChange?: (state: SheetState) => void;
  children: (api: SheetApi) => React.ReactNode;
}> = ({ areaHeight, peekHeight, collapsedRatio = 0.55, bottomInset = 0, peek, onStateChange, children }) => {
  const full = Math.max(areaHeight - bottomInset, peekHeight + 120);
  const collapsed = Math.max(peekHeight + 60, Math.round(full * collapsedRatio));
  const [state, setState] = useState<SheetState>('collapsed');
  const stateRef = useRef(state);
  stateRef.current = state;
  const height = useRef(new Animated.Value(collapsed)).current;
  const current = useRef(collapsed);
  const dragStart = useRef(collapsed);
  const listY = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const sizes = useRef({ peek: peekHeight, collapsed, expanded: full });
  sizes.current = { peek: peekHeight, collapsed, expanded: full };

  useEffect(() => {
    const id = height.addListener(({ value }) => (current.current = value));
    return () => height.removeListener(id);
  }, [height]);

  const animateTo = (target: SheetState, velocity = 0) => {
    setState(target);
    stateRef.current = target;
    onStateChange?.(target);
    if (target !== 'expanded') {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      listY.current = 0;
    }
    Animated.spring(height, { toValue: sizes.current[target], velocity, stiffness: 210, damping: 26, useNativeDriver: false }).start();
  };

  // Re-snap when the area is measured or changes.
  useEffect(() => {
    Animated.spring(height, { toValue: sizes.current[stateRef.current], stiffness: 210, damping: 26, useNativeDriver: false }).start();
  }, [full, collapsed, peekHeight, height]);

  const settle = (vy: number) => {
    const h = current.current;
    const { peek: p, collapsed: c, expanded: e } = sizes.current;
    let target: SheetState;
    if (vy > 0.4) target = 'peek';
    else if (vy < -0.4) target = h < c - 10 ? 'collapsed' : 'expanded';
    else {
      const options: [SheetState, number][] = [['peek', p], ['collapsed', c], ['expanded', e]];
      target = options.reduce((best, o) => (Math.abs(o[1] - h) < Math.abs(best[1] - h) ? o : best))[0];
    }
    animateTo(target, -vy);
  };
  const animateToRef = useRef(animateTo);
  animateToRef.current = animateTo;
  const settleRef = useRef(settle);
  settleRef.current = settle;

  const makePan = (onHandle: boolean) =>
    PanResponder.create({
      // The handle claims its own touches (so a drag from it moves the sheet); a tap on it cycles the height.
      onStartShouldSetPanResponder: () => onHandle,
      onMoveShouldSetPanResponderCapture: (_, g) => {
        if (Math.abs(g.dy) < 6 || Math.abs(g.dy) < Math.abs(g.dx)) return false;
        if (stateRef.current !== 'expanded') return true;
        return g.dy > 0 && listY.current <= 0;
      },
      onPanResponderGrant: () => {
        height.stopAnimation();
        dragStart.current = current.current;
      },
      onPanResponderMove: (_, g) => {
        const { peek: p, expanded: e } = sizes.current;
        const raw = dragStart.current - g.dy;
        height.setValue(raw > e ? e + (raw - e) * 0.25 : raw < p ? p - (p - raw) * 0.25 : raw);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => {
        if (onHandle && Math.abs(g.dx) < 5 && Math.abs(g.dy) < 5) tapRef.current();
        else settleRef.current(g.vy);
      },
      onPanResponderTerminate: (_, g) => settleRef.current(g.vy),
    });
  const pan = useRef(makePan(false)).current;

  // Web: a wheel / trackpad scroll up from the top of the list lowers the sheet (the touch drag does the same).
  const sheetNode = useRef<any>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = sheetNode.current as HTMLElement | null;
    if (!el?.addEventListener) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < -4 && stateRef.current === 'expanded' && listY.current <= 0) {
        animateToRef.current('collapsed');
        e.preventDefault();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  const handlePan = useRef(makePan(true)).current;
  const tapRef = useRef(() => {});
  tapRef.current = () => animateTo(stateRef.current === 'peek' ? 'collapsed' : stateRef.current === 'collapsed' ? 'expanded' : 'collapsed');

  const reveal = height.interpolate({ inputRange: [peekHeight, peekHeight + 90], outputRange: [0, 1], extrapolate: 'clamp' });
  const radius = height.interpolate({ inputRange: [Math.max(full - 60, peekHeight + 1), Math.max(full, peekHeight + 2)], outputRange: [26, 0], extrapolate: 'clamp' });
  // The grip strip melts away as the sheet reaches the top, so the list sits right under the top bar.
  const gripRange = [Math.max(full - 70, peekHeight + 1), Math.max(full, peekHeight + 2)];
  const gripSpace = height.interpolate({ inputRange: gripRange, outputRange: [12, 0], extrapolate: 'clamp' });
  const gripOpacity = height.interpolate({ inputRange: gripRange, outputRange: [1, 0], extrapolate: 'clamp' });
  const gripHeight = height.interpolate({ inputRange: gripRange, outputRange: [4, 0], extrapolate: 'clamp' });
  const handleWidth = height.interpolate({ inputRange: [peekHeight, collapsed, Math.max(full, collapsed + 1)], outputRange: [48, 36, 28], extrapolate: 'clamp' });

  return (
    <Animated.View ref={sheetNode} style={[styles.sheet, NO_SELECT, { bottom: bottomInset, height, borderTopLeftRadius: radius, borderTopRightRadius: radius }]} {...pan.panHandlers}>
      <Animated.View style={[styles.handleArea, { paddingVertical: gripSpace }]} {...handlePan.panHandlers} accessibilityLabel="Sheet handle">
        <Animated.View style={[styles.handle, { width: handleWidth, height: gripHeight, opacity: gripOpacity }]} />
      </Animated.View>
      <View style={styles.flex1}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: reveal.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]} pointerEvents={state === 'peek' ? 'auto' : 'none'}>
          {peek}
        </Animated.View>
        <Animated.View style={[styles.flex1, { opacity: reveal }]} pointerEvents={state === 'peek' ? 'none' : 'auto'}>
          {children({
            state,
            reveal,
            scrollRef,
            onScroll: (y) => {
              listY.current = y;
              // Scrolling the list with a wheel / trackpad opens the sheet fully (web).
              if (y > 2 && stateRef.current !== 'expanded') animateTo('expanded');
            },
          })}
        </Animated.View>
      </View>
    </Animated.View>
  );
};

// Dragging over text on the web would select it and cancel the drag.
const NO_SELECT = (Platform.OS === 'web' ? { userSelect: 'none' } : {}) as ViewStyle;

// White in light mode (like the other tabs' sheets), the body colour in dark mode.
const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.18,
      shadowRadius: 18,
      elevation: 14,
    },
    handleArea: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 12, flexShrink: 0 },
    handle: { height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder },
  })
);
