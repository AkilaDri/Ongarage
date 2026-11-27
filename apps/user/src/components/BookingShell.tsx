import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';
import { outline, pageBg } from '../utils/material';
import { FlowHeader } from './FlowHeader';

/**
 * The frame the owner's booking flows share: the blue band with a round close button and a pill (title, step counter, step name), the rounded sheet that overlaps it
 * with the progress segments, a scrolling body at the Bids tab's 12px rhythm, and a footer with the step's button. `steps` are the names; a finished step's segment goes back to it.
 */
export const BookingShell: React.FC<{ visible: boolean; title: string; icon: string; steps: readonly string[]; step: number; onStep?: (index: number) => void; /** One step back: the round white chevron before the pill. Left out on the first step. */ onBack?: () => void; onClose: () => void; footer: React.ReactNode; overlay?: React.ReactNode; children: React.ReactNode }> = ({ visible, title, icon, steps, step, onStep, onBack, onClose, footer, overlay, children }) => (
  <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlowHeader title={title} icon={icon} steps={steps} step={step} onBack={onBack} onClose={onClose} />
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
        {/* A new scroller for each step, so every step opens at its top. */}
        <ScrollView key={step} style={styles.flex1} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
    postSheet: { flex: 1, marginTop: -24, backgroundColor: pageBg(), borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', shadowColor: '#3c4043', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 8 },
    progressWrap: { gap: 6, paddingHorizontal: 8, marginTop: 14, marginBottom: 8 },
    progressRow: { flexDirection: 'row', gap: 6 },
    progressSeg: { flex: 1, paddingVertical: 6 },
    progressBar: { height: 6, borderRadius: 3, backgroundColor: Colors.subtleBorder },
    progressBarOn: { backgroundColor: '#1a73e8' },
    body: { paddingHorizontal: 8, paddingTop: 18, gap: 12, paddingBottom: 32 },
    footer: { paddingHorizontal: 8, paddingBottom: 12, paddingTop: 10, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: outline(), shadowColor: '#3c4043', shadowOffset: { width: 0, height: -1 }, shadowOpacity: getThemeMode() === 'dark' ? 0.4 : 0.12, shadowRadius: 3, elevation: 4 },
  })
);
