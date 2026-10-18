import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, Vibration, View } from 'react-native';
import { getThemeMode, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';

/** Seconds since `since`, ticking every second (m:ss for the bar). */
export const useElapsed = (since: number) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  return { seconds: s, text: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` };
};

/**
 * A bar that stays on screen, whatever the user is doing, until the thing it is about is answered: 'urgent' pulses red and shakes the phone every few seconds
 * (a decision that someone in an emergency is waiting for), 'waiting' glows amber (the user waits for someone else). `since` shows how long it has waited.
 */
export const UrgentBar: React.FC<{ tone: 'urgent' | 'waiting'; since: number; title: string; children?: React.ReactNode; actions?: React.ReactNode; buzzEveryMs?: number }> = ({
  tone,
  since,
  title,
  children,
  actions,
  buzzEveryMs = 12000,
}) => {
  const pulse = useRef(new Animated.Value(0)).current;
  const { text } = useElapsed(since);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: tone === 'urgent' ? 450 : 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: tone === 'urgent' ? 450 : 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, tone]);

  // A phone buzz now and then while it waits (native only; the web has no vibration).
  useEffect(() => {
    if (tone !== 'urgent' || Platform.OS === 'web') return;
    Vibration.vibrate([0, 350, 150, 350]);
    const t = setInterval(() => Vibration.vibrate([0, 350, 150, 350]), buzzEveryMs);
    return () => {
      clearInterval(t);
      Vibration.cancel();
    };
  }, [tone, buzzEveryMs]);

  const base = tone === 'urgent' ? '#b3261e' : '#b06000';
  const bright = tone === 'urgent' ? '#ef4444' : '#f59e0b';
  const bg = pulse.interpolate({ inputRange: [0, 1], outputRange: [base, bright] });

  return (
    <Animated.View style={[styles.bar, { backgroundColor: bg }]} accessibilityRole="alert" accessibilityLabel={title}>
      <View style={styles.head}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <View style={styles.timer}>
          <Text style={styles.timerText}>⏱ {text}</Text>
        </View>
      </View>
      {!!children && <Text style={styles.text}>{children}</Text>}
      {!!actions && <View style={styles.actions}>{actions}</View>}
    </Animated.View>
  );
};

/** A button on the bar. */
export const UrgentBarButton: React.FC<{ label: string; onPress: () => void; primary?: boolean }> = ({ label, onPress, primary }) => (
  <Text onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[styles.btn, primary && styles.btnPrimary]}>
    {label}
  </Text>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    bar: { gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: getThemeMode() === 'dark' ? 0.5 : 0.3, shadowRadius: 8, elevation: 10 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { flex: 1, fontSize: 13.5, fontFamily: FONTS.bodyBold, color: '#ffffff', lineHeight: 19 },
    timer: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.28)' },
    timerText: { fontSize: 12, fontFamily: FONTS.titleBold, color: '#ffffff' },
    text: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: 'rgba(255,255,255,0.92)', lineHeight: 17 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
    btn: { overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: FONTS.bodySemiBold, color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.12)' },
    btnPrimary: { backgroundColor: '#ffffff', color: '#202124', borderColor: '#ffffff' },
  })
);
