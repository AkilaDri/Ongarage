import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, getThemeMode, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';

/** A bottom sheet with a title, scrolling body and an optional fixed footer. */
export const Sheet: React.FC<{
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: React.ReactNode;
  /** Rendered above the sheet inside its modal, e.g. the app's toast. */
  overlay?: React.ReactNode;
  children: React.ReactNode;
}> = ({ visible, title, subtitle, onClose, footer, overlay, children }) => {
  const [mounted, setMounted] = useState(visible);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(slide, { toValue: 1, stiffness: 200, damping: 24, useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(slide, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: slide }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.anchor} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [700, 0] }) }] }]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={styles.flex1}>
              <Text style={styles.title}>{title}</Text>
              {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8} accessibilityLabel="Close sheet">
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {!!footer && <View style={styles.footer}>{footer}</View>}
        </Animated.View>
      </KeyboardAvoidingView>
      {overlay}
    </Modal>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: Colors.overlay },
    anchor: { flex: 1, justifyContent: 'flex-end' },
    sheet: {
      maxHeight: '90%',
      backgroundColor: Colors.sheetBg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: getThemeMode() === 'dark' ? 1 : 0,
      borderBottomWidth: 0,
      borderColor: Colors.borderColor,
      paddingTop: 10,
      overflow: 'hidden',
    },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 12 },
    title: { fontSize: 17, fontFamily: FONTS.titleBold, color: Colors.textMain },
    subtitle: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#eef2f7', justifyContent: 'center', alignItems: 'center' },
    closeText: { fontSize: 13, fontWeight: '700', color: Colors.textMain },
    body: { padding: 18, gap: 10 },
    footer: {
      padding: 16,
      paddingTop: 12,
      backgroundColor: Colors.sheetBg,
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: getThemeMode() === 'dark' ? 0.3 : 0.08,
      shadowRadius: 12,
      elevation: 8,
    },
  })
);
