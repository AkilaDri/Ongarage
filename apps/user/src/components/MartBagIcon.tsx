import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { navIconTones as tones } from '@ongarage/shared';

/** Brushed-metal fill shared by the spare parts. */
const MetalDefs: React.FC<{ id: string }> = ({ id }) => (
  <Defs>
    <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <Stop offset="0" stopColor="#f8fafc" />
      <Stop offset="0.5" stopColor="#b6c2d1" />
      <Stop offset="1" stopColor="#7b8ba1" />
    </LinearGradient>
  </Defs>
);

/** A cog: eight teeth round a ring with a dark hub. */
const Gear: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <MetalDefs id="partMetalGear" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <Rect key={a} x={10.2} y={1.2} width={3.6} height={5} rx={0.9} fill="url(#partMetalGear)" transform={`rotate(${a} 12 12)`} />
    ))}
    <Circle cx={12} cy={12} r={7.4} fill="url(#partMetalGear)" />
    <Circle cx={12} cy={12} r={3.1} fill="#2b3350" />
    <Circle cx={12} cy={12} r={1.3} fill="#8fa0b8" />
  </Svg>
);

/** An open-ended spanner. */
const Wrench: React.FC<{ width: number; height: number }> = ({ width, height }) => (
  <Svg width={width} height={height} viewBox="0 0 12 22">
    <MetalDefs id="partMetalWrench" />
    <Rect x={4.6} y={7} width={2.8} height={14} rx={1.4} fill="url(#partMetalWrench)" />
    <Circle cx={6} cy={5.2} r={4.2} fill="url(#partMetalWrench)" />
    <Rect x={4.9} y={0.4} width={2.2} height={4.4} rx={0.4} fill="#2b3350" />
  </Svg>
);

/** A spark plug: ceramic body, metal cap and thread. */
const SparkPlug: React.FC<{ width: number; height: number }> = ({ width, height }) => (
  <Svg width={width} height={height} viewBox="0 0 8 18">
    <MetalDefs id="partMetalPlug" />
    <Rect x={2.8} y={0} width={2.4} height={3} rx={0.8} fill="url(#partMetalPlug)" />
    <Rect x={1.8} y={2.6} width={4.4} height={7} rx={1.2} fill="#fdfdfd" />
    <Rect x={1.8} y={2.6} width={1.3} height={7} rx={0.6} fill="#ffffff" opacity={0.7} />
    <Rect x={1.2} y={9.4} width={5.6} height={2.4} rx={0.6} fill="url(#partMetalPlug)" />
    <Rect x={2.2} y={11.8} width={3.6} height={5} rx={0.5} fill="#8fa0b8" />
    <Path d="M2.2 13.2h3.6M2.2 14.6h3.6M2.2 16h3.6" stroke="#5f6f87" strokeWidth={0.5} />
  </Svg>
);

/**
 * The OnMart tab icon: a glossy 3D shopping bag in its own warm colours with vehicle spare parts (a cog, a spanner and a
 * spark plug) sticking out of it. The cog turns, the spanner and plug bob, the bag sways every few seconds, a spark
 * twinkles at its corner and the whole icon hops when it becomes the selected tab. NavIcons.tsx is generated from the
 * designer's SVGs, so this one lives on its own.
 */
