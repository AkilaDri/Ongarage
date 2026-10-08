import React, { useCallback, useRef } from 'react';
import { Animated, type NativeScrollEvent, type NativeSyntheticEvent, StyleSheet } from 'react-native';
import { getThemeMode } from '../theme/colors';
import { Gradient } from './Visuals';

// A soft fall-off under a pinned block, so the content reads as passing beneath it: a shadow on white,
// a faint sky-blue glow on dark (a shadow would not show there).
const stops = () =>
  getThemeMode() === 'dark'
    ? [{ offset: '0', color: '#38bdf8', opacity: 0.2 }, { offset: '1', color: '#38bdf8', opacity: 0 }]
    : [{ offset: '0', color: '#0f172a', opacity: 0.16 }, { offset: '1', color: '#0f172a', opacity: 0 }];

/** Put inside a pinned (sticky) block; `progress` goes 0 to 1 as the block pins, which fades the edge in. */
export const PinnedEdge: React.FC<{ progress: Animated.Value }> = ({ progress }) => (
  <Animated.View style={[styles.edge, { opacity: progress }]} pointerEvents="none">
    <Gradient vertical stops={stops()} />
  </Animated.View>
);

/**
 * For a bar that sits above a ScrollView: spread `scrollProps` on the ScrollView, put `<PinnedEdge progress={progress} />`
 * inside the bar, and give the bar a higher zIndex than the list. The edge fades in as content starts to scroll under it.
 */
export function usePinnedEdge() {
  const progress = useRef(new Animated.Value(0)).current;
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => progress.setValue(Math.min(1, Math.max(0, e.nativeEvent.contentOffset.y / 24))),
    [progress]
  );
  return { progress, scrollProps: { onScroll, scrollEventThrottle: 16 } };
}

const styles = StyleSheet.create({
  edge: { position: 'absolute', left: 0, right: 0, bottom: -22, height: 22, zIndex: 5 },
});
