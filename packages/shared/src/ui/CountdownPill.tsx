import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { getThemeMode } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import { countdown } from '../utils/format';
import { TimeClock } from './TimeClock';

const native = Platform.OS !== 'web';
const two = (n: number) => String(n).padStart(2, '0');
/** The time left with its seconds, whatever its size: 3h 20m 05s. */
const withSeconds = (ms: number) => {
  if (ms <= 0) return countdown(ms);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return h > 0 ? `${h}h ${two(m)}m ${two(sec)}s` : `${two(m)}m ${two(sec)}s`;
};
const dark = () => getThemeMode() === 'dark';

// The colours of the countdown pill (Google's green / amber / red, softened in the dark theme).
const TONES = {
  ok: { ink: () => (dark() ? '#81c995' : '#0d652d'), bg: () => (dark() ? 'rgba(129, 201, 149, 0.18)' : '#ceead6'), edge: () => (dark() ? 'rgba(129, 201, 149, 0.5)' : '#81c995') },
  soon: { ink: () => (dark() ? '#fdd663' : '#8a4b00'), bg: () => (dark() ? 'rgba(253, 214, 99, 0.18)' : '#fde293'), edge: () => (dark() ? 'rgba(253, 214, 99, 0.5)' : '#f9ab00') },
  urgent: { ink: () => (dark() ? '#f28b82' : '#a50e0e'), bg: () => (dark() ? 'rgba(242, 139, 130, 0.18)' : '#fad2cf'), edge: () => (dark() ? 'rgba(242, 139, 130, 0.5)' : '#ee675c') },
};

/**
 * The time left on a bid or a direct request: a big tinted pill with a clock whose hands show the time left. It is green while there is
 * time, amber under 2 hours and red under 30 minutes, and in those last two a soft ring pulses around it to draw the eye.
 */
export const CountdownPill: React.FC<{ ms: number; urgent: boolean; small?: boolean }> = ({ ms, urgent, small }) => {
  const level = urgent ? 'urgent' : ms < 2 * 60 * 60 * 1000 ? 'soon' : 'ok';
  const tone = TONES[level];
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (level === 'ok') {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: level === 'urgent' ? 1100 : 1900, easing: Easing.out(Easing.quad), useNativeDriver: native }));
    loop.start();
    return () => loop.stop();
  }, [level, pulse]);

  return (
    <View style={styles.wrap} accessibilityLabel={`Time left ${withSeconds(ms)}`}>
      {level !== 'ok' && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            { borderColor: tone.edge(), opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }), transform: [{ scaleX: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] }) }, { scaleY: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }] },
          ]}
        />
      )}
      <View style={[styles.pill, small && styles.pillSmall, { backgroundColor: tone.bg(), borderColor: tone.edge() }]}>
        <TimeClock ms={ms} size={small ? 10 : 14} color={tone.ink()} />
        <Text style={[styles.time, small && styles.timeSmall, { color: tone.ink() }]}>{withSeconds(ms)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { ...StyleSheet.absoluteFill, borderRadius: 14, borderWidth: 1.5 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 24, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1 },
  pillSmall: { height: 18, paddingHorizontal: 6, gap: 3, borderRadius: 9 },
  timeSmall: { fontSize: 10 },
  time: { fontSize: 11.5, fontFamily: FONTS.titleBold, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
