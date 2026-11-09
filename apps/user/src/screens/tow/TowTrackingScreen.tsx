import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FONTS, Gradient, themedStyles } from '@ongarage/shared';
import { money } from '../../utils/format';
import type { TowBidsDraft } from './TowBidsScreen';

/** Screen 4 of the towing flow: the truck comes, the owner confirms it is there, the vehicle goes on the flatbed, and it is driven to the drop-off. */
export type TowTrackingStage = 'enroute' | 'arrived' | 'loading' | 'transporting' | 'atDrop';

const TOW_BAND = [
  { offset: '0', color: '#1d367f' },
  { offset: '1', color: '#111f4d' },
];

/** The demo's pace: one minute of truck ETA takes this many milliseconds, so the flow can be tried quickly. */
const MS_PER_MIN = 1500;
/** The demo's drive from the vehicle to the drop-off, in the same minutes. */
const TRANSPORT_MINS = 3;

export const TowTrackingScreen: React.FC<{
  draft: TowBidsDraft;
  /** Leaves the search screens only once the truck has accepted, so there is no close here: cancelling is locked after acceptance (as SOS). */
  onNext: (draft: TowBidsDraft & { stage: 'atDrop' }) => void;
  /** Puts the tow away: the flow keeps running and a return bar shows on Home. */
  onMinimize?: () => void;
  /** Tells the flow which stage the truck is at, so the return bar can say what the owner must do. */
  onStage?: (stage: TowTrackingStage) => void;
}> = ({ draft, onNext, onMinimize, onStage }) => {
  const { bid, vehicle, route } = draft;
  const isStuck = vehicle.condition === 'stuck';
  const [stage, setStage] = useState<TowTrackingStage>('enroute');
  const [minsLeft, setMinsLeft] = useState(bid.etaMin);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    onStage?.(stage);
  }, [stage]);

  // The truck drives in: the ETA counts down, then the truck is at the vehicle.
  useEffect(() => {
    if (stage !== 'enroute') return;
    if (minsLeft <= 0) {
      setStage('arrived');
      return;
    }
    const t = setTimeout(() => setMinsLeft((m) => m - 1), MS_PER_MIN);
    return () => clearTimeout(t);
  }, [stage, minsLeft]);

  // The driver sends a notice once the move has started (a notice, not a step for the owner).
  useEffect(() => {
    if (stage !== 'transporting') return;
    setNotice(`${bid.name}: වාහනය ගෙනයෑම ආරම්භ කළා.`);
    const t = setTimeout(() => {
      setStage('atDrop');
      onNext({ ...draft, stage: 'atDrop' });
    }, MS_PER_MIN * TRANSPORT_MINS);
    return () => clearTimeout(t);
  }, [stage]);

  const confirmArrived = () => setStage('loading');
  const confirmOnFlatbed = () => setStage('transporting');

  const stageLabel: Record<TowTrackingStage, string> = {
    enroute: `ට්‍රක් එනවා · ${Math.max(0, minsLeft)} min`,
    arrived: 'ට්‍රක් ළඟ පැමිණ තිබේ',
    loading: isStuck ? 'වාහනය ඇදගෙන ඉවත් කරමින්' : 'වාහනය flatbed එකට ගන්නවා',
    transporting: 'වාහනය ගෙනයනවා',
    atDrop: 'ගමනාන්තයට ළඟා වුණා',
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.band}>
        <Gradient stops={TOW_BAND} />
        <View style={styles.topBar}>
          {/* No close button here: once a truck has accepted the job cannot be cancelled, as in SOS. Minimise puts the tow away, not cancels it. */}
          <View style={styles.pill}>
            <View style={styles.pillDisc}><Text style={styles.pillEmoji}>🚚</Text></View>
            <View style={styles.flex1}>
              <Text style={styles.pillTitle} numberOfLines={1}>{bid.name}</Text>
              <Text style={styles.pillSub} numberOfLines={1}>{stageLabel[stage]}</Text>
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
        <View style={styles.progressRow}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.progressBar, stage !== 'enroute' && styles.progressBarOn]} />
          ))}
        </View>
      </View>

      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.body}>
          {notice && (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{vehicle.source === 'temp' ? vehicle.plate : 'ඔබේ වාහනය'}</Text>
            <Text style={styles.sub}>{`ගමනාන්තය: ${route.drop.name}`}</Text>
            <Text style={styles.sub}>{`මිල: ${money(bid.quote.total)}`}</Text>
          </View>

          {stage === 'enroute' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>ට්‍රක් එනකල් බලා සිටින්න</Text>
              <Text style={styles.sub}>{`${bid.name} · ${bid.pickupKm} km ඇතුළට`}</Text>
            </View>
          )}

          {stage === 'arrived' && (
            <Pressable style={styles.action} onPress={confirmArrived} accessibilityLabel="Confirm the truck has arrived">
              <Text style={styles.actionTitle}>ට්‍රක් ආවා — තහවුරු කරන්න</Text>
              <Text style={styles.actionSub}>රියදුරා ඔබ ළඟ ඉන්නවාද බලා තහවුරු කරන්න.</Text>
            </Pressable>
          )}

          {stage === 'loading' && (
            <>
              {isStuck && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>වාහනය ඇදගෙන ඉවත් කරනවා</Text>
                  <Text style={styles.sub}>Recovery winch එකෙන් වාහනය පිටතට ගන්නවා. ඉවර වෙනකල් බලා සිටින්න.</Text>
                </View>
              )}
              <Pressable style={styles.action} onPress={confirmOnFlatbed} accessibilityLabel="Confirm the vehicle is on the flatbed">
                <Text style={styles.actionTitle}>වාහනය flatbed එකේ — තහවුරු කරන්න</Text>
                <Text style={styles.actionSub}>වාහනය ට්‍රක් එකට ගත් පසු තහවුරු කරන්න.</Text>
              </Pressable>
            </>
          )}

          {stage === 'transporting' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>ගමන යනවා</Text>
              <Text style={styles.sub}>ගමනාන්තයට ළඟා වෙන විට ඔබට දැනුම් දෙනවා.</Text>
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
    topSlot: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
    pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: Colors.bgCard },
    pillEmoji: { fontSize: 20 },
    pillDisc: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
    stepNo: { color: '#1d367f', fontFamily: FONTS.bodyBold },
    pillTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    pillSub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
    minText: { fontSize: 22, color: Colors.textMain, marginTop: -6 },
    progressRow: { position: 'absolute', left: 16, right: 16, bottom: 14, flexDirection: 'row', gap: 6 },
    progressBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
    progressBarOn: { backgroundColor: '#ffffff' },
    sheet: { flex: 1, marginTop: -24, backgroundColor: Colors.bgBody, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
    body: { padding: 18, gap: 10, paddingBottom: 40 },
    notice: { padding: 12, borderRadius: 16, backgroundColor: '#dbeafe' },
    noticeText: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: '#1d4ed8' },
    card: { padding: 14, borderRadius: 18, backgroundColor: Colors.bgCard, gap: 4 },
    cardTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18 },
    action: { padding: 16, borderRadius: 18, backgroundColor: '#1d367f', gap: 4 },
    actionTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: '#ffffff' },
    actionSub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: '#dbeafe' },
    flex1: { flex: 1 },
  })
);
