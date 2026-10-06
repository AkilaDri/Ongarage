import React, { useEffect, useId, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Pattern, Rect, Stop } from 'react-native-svg';

/** A colour stop; opacity (0–1) lets a gradient fade to transparent, e.g. a shade over a photo. */
type GradientStop = { offset: string; color: string; opacity?: number };

// CSS "linear-gradient(135deg, ...)" rendered behind the parent's children.
// Parent must set overflow: 'hidden' + borderRadius for rounded corners.
export const Gradient: React.FC<{ stops: GradientStop[]; vertical?: boolean }> = ({
  stops,
  vertical,
}) => {
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2={vertical ? '0' : '1'} y2="1">
          {stops.map((s) => (
            <Stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity ?? 1} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
};

export const GRADIENTS = {
  sos: [
    { offset: '0', color: '#f43f5e' },
    { offset: '0.5', color: '#dc2626' },
    { offset: '1', color: '#991b1b' },
  ],
  cta: [
    { offset: '0', color: '#f59e0b' },
    { offset: '1', color: '#d97706' },
  ],
  issue: [
    { offset: '0', color: '#0ea5e9' },
    { offset: '1', color: '#2563eb' },
  ],
  bid: [
    { offset: '0', color: '#1e3a8a' },
    { offset: '1', color: '#172554' },
  ],
  brand: [
    { offset: '0', color: '#10b981' },
    { offset: '1', color: '#059669' },
  ],
  slate: [
    { offset: '0', color: '#1e293b' },
    { offset: '1', color: '#0f172a' },
  ],
  sosHeader: [
    { offset: '0', color: '#7f1d1d' },
    { offset: '1', color: '#450a0a' },
  ],
};

// CSS "radial-gradient(color 1.5px, transparent 1.5px)" dot-grid map background.
export const DotGrid: React.FC<{ color: string; spacing: number; radius?: number; opacity: number }> = ({
  color,
  spacing,
  radius = 1.5,
  opacity,
}) => {
  const id = `d${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg style={[StyleSheet.absoluteFill, { opacity }]} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <Pattern id={id} width={spacing} height={spacing} patternUnits="userSpaceOnUse">
          <Circle cx={spacing / 2} cy={spacing / 2} r={radius} fill={color} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
};

// CSS "@keyframes pulse": scale 0.95 → 1.4 → 0.95, opacity 0.8 → 1 → 0.8 over 1.5s.
export const Pulse: React.FC<{ style?: StyleProp<ViewStyle>; maxScale?: number; children?: React.ReactNode }> = ({
  style,
  maxScale = 1.4,
  children,
}) => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }),
          transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.95, maxScale] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};
