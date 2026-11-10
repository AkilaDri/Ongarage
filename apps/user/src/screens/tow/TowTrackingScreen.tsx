import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton, Colors, distanceKm, FONTS, finalNeedsApproval, Gradient, ModalCard, Pulse, themedStyles, zoomToFit } from '@ongarage/shared';
import { TOW_OPERATORS } from '../../constants/towOperators';
import { money } from '../../utils/format';
import type { TowBidsDraft } from './TowBidsScreen';
import { AppMap } from '../../components/map/AppMap';

/**
 * Step 5 of the towing flow, one job frame as on SOS: the operator's card stays on the sheet the whole time, and only the top area and the status
 * block change. The map shows while the truck comes and while the vehicle is driven; the towing blue band shows at the vehicle and at the drop-off,
 * where a pulsing status says the work is under way and the owner confirms each point.
 */
/** The job once the vehicle is at the drop-off: the final price, and whether the owner approved a price above the quote's limit. */
export type TowFinalDraft = TowBidsDraft & { finalAmount: number; finalReason: string | null; approval: 'none' | 'accepted' | 'declined' };

export type TowTrackingStage =
  | 'requested'
  | 'enroute'
  | 'arrived'
  | 'loading'
  | 'loaded'
  | 'transporting'
  | 'dropping'
  | 'dropped'
  | 'atDrop';

/** The towing blue, the same band as the rest of the flow. */
const TOW_BAND = [
  { offset: '0', color: '#1d367f' },
  { offset: '1', color: '#111f4d' },
];

/** The demo's pace: one minute of truck ETA takes this many milliseconds, so the flow can be tried quickly. */
const MS_PER_MIN = 1500;
/** The demo's drive from the pickup to the drop-off, in the same minutes. */
const TRANSPORT_MINS = 3;
/** The truck takes this long to accept the request (the demo's pace). */
const ACCEPT_AFTER_MS = 2200;
/** After the truck is at the vehicle, the operator confirms the arrival this long after. */
const ARRIVAL_CONFIRM_MS = 2000;
/** The operator loads the vehicle this long; the owner then confirms it on the flatbed. */
const LOAD_MS = 3000;
/** The operator unloads the vehicle this long at the drop-off; the owner then confirms it. */
const DROP_MS = 3000;
/** This is step 4 of the five towing steps. */
const STEP_NO = 4;
/** How many notices stay on the sheet, newest first. */
const MAX_NOTICES = 3;
/** The map shows while the truck comes and while the vehicle is driven. */
const MAP_STAGES: TowTrackingStage[] = ['requested', 'enroute', 'transporting'];

