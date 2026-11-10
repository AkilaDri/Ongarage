import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import {
  ActionButton,
  Colors,
  distanceKm,
  FONTS,
  kmToMapPixels,
  ModalCard,
  canDoSites,
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
import { TOW_SITE_TEXT } from '../../constants/towSites';
import { TowOperatorSheet } from './TowOperatorSheet';
import { money } from '../../utils/format';
import type { TowRouteDraft } from './TowRouteScreen';
import type { TowVehicleFull } from './TowVehicleScreen';
import { AppMap } from '../../components/map/AppMap';

/**
 * Step 4 of the towing flow: the trucks' quotes. The quotes are the main thing on screen; the owner taps one,
 * and a bottom bar shows the chosen truck and its price with the confirm button.
 */
export type TowBid = { operatorId: string; name: string; phone: string; etaMin: number; quote: TowQuote; pickupKm: number };
export type TowBidsDraft = { vehicle: TowVehicleFull; route: TowRouteDraft; bid: TowBid };

/** How long the search runs at one radius before the owner is asked whether to widen it. */
const ASK_WIDEN_AFTER_MS = 3500;
/** The towing blue, the same as the rest of the flow. */
const TOW_BLUE = '#1d367f';
/** Trucks answer one by one: the first quote comes after a short search, then the others follow, each a moment apart. */
const FIRST_QUOTE_MS = 2600;
const NEXT_QUOTE_MS = 1400;

/** A new quote eases in. The cheapest one also gets a single soft ring, once, and then stays still. */
const QuoteIn: React.FC<{ children: React.ReactNode; ring?: boolean }> = ({ children, ring }) => {
  const a = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    if (ring) Animated.timing(halo, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [a, halo, ring]);
  return (
    <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
      {children}
      {ring && (
        <Animated.View pointerEvents="none" style={[styles.ring, { opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }), transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] }]} />
      )}
    </Animated.View>
  );
};

