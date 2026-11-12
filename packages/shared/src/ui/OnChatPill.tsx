import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import { Gradient } from './Visuals';

/**
 * The OnChat button of every app: a small pill with a green live dot, the word ONCHAT and the unread count in a soft chip. `glass` is for the blue page
 * header (a see-through white pill); `solid` (the default) is a blue to violet gradient for everywhere else.
 */
export const OnChatPill: React.FC<{ onPress: () => void; count?: number; variant?: 'glass' | 'solid' }> = ({ onPress, count = 0, variant = 'solid' }) => (
  <Pressable style={[styles.pill, variant === 'glass' ? styles.glass : styles.solid]} onPress={onPress} hitSlop={6} accessibilityLabel="Messages">
    {variant === 'solid' && <Gradient stops={[{ offset: '0', color: '#2563eb' }, { offset: '0.5', color: '#4f46e5' }, { offset: '1', color: '#7c3aed' }]} />}
    <View style={styles.dot}>
      <View style={styles.dotInner} />
    </View>
    <Text style={styles.text}>ONCHAT</Text>
    {count > 0 && (
      <View style={styles.count}>
        <Text style={styles.countText}>{count > 9 ? '9+' : count}</Text>
      </View>
    )}
  </Pressable>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    pill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 9, borderRadius: 12, overflow: 'hidden' },
    glass: { borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.4)', backgroundColor: 'rgba(255, 255, 255, 0.18)' },
    solid: { shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    dot: { width: 9, height: 9, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(52, 211, 153, 0.35)' },
    dotInner: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#34d399' },
    text: { fontSize: 9.5, fontFamily: FONTS.bodySemiBold, color: '#ffffff', letterSpacing: 0.5 },
    count: { minWidth: 16, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.28)' },
    countText: { fontSize: 8.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  })
);
