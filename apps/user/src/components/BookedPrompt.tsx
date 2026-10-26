import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';

/** How long the message stays before it goes by itself (ms). */
const STAY_MS = 9000;

/**
 * What the owner sees right after sending a booking request: a short message that it went off, and under it a chip that opens the Activity tab. Nothing
 * navigates by itself any more; the owner decides whether to go and look. It slides up above the tab bar and goes after a few seconds.
 */
export const BookedPrompt: React.FC<{ garageName: string | null; onGo: () => void; onClose: () => void }> = ({ garageName, onGo, onClose }) => {
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!garageName) return;
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const t = setTimeout(onClose, STAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garageName]);
  if (!garageName) return null;
  return (
    <Animated.View style={[styles.wrap, { opacity: slide, transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]} accessibilityLabel="Booking sent">
      <View style={styles.card}>
        <View style={styles.top}>
          <View style={styles.tick}>
            <Text style={styles.tickText}>✓</Text>
          </View>
          <View style={styles.flex1}>
            <Text style={styles.title}>වෙන්කිරීම් ඉල්ලීම යැව්වා</Text>
            <Text style={styles.sub} numberOfLines={2}>
              {garageName} පැය 2ක් ඇතුළත පිළිතුරු දෙයි. දැන් ක්‍රියාකාරකම් වෙත ගොස් බලන්න.
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Dismiss">
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>
        <Pressable style={styles.chip} onPress={onGo} accessibilityLabel="Go to Activity">
          <Text style={styles.chipText}>ක්‍රියාකාරකම් වෙත යන්න ›</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

const dark = () => getThemeMode() === 'dark';

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    // Above the floating tab bar, across the page.
    wrap: { position: 'absolute', left: 14, right: 14, bottom: 100, zIndex: 80 },
    card: { padding: 14, borderRadius: 16, gap: 10, backgroundColor: dark() ? '#16233a' : '#ffffff', borderWidth: 1, borderColor: dark() ? 'rgba(141, 177, 255, 0.25)' : '#d2e3fc', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 12 },
    top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    tick: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#16a34a' },
    tickText: { fontSize: 16, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    title: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17, marginTop: 1 },
    close: { fontSize: 15, color: Colors.textMuted },
    chip: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 18, backgroundColor: '#1a73e8' },
    chipText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  })
);
