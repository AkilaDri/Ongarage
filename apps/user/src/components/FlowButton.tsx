import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, themedStyles } from '@ongarage/shared';

/** The Bids card's button: yellow edge, soft fill, 14px semi-bold label. Used by the booking flows' footers. */
export const FlowButton: React.FC<{ label: string; /** The price or the item the action is about: always on its own line under the action. */ detail?: string; icon?: string; variant?: 'primary' | 'success' | 'ghost' | 'record' | 'danger'; disabled?: boolean; onPress: () => void; /** A label for tests and screen readers when it differs from the text. */ a11y?: string }> = ({ label, detail, icon, variant = 'primary', disabled, onPress, a11y }) => {
  const tone = [styles.flowBtnText, variant === 'success' && styles.flowBtnTextSuccess, variant === 'ghost' && styles.flowBtnTextGhost, variant === 'record' && styles.flowBtnTextRecord, variant === 'danger' && styles.flowBtnTextDanger, disabled && styles.flowBtnTextOff];
  // With a detail, each line holds one thing: it shrinks a little on a very narrow phone instead of wrapping.
  const fit = detail ? { numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.8 } : { numberOfLines: 2 };
  const title = (
    <>
      {!!icon && <Text style={tone}>{icon}</Text>}
      <Text style={tone} {...fit}>
        {label}
      </Text>
    </>
  );
  return (
    <Pressable
      style={[styles.flowBtn, !!detail && styles.flowBtnStacked, variant === 'success' && styles.flowBtnSuccess, variant === 'ghost' && styles.flowBtnGhost, variant === 'record' && styles.flowBtnRecord, variant === 'danger' && styles.flowBtnDanger, disabled && styles.flowBtnOff]}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? (detail ? `${label} · ${detail}` : label)}
    >
      {detail ? (
        <>
          {/* The icon stays beside the action, so both lines are centred in the button. */}
          <View style={styles.titleRow}>{title}</View>
          <Text style={[tone, styles.detail]} {...fit}>
            {detail}
          </Text>
        </>
      ) : (
        title
      )}
    </Pressable>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flowBtn: { minHeight: 40, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1.5, borderColor: '#facc15', backgroundColor: '#dbeafe' },
    flowBtnStacked: { flexDirection: 'column', gap: 1, paddingVertical: 8, paddingHorizontal: 14 },
    titleRow: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    detail: { alignSelf: 'stretch', fontSize: 15, lineHeight: 21, fontFamily: FONTS.titleBold },
    flowBtnSuccess: { backgroundColor: '#bbf7d0' },
    flowBtnRecord: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
    flowBtnTextRecord: { color: '#ffffff' },
    flowBtnGhost: { backgroundColor: 'transparent' },
    flowBtnOff: { backgroundColor: '#e5e7eb', borderColor: '#e5e7eb' },
    flowBtnDanger: { backgroundColor: '#fde8e8', borderColor: '#fca5a5' },
    flowBtnTextDanger: { color: '#b91c1c' },
    flowBtnText: { flexShrink: 1, textAlign: 'center', lineHeight: 20, fontSize: 14, fontFamily: FONTS.bodySemiBold, color: '#1e3a8a' },
    flowBtnTextSuccess: { color: '#15803d' },
    flowBtnTextGhost: { color: Colors.textMuted },
    flowBtnTextOff: { color: '#6b7280' },
  })
);
