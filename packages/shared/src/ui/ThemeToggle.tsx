import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

const TRACK_W = 74;
const TRACK_H = 38;
const KNOB = 30;
const PAD = 4;

// Day ↔ night switch: the knob rolls across as a sun that becomes a moon,
// the sky darkens, the cloud drifts away and stars come out.
export const ThemeToggle: React.FC<{ isDark: boolean; onToggle: () => void }> = ({ isDark, onToggle }) => {
  const progress = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(progress, { toValue: isDark ? 1 : 0, stiffness: 180, damping: 18, mass: 1, useNativeDriver: false }).start();
  }, [isDark, progress]);

  const onPress = () => {
    Animated.sequence([
      Animated.timing(press, { toValue: 0.9, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.spring(press, { toValue: 1, friction: 4, tension: 160, useNativeDriver: false }),
    ]).start();
    onToggle();
  };

  const trackColor = progress.interpolate({ inputRange: [0, 1], outputRange: ['#7dd3fc', '#1e1b4b'] });
  const borderColor = progress.interpolate({ inputRange: [0, 1], outputRange: ['#38bdf8', '#4338ca'] });
  const knobColor = progress.interpolate({ inputRange: [0, 1], outputRange: ['#fbbf24', '#e2e8f0'] });
  const glow = progress.interpolate({ inputRange: [0, 1], outputRange: ['#f59e0b', '#a5b4fc'] });
  const knobX = progress.interpolate({ inputRange: [0, 1], outputRange: [PAD, TRACK_W - KNOB - PAD - 2] });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const stars = progress.interpolate({ inputRange: [0.4, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const cloud = progress.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' });
  const cloudX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });
  const craters = progress.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="switch" accessibilityState={{ checked: isDark }}>
      <Animated.View style={[styles.track, { backgroundColor: trackColor, borderColor, transform: [{ scale: press }] }]}>
        <Animated.View style={[styles.starsLayer, { opacity: stars }]} pointerEvents="none">
          <View style={[styles.star, { top: 8, left: 12 }]} />
          <View style={[styles.star, styles.starSmall, { top: 20, left: 22 }]} />
          <View style={[styles.star, { top: 11, left: 30 }]} />
          <View style={[styles.star, styles.starSmall, { top: 25, left: 8 }]} />
        </Animated.View>

        <Animated.View style={[styles.cloud, { opacity: cloud, transform: [{ translateX: cloudX }] }]} pointerEvents="none">
          <View style={[styles.puff, { width: 14, height: 14, left: 4, top: 4 }]} />
          <View style={[styles.puff, { width: 18, height: 18, left: 12, top: 0 }]} />
          <View style={[styles.puff, { width: 26, height: 10, left: 2, top: 10, borderRadius: 5 }]} />
        </Animated.View>

        <Animated.View
          style={[
            styles.knob,
            { backgroundColor: knobColor, shadowColor: glow, transform: [{ translateX: knobX }, { rotate }] },
          ]}
        >
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: craters }]} pointerEvents="none">
            <View style={[styles.crater, { width: 8, height: 8, top: 6, left: 15 }]} />
            <View style={[styles.crater, { width: 5, height: 5, top: 17, left: 8 }]} />
            <View style={[styles.crater, { width: 4, height: 4, top: 19, left: 19 }]} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    borderWidth: 1.5,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  starsLayer: { ...StyleSheet.absoluteFill },
  star: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#fff' },
  starSmall: { width: 2, height: 2, borderRadius: 1 },
  cloud: { position: 'absolute', right: 8, top: 9, width: 30, height: 20 },
  puff: { position: 'absolute', borderRadius: 10, backgroundColor: '#ffffff' },
  knob: {
    position: 'absolute',
    top: (TRACK_H - 3 - KNOB) / 2,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  crater: { position: 'absolute', borderRadius: 4, backgroundColor: 'rgba(100, 116, 139, 0.45)' },
});
