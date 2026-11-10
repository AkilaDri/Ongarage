import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FONTS, Gradient, SCHEDULED_CANCEL_TIERS, scheduledCancelFee, themedStyles } from '@ongarage/shared';
import { money } from '../../utils/format';
import type { TowBidsDraft } from './TowBidsScreen';
import type { TowRouteDraft } from './TowRouteScreen';

/**
 * Screen for a scheduled tow: the truck's time is held and the owner sees what cancelling costs right now.
 * The fee follows the shared rule for how many days are left before the slot.
 */
export type TowHoldDraft = TowBidsDraft & { cancelled: boolean; cancelFee: number };

const TOW_BAND = [
  { offset: '0', color: '#1d367f' },
  { offset: '1', color: '#111f4d' },
];

const slotLabel = (route: TowRouteDraft) => {
  if (route.timing.mode !== 'scheduled') return 'දැන්';
  const d = new Date(Date.now() + route.timing.dayOffset * 86400000);
  const day = route.timing.dayOffset === 0 ? 'අද' : route.timing.dayOffset === 1 ? 'හෙට' : d.toLocaleDateString('si-LK', { weekday: 'short', day: 'numeric' });
  return `${day} · ${String(route.timing.hour).padStart(2, '0')}:00`;
};

export const TowHoldScreen: React.FC<{
  draft: TowBidsDraft;
  /** Closes the booking: the flow ends with the fee that was charged (zero when free). */
  onDone: (draft: TowHoldDraft) => void;
}> = ({ draft, onDone }) => {
  const { bid, route } = draft;
  const daysBefore = route.timing.mode === 'scheduled' ? route.timing.dayOffset : 0;
  const feeNow = scheduledCancelFee(bid.quote.total, daysBefore);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const cancel = () => onDone({ ...draft, cancelled: true, cancelFee: feeNow });
  const keep = () => onDone({ ...draft, cancelled: false, cancelFee: 0 });

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.band}>
        <Gradient stops={TOW_BAND} />
        <View style={styles.topBar}>
          <View style={styles.pill}>
            <View style={styles.pillDisc}><Text style={styles.pillEmoji}>📅</Text></View>
            <View style={styles.flex1}>
              <Text style={styles.pillTitle} numberOfLines={1}>{`${slotLabel(route)} ට ඇණවුම් වුණා`}</Text>
              <Text style={styles.pillSub} numberOfLines={1}>{bid.name}</Text>
            </View>
          </View>
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
            <Text style={styles.cardTitle}>ට්‍රක් වේලාව රඳවා තිබේ</Text>
            <Text style={styles.sub}>{`${slotLabel(route)} · ${route.drop.name}`}</Text>
            <Text style={styles.total}>{money(bid.quote.total)}</Text>
            <Text style={styles.sub}>ගිවිසගත් මිල</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>අවලංගු කිරීමේ ගාස්තු</Text>
            <Text style={styles.sub}>{`${SCHEDULED_CANCEL_TIERS.freeDays} දින හෝ ඊට වැඩි කලින් — නොමිලේ`}</Text>
            <Text style={styles.sub}>{`දින 1–2 කලින් — ගිවිසගත් මිලෙන් ${SCHEDULED_CANCEL_TIERS.lateSharePct}%`}</Text>
            <Text style={styles.sub}>{`ඇණවුම් දිනයේම — ගිවිසගත් මිලෙන් ${SCHEDULED_CANCEL_TIERS.sameDayPct}%`}</Text>
            <Text style={styles.feeNow}>{feeNow === 0 ? 'දැන් අවලංගු කළොත්: නොමිලේ' : `දැන් අවලංගු කළොත්: ${money(feeNow)}`}</Text>
          </View>

          {!confirmCancel ? (
            <>
              <Pressable style={styles.action} onPress={keep} accessibilityLabel="Keep the booking">
                <Text style={styles.actionTitle}>ඇණවුම තහවුරුයි</Text>
              </Pressable>
              <Pressable style={styles.secondary} onPress={() => setConfirmCancel(true)} accessibilityLabel="Cancel the booking">
                <Text style={styles.secondaryText}>අවලංගු කරන්න</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{feeNow === 0 ? 'ඇණවුම අවලංගු කරන්නද?' : `${money(feeNow)} ගෙවා අවලංගු කරන්නද?`}</Text>
              <Pressable style={styles.action} onPress={cancel} accessibilityLabel="Confirm cancelling">
                <Text style={styles.actionTitle}>ඔව්, අවලංගු කරන්න</Text>
              </Pressable>
              <Pressable style={styles.secondary} onPress={() => setConfirmCancel(false)} accessibilityLabel="Keep it">
                <Text style={styles.secondaryText}>නැහැ, තබන්න</Text>
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
    total: { fontSize: 24, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18 },
    feeNow: { fontSize: 14, fontFamily: FONTS.bodyBold, color: '#1d367f', marginTop: 4 },
    action: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1d367f' },
    actionTitle: { fontSize: 15, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    secondary: { height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard },
    secondaryText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: '#1d367f' },
    flex1: { flex: 1 },
  })
);
