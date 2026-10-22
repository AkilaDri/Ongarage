import { CategoryArt } from './CategoryArt';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';

const native = Platform.OS !== 'web';

/**
 * Shown on a job card when the customer attached no photo: a soft media area with the
 * service's emoji floating over a pulsing ring and a light sweep, so the card never has a gap.
 */
export const NoPhotoAnimation: React.FC<{ emoji: string; height?: number }> = ({ emoji, height = 104 }) => {
  const float = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = React.useState(0);

  useEffect(() => {
    const loops = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(float, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
          Animated.timing(float, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        ])
      ),
      Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: native })),
      Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.quad), useNativeDriver: native })),
    ];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [float, pulse, sweep]);

  return (
    <View style={[styles.box, { height }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityLabel="No photos from the customer">
      {/* a light band sweeping across */}
      <Animated.View
        pointerEvents="none"
        style={[styles.sweep, { transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-80, width + 80] }) }, { skewX: '-18deg' }] }]}
      />
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.ring,
            { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.9] }) }] },
          ]}
        />
        <Animated.View style={[styles.disc, { transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [3, -5] }) }] }]}>
          <CategoryArt emoji={emoji} size={40} />
        </Animated.View>
      </View>
      <Text style={styles.caption}>පාරිභෝගිකයා ඡායාරූප එවා නැත</Text>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    box: {
      borderRadius: 8,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#e8f0fe',
    },
    sweep: { position: 'absolute', top: 0, bottom: 0, width: 60, backgroundColor: getThemeMode() === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.55)' },
    center: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
    ring: { position: 'absolute', width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: Colors.primary },
    disc: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard },
    emoji: { fontSize: 24 },
    caption: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
  })
);