const MartBag: React.FC<{ active: boolean; size: number }> = ({ active, size }) => {
  const c = tones(active);
  const sway = useRef(new Animated.Value(0)).current;
  const spark = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0.6, duration: 340, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sway, { toValue: -0.3, duration: 300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.delay(2600),
      ])
    );
    const sparkLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(spark, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(spark, { toValue: 0, duration: 700, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.delay(1600),
      ])
    );
    const spinLoop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: true }));
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const loops = [swayLoop, sparkLoop, spinLoop, bobLoop];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [sway, spark, spin, bob]);

  useEffect(() => {
    if (!active) return;
    hop.setValue(0);
    Animated.sequence([
      Animated.timing(hop, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(hop, { toValue: 0, friction: 4, tension: 160, useNativeDriver: true }),
    ]).start();
  }, [active, hop]);

  const pivot = size * 0.3;
  const abs = { position: 'absolute' as const };
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        transform: [{ translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }, { scale: hop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
      }}
    >
      <Animated.View
        style={{
          width: size,
          height: size,
          // Swings from the top of the bag, not the middle.
          transform: [{ translateY: -pivot }, { rotate: sway.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] }) }, { translateY: pivot }],
        }}
      >
        {/* the spare parts, behind the front of the bag so only their tops show */}
        <Animated.View style={[abs, { left: size * 0.02, top: size * 0.02, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
          <Gear size={size * 0.56} />
        </Animated.View>
        <Animated.View style={[abs, { left: size * 0.6, top: 0, transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [1.2, -1.6] }) }, { rotate: '18deg' }] }]}>
          <Wrench width={size * 0.36} height={size * 0.66} />
        </Animated.View>
        <Animated.View style={[abs, { left: size * 0.4, top: size * 0.04, transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [-1.4, 1.2] }) }, { rotate: '-8deg' }] }]}>
          <SparkPlug width={size * 0.2} height={size * 0.5} />
        </Animated.View>

        {/* the glossy 3D bag in front */}
        <Svg width={size} height={size} viewBox="0 0 24 24" style={abs}>
          <Defs>
            <LinearGradient id="martBody" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#ffb547" />
              <Stop offset="0.55" stopColor="#ff6a4d" />
              <Stop offset="1" stopColor="#e0245e" />
            </LinearGradient>
            <LinearGradient id="martSide" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#9b1b4b" stopOpacity="0" />
              <Stop offset="1" stopColor="#7a1040" stopOpacity="0.55" />
            </LinearGradient>
            <LinearGradient id="martTag" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#ffffff" />
              <Stop offset="1" stopColor="#ffe0ec" />
            </LinearGradient>
          </Defs>
          <Ellipse cx={12} cy={22.7} rx={7.4} ry={1} fill="#000000" opacity={0.22} />
          <Path d="M2.8 11.6h18.4l-1.4 9a2.4 2.4 0 0 1-2.4 2H6.6a2.4 2.4 0 0 1-2.4-2z" fill="url(#martBody)" />
          <Path d="M2.8 11.6h18.4l-1.4 9a2.4 2.4 0 0 1-2.4 2H6.6a2.4 2.4 0 0 1-2.4-2z" fill="url(#martSide)" />
          <Path d="M2.8 11.6h18.4l-.3 2.2H3.1z" fill="#ffffff" opacity={0.38} />
          <Path d="M5.6 15.2l-.6 5" stroke="#ffffff" strokeWidth={1.2} strokeLinecap="round" opacity={0.45} />
          <Rect x={8.4} y={15.6} width={7.2} height={4.2} rx={1.5} fill="url(#martTag)" />
          <Circle cx={12} cy={17.7} r={1.1} fill="#e0245e" />
        </Svg>
      </Animated.View>
      <Animated.Text
        pointerEvents="none"
        style={[
          styles.spark,
          { color: c.accent, opacity: spark, transform: [{ scale: spark.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.15] }) }, { rotate: spark.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] },
        ]}
      >
        ✦
      </Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  spark: { position: 'absolute', top: -5, right: -5, fontSize: 11 },
});

/** The OnMart icon is drawn at the same size as the other tab icons (raise this above 1 to make it grow upward). */
const SCALE = 1;

export const MartIcon: React.FC<{ active: boolean; size?: number }> = ({ active, size = 26 }) => {
  const big = Math.round(size * SCALE);
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', width: big, height: big, left: -(big - size) / 2, top: -(big - size) * 0.85 }}>
        <MartBag active={active} size={big} />
      </View>
    </View>
  );
};
