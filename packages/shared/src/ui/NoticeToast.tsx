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
  const tint = { primary: 'rgba(56, 189, 248, 0.16)', success: 'rgba(16, 185, 129, 0.16)', danger: 'rgba(239, 68, 68, 0.14)' }[notice.tone] ?? 'rgba(56, 189, 248, 0.16)';

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { top: topOffset, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] },
      ]}
    >
      <Pressable style={styles.card} onPress={dismissNotice}>
        <View style={[styles.toneBar, { backgroundColor: tone }]} />
        <View style={[styles.iconTile, { backgroundColor: tint }]}>
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
      paddingLeft: 16,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: getThemeMode() === 'dark' ? Colors.borderColor : 'transparent',
      backgroundColor: Colors.bgCard,
      overflow: 'hidden',
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: getThemeMode() === 'dark' ? 0.5 : 0.18,
      shadowRadius: 24,
      elevation: 12,
    },
    // A slim tone stripe on the left says what kind of notice it is.
    toneBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
    iconTile: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
    icon: { fontSize: 19 },
    flex1: { flex: 1 },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    body: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
  })
);
