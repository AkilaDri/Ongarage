import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import {
  ActionButton,
  Colors,
  distanceKm,
  FONTS,
  GoogleMap,
  kmToMapPixels,
  ModalCard,
  nextTowRadiusKm,
  Pulse,
  rankTowOperators,
  themedStyles,
  TOW_RADIUS_STEPS_KM,
  zoomToFit,
  type TowCondition,
  type TowQuote,
} from '@ongarage/shared';
import { TOW_OPERATORS } from '../../constants/towOperators';
import { money } from '../../utils/format';
import type { TowRouteDraft } from './TowRouteScreen';
import type { TowVehicleFull } from './TowVehicleScreen';

/** Screen 3 of the towing flow, in the SOS searching format: the map with the search radius, the search status, the trucks around, and the bids. */
export type TowBid = { operatorId: string; name: string; phone: string; etaMin: number; quote: TowQuote; pickupKm: number };
export type TowBidsDraft = { vehicle: TowVehicleFull; route: TowRouteDraft; bid: TowBid };

/** How long the search runs at one radius before the owner is asked whether to widen it. */
const ASK_WIDEN_AFTER_MS = 3500;
/** The towing blue, the same as the rest of the flow. */
const TOW_BLUE = '#1d367f';

export const TowBidsScreen: React.FC<{
  vehicle: TowVehicleFull;
  route: TowRouteDraft;
  onClose: () => void;
  /** The owner puts the search away: the app shows the return bar and the search keeps running. */
  onMinimize?: () => void;
  /** The owner took a bid. The flow moves on by itself. */
  onNext: (draft: TowBidsDraft) => void;
}> = ({ vehicle, route, onClose, onMinimize, onNext }) => {
  const { height: windowH } = useWindowDimensions();
  const mapH = Math.round(windowH * 0.42);
  const condition: TowCondition = vehicle.condition;
  const lat = route.pickup.coords.latitude;
  const [radius, setRadius] = useState<number>(TOW_RADIUS_STEPS_KM[0]);
  const [stopped, setStopped] = useState(false);
  const [askWiden, setAskWiden] = useState(false);
  const [round, setRound] = useState(0);
  const spin = useRef(new Animated.Value(0)).current;

  // Trucks that can take the job within the radius, cheapest first. Busy operators and wrong trucks are left out by the shared rules.
  const bids = useMemo(() => {
    const inside = TOW_OPERATORS.filter((op) => distanceKm(route.pickup.coords, op.coords) <= radius);
    return rankTowOperators(inside, route.pickup.coords, route.drop.coords, condition, Date.now());
  }, [radius, route, condition]);

  // Trucks around the vehicle, nearest first.
  const nearby = useMemo(
    () =>
      TOW_OPERATORS.map((op) => ({ op, km: distanceKm(route.pickup.coords, op.coords) }))
        .sort((a, b) => a.km - b.km)
        .slice(0, 6),
    [route.pickup.coords]
  );

  const next = nextTowRadiusKm(radius);
  const searching = !stopped && !askWiden && bids.length === 0 && next !== null;
  const farther = radius > TOW_RADIUS_STEPS_KM[0];
  const cheapest = bids[0];

  // Radar: the core turns while the search runs.
  useEffect(() => {
    if (!searching) {
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [searching, spin]);

  // No truck has bid at this radius: after a short wait the owner is asked whether to widen it, as in SOS.
  useEffect(() => {
    if (!searching) return;
    const t = setTimeout(() => setAskWiden(true), ASK_WIDEN_AFTER_MS);
    return () => clearTimeout(t);
  }, [searching, radius, round]);

  const widen = () => {
    if (next === null) return;
    setAskWiden(false);
    setRadius(next);
  };
  // The owner keeps the radius: the search stops, and "ask again" is offered.
  const keepRadius = () => {
    setAskWiden(false);
    setStopped(true);
  };
  // Ask the trucks around again from the nearest step, with the search running again.
  const askAgain = () => {
    setRadius(TOW_RADIUS_STEPS_KM[0]);
    setStopped(false);
    setAskWiden(false);
    setRound((r) => r + 1);
  };

  const takeBid = (b: (typeof bids)[number]) =>
    onNext({
      vehicle,
      route,
      bid: { operatorId: b.op.id, name: b.op.name, phone: b.op.phone, etaMin: b.etaMin, quote: b.quote, pickupKm: b.pickupKm },
    });

  const spinRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const zoom = zoomToFit(radius * 2, lat, mapH);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* The map with the search radius, full width on top. The header floats over it. */}
      <View style={[styles.topArea, { height: mapH }]}>
        <GoogleMap
          style={StyleSheet.absoluteFill}
          center={route.pickup.coords}
          zoom={zoom}
          fallbackColor="#ef4444"
          renderOverlay={(project) => {
            const me = project(route.pickup.coords);
            return (
              <>
                {me && (
                  <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
                    <Circle
                      cx={me.x}
                      cy={me.y}
                      r={kmToMapPixels(radius, lat, zoom)}
                      fill="rgba(29, 54, 127, 0.12)"
                      stroke="rgba(29, 54, 127, 0.75)"
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                    />
                  </Svg>
                )}
                {me && (
                  <View style={[styles.pinAnchor, { left: me.x, top: me.y }]} pointerEvents="none">
                    <View style={styles.vehiclePin}>
                      <Text style={styles.pinEmoji}>🚗</Text>
                    </View>
                  </View>
                )}
                {nearby.map(({ op }) => {
                  const p = project(op.coords);
                  return p ? (
                    <View key={op.id} style={[styles.pinAnchor, { left: p.x, top: p.y }]} pointerEvents="none">
                      <View style={styles.truckPin}>
                        <Text style={styles.pinEmoji}>🛻</Text>
                      </View>
                    </View>
                  ) : null;
                })}
              </>
            );
          }}
        />

        {/* The SOS header, in the towing blue: close on the left and the step pill, as on the SOS search. */}
        <View style={styles.topBar}>
          <Pressable style={styles.roundBtn} onPress={onClose} accessibilityLabel="Close towing">
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <View style={styles.pill}>
            <View style={styles.pillDisc}>
              <Text style={styles.pillEmoji}>📡</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.pillTitle} numberOfLines={1}>Ongarage Towing</Text>
              <View style={styles.stepRow}>
                <View style={styles.stepChip}>
                  <Text style={styles.stepNo}>3/5</Text>
                </View>
                <Text style={styles.pillSub} numberOfLines={1}>{bids.length > 0 ? '· මිල ගණන්' : '· ට්‍රක් සොයමින්'}</Text>
              </View>
            </View>
          </View>
          {/* The minimise slot, as in SOS: shown while the owner can put the search away. */}
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
        <View style={styles.progressRow}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.progressBar, i <= 2 && styles.progressBarOn]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.body} key={round} showsVerticalScrollIndicator={false}>
          {/* The search status: the radar while it runs, the result once a truck has bid. */}
          <View style={[styles.card, styles.rowCenter]}>
            <View style={styles.radarWrap}>
              <Pulse style={styles.radarRing} maxScale={1.6} />
              <Animated.View style={[styles.radarCore, { transform: [{ rotate: spinRotate }] }]}>
                <Text style={styles.radarEmoji}>📡</Text>
              </Animated.View>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.cardTitle}>
                {bids.length > 0 ? `ට්‍රක් ${bids.length} ක් මිල දුන්නා` : searching ? 'ළඟම ට්‍රක් සොයමින්...' : 'ට්‍රක් මිල දුන්නේ නැහැ'}
              </Text>
              <Text style={styles.cardSub}>{`km ${radius} ක් ඇතුළත සොයා ඔබව සම්බන්ධ කරනු ඇත.`}</Text>
              {farther && <Text style={styles.cardSub}>දුරින් එන ට්‍රක් තිබේ. ඒවාට මිල වැඩි වෙන්න පුළුවන්.</Text>}
            </View>
          </View>

          {/* Three figures, as in the SOS search: the radius, the cheapest price so far, and how many trucks have bid. */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{`km ${radius}`}</Text>
              <Text style={styles.statLabel}>සෙවුම් කලාපය</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: Colors.warning }]}>{cheapest ? money(cheapest.quote.total) : '—'}</Text>
              <Text style={styles.statLabel}>සුළුම මිල</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{bids.length}</Text>
              <Text style={styles.statLabel}>මිල දුන් ට්‍රක්</Text>
            </View>
          </View>

          {bids.length > 0 && <Text style={styles.sectionLabel}>මිල දුන් ට්‍රක්</Text>}
          {bids.map((b, i) => (
            <Pressable key={b.op.id} style={styles.bid} onPress={() => takeBid(b)} accessibilityLabel={`Take bid from ${b.op.name} ${money(b.quote.total)}`}>
              <View style={styles.flex1}>
                <View style={styles.bidTop}>
                  <Text style={styles.bidName} numberOfLines={1}>{b.op.name}</Text>
                  {i === 0 && (
                    <View style={styles.cheapTag}>
                      <Text style={styles.cheapText}>සුළුම මිල</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardSub}>{`★ ${b.op.rating.toFixed(1)} · ${b.etaMin} min · ${b.pickupKm} km`}</Text>
              </View>
              <Text style={styles.bidTotal}>{money(b.quote.total)}</Text>
            </Pressable>
          ))}

          <Text style={styles.sectionLabel}>ළඟ ඇති ට්‍රක්</Text>
          {nearby.map(({ op, km }) => {
            const inside = km <= radius;
            return (
              <View key={op.id} style={[styles.card, styles.rowCenter]}>
                <View style={styles.truckIcon}>
                  <Text style={styles.truckIconText}>🛻</Text>
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{op.name}</Text>
                  <Text style={styles.cardSub}>{`${km.toFixed(1)} km`}</Text>
                </View>
                <View style={[styles.statusPill, inside ? styles.statusPillOn : styles.statusPillOff]}>
                  <Text style={[styles.statusPillText, inside ? styles.statusTextOn : styles.statusTextOff]}>{inside ? '✓ ළඟයි' : 'කලාපයෙන් පිටත'}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* The bottom action, as in SOS: stop the search while it runs, ask again once it has stopped. */}
        {bids.length === 0 && (
          <View style={styles.bottomBar}>
            {searching ? (
              <ActionButton label="සෙවීම නවත්වන්න" variant="ghost" onPress={keepRadius} />
            ) : (
              <ActionButton label="නැවත ඉල්ලන්න" variant="primary" onPress={askAgain} />
            )}
          </View>
        )}
      </View>

      {askWiden && next !== null && (
        <ModalCard
          icon="📡"
          tone="primary"
          title="සෙවුම් කලාපය පුළුල් කරමින්"
          rows={[{ label: 'Search radius', value: `km ${radius} → km ${next}` }]}
          body={'\nමෙම කලාපයේ ට්‍රක් නැත. ඒ නිසා සෙවුම් කලාපය වැඩි කරන්න ද?'}
        >
          <ActionButton label="නැහැ, නැවත සොයන්න" variant="ghost" compact onPress={keepRadius} />
          <ActionButton label="ඔව්, වැඩි කරන්න" variant="primary" compact onPress={widen} />
        </ModalCard>
      )}
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
    closeText: { fontSize: 18, color: Colors.textMain, marginTop: -2 },
    minText: { fontSize: 22, color: Colors.textMain, marginTop: -6 },
    topSlot: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
    pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: Colors.bgCard },
    pillDisc: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
    pillEmoji: { fontSize: 20 },
    pillTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    pillSub: { flexShrink: 1, fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stepChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#dbeafe' },
    stepNo: { fontSize: 12, color: TOW_BLUE, fontFamily: FONTS.bodyBold },
    pinAnchor: { position: 'absolute', width: 0, height: 0 },
    vehiclePin: { position: 'absolute', left: -18, top: -18, width: 36, height: 36, borderRadius: 18, backgroundColor: TOW_BLUE, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
    truckPin: { position: 'absolute', left: -15, top: -15, width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 },
    pinEmoji: { fontSize: 15 },
    sheet: { flex: 1, marginTop: -24, backgroundColor: Colors.bgBody, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', shadowColor: '#3c4043', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 8 },
    progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, paddingTop: 12 },
    progressBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: Colors.subtleBorder },
    progressBarOn: { backgroundColor: '#1a73e8' },
    body: { padding: 16, gap: 12, paddingBottom: 24 },
    card: { padding: 14, borderRadius: 18, backgroundColor: Colors.bgCard, gap: 6 },
    rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    radarWrap: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
    radarRing: { position: 'absolute', width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(29, 54, 127, 0.18)' },
    radarCore: { width: 44, height: 44, borderRadius: 22, backgroundColor: TOW_BLUE, alignItems: 'center', justifyContent: 'center' },
    radarEmoji: { fontSize: 20 },
    cardTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    cardSub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18 },
    statsRow: { flexDirection: 'row', gap: 8 },
    statBox: { flex: 1, padding: 12, borderRadius: 16, backgroundColor: Colors.bgCard, alignItems: 'center', gap: 2 },
    statValue: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    statLabel: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center' },
    sectionLabel: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.textMain, marginTop: 4 },
    truckIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.subtleFill, alignItems: 'center', justifyContent: 'center' },
    truckIconText: { fontSize: 21 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusPillOn: { backgroundColor: '#dcfce7' },
    statusPillOff: { backgroundColor: Colors.subtleFill },
    statusPillText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold },
    statusTextOn: { color: '#15803d' },
    statusTextOff: { color: Colors.textMuted },
    bid: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: Colors.bgCard },
    bidTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    bidName: { flexShrink: 1, fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    cheapTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#dbeafe' },
    cheapText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: '#1d4ed8' },
    bidTotal: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    bottomBar: { padding: 16, paddingTop: 12, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.subtleBorder },
  })
);
