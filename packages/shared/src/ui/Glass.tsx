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
    shadowOffset: { width: 0, height: getThemeMode() === 'dark' ? 6 : 3 },
    shadowOpacity: getThemeMode() === 'dark' ? 0.5 : 0.09,
    shadowRadius: getThemeMode() === 'dark' ? 18 : 12,
    elevation: getThemeMode() === 'dark' ? 5 : 3,
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
  icon?: string | React.ReactNode;
  variant: keyof typeof BUTTON_GRADIENTS | 'ghost';
  disabled?: boolean;
  compact?: boolean;
  /** Fully rounded ends (the default); false gives a rounded rectangle. */
  pill?: boolean;
  onPress: () => void;
}> = ({ label, icon, variant, disabled, compact, pill = true, onPress }) => {
  // Buttons inside cards (compact) are the modern kind: tall pills, a tonal (soft tinted) look for the secondary and the success ones, a soft coloured shadow
  // under the primary one. Full-width sheet buttons keep the gradient look.
  const modern = !!compact;
  const tonal = modern && (variant === 'ghost' || variant === 'success');
  const dark = getThemeMode() === 'dark';
  const tonalText = variant === 'success' ? (dark ? '#81c995' : '#137333') : dark ? '#8db1ff' : '#1a73e8';
  const textStyle = [styles.actionBtnText, modern && styles.actionBtnTextModern, tonal && !disabled && { color: tonalText }, !modern && variant === 'ghost' && { color: Colors.textMuted }, disabled && styles.actionBtnTextDisabled];
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        compact && styles.actionBtnCompact,
        pill && styles.actionBtnPill,
        modern && styles.actionBtnModern,
        variant === 'ghost' && !modern && styles.actionBtnGhost,
        tonal && !disabled && (variant === 'success' ? styles.actionBtnTonalGreen : styles.actionBtnTonalBlue),
        modern && !tonal && !disabled && variant !== 'sos' && styles.actionBtnLift,
        disabled && styles.actionBtnDisabled,
        disabled && modern && styles.actionBtnDisabledModern,
        pressed && !disabled && { transform: [{ scale: 0.97 }] },
      ]}
    >
      {variant !== 'ghost' && !disabled && !tonal && <Gradient stops={BUTTON_GRADIENTS[variant]} />}
      {!!icon && (typeof icon === 'string' ? <Text style={[textStyle, modern && styles.actionBtnIconModern]}>{icon}</Text> : icon)}
      <Text style={textStyle}>{label}</Text>
    </Pressable>
  );
};

/**
 * A small fact on a card (distance, part type, doorstep…): a tinted pill with its leading emoji, no outline. The tint follows the emoji: 📍 blue, 🚛 🛡️ ✅ green,
 * 🚗 ⏱️ ⚠️ amber, 🔩 teal, anything else neutral.
 */
export const InfoChip: React.FC<{ text: string }> = ({ text }) => {
  const i = text.indexOf(' ');
  const head = i > 0 ? text.slice(0, i) : '';
  const hasIcon = !!head && !/^[\u0000-\u007f]*$/.test(head);
  const icon = hasIcon ? head : '';
  const rest = hasIcon ? text.slice(i + 1) : text;
  const dark = getThemeMode() === 'dark';
  const TONES = {
    blue: { bg: dark ? 'rgba(141, 177, 255, 0.14)' : '#e8f0fe', fg: dark ? '#8db1ff' : '#1a73e8' },
    green: { bg: dark ? 'rgba(129, 201, 149, 0.14)' : '#e6f4ea', fg: dark ? '#81c995' : '#137333' },
    amber: { bg: dark ? 'rgba(253, 214, 99, 0.14)' : '#fef7e0', fg: dark ? '#fdd663' : '#b06000' },
    teal: { bg: dark ? 'rgba(94, 234, 212, 0.14)' : '#e0f7f4', fg: dark ? '#5eead4' : '#0d7a6e' },
    plain: { bg: dark ? 'rgba(255, 255, 255, 0.08)' : '#f1f3f4', fg: dark ? '#e8eaed' : '#3c4043' },
  };
  const tone = ['📍'].includes(icon) ? TONES.blue : ['🚛', '🛡️', '✅'].includes(icon) ? TONES.green : ['🚗', '⏱️', '⚠️', '⏰'].includes(icon) ? TONES.amber : ['🔩'].includes(icon) ? TONES.teal : TONES.plain;
  return (
    <View style={[styles.infoChip, { backgroundColor: tone.bg }]}>
      {!!icon && <Text style={styles.infoChipIcon}>{icon}</Text>}
      <Text style={[styles.infoChipText, { color: tone.fg }]} numberOfLines={1}>
        {rest}
      </Text>
    </View>
  );
};

