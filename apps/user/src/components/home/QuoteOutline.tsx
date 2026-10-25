import React from 'react';
import { Animated, StyleSheet } from 'react-native';

/**
 * The free-quotes card inside the blue Home card: a light solid tint, no border, no animation. `style` places it (and carries the scroll fade).
 */
export const QuoteOutline: React.FC<{ style?: object }> = ({ style }) => <Animated.View pointerEvents="none" style={[styles.box, style]} />;

const styles = StyleSheet.create({
  box: { borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.24)' },
});
