import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { getThemeMode, themedStyles } from '../../theme/colors';
import { FONTS } from '../../theme/fonts';
import { Icon } from '../Icons';

const GREEN = () => (getThemeMode() === 'dark' ? '#81c995' : '#188038');

/**
 * The call button in a chat's app bar: a green pill whose phone icon rings now and then (it shakes side to side a few
 * times, then rests) while a soft ring breathes out from the pill, so it is easy to find. A tap opens the dialler.
 */
export const CallPill: React.FC<{ phone: string; label?: string; accessibilityLabel?: string; /** Called when the call is placed (the chat writes it into the conversation). */ onCall?: () => void }> = ({ phone, label = 'අමතන්න', accessibilityLabel = 'Call', onCall }) => {
  const ring = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // The icon rings: four quick shakes, then a pause.
    const shake = Animated.loop(
      Animated.sequence([
        Animated.timing(ring, { toValue: 1, duration: 90, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(ring, { toValue: -1, duration: 150, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(ring, { toValue: 1, duration: 150, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(ring, { toValue: -1, duration: 150, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(ring, { toValue: 0, duration: 90, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(1500),
      ])
    );
    // A ring grows out of the pill and fades, in step with the rest between the shakes.
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(halo, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(800),
      ])
    );
    shake.start();
    breathe.start();
    return () => {
      shake.stop();
      breathe.stop();
    };
  }, [ring, halo]);

  const rotate = ring.interpolate({ inputRange: [-1, 1], outputRange: ['-22deg', '22deg'] });
  return (
    <Pressable onPress={() => {
        onCall?.();
        Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
      }} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      <View style={styles.wrap}>
        <Animated.View
          pointerEvents="none"
          style={[styles.halo, { opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }), transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }] }]}
        />
        <View style={styles.pill}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Icon name="phone" size={22} color={GREEN()} />
          </Animated.View>
          <Text style={styles.text}>{label}</Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { alignItems: 'center', justifyContent: 'center' },
    halo: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 21, backgroundColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.45)' : 'rgba(24, 128, 56, 0.28)' },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 16, borderRadius: 21, backgroundColor: getThemeMode() === 'dark' ? '#1d3326' : '#e6f4ea', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.3)' : '#ceead6' },
    text: { fontSize: 15, fontFamily: FONTS.bodySemiBold, color: GREEN() },
  })
);
