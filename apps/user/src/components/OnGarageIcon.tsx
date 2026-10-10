import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/** A wheel: dark tyre, light hub and four spokes, so its turning shows. */
const Wheel: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20">
    <Circle cx={10} cy={10} r={9.5} fill="#16213f" />
    <Circle cx={10} cy={10} r={5.6} fill="#e8eefc" />
    <Line x1={10} y1={4.8} x2={10} y2={15.2} stroke="#16213f" strokeWidth={1.8} strokeLinecap="round" />
    <Line x1={4.8} y1={10} x2={15.2} y2={10} stroke="#16213f" strokeWidth={1.8} strokeLinecap="round" />
    <Circle cx={10} cy={10} r={1.8} fill="#16213f" />
  </Svg>
);

/**
 * The "back to OnGarage" tab inside OnMart: a modern app-style tile (blue to violet gradient with a soft top gloss) holding a
 * white car. The car idles forward and back with its wheels turning and its headlight glowing, speed lines trail it,
 * and a shine sweeps across the tile every few seconds.
 */
const TileBase: React.FC<{ size: number }> = ({ size }) => {
  const spin = useRef(new Animated.Value(0)).current;
  const idle = useRef(new Animated.Value(0)).current;
  const lines = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinLoop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 650, easing: Easing.linear, useNativeDriver: true }), { iterations: -1 });
    const idleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(idle, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(idle, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const linesLoop = Animated.loop(Animated.timing(lines, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }), { iterations: -1 });
    const shineLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(1800),
        Animated.timing(shine, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.35, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const loops = [spinLoop, idleLoop, linesLoop, shineLoop, glowLoop];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [spin, idle, lines, shine, glow]);

  const k = size / 24;
  const wheelSize = 4.6 * k;
  const turn = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const line = (top: number, delay: number) => ({
    position: 'absolute' as const,
    left: 2.2 * k,
    top: top * k,
    width: 3.2 * k,
    height: 1.1 * k,
    borderRadius: k,
    backgroundColor: 'rgba(255,255,255,0.85)',
    opacity: lines.interpolate({ inputRange: [0, delay, delay + 0.4, 1].map((v) => Math.min(1, v)), outputRange: [0, 0, 0.9, 0] }),
    transform: [{ translateX: lines.interpolate({ inputRange: [0, 1], outputRange: [2 * k, -3 * k] }) }],
  });

  return (
    <View style={{ width: size, height: size }}>
      {/* soft shadow under the tile */}
      <Svg width={size} height={size} viewBox="0 0 24 24" style={StyleSheet.absoluteFill}>
        <Ellipse cx={12} cy={22.9} rx={8.4} ry={1} fill="#000000" opacity={0.22} />
      </Svg>
      <View style={{ width: size, height: size * 0.94, borderRadius: size * 0.3, overflow: 'hidden' }}>
        <Svg width={size} height={size} viewBox="0 0 24 24" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="tileBg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#4f9dff" />
              <Stop offset="1" stopColor="#7b4dff" />
            </LinearGradient>
            <LinearGradient id="tileGloss" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={0.4} />
              <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={24} height={24} fill="url(#tileBg)" />
          <Rect x={0} y={0} width={24} height={11} fill="url(#tileGloss)" />
        </Svg>

        {/* the car, idling forward and back */}
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: idle.interpolate({ inputRange: [0, 1], outputRange: [-0.6 * k, 0.8 * k] }) }] }]}>
          {/* speed lines behind it */}
          <Animated.View style={line(11.2, 0)} />
          <Animated.View style={line(13.8, 0.2)} />
          <Animated.View style={line(16.2, 0.4)} />

          <Svg width={size} height={size} viewBox="0 0 24 24" style={StyleSheet.absoluteFill}>
            {/* lower body and cabin */}
            <Rect x={4.2} y={11.4} width={17.4} height={5} rx={2.2} fill="#ffffff" />
            <Path d="M7.4 11.4l2-3.4a1.7 1.7 0 0 1 1.45-.85h3.9a1.7 1.7 0 0 1 1.4.75l2.2 3.5z" fill="#ffffff" />
            {/* windows */}
            <Path d="M9 11l1.25-2.1h1.9V11z" fill="#5a7de8" opacity={0.65} />
            <Path d="M13.4 11V8.9h1.15L16.1 11z" fill="#5a7de8" opacity={0.65} />
            {/* a stripe along the door */}
            <Rect x={6.2} y={13.6} width={11.2} height={0.9} rx={0.45} fill="#7b8bd8" opacity={0.5} />
          </Svg>

          {/* the headlight glows */}
          <Animated.View
            style={{ position: 'absolute', left: 19.7 * k, top: 12.6 * k, width: 1.9 * k, height: 1.9 * k, borderRadius: k, backgroundColor: '#ffe066', opacity: glow, transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.35] }) }] }}
          />

          {/* the wheels turn */}
          <Animated.View style={{ position: 'absolute', left: 6.2 * k, top: 14.2 * k, width: wheelSize, height: wheelSize, transform: [{ rotate: turn }] }}>
            <Wheel size={wheelSize} />
          </Animated.View>
          <Animated.View style={{ position: 'absolute', left: 16.4 * k, top: 14.2 * k, width: wheelSize, height: wheelSize, transform: [{ rotate: turn }] }}>
            <Wheel size={wheelSize} />
          </Animated.View>
        </Animated.View>

        {/* a shine sweeps across the tile now and then */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -size * 0.2,
            width: size * 0.34,
            height: size * 1.5,
            backgroundColor: 'rgba(255,255,255,0.3)',
            transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.5, size * 1.2] }) }, { rotate: '22deg' }],
          }}
        />
      </View>
    </View>
  );
};

/** Drawn a little larger than the other tab icons (it sits in the middle of OnMart's bar and grows upward). */
const SCALE = 1.2;

export const OnGarageIcon: React.FC<{ active: boolean; size?: number }> = ({ size = 26 }) => {
  const big = Math.round(size * SCALE);
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', width: big, height: big, left: -(big - size) / 2, top: -(big - size) * 0.85 }}>
        <TileBase size={big} />
      </View>
    </View>
  );
};
