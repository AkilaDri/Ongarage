import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, getThemeMode, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import { Gradient, GRADIENTS } from './Visuals';

// The OnGarage soft style (PickMe-like): surfaces float on a soft shadow instead of an outline. On dark,
// where a shadow does not show, a faint outline stands in for it. Functions, not constants: they read the
// palette of the active theme.

/** Soft drop shadow for cards and floating controls. */
export const softShadow = () =>
  ({
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: getThemeMode() === 'dark' ? 0.3 : 0.1,
    shadowRadius: 16,
    elevation: 3,
  }) as const;

/** The outline colour of a soft surface: none on light, faint on dark. A variant may still set its own borderColor. */
export const softEdge = () => (getThemeMode() === 'dark' ? Colors.borderColor : 'transparent');

/** A soft card surface: card background, soft shadow, outline only on dark. */
export const softCard = () => ({ backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), ...softShadow() }) as const;

/** A soft grey fill for chips, inputs and secondary buttons (no outline). */
export const softFill = () => (getThemeMode() === 'dark' ? Colors.subtleFill : '#eef2f7');

/** The navy used for active tab pills and the strongest accents (same as the owner app). */
export const NAVY = '#162b63';

/** The sky-blue band at the top of every app; the screen below overlaps it with rounded corners. */
export const headerBand = () => {
  const dark = getThemeMode() === 'dark';
  return {
    bg: dark ? '#0e2a3f' : '#bfe4fa',
    title: dark ? '#d6eefc' : '#0f2a3d',
    sub: dark ? '#8fc3e3' : '#2b4a63',
    pill: dark ? '#16415f' : '#0f2f4a',
  };
};

/** Kept for existing callers: now the soft card surface. */
export const glassStyle = softCard;

/** An emoji on a soft round disc (no outline). */
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
  /** Fully rounded ends (the default); false gives a rounded rectangle. */
  pill?: boolean;
  onPress: () => void;
}> = ({ label, icon, variant, disabled, compact, pill = true, onPress }) => (
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

// A soft tint behind the icon, no outline.
const modalTint = (tone: ModalTone) =>
  ({
    danger: 'rgba(239, 68, 68, 0.14)',
    primary: 'rgba(56, 189, 248, 0.16)',
    success: 'rgba(16, 185, 129, 0.16)',
  })[tone];

/** A pop-up in the middle of the screen: a borderless rounded card with a wide shadow, a tinted icon disc and pill buttons. */
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
  return (
    <View style={styles.modalOverlay}>
      <Animated.View style={[styles.modalCard, { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
        <View style={[styles.modalIcon, { backgroundColor: modalTint(tone) }]}>
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
  glassIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: softFill(), justifyContent: 'center', alignItems: 'center' },
  glassIconSmall: { width: 40, height: 40, borderRadius: 20 },
  glassIconEmoji: { fontSize: 20 },
  glassIconEmojiSmall: { fontSize: 17 },

  empty: { alignItems: 'center', gap: 8, paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, ...softCard(), justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyEmoji: { fontSize: 34 },
  emptyTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
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
  actionBtnGhost: { borderWidth: 1, borderColor: softEdge(), backgroundColor: softFill() },
  actionBtnDisabled: { backgroundColor: softFill(), borderWidth: 1, borderColor: softEdge() },
  actionBtnText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: '#fff' },
  actionBtnTextDisabled: { color: Colors.textMuted },

  modalOverlay: { ...StyleSheet.absoluteFill, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 100 },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.bgCard,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 16,
  },
  modalIcon: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  modalIconText: { fontSize: 28 },
  modalTitle: { fontSize: 17, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
  modalBody: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, textAlign: 'center', lineHeight: 19, marginBottom: 10 },
  modalActions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
}));
