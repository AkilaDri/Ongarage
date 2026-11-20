import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';
import { outline, pageBg } from '../utils/material';

/**
 * The frame the owner's booking flows share: the blue band with a round close button and a pill (title, step counter, step name), the rounded sheet that overlaps it
 * with the progress segments, a scrolling body at the Bids tab's 12px rhythm, and a footer with the step's button. `steps` are the names; a finished step's segment goes back to it.
 */
export const BookingShell: React.FC<{ visible: boolean; title: string; icon: string; steps: readonly string[]; step: number; onStep?: (index: number) => void; onClose: () => void; footer: React.ReactNode; overlay?: React.ReactNode; children: React.ReactNode }> = ({ visible, title, icon, steps, step, onStep, onClose, footer, overlay, children }) => (
  <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          <Pressable style={styles.topRoundBtn} onPress={onClose} accessibilityLabel="Close">
            <Text style={styles.topRoundText}>✕</Text>
          </Pressable>
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
          </View>
          <View style={styles.topSlot} />
        </View>
      </View>
      <View style={styles.postSheet}>
        <View style={styles.progressWrap}>
          <View style={styles.progressRow} accessibilityLabel={`Step ${step + 1} of ${steps.length}`}>
            {steps.map((name, i) => (
              <Pressable key={name} style={styles.progressSeg} disabled={i >= step || !onStep} onPress={() => onStep?.(i)} accessibilityLabel={name}>
                <View style={[styles.progressBar, i <= step && styles.progressBarOn]} />
              </Pressable>
            ))}
          </View>
        </View>
        <ScrollView style={styles.flex1} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
      <View style={styles.footer}>{footer}</View>
      {overlay}
    </SafeAreaView>
  </Modal>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    container: { flex: 1, backgroundColor: pageBg() },
    header: { flexDirection: 'column', alignItems: 'stretch', gap: 10, paddingHorizontal: 16, paddingVertical: 9, overflow: 'hidden', paddingTop: 12, paddingBottom: 68, backgroundColor: '#1d367f' },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    topRoundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center' },
    topRoundText: { fontSize: 16, fontWeight: '700', color: Colors.textMain },
    topSlot: { width: 46 },
    topPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: Colors.bgCard },
    topPillIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: getThemeMode() === 'dark' ? 'rgba(59, 130, 246, 0.18)' : '#dbeafe', justifyContent: 'center', alignItems: 'center' },
    topPillEmoji: { fontSize: 18 },
    topPillTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    topPillRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    topPillCount: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: '#1d4ed8', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#dbeafe' },
    topPillSub: { flexShrink: 1, fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textSoft },
    postSheet: { flex: 1, marginTop: -24, backgroundColor: pageBg(), borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', shadowColor: '#3c4043', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 8 },
    progressWrap: { gap: 6, paddingHorizontal: 8, marginTop: 14, marginBottom: 8 },
    progressRow: { flexDirection: 'row', gap: 6 },
    progressSeg: { flex: 1, paddingVertical: 6 },
    progressBar: { height: 6, borderRadius: 3, backgroundColor: Colors.subtleBorder },
    progressBarOn: { backgroundColor: '#1a73e8' },
    body: { paddingHorizontal: 8, paddingTop: 10, gap: 12, paddingBottom: 24 },
    footer: { paddingHorizontal: 8, paddingBottom: 12, paddingTop: 10, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: outline(), shadowColor: '#3c4043', shadowOffset: { width: 0, height: -1 }, shadowOpacity: getThemeMode() === 'dark' ? 0.4 : 0.12, shadowRadius: 3, elevation: 4 },
  })
);
