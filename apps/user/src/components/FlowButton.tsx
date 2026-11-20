import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Colors, FONTS, themedStyles } from '@ongarage/shared';

/** The Bids card's button: yellow edge, soft fill, 14px semi-bold label. Used by the booking flows' footers. */
export const FlowButton: React.FC<{ label: string; icon?: string; variant: 'primary' | 'success' | 'ghost' | 'record'; disabled?: boolean; onPress: () => void }> = ({ label, icon, variant, disabled, onPress }) => (
  <Pressable
    style={[styles.flowBtn, variant === 'success' && styles.flowBtnSuccess, variant === 'ghost' && styles.flowBtnGhost, variant === 'record' && styles.flowBtnRecord, disabled && styles.flowBtnOff]}
    disabled={disabled}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    {!!icon && <Text style={styles.flowBtnText}>{icon}</Text>}
    <Text style={[styles.flowBtnText, variant === 'success' && styles.flowBtnTextSuccess, variant === 'ghost' && styles.flowBtnTextGhost, variant === 'record' && styles.flowBtnTextRecord, disabled && styles.flowBtnTextOff]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{label}</Text>
  </Pressable>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flowBtn: { height: 40, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1.5, borderColor: '#facc15', backgroundColor: '#dbeafe' },
    flowBtnSuccess: { backgroundColor: '#bbf7d0' },
    flowBtnRecord: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
    flowBtnTextRecord: { color: '#ffffff' },
    flowBtnGhost: { backgroundColor: 'transparent' },
    flowBtnOff: { backgroundColor: '#e5e7eb', borderColor: '#e5e7eb' },
    flowBtnText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: '#1e3a8a' },
    flowBtnTextSuccess: { color: '#15803d' },
    flowBtnTextGhost: { color: Colors.textMuted },
    flowBtnTextOff: { color: '#6b7280' },
  })
);
