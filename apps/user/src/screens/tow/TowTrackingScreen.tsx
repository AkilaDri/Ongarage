import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FONTS, themedStyles, zoomToFit } from '@ongarage/shared';
import { TOW_OPERATORS } from '../../constants/towOperators';
import { money } from '../../utils/format';
import type { TowBidsDraft } from './TowBidsScreen';
import { AppMap } from '../../components/map/AppMap';

/**
 * Step 5 of the towing flow: the request goes to the chosen truck, the truck accepts, comes, the owner confirms it is there, the vehicle goes on the
 * flatbed, and it is driven to the drop-off. Laid out as the SOS tracking screen: the map on top, a step pill, and a rounded sheet with the notices
 * (accepted, arrived, moving), the distance and time, the truck's card, and one confirmation at each stage.
 */
export type TowTrackingStage = 'requested' | 'enroute' | 'arrived' | 'loading' | 'transporting' | 'atDrop';

/** The demo's pace: one minute of truck ETA takes this many milliseconds, so the flow can be tried quickly. */
const MS_PER_MIN = 1500;
/** The demo's drive from the vehicle to the drop-off, in the same minutes. */
const TRANSPORT_MINS = 3;
/** The truck takes this long to accept the request (the demo's pace). */
const ACCEPT_AFTER_MS = 2200;
/** After the truck is at the vehicle, the operator confirms the arrival this long after (the demo's pace). */
const ARRIVAL_CONFIRM_MS = 2000;
/** This is step 5 of the six towing steps. */
const STEP_NO = 5;
/** How many notices stay on the sheet, newest first. */
const MAX_NOTICES = 3;

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
  const { height: windowH } = useWindowDimensions();
  const mapH = Math.round(windowH * 0.36);
  const isStuck = vehicle.condition === 'stuck';
  const [stage, setStage] = useState<TowTrackingStage>('requested');
  const [minsLeft, setMinsLeft] = useState(bid.etaMin);
  // The notices, newest first: the owner sees each thing the truck does, in order.
  const [notices, setNotices] = useState<string[]>([]);
  const notify = (text: string) => setNotices((cur) => [text, ...cur].slice(0, MAX_NOTICES));
  const op = TOW_OPERATORS.find((o) => o.id === bid.operatorId) ?? null;

  useEffect(() => {
    onStage?.(stage);
  }, [stage]);

  // The truck accepts the request, then drives in.
  useEffect(() => {
    if (stage !== 'requested') return;
    const t = setTimeout(() => {
      notify(`${bid.name} ඔබේ ඉල්ලීම පිළිගත්තා.`);
      setStage('enroute');
    }, ACCEPT_AFTER_MS);
    return () => clearTimeout(t);
  }, [stage]);

  // The ETA counts down, then the truck is at the vehicle.
  useEffect(() => {
    if (stage !== 'enroute') return;
    if (minsLeft <= 0) {
      notify(`${bid.name} ට්‍රක් ළඟ පැමිණ ඇත.`);
      setStage('arrived');
      return;
    }
    const t = setTimeout(() => setMinsLeft((m) => m - 1), MS_PER_MIN);
    return () => clearTimeout(t);
  }, [stage, minsLeft]);

  // The driver sends a notice once the move has started, then the trip ends at the drop-off.
  useEffect(() => {
    if (stage !== 'transporting') return;
    notify(`${bid.name}: වාහනය ගෙනයෑම ආරම්භ කළා.`);
    const t = setTimeout(() => {
      setStage('atDrop');
      onNext({ ...draft, stage: 'atDrop' });
    }, MS_PER_MIN * TRANSPORT_MINS);
    return () => clearTimeout(t);
  }, [stage]);

  // The operator confirms the arrival; the owner waits on this screen until then, as SOS does for the technician.
  useEffect(() => {
    if (stage !== 'arrived') return;
    const t = setTimeout(() => {
      notify(`${bid.name} ළඟා වීම තහවුරු කළා.`);
      setStage('loading');
    }, ARRIVAL_CONFIRM_MS);
    return () => clearTimeout(t);
  }, [stage]);
  const confirmOnFlatbed = () => setStage('transporting');

  // The share of the way still to go, from the truck's own base to the vehicle: the map and the distance follow the countdown.
  const frac = bid.etaMin > 0 ? Math.max(0, Math.min(1, minsLeft / bid.etaMin)) : 0;
  const kmLeft = bid.pickupKm * frac;
  const truckAt =
    op && stage === 'enroute'
      ? {
          latitude: route.pickup.coords.latitude + (op.coords.latitude - route.pickup.coords.latitude) * frac,
          longitude: route.pickup.coords.longitude + (op.coords.longitude - route.pickup.coords.longitude) * frac,
        }
      : route.pickup.coords;
  const zoom = zoomToFit(Math.max(bid.pickupKm, 1) * 2, route.pickup.coords.latitude, mapH);

  const stageLabel: Record<TowTrackingStage, string> = {
    requested: 'ඉල්ලීම යවා ඇත',
    enroute: `ට්‍රක් එනවා · ${Math.max(0, minsLeft)} min`,
    arrived: 'ට්‍රක් ළඟ පැමිණ තිබේ',
    loading: isStuck ? 'වාහනය ඇදගෙන ඉවත් කරමින්' : 'වාහනය flatbed එකට ගන්නවා',
    transporting: 'වාහනය ගෙනයනවා',
    atDrop: 'ගමනාන්තයට ළඟා වුණා',
  };
  const accepted = stage !== 'requested';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* The map on top with the truck and the vehicle. The header floats over it, as in SOS. No close: the job is locked once a truck has accepted. */}
      <View style={[styles.topArea, { height: mapH }]}>
        <AppMap
          style={StyleSheet.absoluteFill}
          center={route.pickup.coords}
          zoom={zoom}
          fallbackColor="#94a3b8"
          renderOverlay={(project) => {
            const me = project(route.pickup.coords);
            const t = project(truckAt);
            return (
              <>
                {me && (
                  <View style={[styles.pinAnchor, { left: me.x, top: me.y }]} pointerEvents="none">
                    <View style={styles.vehiclePin}>
                      <Text style={styles.pinEmoji}>🚗</Text>
                    </View>
                  </View>
                )}
                {t && (
                  <View style={[styles.pinAnchor, { left: t.x, top: t.y }]} pointerEvents="none">
                    <View style={styles.truckPin}>
                      <Text style={styles.pinEmoji}>🛻</Text>
                    </View>
                  </View>
                )}
              </>
            );
          }}
        />
        <View style={styles.topBar}>
          <View style={styles.pill}>
            <View style={styles.pillDisc}>
              <Text style={styles.pillEmoji}>🛻</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.pillTitle} numberOfLines={1}>Ongarage Towing</Text>
              <View style={styles.stepRow}>
                <View style={styles.stepChip}>
                  <Text style={styles.stepNo}>{`${STEP_NO}/6`}</Text>
                </View>
                <Text style={styles.pillSub} numberOfLines={1}>{`· ${stageLabel[stage]}`}</Text>
              </View>
            </View>
          </View>
          {onMinimize && (
            <Pressable style={styles.roundBtn} onPress={onMinimize} accessibilityLabel="Minimise towing">
              <Text style={styles.minText}>⌄</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.progressRow}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.progressBar, i < STEP_NO && styles.progressBarOn]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* The distance and the time still to go, as on the SOS tracking card. */}
          {(stage === 'requested' || stage === 'enroute') && (
          <View style={styles.statCard}>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>ඉතිරි වී ඇති දුර</Text>
              <Text style={styles.statValue}>{stage === 'enroute' ? `${kmLeft.toFixed(2)} km` : accepted ? 'ළඟයි' : '—'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>ස්ථානයට තව</Text>
              <Text style={styles.statValue}>{stage === 'enroute' ? `${Math.max(0, minsLeft)} min` : '—'}</Text>
            </View>
          </View>
          )}

          {/* The notices: each thing the truck does, newest first. */}
          {notices.map((n, i) => (
            <View key={`${i}-${n}`} style={[styles.notice, i > 0 && styles.noticeOld]}>
              <Text style={[styles.noticeText, i > 0 && styles.noticeTextOld]}>{n}</Text>
            </View>
          ))}

          {/* The truck's card, as the SOS technician card: who is coming, the call button, and the estimated price. */}
          <View style={styles.card}>
            <View style={styles.opRow}>
              <View style={styles.opDisc}>
                <Text style={styles.opEmoji}>🛻</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.opName} numberOfLines={2}>{bid.name}</Text>
                {op && <Text style={styles.sub}>{`★ ${op.rating.toFixed(1)} · සමාලෝචන ${op.reviews}`}</Text>}
              </View>
            </View>
            <Text style={styles.sub}>{`${vehicle.source === 'temp' ? vehicle.plate : 'ඔබේ වාහනය'} · ගමනාන්තය: ${route.drop.name}`}</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.phoneText}>{bid.phone}</Text>
              <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${bid.phone.replace(/\s/g, '')}`)} accessibilityLabel="Call the truck driver">
                <Text style={styles.callIcon}>📞</Text>
              </Pressable>
            </View>
            <View style={styles.feeBlock}>
              <Text style={styles.sub}>ඇස්තමේන්තුගත ගාස්තුව</Text>
              <Text style={styles.feeValue}>{money(bid.quote.total)}</Text>
            </View>
          </View>

          {stage === 'requested' && <Text style={styles.waitText}>ට්‍රක් ඔබේ ඉල්ලීම පිළිගන්නා තුරු බලා සිටින්න.</Text>}

          {stage === 'enroute' && <Text style={styles.waitText}>ට්‍රක් එනකල් බලා සිටින්න.</Text>}

          {/* Arrived: as the SOS arrival card. The owner waits here while the operator confirms the arrival. */}
          {stage === 'arrived' && (
            <View style={styles.centerBlock}>
              <View style={styles.arriveDisc}>
                <Text style={styles.bigEmoji}>📍</Text>
              </View>
              <Text style={styles.bigTitle}>ට්‍රක් ළඟා විය</Text>
              <Text style={styles.bigSub}>{`${bid.name} ඔබේ වාහනය තිබෙන ස්ථානයට ළඟා විය.`}</Text>
              <View style={styles.waitChip}>
                <Text style={styles.waitChipText}>⏳ තහවුරු කරන තුරු රැඳී සිටින්න</Text>
              </View>
            </View>
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
    flex1: { flex: 1 },
    topArea: { overflow: 'hidden' },
    topBar: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
    minText: { fontSize: 22, color: Colors.textMain, marginTop: -6 },
    pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: Colors.bgCard },
    pillDisc: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
    pillEmoji: { fontSize: 20 },
    pillTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    pillSub: { flexShrink: 1, fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stepChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#dbeafe' },
    stepNo: { fontSize: 12, color: '#1d367f', fontFamily: FONTS.bodyBold },
    pinAnchor: { position: 'absolute', width: 0, height: 0 },
    vehiclePin: { position: 'absolute', left: -18, top: -18, width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff', borderWidth: 3, borderColor: '#1d367f', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
    truckPin: { position: 'absolute', left: -18, top: -18, width: 36, height: 36, borderRadius: 18, backgroundColor: '#1d367f', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
    pinEmoji: { fontSize: 15 },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder, marginTop: 10 },
    progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, paddingTop: 12 },
    progressBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: Colors.subtleBorder },
    progressBarOn: { backgroundColor: '#1a73e8' },
    sheet: { flex: 1, marginTop: -24, backgroundColor: Colors.bgBody, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
    body: { padding: 16, gap: 10, paddingBottom: 24 },
    statCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 18, backgroundColor: Colors.bgCard },
    statCell: { flex: 1, alignItems: 'center', gap: 4 },
    statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: Colors.subtleBorder },
    statValue: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMain },
    statLabel: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    notice: { padding: 12, borderRadius: 16, backgroundColor: '#dbeafe' },
    noticeOld: { backgroundColor: Colors.bgCard },
    noticeText: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: '#1d4ed8' },
    noticeTextOld: { color: Colors.textMuted, fontFamily: FONTS.bodyRegular },
    card: { padding: 14, borderRadius: 18, backgroundColor: Colors.bgCard, gap: 6 },
    cardTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18 },
    opRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    opDisc: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.subtleFill, alignItems: 'center', justifyContent: 'center' },
    opEmoji: { fontSize: 20 },
    opName: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain, lineHeight: 20 },
    phoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
    phoneText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
    callIcon: { fontSize: 16 },
    feeBlock: { gap: 2 },
    feeValue: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMain },
    waitText: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', paddingTop: 4 },
    centerBlock: { alignItems: 'center', gap: 8, paddingVertical: 8 },
    bigDisc: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1d367f', alignItems: 'center', justifyContent: 'center' },
    arriveDisc: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
    waitChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#fef3c7' },
    waitChipText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: '#92400e' },
    bigEmoji: { fontSize: 28 },
    bigTitle: { fontSize: 20, fontFamily: FONTS.titleBold, color: Colors.textMain },
    bigSub: { fontSize: 13.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
    action: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 26, backgroundColor: '#1d367f', alignItems: 'center', justifyContent: 'center', gap: 2 },
    actionTitle: { fontSize: 15, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    actionSub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: '#dbeafe' },
  })
);
