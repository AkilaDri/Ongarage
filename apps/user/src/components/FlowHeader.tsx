import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';

/** The blue band every booking and request opens with: back first (from the second step), then a pill with the title, the step count and name, and a quiet close at its end. */
export const FlowHeader: React.FC<{ title: string; icon: string; steps: readonly string[]; step: number; onBack?: () => void; onClose: () => void }> = ({ title, icon, steps, step, onBack, onClose }) => (
  <View style={styles.header}>
    <View style={styles.topRow}>
      {/* Back comes first, where the eye and the thumb look for it. On the first step there is none, and the pill takes the whole row. */}
      {!!onBack && (
        <Pressable style={styles.topRoundBtn} onPress={onBack} accessibilityRole="button" accessibilityLabel="Previous step">
          <Text style={styles.topBackText}>‹</Text>
        </Pressable>
      )}
      <View style={styles.topPill}>
        <View style={styles.topPillIcon}>
          <Text style={styles.topPillEmoji}>{icon}</Text>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.topPillTitle} numberOfLines={1}>{title}</Text>
          <View style={styles.topPillRow}>
            <Text style={styles.topPillCount}>{`${step + 1}/${steps.length}`}</Text>
            <Text style={styles.topPillSub} numberOfLines={1}>{steps[step]}</Text>
          </View>
        </View>
        {/* Close ends the whole request, so it sits quiet at the end of the pill: a grey ✕ with no disc. */}
        <Pressable style={styles.topCloseBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={styles.topCloseText}>✕</Text>
        </Pressable>
      </View>
    </View>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    header: { flexDirection: 'column', alignItems: 'stretch', gap: 10, paddingHorizontal: 16, paddingVertical: 9, overflow: 'hidden', paddingTop: 12, paddingBottom: 68, backgroundColor: '#1d367f' },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    topRoundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center' },
    topCloseBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    topCloseText: { fontSize: 15, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    topPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 4, borderRadius: 26, backgroundColor: Colors.bgCard },
    topBackText: { fontSize: 26, lineHeight: 30, marginTop: -3, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    topPillIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: getThemeMode() === 'dark' ? 'rgba(59, 130, 246, 0.18)' : '#dbeafe', justifyContent: 'center', alignItems: 'center' },
    topPillEmoji: { fontSize: 18 },
    topPillTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    topPillRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    topPillCount: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: '#1d4ed8', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#dbeafe' },
    topPillSub: { flexShrink: 1, fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textSoft },
  })
);
