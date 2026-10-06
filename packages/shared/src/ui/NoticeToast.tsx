import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, getThemeMode, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import type { Notice } from '../types';

const SHOW_MS = 3800;

// Slides down from the top for events the user did not trigger themselves.
// topOffset: push below a screen header the toast should not cover.
export const NoticeToast: React.FC<{ notice: Notice | null; onDismiss: () => void; topOffset?: number }> = ({ notice, onDismiss: dismissNotice, topOffset = 8 }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!notice) return;
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, stiffness: 220, damping: 22, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(dismissNotice);
    }, SHOW_MS);
    return () => clearTimeout(t);
  }, [notice, anim, dismissNotice]);

  if (!notice) return null;
  const tone = { primary: Colors.primary, success: Colors.success, danger: Colors.error }[notice.tone] ?? Colors.primary;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { top: topOffset, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] },
      ]}
    >
      <Pressable style={[styles.card, { borderColor: tone }]} onPress={dismissNotice}>
        <View style={[styles.iconTile, { borderColor: tone }]}>
          <Text style={styles.icon}>{notice.icon}</Text>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.title}>{notice.title}</Text>
          <Text style={styles.body} numberOfLines={2}>
            {notice.body}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { position: 'absolute', top: 8, left: 12, right: 12, zIndex: 200 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 18,
      borderWidth: 1.5,
      backgroundColor: Colors.cardGlass,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: getThemeMode() === 'dark' ? 0.5 : 0.12,
      shadowRadius: 20,
      elevation: 12,
    },
    iconTile: { width: 40, height: 40, borderRadius: 13, borderWidth: 1.5, backgroundColor: Colors.glassBg, justifyContent: 'center', alignItems: 'center' },
    icon: { fontSize: 19 },
    flex1: { flex: 1 },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    body: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
  })
);
