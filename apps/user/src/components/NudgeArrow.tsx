import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { Colors, FONTS, themedStyles } from '@ongarage/shared';

/** The bare "›" that opens a whole list, nudging to the right and back like the arrow on the main services strip. */
export const NudgeArrow: React.FC = () => {
  const nudge = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(nudge, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(nudge, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [nudge]);
  return (
    <Animated.View style={[styles.box, { opacity: nudge.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }), transform: [{ translateX: nudge.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }) }] }]}>
      <Text style={styles.arrow}>›</Text>
    </Animated.View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    box: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
    arrow: { fontSize: 40, lineHeight: 40, color: Colors.primary, fontFamily: FONTS.bodyRegular, fontWeight: '200', marginTop: -4 },
  })
);
