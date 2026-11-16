import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FONTS, Gradient, themedStyles } from '@ongarage/shared';

/** The towing header's blue, so every primary button of the towing flow matches the band at the top. */
const TOW_BAND = [
  { offset: '0', color: '#1d367f' },
  { offset: '1', color: '#111f4d' },
];

/**
 * The primary button of the towing flow: the header's blue gradient in a 52px pill. Disabled it turns grey, as the other steps do.
 * Secondary actions stay ghost buttons (ActionButton variant="ghost").
 */
export const TowButton: React.FC<{
  label: string;
  icon?: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}> = ({ label, icon, onPress, disabled, accessibilityLabel }) => (
  <Pressable
    style={({ pressed }) => [styles.button, disabled && styles.off, pressed && !disabled && styles.pressed]}
    onPress={onPress}
    disabled={disabled}
    accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ disabled: !!disabled }}
  >
    {!disabled && <Gradient stops={TOW_BAND} />}
    <View style={styles.row}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={[styles.text, disabled && styles.textOff]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  </Pressable>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    button: { height: 52, borderRadius: 26, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
    off: { backgroundColor: '#cbd5e1' },
    pressed: { opacity: 0.9 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    icon: { fontSize: 15 },
    text: { fontSize: 15, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    textOff: { color: '#334155' },
  })
);
