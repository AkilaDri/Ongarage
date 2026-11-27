import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';

/** A section of a request: a 16px heading with a tick once done, or the amber "required" note, over its contents. */
export const FlowStepCard: React.FC<{ step: number; title: string; done: boolean; hint?: string; optional?: boolean; requiredNote?: string; children: React.ReactNode }> = ({ step, title, done, hint, optional, requiredNote, children }) => (
  <View style={styles.stepCard}>
    <View style={styles.stepHead}>
      {/* The number is not needed: the progress bar shows the order, and a finished step shows a tick. */}
      {done && (
        <View style={[styles.stepBadge, styles.stepBadgeDone]}>
          <Text style={[styles.stepBadgeText, styles.stepBadgeTextDone]}>✓</Text>
        </View>
      )}
      <View style={styles.flex1}>
        <View style={styles.stepTitleRow}>
          <Text style={[styles.stepTitle, styles.flex1]}>{title}</Text>
          {!optional && !done && (
            <View style={styles.requiredPill} accessibilityLabel="Required">
              <Text style={styles.requiredText}>{requiredNote ?? '* අත්‍යවශ්‍යයි'}</Text>
            </View>
          )}
        </View>
        {!!hint && <Text style={styles.cardSub}>{hint}</Text>}
      </View>
    </View>
    {children}
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    stepCard: { borderRadius: 26, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#f3f4f6', backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff', shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: getThemeMode() === 'dark' ? 0.6 : 0.16, shadowRadius: 22, elevation: 6, paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    stepHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
    stepBadgeDone: { backgroundColor: '#1a73e8' },
    stepBadgeText: { fontSize: 17, fontFamily: FONTS.titleBold, color: '#ffffff' },
    stepBadgeTextDone: { color: '#ffffff', fontSize: 18 },
    stepTitle: { fontSize: 16, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    stepTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    requiredPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.16)' },
    requiredText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: '#b45309' },
    cardSub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
  })
);
