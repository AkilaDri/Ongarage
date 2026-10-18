import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

const native = Platform.OS !== 'web';

/**
 * A small clock that shows the time left: its hands stand where the remaining time puts them (hours on the short hand,
 * minutes on the long one, seconds on the thin one) and keep moving as the time runs down, a little each second, so the
 * dial turns backwards with the countdown. A bid with hours left and one with minutes left look different at a glance.
 */
export const TimeClock: React.FC<{ ms: number; size?: number; color: string }> = ({ ms, size = 16, color }) => {
  const seconds = Math.max(0, ms) / 1000;
  // Degrees on an ordinary dial: 12 hours / 60 minutes / 60 seconds a turn. The angles are not wrapped, so a hand never
  // spins back through a full turn when it passes 12.
  const target = { hour: (seconds / 43200) * 360, minute: (seconds / 3600) * 360, second: (seconds / 60) * 360 };
  const hour = useRef(new Animated.Value(target.hour)).current;
  const minute = useRef(new Animated.Value(target.minute)).current;
  const second = useRef(new Animated.Value(target.second)).current;

  useEffect(() => {
    // Glide to the new position over the second that has just passed.
    const move = (value: Animated.Value, to: number) => Animated.timing(value, { toValue: to, duration: 950, easing: Easing.linear, useNativeDriver: native });
    const run = Animated.parallel([move(hour, target.hour), move(minute, target.minute), move(second, target.second)]);
    run.start();
    return () => run.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(seconds)]);

  const inner = size - 4; // inside the 2px rim
  const hand = (angle: Animated.Value, length: number, width: number, tint: string) => (
    <Animated.View
      pointerEvents="none"
      style={[styles.arm, { width: inner, height: inner, transform: [{ rotate: angle.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1deg'] }) }] }]}
    >
      <View style={{ width, height: length, borderRadius: width / 2, backgroundColor: tint, marginTop: inner / 2 - length }} />
    </Animated.View>
  );

  return (
    <View style={[styles.face, { width: size, height: size, borderRadius: size / 2, borderColor: color }]} accessibilityElementsHidden>
      {hand(hour, inner * 0.3, 1.8, color)}
      {hand(minute, inner * 0.45, 1.4, color)}
      {hand(second, inner * 0.47, 0.9, color)}
      <View style={[styles.pin, { backgroundColor: color }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  face: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  arm: { position: 'absolute', alignItems: 'center' },
  pin: { width: 2.5, height: 2.5, borderRadius: 1.5 },
});
