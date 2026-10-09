import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { themedStyles } from '@ongarage/shared';

export type Period = 'day' | 'evening' | 'night';
export const periodOf = (hour: number): Period => (hour >= 5 && hour < 17 ? 'day' : hour >= 17 && hour < 20 ? 'evening' : 'night');
export const SKY: Record<Period, string> = { day: '#a9dcf7', evening: '#f8b878', night: '#10213f' };

/** Runs `value` 0 → 1 forever, starting part-way through (so clouds don't all begin at the same spot). */
const loopFrom = (value: Animated.Value, start: number, duration: number, easing = Easing.linear) => {
  value.setValue(start);
  const run = Animated.loop(Animated.timing(value, { toValue: 1, duration, easing, useNativeDriver: true }), { resetBeforeIteration: true });
  const first = Animated.timing(value, { toValue: 1, duration: duration * (1 - start), easing, useNativeDriver: true });
  first.start(({ finished }) => finished && run.start());
  return () => {
    first.stop();
    run.stop();
  };
};

const pingPong = (value: Animated.Value, duration: number) => {
  const run = Animated.loop(
    Animated.sequence([
      Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])
  );
  run.start();
  return () => run.stop();
};

/**
 * The sky behind the whole greeting band (it fills its parent). Daytime: the sun with clouds drifting sideways.
 * Evening: the sun slowly sinking behind the horizon while clouds drift. Night: a moon, twinkling stars and a few
 * dim clouds.
 */
const WeatherAnimation: React.FC<{ hour: number; bodyRight?: number }> = ({ hour, bodyRight = 168 }) => {
  const period = periodOf(hour);
  const [width, setWidth] = useState(360);
  const cloudA = useRef(new Animated.Value(0)).current;
  const cloudB = useRef(new Animated.Value(0)).current;
  const cloudC = useRef(new Animated.Value(0)).current;
  const sun = useRef(new Animated.Value(0)).current;
  const twinkleA = useRef(new Animated.Value(0)).current;
  const twinkleB = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const stops = [loopFrom(cloudA, 0, 26000), loopFrom(cloudB, 0.5, 38000), loopFrom(cloudC, 0.8, 32000)];
    if (period === 'evening') stops.push(loopFrom(sun, 0, 16000, Easing.inOut(Easing.quad)));
    if (period === 'day') stops.push(pingPong(sun, 3500));
    if (period === 'night') stops.push(pingPong(twinkleA, 1100), pingPong(twinkleB, 1700), pingPong(bob, 2600));
    return () => stops.forEach((stop) => stop());
  }, [period, cloudA, cloudB, cloudC, sun, twinkleA, twinkleB, bob]);

  const drift = (v: Animated.Value) => ({ transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-48, width + 8] }) }] });
  const cloudOpacity = period === 'night' ? 0.3 : 0.6;
  const twinkle = (v: Animated.Value, from: number, to: number) => v.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

  return (
    <Animated.View
      style={[styles.sky, { backgroundColor: SKY[period] }]}
      pointerEvents="none"
      accessibilityLabel={`Sky: ${period}`}
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
    >
      {period === 'day' && (
        <Animated.Text style={[styles.sun, { right: bodyRight, transform: [{ scale: twinkle(sun, 1, 1.12) }, { rotate: sun.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '8deg'] }) }] }]}>☀️</Animated.Text>
      )}
      {period === 'evening' && (
        <>
          <Animated.Text style={[styles.sun, { right: bodyRight, transform: [{ translateY: twinkle(sun, 0, 64) }] }]}>☀️</Animated.Text>
          <Animated.View style={styles.horizon} />
        </>
      )}
      {period === 'night' && (
        <>
          <Animated.Text style={[styles.moon, { right: bodyRight + 2, transform: [{ translateY: twinkle(bob, 0, -4) }] }]}>🌙</Animated.Text>
          <Animated.Text style={[styles.star, { left: '12%', top: 14, opacity: twinkle(twinkleA, 0.25, 1) }]}>✦</Animated.Text>
          <Animated.Text style={[styles.star, { left: '38%', top: 58, fontSize: 9, opacity: twinkle(twinkleB, 1, 0.2) }]}>✦</Animated.Text>
          <Animated.Text style={[styles.star, { left: '56%', top: 22, fontSize: 8, opacity: twinkle(twinkleA, 1, 0.3) }]}>✦</Animated.Text>
          <Animated.Text style={[styles.star, { left: '80%', top: 70, fontSize: 9, opacity: twinkle(twinkleB, 0.3, 1) }]}>✦</Animated.Text>
        </>
      )}
      <Animated.Text style={[styles.cloud, { top: 34, opacity: cloudOpacity }, drift(cloudA)]}>☁️</Animated.Text>
      <Animated.Text style={[styles.cloud, styles.cloudSmall, { top: 8, opacity: cloudOpacity }, drift(cloudB)]}>☁️</Animated.Text>
      <Animated.Text style={[styles.cloud, styles.cloudSmall, { top: 62, opacity: cloudOpacity * 0.8 }, drift(cloudC)]}>☁️</Animated.Text>
    </Animated.View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    sky: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
    sun: { position: 'absolute', right: 168, top: 10, fontSize: 40 },
    moon: { position: 'absolute', right: 170, top: 12, fontSize: 36 },
    star: { position: 'absolute', fontSize: 12, color: '#ffffff' },
    cloud: { position: 'absolute', left: 0, fontSize: 34 },
    cloudSmall: { fontSize: 24 },
    horizon: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 26, backgroundColor: '#7a3b2e' },
  })
);

export default WeatherAnimation;

/** Text colours that read on the sky of the given period (light sky by day and evening, dark at night), in either theme. */
export const skyInk = (period: Period) =>
  period === 'night' ? { main: '#e6f3fc', sub: '#a9cbe6' } : { main: '#0f2a3d', sub: '#2b4a63' };
