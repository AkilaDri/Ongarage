import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FONTS, Gradient, finalNeedsApproval, themedStyles } from '@ongarage/shared';
import { money } from '../../utils/format';
import type { TowBidsDraft } from './TowBidsScreen';

/** Screen 5 of the towing flow: the truck is at the drop-off. The driver's final price either fits the agreed quote (and moves on by itself) or needs the owner's approval. */
export type TowFinalDraft = TowBidsDraft & { finalAmount: number; finalReason: string | null; approval: 'none' | 'accepted' | 'declined' };

const TOW_BAND = [
  { offset: '0', color: '#1d367f' },
  { offset: '1', color: '#111f4d' },
];

export const TowDropScreen: React.FC<{
  draft: TowBidsDraft & { stage: 'atDrop' };
  onNext: (draft: TowFinalDraft) => void;
  /** Puts the tow away: the flow keeps running and the return bar on Home shows what is waiting. */
  onMinimize?: () => void;
}> = ({ draft, onNext, onMinimize }) => {
  const { bid, route, vehicle } = draft;
  const agreed = bid.quote.total;

  // The driver's final price. In this demo a stuck or accident job can run over the agreed amount; the real price comes from the driver's app.
  const extra = vehicle.condition === 'stuck' || vehicle.condition === 'accident' ? 800 : 0;
  const finalAmount = agreed + extra;
  const reason = extra > 0 ? 'වාහනය ඉවත් කරන විට අමතර වැඩ වුණා' : null;
  const needsApproval = finalNeedsApproval(bid.quote, finalAmount);

  // Nothing above the quote's limit: move on by itself.
  useEffect(() => {
    if (!needsApproval) onNext({ ...draft, finalAmount, finalReason: reason, approval: 'none' });
  }, [needsApproval]);

  const decide = (approval: 'accepted' | 'declined') => onNext({ ...draft, finalAmount: approval === 'accepted' ? finalAmount : agreed, finalReason: reason, approval });

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.band}>
        <Gradient stops={TOW_BAND} />
        <View style={styles.topBar}>
          <View style={styles.pill}>
            <View style={styles.pillDisc}><Text style={styles.pillEmoji}>🏁</Text></View>
            <View style={styles.flex1}>
              <Text style={styles.pillTitle} numberOfLines={1}>ගමනාන්තයට ආවා</Text>
              <Text style={styles.pillSub} numberOfLines={1}>{route.drop.name}</Text>
            </View>
          </View>
          {onMinimize && (
              <View style={styles.topSlot}>
              <Pressable style={styles.roundBtn} onPress={onMinimize} accessibilityLabel="Minimise towing">
                <Text style={styles.minText}>⌄</Text>
              </Pressable>
              </View>
            )}
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.progressRow}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.progressBar, styles.progressBarOn]} />
          ))}
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>ගෙවිය යුතු මුදල</Text>
            <Text style={styles.sub}>{`ගිවිසගත් මිල: ${money(agreed)}`}</Text>
            <Text style={styles.total}>{money(finalAmount)}</Text>
            {reason && <Text style={styles.sub}>{reason}</Text>}
          </View>

          {needsApproval && (
            <View style={styles.approval}>
              <Text style={styles.approvalTitle}>ගිවිසගත් මිලට වඩා වැඩියි</Text>
              <Text style={styles.approvalSub}>{`${money(finalAmount - agreed)} ක අමතර මුදලක් ${bid.name} ඉල්ලනවා. අනුමත කරනවාද?`}</Text>
              <Pressable style={styles.primary} onPress={() => decide('accepted')} accessibilityLabel={`Approve the final ${money(finalAmount)}`}>
                <Text style={styles.primaryText}>{`${money(finalAmount)} අනුමත කරන්න`}</Text>
              </Pressable>
              <Pressable style={styles.secondary} onPress={() => decide('declined')} accessibilityLabel={`Pay the agreed ${money(agreed)} only`}>
                <Text style={styles.secondaryText}>{`ගිවිසගත් ${money(agreed)} පමණක්`}</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.bgBody },
    band: { height: 130, overflow: 'hidden' },
    topBar: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
    minText: { fontSize: 22, color: Colors.textMain, marginTop: -6 },
    topSlot: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
    pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: Colors.bgCard },
    pillEmoji: { fontSize: 20 },
    pillDisc: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
    stepNo: { color: '#1d367f', fontFamily: FONTS.bodyBold },
    pillTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    pillSub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder, marginTop: 10 },
    progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, paddingTop: 12 },
    progressBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: Colors.subtleBorder },
    progressBarOn: { backgroundColor: '#1a73e8' },
    sheet: { flex: 1, marginTop: -24, backgroundColor: Colors.bgBody, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
    body: { padding: 18, gap: 12, paddingBottom: 40 },
    card: { padding: 16, borderRadius: 18, backgroundColor: Colors.bgCard, gap: 6 },
    cardTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    total: { fontSize: 26, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18 },
    approval: { padding: 16, borderRadius: 18, backgroundColor: '#dbeafe', gap: 8 },
    approvalTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: '#1d367f' },
    approvalSub: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: '#1e3a8a', lineHeight: 19 },
    primary: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1d367f' },
    primaryText: { fontSize: 15, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    secondary: { height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard },
    secondaryText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: '#1d367f' },
    flex1: { flex: 1 },
  })
);
