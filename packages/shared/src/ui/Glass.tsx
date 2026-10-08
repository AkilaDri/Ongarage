import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, getThemeMode, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import { Gradient, GRADIENTS } from './Visuals';

// A function, not a constant: it must read the palette of the active theme.
export const glassStyle = () =>
  ({
    backgroundColor: Colors.glassBg,
    borderWidth: 1.5,
    borderColor: Colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: getThemeMode() === 'dark' ? 0.3 : 0.08,
    shadowRadius: 20,
    elevation: 5,
  }) as const;

export const GlassIcon: React.FC<{ emoji: string; small?: boolean }> = ({ emoji, small }) => (
  <View style={[styles.glassIcon, small && styles.glassIconSmall]}>
    <Text style={small ? styles.glassIconEmojiSmall : styles.glassIconEmoji}>{emoji}</Text>
  </View>
);

const BUTTON_GRADIENTS = { sos: GRADIENTS.sos, success: GRADIENTS.brand, primary: GRADIENTS.issue, cta: GRADIENTS.cta } as const;

export const ActionButton: React.FC<{
  label: string;
  icon?: string;
  variant: keyof typeof BUTTON_GRADIENTS | 'ghost';
  disabled?: boolean;
  compact?: boolean;
  /** Fully rounded ends (the owner app's style). */
  pill?: boolean;
  onPress: () => void;
}> = ({ label, icon, variant, disabled, compact, pill, onPress }) => (
  <Pressable
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [
      styles.actionBtn,
      compact && styles.actionBtnCompact,
      pill && styles.actionBtnPill,
      variant === 'ghost' && styles.actionBtnGhost,
      disabled && styles.actionBtnDisabled,
      pressed && !disabled && { transform: [{ scale: 0.97 }] },
    ]}
  >
    {variant !== 'ghost' && !disabled && <Gradient stops={BUTTON_GRADIENTS[variant]} />}
    {icon && <Text style={[styles.actionBtnText, disabled && styles.actionBtnTextDisabled]}>{icon}</Text>}
    <Text style={[styles.actionBtnText, variant === 'ghost' && { color: Colors.textMuted }, disabled && styles.actionBtnTextDisabled]}>
      {label}
    </Text>
  </Pressable>
);

export const EmptyState: React.FC<{ icon: string; title: string; text: string }> = ({ icon, title, text }) => (
  <View style={styles.empty}>
    <View style={styles.emptyIcon}>
      <Text style={styles.emptyEmoji}>{icon}</Text>
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

type ModalTone = 'danger' | 'primary' | 'success';

const modalTone = (tone: ModalTone) =>
  ({
    danger: { bg: 'rgba(239, 68, 68, 0.15)', border: Colors.error },
    primary: { bg: 'rgba(56, 189, 248, 0.15)', border: Colors.primary },
    success: { bg: 'rgba(16, 185, 129, 0.15)', border: Colors.success },
  })[tone];

export const ModalCard: React.FC<{
  icon: string;
  tone: ModalTone;
  title: string;
  body: string;
  children: React.ReactNode;
}> = ({ icon, tone, title, body, children }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 280, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true }).start();
  }, [anim]);
  const t = modalTone(tone);
  return (
    <View style={styles.modalOverlay}>
      <Animated.View
        style={[
          styles.modalCard,
          { borderColor: t.border, opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }] },
        ]}
      >
        <View style={[styles.modalIcon, { backgroundColor: t.bg, borderColor: t.border }]}>
          <Text style={styles.modalIconText}>{icon}</Text>
        </View>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalBody}>{body}</Text>
        <View style={styles.modalActions}>{children}</View>
      </Animated.View>
    </View>
  );
};

const styles = themedStyles(() => StyleSheet.create({
  glassIcon: { width: 44, height: 44, borderRadius: 14, ...glassStyle(), justifyContent: 'center', alignItems: 'center' },
  glassIconSmall: { width: 38, height: 38, borderRadius: 12 },
  glassIconEmoji: { fontSize: 20 },
  glassIconEmojiSmall: { fontSize: 17 },

  empty: { alignItems: 'center', gap: 8, paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: { width: 76, height: 76, borderRadius: 22, ...glassStyle(), justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyEmoji: { fontSize: 34 },
  emptyTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
  emptyText: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center' },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  actionBtnCompact: { flex: 1, paddingVertical: 12 },
  actionBtnPill: { borderRadius: 28 },
  actionBtnGhost: { borderWidth: 1, borderColor: Colors.subtleBorder, backgroundColor: Colors.subtleFill },
  actionBtnDisabled: { backgroundColor: Colors.subtleFill, borderWidth: 1, borderColor: Colors.borderColor },
  actionBtnText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: '#fff' },
  actionBtnTextDisabled: { color: Colors.textMuted },

  modalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 100,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.bgCard,
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 20,
  },
  modalIcon: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  modalIconText: { fontSize: 26 },
  modalTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
  modalBody: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, textAlign: 'center', lineHeight: 18, marginBottom: 8 },
  modalActions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
}));
