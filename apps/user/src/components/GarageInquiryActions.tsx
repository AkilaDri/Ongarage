import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';

/** In a chat with a garage the owner has not booked yet (opened from the garage's card): send an inquiry, or book the garage directly. */
export const GarageInquiryActions: React.FC<{ onInquire: () => void; onBook: () => void }> = ({ onInquire, onBook }) => (
  <>
    <Pressable style={styles.btn} onPress={onInquire} accessibilityLabel="Send an inquiry">
      <Text style={styles.icon}>❓</Text>
      <Text style={styles.label}>විමසීමක් යවන්න</Text>
    </Pressable>
    <Pressable style={[styles.btn, styles.primary]} onPress={onBook} accessibilityLabel="Book this garage directly">
      <Text style={styles.icon}>📅</Text>
      <Text style={[styles.label, styles.primaryText]}>වෙන් කරන්න</Text>
    </Pressable>
  </>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 19, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard },
    primary: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    icon: { fontSize: 15 },
    label: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    primaryText: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  })
);