export const EmptyState: React.FC<{ icon: string; title: string; text: string; /** Without the card round it (when it already sits inside one). */ bare?: boolean }> = ({ icon, title, text, bare }) => (
  <View style={[styles.empty, !bare && styles.emptyCard]}>
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
  /** The Google Material dialog: a 28px card, a centred icon and headline, left-aligned text and right-aligned buttons (opt-in). */
  material?: boolean;
}> = ({ icon, tone, title, body, children, material }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 280, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true }).start();
  }, [anim]);
  return (
    <View style={styles.modalOverlay}>
      <Animated.View style={[styles.modalCard, material && styles.modalCardMaterial, { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
        <View style={[styles.modalIcon, material && styles.modalIconMaterial, { backgroundColor: modalTint(tone) }]}>
          <Text style={[styles.modalIconText, material && styles.modalIconTextMaterial]}>{icon}</Text>
        </View>
        <Text style={[styles.modalTitle, material && styles.modalTitleMaterial]}>{title}</Text>
        <Text style={[styles.modalBody, material && styles.modalBodyMaterial]}>{body}</Text>
        <View style={[styles.modalActions, material && styles.modalActionsMaterial]}>{children}</View>
      </Animated.View>
    </View>
  );
};

/** A Material dialog button: a text button, or the filled one for the main answer. */
export const DialogButton: React.FC<{ label: string; onPress: () => void; filled?: boolean }> = ({ label, onPress, filled }) => (
  <Pressable style={({ pressed }) => [styles.dialogBtn, filled && styles.dialogBtnFilled, pressed && { opacity: 0.8 }]} onPress={onPress} accessibilityLabel={label}>
    <Text style={[styles.dialogBtnText, filled && styles.dialogBtnTextFilled]}>{label}</Text>
  </Pressable>
);

const styles = themedStyles(() => StyleSheet.create({
  glassIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: softFill(), justifyContent: 'center', alignItems: 'center' },
  glassIconSmall: { width: 40, height: 40, borderRadius: 20 },
  glassIconEmoji: { fontSize: 20 },
  glassIconEmojiSmall: { fontSize: 17 },

  empty: { alignItems: 'center', gap: 8, paddingVertical: 40, paddingHorizontal: 24 },
  emptyCard: { borderRadius: 24, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), ...softShadow() },
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
  // The modern in-card button.
  actionBtnModern: { minHeight: 42, paddingVertical: 10, paddingHorizontal: 18, gap: 7, borderRadius: 21 },
  actionBtnTonalBlue: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.14)' : '#e8f0fe' },
  actionBtnTonalGreen: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.16)' : '#e6f4ea' },
  actionBtnLift: { shadowColor: '#1a73e8', shadowOffset: { width: 0, height: 3 }, shadowOpacity: getThemeMode() === 'dark' ? 0.35 : 0.28, shadowRadius: 8, elevation: 3 },
  actionBtnDisabledModern: { borderWidth: 0, backgroundColor: getThemeMode() === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f1f3f4' },
  actionBtnTextModern: { fontSize: 12.5, letterSpacing: 0.1 },
  actionBtnIconModern: { fontSize: 13 },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', maxWidth: '100%', minHeight: 26, paddingLeft: 6, paddingRight: 8, paddingVertical: 1, borderRadius: 11 },
  infoChipIcon: { fontSize: 12 },
  infoChipText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, flexShrink: 1, lineHeight: 15 },
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

  // Material dialog: elevation 3, a small tonal icon, a 20px headline, 14px supporting text and right-aligned buttons.
  modalCardMaterial: { maxWidth: 312, gap: 16, shadowColor: '#3c4043', shadowOffset: { width: 0, height: 6 }, shadowOpacity: getThemeMode() === 'dark' ? 0.5 : 0.28, shadowRadius: 16, elevation: 8 },
  modalIconMaterial: { width: 48, height: 48, borderRadius: 24, marginBottom: 0 },
  modalIconTextMaterial: { fontSize: 22 },
  modalTitleMaterial: { fontSize: 20, lineHeight: 28, fontFamily: FONTS.titleBold },
  modalBodyMaterial: { alignSelf: 'stretch', textAlign: 'left', fontSize: 14, lineHeight: 21, marginBottom: 0, color: Colors.textMuted },
  modalActionsMaterial: { justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 8 },
  dialogBtn: { minWidth: 64, height: 40, paddingHorizontal: 16, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dialogBtnFilled: { backgroundColor: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  dialogBtnText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  dialogBtnTextFilled: { color: getThemeMode() === 'dark' ? '#0b1b3a' : '#ffffff' },
}));
