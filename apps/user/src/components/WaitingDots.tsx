import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

/**
 * Three dots that light up one after another and start again: "waiting for an answer". It is for a booking the garage has not answered yet.
 * The beat is read from the clock on every frame, so it never stalls and every waiting card beats together.
 */
export const WaitingDots: React.FC<{ color: string }> = ({ color }) => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      t.setValue((Date.now() % 1500) / 1500);
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [t]);
  return (
    <View style={styles.row} accessibilityLabel="Waiting">
      {[0, 1, 2].map((i) => {
        // Each dot swells and brightens in its own third of the beat.
        const a = i / 3;
        const input = [0, a, a + 0.16, a + 0.33, 1].map((x) => Math.min(1, x));
        const scale = t.interpolate({ inputRange: dedupe(input), outputRange: dedupe(input).map((x) => (x === a + 0.16 ? 1.5 : 1)) });
        const opacity = t.interpolate({ inputRange: dedupe(input), outputRange: dedupe(input).map((x) => (x === a + 0.16 ? 1 : 0.35)) });
        return <Animated.View key={i} style={[styles.dot, { backgroundColor: color, opacity, transform: [{ scale }] }]} />;
      })}
    </View>
  );
};

/** Interpolation inputs must rise strictly: drop repeats (a dot whose third ends at the end of the beat). */
const dedupe = (xs: number[]) => xs.filter((x, i) => i === 0 || x > xs[i - 1]);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 26 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