export const TowTrackingScreen: React.FC<{
  draft: TowBidsDraft;
  /** The owner confirmed the vehicle is at the drop-off (and approved any extra): the flow moves on to the completion code. */
  onNext: (draft: TowFinalDraft) => void;
  /** Puts the tow away: the flow keeps running and a return bar shows on Home. */
  onMinimize?: () => void;
  /** Tells the flow which stage the truck is at, so the return bar can say what the owner must do. */
  onStage?: (stage: TowTrackingStage) => void;
  /** The owner cancels before the vehicle is loaded: the fee is what the cancellation costs (none before the truck accepts). */
  onCancel?: (fee: number) => void;
}> = ({ draft, onNext, onMinimize, onStage, onCancel }) => {
  const { bid, vehicle, route } = draft;
  const { height: windowH } = useWindowDimensions();
  const mapH = Math.round(windowH * 0.36);
  const isStuck = vehicle.condition === 'stuck';
  const [stage, setStage] = useState<TowTrackingStage>('requested');
  const [minsLeft, setMinsLeft] = useState(bid.etaMin);
  // How far the vehicle has been driven, 0 to 1, while it is transported.
  const [progress, setProgress] = useState(0);
  // The notices, newest first. A tick marks a confirmation, shown with the green check as on SOS.
  const [notices, setNotices] = useState<{ text: string; tick: boolean }[]>([]);
  // The cancel card: free until the truck accepts; after that, a tenth of the truck's quote.
  const [askCancel, setAskCancel] = useState(false);
  const cancelFee = stage === 'enroute' ? Math.round(bid.quote.total * 0.1) : 0;
  const notify = (text: string, tick = false) => setNotices((cur) => [{ text, tick }, ...cur].slice(0, MAX_NOTICES));
  const op = TOW_OPERATORS.find((o) => o.id === bid.operatorId) ?? null;

  const showMap = MAP_STAGES.includes(stage);
  const carrying = stage === 'transporting';
  const tripKm = distanceKm(route.pickup.coords, route.drop.coords);

  useEffect(() => {
    onStage?.(stage);
  }, [stage]);

  // The truck accepts the request, then drives in.
  useEffect(() => {
    if (stage !== 'requested') return;
    const t = setTimeout(() => {
      notify(`${bid.name} ඔබේ ඉල්ලීම පිළිගත්තා.`, true);
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

  // The operator confirms the arrival; the owner waits on this frame until then.
  useEffect(() => {
    if (stage !== 'arrived') return;
    const t = setTimeout(() => {
      notify(`${bid.name} ළඟා වීම තහවුරු කළා.`, true);
      setStage('loading');
    }, ARRIVAL_CONFIRM_MS);
    return () => clearTimeout(t);
  }, [stage]);

  // The operator loads the vehicle; the owner confirms it once it is on the flatbed.
  useEffect(() => {
    if (stage !== 'loading') return;
    const t = setTimeout(() => setStage('loaded'), LOAD_MS);
    return () => clearTimeout(t);
  }, [stage]);

  // The vehicle is driven to the drop-off: the map follows it, then the operator unloads it.
  useEffect(() => {
    if (stage !== 'transporting') return;
    setProgress(0);
    notify(`${bid.name}: වාහනය ගෙනයෑම ආරම්භ කළා.`);
    const start = Date.now();
    const total = TRANSPORT_MINS * MS_PER_MIN;
    const tick = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / total);
      setProgress(p);
      if (p >= 1) {
        clearInterval(tick);
        setStage('dropping');
      }
    }, 150);
    return () => clearInterval(tick);
  }, [stage]);

  // The operator unloads the vehicle at the drop-off; the owner then confirms it.
  useEffect(() => {
    if (stage !== 'dropping') return;
    const t = setTimeout(() => {
      notify(`${bid.name} වාහනය බැස්සුවා.`, true);
      setStage('dropped');
    }, DROP_MS);
    return () => clearTimeout(t);
  }, [stage]);

  const confirmOnFlatbed = () => setStage('transporting');
  // The driver's final price. In this demo a stuck or accident job can run over the agreed amount; the real price comes from the driver's app.
  const agreed = bid.quote.total;
  const extra = vehicle.condition === 'stuck' || vehicle.condition === 'accident' ? 800 : 0;
  const finalAmount = agreed + extra;
  const finalReason = extra > 0 ? 'වාහනය ඉවත් කරන විට අමතර වැඩ වුණා' : null;
  const needsApproval = finalNeedsApproval(bid.quote, finalAmount);
  const [askApprove, setAskApprove] = useState(false);
  // Once the owner confirms the vehicle is down: a price within the quote moves on at once; above it, the owner decides in this frame.
  const confirmDropped = () => {
    if (needsApproval) setAskApprove(true);
    else onNext({ ...draft, finalAmount, finalReason, approval: 'none' });
  };
  const decideExtra = (approval: 'accepted' | 'declined') => {
    setAskApprove(false);
    onNext({ ...draft, finalAmount: approval === 'accepted' ? finalAmount : agreed, finalReason, approval });
  };

  // The share of the way still to go, from the truck's own base to the vehicle: the map and the distance follow the countdown.
  const frac = bid.etaMin > 0 ? Math.max(0, Math.min(1, minsLeft / bid.etaMin)) : 0;
  const kmLeft = bid.pickupKm * frac;
  const onTheWay = stage === 'transporting' || stage === 'dropping' || stage === 'dropped';
  // While coming, the truck moves in from its base; while carrying, the truck moves from the pickup to the drop-off.
  const truckAt = onTheWay
    ? {
        latitude: route.pickup.coords.latitude + (route.drop.coords.latitude - route.pickup.coords.latitude) * progress,
        longitude: route.pickup.coords.longitude + (route.drop.coords.longitude - route.pickup.coords.longitude) * progress,
      }
    : op && stage === 'enroute'
      ? {
          latitude: route.pickup.coords.latitude + (op.coords.latitude - route.pickup.coords.latitude) * frac,
          longitude: route.pickup.coords.longitude + (op.coords.longitude - route.pickup.coords.longitude) * frac,
        }
      : route.pickup.coords;
  const mapCentre = carrying
    ? { latitude: (route.pickup.coords.latitude + route.drop.coords.latitude) / 2, longitude: (route.pickup.coords.longitude + route.drop.coords.longitude) / 2 }
    : route.pickup.coords;
  const zoom = carrying ? zoomToFit(Math.max(tripKm, 1) * 2, mapCentre.latitude, mapH) : zoomToFit(Math.max(bid.pickupKm, 1) * 2, route.pickup.coords.latitude, mapH);
  const remainingKm = tripKm * (1 - progress);
  const remainingMin = Math.max(0, Math.ceil(TRANSPORT_MINS * (1 - progress)));

  const stageLabel: Record<TowTrackingStage, string> = {
    requested: 'ඉල්ලීම යවා ඇත',
    enroute: `ට්‍රක් එනවා · ${Math.max(0, minsLeft)} min`,
    arrived: 'ට්‍රක් ළඟ පැමිණ තිබේ',
    loading: isStuck ? 'වාහනය ඇදගෙන ඉවත් කරමින්' : 'වාහනය ට්‍රක් එකට ගනිමින්',
    loaded: 'flatbed එකේ — තහවුරු කරන්න',
    transporting: 'වාහනය ගෙනයනවා',
    dropping: 'වාහනය බැස්සවෙමින්',
    dropped: 'බැස්සුවා — තහවුරු කරන්න',
    atDrop: 'ගමනාන්තයට ළඟා වුණා',
  };

  // The status block: one heading per stage, pulsing while the work is under way.
  const pulsing = stage === 'loading' || stage === 'dropping';
  const heading = (): { icon: string; title: string; sub: string } | null => {
    switch (stage) {
      case 'arrived':
        return { icon: '📍', title: 'ට්‍රක් ළඟා විය', sub: `${bid.name} ඔබේ ස්ථානයට ළඟා විය.` };
      case 'loading':
        return {
          icon: isStuck ? '🪝' : '🛻',
          title: isStuck ? 'වාහනය ඇදගෙන ඉවත් කරමින්' : 'වාහනය ට්‍රක් එකට ගනිමින්',
          sub: `${bid.name} වැඩ අවසන් වන තුරු බලා සිටින්න.`,
        };
      case 'loaded':
        return { icon: '✓', title: 'වාහනය ට්‍රක් එකට ගෙන ඇත', sub: `${bid.name} වාහනය තහවුරු කරන්න.` };
      case 'dropping':
        return { icon: '🛻', title: 'වාහනය බැස්සවෙමින්', sub: `${bid.name} වාහනය ගමනාන්තයේ බැස්සවෙමින් සිටී.` };
      case 'dropped':
        return { icon: '✓', title: 'වාහනය බැස්සුවා', sub: `${bid.name} වාහනය ගමනාන්තයේ බැස්සුවා. තහවුරු කරන්න.` };
      default:
        return null;
    }
  };
  const h = heading();
  // The notices step aside while the owner is at the vehicle or at the drop-off, so only the current status shows.
  const quietStep = stage === 'arrived' || stage === 'loading' || stage === 'loaded' || stage === 'dropping' || stage === 'dropped';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* The top: the map while the truck comes and drives, the towing blue band at the vehicle and at the drop-off. The header floats over both. */}
      <View style={[styles.topArea, { height: showMap ? mapH : 130 }]}>
        {!showMap && <Gradient stops={TOW_BAND} />}
        {showMap && (
          <AppMap
            style={StyleSheet.absoluteFill}
            center={mapCentre}
            zoom={zoom}
            fallbackColor="#94a3b8"
            renderOverlay={(project) => {
              const t = project(truckAt);
              const me = project(route.pickup.coords);
              const to = project(route.drop.coords);
              return (
                <>
                  {!carrying && me && (
                    <View style={[styles.pinAnchor, { left: me.x, top: me.y }]} pointerEvents="none">
                      <View style={styles.vehiclePin}>
                        <Text style={styles.pinEmoji}>🚗</Text>
                      </View>
                    </View>
                  )}
                  {carrying && to && (
                    <View style={[styles.pinAnchor, { left: to.x, top: to.y }]} pointerEvents="none">
                      <View style={styles.dropPin}>
                        <Text style={styles.pinEmoji}>🏁</Text>
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
        )}
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
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.progressBar, i < STEP_NO && styles.progressBarOn]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* The distance and the time still to go, as on the SOS tracking card. */}
          {(stage === 'requested' || stage === 'enroute' || stage === 'transporting') && (
            <View style={styles.statCard}>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>ඉතිරි වී ඇති දුර</Text>
                <Text style={styles.statValue}>
                  {stage === 'enroute' ? `${kmLeft.toFixed(2)} km` : stage === 'transporting' ? `${remainingKm.toFixed(2)} km` : '—'}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>{stage === 'transporting' ? 'ගමනාන්තයට තව' : 'ස්ථානයට තව'}</Text>
                <Text style={styles.statValue}>
                  {stage === 'enroute' ? `${Math.max(0, minsLeft)} min` : stage === 'transporting' ? `${remainingMin} min` : '—'}
                </Text>
              </View>
            </View>
          )}

          {/* The notices: each thing the truck does, newest first. */}
          {!quietStep &&
            notices.map((n, i) =>
              n.tick ? (
                <View key={`${i}-${n.text}`} style={styles.acceptedRow}>
                  <Text style={styles.acceptedIcon}>✓</Text>
                  <Text style={styles.acceptedText}>{n.text}</Text>
                </View>
              ) : (
                <View key={`${i}-${n.text}`} style={[styles.notice, i > 0 && styles.noticeOld]}>
                  <Text style={[styles.noticeText, i > 0 && styles.noticeTextOld]}>{n.text}</Text>
                </View>
              )
            )}

          {/* The operator's card, always on the sheet, as the SOS technician card. */}
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

          {/* The status block: the one place the frame changes. */}
          {stage === 'requested' && <Text style={styles.waitText}>ට්‍රක් ඔබේ ඉල්ලීම පිළිගන්නා තුරු බලා සිටින්න.</Text>}
          {stage === 'enroute' && <Text style={styles.waitText}>ට්‍රක් එනකල් බලා සිටින්න.</Text>}
          {stage === 'transporting' && <Text style={styles.waitText}>ගමනාන්තයට ළඟා වෙන විට ඔබට දැනුම් දෙනවා.</Text>}

          {h && (
            <View style={styles.centerBlock}>
              {pulsing ? (
                <View style={styles.loadWrap}>
                  <Pulse style={styles.loadRing} maxScale={1.6} />
                  <View style={styles.arriveDisc}>
                    <Text style={styles.bigEmoji}>{h.icon}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.arriveDisc}>
                  <Text style={styles.bigEmoji}>{h.icon}</Text>
                </View>
              )}
              <Text style={styles.bigTitle}>{h.title}</Text>
              <Text style={styles.bigSub}>{h.sub}</Text>
            </View>
          )}

          {stage === 'arrived' && (
            <View style={styles.centerBlock}>
              <View style={styles.waitChip}>
                <Text style={styles.waitChipText}>⏳ තහවුරු කරන තුරු රැඳී සිටින්න</Text>
              </View>
            </View>
          )}

        </ScrollView>

        {/* The one action of the step sits in the bottom bar, as on SOS and in the bids step. */}
        {(stage === 'requested' || stage === 'enroute') && onCancel && (
          <View style={styles.bottomBar}>
            <ActionButton label="ඉල්ලීම අවලංගු කරන්න" variant="ghost" onPress={() => setAskCancel(true)} />
          </View>
        )}
        {(stage === 'loaded' || stage === 'dropped') && (
          <View style={styles.bottomBar}>
            {stage === 'loaded' ? (
              <ActionButton label="වාහනය flatbed එකේ — තහවුරු කරන්න" variant="primary" onPress={confirmOnFlatbed} />
            ) : (
              <ActionButton label="වාහනය බැස්සූ බව තහවුරු කරන්න" variant="primary" onPress={confirmDropped} />
            )}
          </View>
        )}
      </View>

      {askApprove && (
        <ModalCard
          icon="💬"
          tone="primary"
          title="ගිවිසගත් මිලට වඩා වැඩියි"
          rows={[
            { label: 'ගිවිසගත් මිල', value: money(agreed) },
            { label: 'අමතර වැඩ', value: money(finalAmount - agreed) },
            { label: 'මුළු එකතුව', value: money(finalAmount) },
          ]}
          body={`\n${finalReason ?? ''} ${bid.name} ${money(finalAmount - agreed)} ක අමතර මුදලක් ඉල්ලනවා. අනුමත කරනවාද?`}
        >
          <ActionButton label={`ගිවිසගත් ${money(agreed)} පමණක්`} variant="ghost" compact onPress={() => decideExtra('declined')} />
          <ActionButton label={`${money(finalAmount)} අනුමත කරන්න`} variant="primary" compact onPress={() => decideExtra('accepted')} />
        </ModalCard>
      )}

      {askCancel && (
        <ModalCard
          icon="⚠️"
          tone="danger"
          title="ඉල්ලීම අවලංගු කරන්න ද?"
          rows={[{ label: 'අවලංගු කිරීමේ ගාස්තුව', value: cancelFee > 0 ? money(cancelFee) : 'නොමිලේ' }]}
          body={`\n${cancelFee > 0 ? 'ට්‍රක් ඉල්ලීම පිළිගත් පසු අවලංගු කළොත් ගාස්තුවෙන් 10%ක් අයවේ.' : 'ට්‍රක් කෙනෙක් ඉල්ලීම පිළිගන්නා තුරු නොමිලේ අවලංගු කළ හැක.'}`}
        >
          <ActionButton label="නැහැ" variant="ghost" compact onPress={() => setAskCancel(false)} />
          <ActionButton label="අවලංගු කරන්න" variant="primary" compact onPress={() => onCancel?.(cancelFee)} />
        </ModalCard>
      )}
    </SafeAreaView>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.bgBody },
    flex1: { flex: 1 },
    topArea: { overflow: 'visible' },
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
    dropPin: { position: 'absolute', left: -16, top: -16, width: 32, height: 32, borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
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
    acceptedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
    acceptedIcon: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.success },
    acceptedText: { flex: 1, fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    card: { padding: 14, borderRadius: 18, backgroundColor: Colors.bgCard, gap: 6 },
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
    arriveDisc: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
    loadWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
    loadRing: { position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(22, 163, 74, 0.18)' },
    bigEmoji: { fontSize: 28 },
    bigTitle: { fontSize: 20, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
    bigSub: { fontSize: 13.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
    waitChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#fef3c7' },
    waitChipText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: '#92400e' },
    bottomBar: { padding: 16, paddingTop: 12, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.subtleBorder },
    action: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 26, backgroundColor: '#1d367f', alignItems: 'center', justifyContent: 'center', gap: 2 },
    actionTitle: { fontSize: 15, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    actionSub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: '#dbeafe' },
  })
);
