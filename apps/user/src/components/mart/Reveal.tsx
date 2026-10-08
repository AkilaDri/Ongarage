import React, { useEffect, useRef } from 'react';
import { Animated, Easing, type LayoutChangeEvent, StyleSheet } from 'react-native';

/** Fades a landing-page section in and lifts it a little as the page opens, a beat after the one above it. */
export const Reveal: React.FC<{ delay?: number; onLayout?: (e: LayoutChangeEvent) => void; children: React.ReactNode }> = ({ delay = 0, onLayout, children }) => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 380, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [t, delay]);
  return (
    <Animated.View onLayout={onLayout} style={[styles.wrap, { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({ wrap: { gap: 8 } });
