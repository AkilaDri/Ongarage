import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

/**
 * A count in a round tag that reacts when the number changes: the tag pops up (swells and settles back with a spring) and a ring spreads out from it
 * and fades, so a new bid, a status change or a finished job is noticed. The first time it is drawn it stays still.
 */
export const PopCount: React.FC<{ value: number; style: StyleProp<ViewStyle>; textStyle: StyleProp<TextStyle>; ringColor?: string }> = ({ value, style, textStyle, ringColor = '#1a73e8' }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    scale.setValue(0.6);
    ring.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 3, tension: 190, useNativeDriver: true }),
      Animated.timing(ring, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [value, scale, ring]);

  return (
    <View style={style} pointerEvents="none">
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.ring, { borderColor: ringColor, opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }), transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 2.3] }) }] }]}
      />
      <Animated.View style={{ transform: [{ scale }] }}>
        <Text style={textStyle}>{value}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  ring: { borderWidth: 2, borderRadius: 999 },
});
