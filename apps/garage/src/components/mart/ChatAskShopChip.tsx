import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';

/**
 * In every chat with a parts shop (opened from its profile, or from one of its answers): the decision chip to ask this shop for a part. It goes to OnMart's request form with
 * this shop already chosen.
 */
export const ChatAskShopChip: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <Pressable style={styles.btn} onPress={onPress} accessibilityLabel="Ask this shop for a part">
    <Text style={styles.icon}>📨</Text>
    <Text style={styles.label}>මෙම වෙළඳසැලෙන් කොටසක් ඉල්ලන්න</Text>
  </Pressable>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 19, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    icon: { fontSize: 15 },
    label: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  })
);