export const TowBidsScreen: React.FC<{
  vehicle: TowVehicleFull;
  route: TowRouteDraft;
  onClose: () => void;
  /** The owner puts the search away: the app shows the return bar and the search keeps running. */
  onMinimize?: () => void;
  /** The owner confirmed a truck. The flow moves on by itself. */
  onNext: (draft: TowBidsDraft) => void;
  /** A scheduled tow: the request goes out for this slot, and trucks free at that time confirm it. Set to the slot's label. */
  slotLabel?: string;
  /** Back to the time step, to pick another time when no truck is free at this one. */
  onChangeTime?: () => void;
}> = ({ vehicle, route, onClose, onMinimize, onNext, slotLabel, onChangeTime }) => {
  const { height: windowH } = useWindowDimensions();
  const mapH = Math.round(windowH * 0.36);
  const condition: TowCondition = vehicle.condition;
  const lat = route.pickup.coords.latitude;
  const [radius, setRadius] = useState<number>(TOW_RADIUS_STEPS_KM[0]);
  const [stopped, setStopped] = useState(false);
  const [askWiden, setAskWiden] = useState(false);
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  // The truck whose profile is open (from a row or a pin on the map).
  const [profileId, setProfileId] = useState<string | null>(null);
  const spin = useRef(new Animated.Value(0)).current;

  // Trucks that can take the job within the radius, cheapest first. Busy operators and wrong trucks are left out by the shared rules.
  const bids = useMemo(() => {
    const inside = TOW_OPERATORS.filter((op) => distanceKm(route.pickup.coords, op.coords) <= radius);
    return rankTowOperators(inside, route.pickup.coords, route.drop.coords, condition, Date.now(), route.sites ?? []);
  }, [radius, route, condition]);

  // Trucks around the vehicle, nearest first.
  const nearby = useMemo(
    () =>
      TOW_OPERATORS.map((op) => ({ op, km: distanceKm(route.pickup.coords, op.coords) }))
        .sort((a, b) => a.km - b.km)
        .slice(0, 6),
    [route.pickup.coords]
  );

  // The quotes the owner can see so far: they arrive one at a time, never all at once.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    setPicked(null);
    if (bids.length === 0) return;
    const timers = bids.map((_, i) => setTimeout(() => setShown(i + 1), FIRST_QUOTE_MS + i * NEXT_QUOTE_MS));
    return () => timers.forEach(clearTimeout);
  }, [radius, round, bids.length]);
  const quotes = bids.slice(0, shown);
  const chosen = quotes.find((b) => b.op.id === picked) ?? null;

  const next = nextTowRadiusKm(radius);
  const searching = !stopped && !askWiden && quotes.length === 0 && next !== null;
  const farther = radius > TOW_RADIUS_STEPS_KM[0];

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

  // Confirm hands the request to the tracking screen at once: that screen shows the chosen truck and the notices from then on.
  const confirmChosen = () => {
    if (!chosen) return;
    onNext({
      vehicle,
      route,
      bid: { operatorId: chosen.op.id, name: chosen.op.name, phone: chosen.op.phone, etaMin: chosen.etaMin, quote: chosen.quote, pickupKm: chosen.pickupKm },
    });
  };

  const spinRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const zoom = zoomToFit(radius * 2, lat, mapH);
  const quotedIds = new Set(quotes.map((b) => b.op.id));
  // The price each quoted truck shows on its map pin, and how many of the nearby trucks have quoted.
  const quoteTotal = new Map(quotes.map((b) => [b.op.id, b.quote.total]));
  const nearbyQuoted = nearby.filter(({ op }) => quotedIds.has(op.id)).length;
  // One meaning per status: the search area, the truck's own state, and whether it has quoted this job.
  const statusOf = (op: (typeof TOW_OPERATORS)[number], km: number) => {
    if (km > radius) return 'ප්‍රදේශයෙන් පිටත';
    if (!op.available) return 'දැන් කාර්යබහුලයි';
    if (!canDoSites(op, route.sites)) return 'මෙම වැඩට නොහැක';
    if (quotedIds.has(op.id)) return slotLabel ? 'වේලාවට නිදහසයි' : 'මිල දුන්නා';
    return slotLabel ? 'වේලාවට නිදහස් නැත' : 'මිල බලා සිටිනවා';
  };
  const profileOp = profileId ? (TOW_OPERATORS.find((o) => o.id === profileId) ?? null) : null;
  const profileKm = profileOp ? distanceKm(route.pickup.coords, profileOp.coords) : 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* The map with the search radius, on top. The header floats over it. */}
      <View style={[styles.topArea, { height: mapH }]}>
        <AppMap
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
                  if (!p) return null;
                  // A truck that has quoted is marked blue, and the chosen one is marked larger.
                  const quoted = quotedIds.has(op.id);
                  const on = picked === op.id;
                  return (
                    <Pressable key={op.id} style={[styles.pinAnchor, { left: p.x, top: p.y }]} onPress={() => setProfileId(op.id)} accessibilityLabel={`Profile of ${op.name}`}>
                      <View style={[styles.truckPin, quoted && styles.truckPinQuoted, (on || profileId === op.id) && styles.truckPinOn]}>
                        <Text style={styles.pinEmoji}>🛻</Text>
                      </View>
                      {quoted && (
                        <View style={styles.pinPrice}>
                          <Text style={styles.pinPriceText}>{money(quoteTotal.get(op.id) ?? 0)}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </>
            );
          }}
        />

        {/* The header, as in SOS: close on the left, the step pill, and the right slot for minimise. */}
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
                <Text style={styles.pillSub} numberOfLines={1}>{slotLabel ? (quotes.length > 0 ? '· තහවුරු කිරීම්' : '· ට්‍රක් තහවුරු කරමින්') : quotes.length > 0 ? '· මිල ගණන්' : '· ට්‍රක් සොයමින්'}</Text>
              </View>
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
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.progressBar, i <= 2 && styles.progressBarOn]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.body} key={round} showsVerticalScrollIndicator={false}>
          {/* The status in one line: the radar while the search runs, then the count of quotes. */}
          <View style={styles.status}>
            {/* Once an answer to a scheduled slot is in (none free), the radar stops: the card just says so. */}
            {(!slotLabel || searching || quotes.length > 0) && (
              <View style={styles.radarWrap}>
                <Pulse style={styles.radarRing} maxScale={1.6} />
                <Animated.View style={[styles.radarCore, { transform: [{ rotate: spinRotate }] }]}>
                  <Text style={styles.radarEmoji}>📡</Text>
                </Animated.View>
              </View>
            )}
            <View style={styles.flex1}>
              <Text style={styles.cardTitle}>
                {slotLabel
                  ? quotes.length > 0
                    ? `ට්‍රක් ${quotes.length} ක් ඒ වේලාවට ලබාගත හැකියි`
                    : searching
                      ? `${slotLabel} සඳහා ට්‍රක් තහවුරු කරමින්...`
                      : 'ඒ වේලාවට ට්‍රක් නැහැ'
                  : quotes.length > 0 || (!stopped && !askWiden && next !== null)
                    ? 'ළඟම ට්‍රක් සොයමින්...'
                    : 'ට්‍රක් මිල දුන්නේ නැහැ'}
              </Text>
              <Text style={styles.cardSub}>
                {slotLabel
                  ? !searching && quotes.length === 0
                    ? 'වෙනත් වේලාවක් තෝරන්න.'
                    : `${slotLabel} · km ${radius}`
                  : `${radius} km${farther ? ' · දුරින් එන ට්‍රක් ද ඇත' : ''}${route.sites?.length ? ` · ${route.sites.map((s) => TOW_SITE_TEXT[s]).join(', ')}` : ''}`}
              </Text>
            </View>
          </View>

          {/* The three numbers, as on the SOS search: the search area, the cheapest price, and the trucks that have answered. */}
          <View style={styles.statRow}>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{`${radius} km`}</Text>
              <Text style={styles.statLabel}>සෙවුම් කලාපය</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{quotes.length > 0 ? money(quotes[0].quote.total) : '—'}</Text>
              <Text style={styles.statLabel}>අඩුම මිල</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{String(quotes.length)}</Text>
              <Text style={styles.statLabel}>මිල දුන්නා</Text>
            </View>
          </View>

          {/* The quotes: the main thing on this screen. The whole card is the button. */}
          {quotes.map((b, i) => {
            const on = picked === b.op.id;
            const cheapestOne = i === 0;
            return (
              <QuoteIn key={b.op.id} ring={cheapestOne}>
                <Pressable
                  style={({ pressed }) => [styles.bid, on && styles.bidOn, pressed && { transform: [{ scale: 0.99 }] }]}
                  onPress={() => setPicked(b.op.id)}
                  accessibilityLabel={`Choose ${b.op.name} ${money(b.quote.total)}`}
                  accessibilityState={{ selected: on }}
                >
                  {/* The name and details open the truck's profile; the rest of the card chooses the truck. */}
                  <Pressable style={styles.profileRow} onPress={() => setProfileId(b.op.id)} accessibilityLabel={`Profile of ${b.op.name}`}>
                    <View style={styles.truckDisc}>
                      <Text style={styles.pinEmoji}>🛻</Text>
                    </View>
                    <View style={styles.flex1}>
                    {cheapestOne && (
                      <View style={[styles.cheapTag, styles.cheapTagTop]}>
                        <Text style={styles.cheapText}>අඩුම මිල</Text>
                      </View>
                    )}
                    <View style={styles.nameRow}>
                      <Text style={styles.bidName}>{b.op.name}</Text>
                      <Text style={styles.nameChevron}>›</Text>
                    </View>
                    {/* The same straight-line distance the search circle uses, so the card and the map agree. */}
                    <Text style={styles.cardSub}>{`★ ${b.op.rating.toFixed(1)} · ${b.etaMin} min · ${distanceKm(route.pickup.coords, b.op.coords).toFixed(1)} km${b.quote.siteFee > 0 ? ` · ඇදීමේ ගාස්තුව ${money(b.quote.siteFee)}` : ''}`}</Text>
                    </View>
                  </Pressable>
                  <Text style={styles.bidTotal}>{money(b.quote.total)}</Text>
                  {on ? (
                    <View style={styles.tickDisc}>
                      <Text style={styles.tickText}>✓</Text>
                    </View>
                  ) : (
                    <View style={[styles.pickBtn, cheapestOne ? styles.pickBtnPrimary : styles.pickBtnGhost]}>
                      <Text style={[styles.pickText, cheapestOne ? styles.pickTextPrimary : styles.pickTextGhost]}>තෝරන්න</Text>
                    </View>
                  )}
                </Pressable>
              </QuoteIn>
            );
          })}

          {/* The other trucks around, folded to one line: they are context, not a choice. */}
          {/* The trucks that have not quoted yet, always listed as on the SOS search: context, and a tap opens the profile. */}
          <Text style={styles.sectionLabel}>{`ළඟ ඇති ට්‍රක් ${nearby.length - nearbyQuoted}`}</Text>
          {nearby
            .filter(({ op }) => !quotedIds.has(op.id))
            .map(({ op, km }) => {
              // One meaning per status: the search area, the truck's own state, and whether it has quoted this job.
              const quotedHere = quotedIds.has(op.id);
              const status = statusOf(op, km);
              return (
                <Pressable key={op.id} style={styles.nearbyRow} onPress={() => setProfileId(op.id)} accessibilityLabel={`Profile of ${op.name}`}>
                  <View style={styles.flex1}>
                    <Text style={styles.nearbyName}>{op.name}</Text>
                    <Text style={styles.cardSub}>{`${km.toFixed(1)} km`}</Text>
                  </View>
                  <View style={[styles.statusPill, quotedHere && styles.statusPillOn]}>
                    <Text style={[styles.statusPillText, quotedHere ? styles.statusTextOn : styles.statusTextOff]}>{status}</Text>
                  </View>
                  <Text style={styles.rowChevron}>›</Text>
                </Pressable>
              );
            })}
          {/* The commitment rule sits under the list, before the owner confirms (the empty space was used for it). */}
          {quotes.length > 0 && !slotLabel && <Text style={styles.ruleNote}>ට්‍රක් කෙනෙක් පිළිගන්නා තුරු නොමිලේ.</Text>}
        </ScrollView>

        {/* The bottom bar: once a truck is chosen, the confirm button; before that, the search controls. */}
        <View style={styles.bottomBar}>
          {chosen ? (
            <View style={styles.confirmRow}>
              <View style={styles.flex1}>
                <Text style={styles.confirmPrice}>{money(chosen.quote.total)}</Text>
              </View>
              <Pressable style={styles.confirmBtn} onPress={confirmChosen} accessibilityLabel="Confirm this truck">
                <Text style={styles.confirmText}>ට්‍රක් තහවුරු කරන්න</Text>
              </Pressable>
            </View>
          ) : quotes.length === 0 ? (
            searching ? (
              <ActionButton label="සෙවීම නවත්වන්න" variant="ghost" onPress={keepRadius} />
            ) : slotLabel && onChangeTime ? (
              // No truck is free at this time: the next step is a different time, so that is the main button.
              <View style={styles.twoRow}>
                <ActionButton label="වේලාව වෙනස් කරන්න" variant="primary" onPress={onChangeTime} />
                <ActionButton label="නැවත ඉල්ලන්න" variant="ghost" onPress={askAgain} />
              </View>
            ) : (
              <ActionButton label="නැවත ඉල්ලන්න" variant="primary" onPress={askAgain} />
            )
          ) : next !== null ? (
            <ActionButton label="තවත් ට්‍රක් සොයන්න" variant="ghost" onPress={widen} />
          ) : null}
        </View>
      </View>

      {/* A truck's profile: a sheet over the search, so the owner's place in the flow stays the same. Only facts the app holds. */}
      {/* A truck's profile, laid out like a garage's. A truck that has quoted this job can be chosen from it. */}
      {profileOp && (
      <TowOperatorSheet
        op={profileOp}
        top={mapH - 24}
        km={profileKm}
        status={profileOp ? statusOf(profileOp, profileKm) : ''}
        quote={profileOp ? (quotes.find((b) => b.op.id === profileOp.id)?.quote ?? null) : null}
        onClose={() => setProfileId(null)}
        onChoose={
          profileOp && quotedIds.has(profileOp.id)
            ? () => {
                setPicked(profileOp.id);
                setProfileId(null);
              }
            : undefined
        }
      />
      )}

      {askWiden && next !== null && (
        <ModalCard
          icon="📡"
          tone="primary"
          title="සෙවුම් කලාපය පුළුල් කරමින්"
          rows={[{ label: 'Search radius', value: `${radius} km → ${next} km` }]}
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
    vehiclePin: { position: 'absolute', left: -18, top: -18, width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff', borderWidth: 3, borderColor: TOW_BLUE, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
    truckPin: { position: 'absolute', left: -15, top: -15, width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 },
    truckPinQuoted: { backgroundColor: '#dbeafe', borderWidth: 2, borderColor: TOW_BLUE },
    truckPinOn: { backgroundColor: TOW_BLUE, left: -18, top: -18, width: 36, height: 36, borderRadius: 18 },
    pinPrice: { position: 'absolute', left: -30, top: -36, width: 60, paddingVertical: 2, borderRadius: 10, backgroundColor: TOW_BLUE, alignItems: 'center' },
    pinPriceText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    cheapTagTop: { alignSelf: 'flex-start', marginBottom: 4 },
    ruleNote: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18, paddingHorizontal: 4, paddingTop: 6 },
    pinEmoji: { fontSize: 15 },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder, marginTop: 10 },
    progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, paddingTop: 12 },
    progressBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: Colors.subtleBorder },
    progressBarOn: { backgroundColor: '#1a73e8' },
    sheet: { flex: 1, marginTop: -24, backgroundColor: Colors.bgBody, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', shadowColor: '#3c4043', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 8 },
    body: { padding: 16, gap: 10, paddingBottom: 20 },
    status: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, paddingVertical: 2 },
    radarWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    radarRing: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(29, 54, 127, 0.18)' },
    radarCore: { width: 36, height: 36, borderRadius: 18, backgroundColor: TOW_BLUE, alignItems: 'center', justifyContent: 'center' },
    radarEmoji: { fontSize: 16 },
    cardTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    cardSub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18 },
    bid: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 2, borderColor: 'transparent' },
    bidOn: { borderColor: TOW_BLUE, backgroundColor: 'rgba(29, 54, 127, 0.06)' },
    bidTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    bidName: { flexShrink: 1, fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    cheapTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#dbeafe' },
    cheapText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: '#1d4ed8' },
    bidTotal: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    profileRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    truckDisc: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.subtleFill, alignItems: 'center', justifyContent: 'center' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    nameChevron: { fontSize: 20, color: TOW_BLUE, marginTop: -2 },
    pickBtn: { height: 36, paddingHorizontal: 14, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
    pickBtnPrimary: { backgroundColor: TOW_BLUE, borderColor: TOW_BLUE },
    pickBtnGhost: { backgroundColor: 'transparent', borderColor: TOW_BLUE },
    pickText: { fontSize: 13, fontFamily: FONTS.bodyBold },
    pickTextPrimary: { color: '#ffffff' },
    pickTextGhost: { color: TOW_BLUE },
    tickDisc: { width: 30, height: 30, borderRadius: 15, backgroundColor: TOW_BLUE, alignItems: 'center', justifyContent: 'center' },
    tickText: { fontSize: 14, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    ring: { ...StyleSheet.absoluteFillObject, borderRadius: 18, borderWidth: 2, borderColor: '#60a5fa' },
    nearbyToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingTop: 8 },
    nearbyText: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    nearbyChevron: { fontSize: 16, color: Colors.textMuted },
    sectionLabel: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, paddingHorizontal: 4, paddingTop: 8 },
    statRow: { flexDirection: 'row', gap: 8 },
    statTile: { flex: 1, paddingVertical: 12, borderRadius: 16, backgroundColor: Colors.bgCard, alignItems: 'center', gap: 2 },
    statValue: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    statLabel: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    nearbyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, minHeight: 56, borderRadius: 14, backgroundColor: Colors.subtleFill },
    nearbyName: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, lineHeight: 20 },
    rowChevron: { fontSize: 22, color: Colors.textMuted, marginLeft: 2 },
    twoRow: { gap: 8 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusPillOn: { backgroundColor: '#dcfce7' },
    statusPillOff: { backgroundColor: Colors.subtleFill },
    statusPillText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold },
    statusTextOn: { color: '#15803d' },
    statusTextOff: { color: Colors.textMuted },
    bottomBar: { padding: 16, paddingTop: 12, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.subtleBorder, minHeight: 84 },
    confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    confirmName: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    confirmPrice: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMain },
    confirmBtn: { height: 50, paddingHorizontal: 18, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: TOW_BLUE },
    confirmText: { fontSize: 14, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  })
);
