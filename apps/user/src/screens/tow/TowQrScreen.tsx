import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton, CloseCode, Colors, FONTS, Gradient, makeCloseCode, themedStyles } from '@ongarage/shared';
import { money } from '../../utils/format';
import type { TowPaidDraft } from './TowPayScreen';

const TOW_BAND = [
  { offset: '0', color: '#1d367f' },
  { offset: '1', color: '#111f4d' },
];

/** This is step 5 of the five towing steps; the rating after it closes the job. */
const STEP_NO = 5;

/**
 * The end of the towing job, laid out as the SOS QR step: the blue band with the step pill, the progress bar, the title, the closing code as a QR
 * with its digits, the reference and the bill summary, and the driver's scan button at the bottom.
 */
export const TowQrScreen: React.FC<{
  draft: TowPaidDraft;
  onNext: (draft: TowPaidDraft) => void;
}> = ({ draft, onNext }) => {
  const { bid, finalAmount, closeCode } = draft;
  const extra = Math.max(0, finalAmount - bid.quote.total);
  const [code] = useState(() => closeCode || makeCloseCode());
  const reference = `OG-TOW-${code}`;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.band}>
        <Gradient stops={TOW_BAND} />
        <View style={styles.topBar}>
          <View style={styles.pill}>
            <View style={styles.pillDisc}>
              <Text style={styles.pillEmoji}>🛻</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.pillTitle} numberOfLines={1}>Ongarage Towing</Text>
              <View style={styles.stepRow}>
                <View style={styles.stepChip}>
                  <Text style={styles.stepNo}>{`${STEP_NO}/5`}</Text>
                </View>
                <Text style={styles.pillSub} numberOfLines={1}>· QR ස්කෑන්</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.progressRow}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.progressBar, i < STEP_NO && styles.progressBarOn]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>ට්‍රක් ගමන අවසන්</Text>
            <Text style={styles.heroSub}>{`${bid.name} වාහනය ගමනාන්තයේ බැස්සුවා. වාහනය පරීක්ෂා කරන්න.`}</Text>
          </View>

          <View style={styles.codeBlock}>
            <CloseCode code={code} size={190} />
            <Text style={styles.codeCaption}>ස්කෑන් කළ නොහැකි නම් මෙම කේතය කාර්මිකයාට කියන්න.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>බිල්පත් සාරාංශය</Text>
            <View style={styles.refChip}>
              <Text style={styles.refText}>{reference}</Text>
            </View>
            <Fact label="ට්‍රක් ගාස්තුව" value={money(bid.quote.total)} />
            {extra > 0 && <Fact label="අමතර වැඩ" value={money(extra)} />}
            <View style={styles.divider} />
            <View style={styles.rowBetween}>
              <Text style={styles.total}>මුළු එකතුව</Text>
              <Text style={styles.total}>{money(finalAmount)}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <ActionButton label="ට්‍රක් කාර්මිකයා ස්කෑන් කළා" icon="📷" variant="success" onPress={() => onNext({ ...draft, closeCode: code })} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const Fact: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.factRow}>
    <Text style={styles.factLabel}>{label}</Text>
    <Text style={styles.factValue}>{value}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.bgBody },
    flex1: { flex: 1 },
    band: { height: 130, overflow: 'hidden' },
    topBar: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: Colors.bgCard },
    pillDisc: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
    pillEmoji: { fontSize: 20 },
    pillTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    pillSub: { flexShrink: 1, fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stepChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#dbeafe' },
    stepNo: { fontSize: 12, color: '#1d367f', fontFamily: FONTS.bodyBold },
    sheet: { flex: 1, marginTop: -24, backgroundColor: Colors.bgBody, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder, marginTop: 10 },
    progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, paddingTop: 12 },
    progressBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: Colors.subtleBorder },
    progressBarOn: { backgroundColor: '#1a73e8' },
    body: { padding: 16, gap: 12, paddingBottom: 24 },
    hero: { alignItems: 'center', gap: 6, paddingTop: 4 },
    heroTitle: { fontSize: 20, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
    heroSub: { fontSize: 13.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
    codeBlock: { alignItems: 'center', gap: 10, paddingVertical: 4 },
    codeCaption: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
    card: { padding: 14, borderRadius: 18, backgroundColor: Colors.bgCard, gap: 8 },
    label: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    refChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: Colors.subtleFill },
    refText: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    factRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    factLabel: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    factValue: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    divider: { height: 1, backgroundColor: Colors.subtleBorder, marginVertical: 2 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    total: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    bottomBar: { padding: 16, paddingTop: 12, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.subtleBorder },
  })
);
