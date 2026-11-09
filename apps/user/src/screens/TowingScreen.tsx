import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  ActionButton,
  ModalCard,
  canCancelTow,
  etaMinutes,
  getAi,
  SUGGEST_MIN_CONFIDENCE,
  Colors,
  directionsUrl,
  distanceKm,
  FONTS,
  Gradient,
  getThemeMode,
  GoogleMap,
  LkPlate,
  geocodeAddress,
  reverseGeocode,
  zoomToFit,
  rankTowOperators,
  roadKm,
  themedStyles,
  TOW_CONDITION_LIST,
  TOW_OVERRUN_PCT,
  towClosed,
  towStageIndex,
  type TowCondition,
  type TowRequest,
  type TowQuote,
  type TowStage,
} from '@ongarage/shared';
import { MOCK_GARAGES } from '../constants/mockData';
import { TOW_OPERATORS, TOW_TRUCKS, towReviewsOf } from '../constants/towOperators';
import { TowTruckCard } from '../components/TowTruckCard';
import { ReviewsSection, WriteReview, type ReviewView } from '../components/ReviewCard';
import { useUserLocation } from '../context/LocationContext';
import { useVehicles } from '../context/VehiclesContext';
import { useTow } from '../context/TowContext';
import { Toast } from '../components/Toast';
import { TowCover, TowOperatorCard } from '../components/TowOperatorCard';
import { Sheet } from '../components/Sheet';
import { ThreeStateSheet, type SheetApi, type SheetState } from '../components/ThreeStateSheet';
import { cardGlow, pageBg } from '../utils/material';

/** The request form, one question at a time. */
const TOW_STEPS = ['වාහනය', 'තත්වය', 'ගමනාන්තය', 'Operator'];

/** The header band: the SOS band's two-stop gradient, in the Quotes posting header's blue (#1d367f). */
const TOW_BAND = [
  { offset: '0', color: '#1d367f' },
  { offset: '1', color: '#111f4d' },
];

type LatLng = { latitude: number; longitude: number };
/** A place the vehicle can be taken to: a garage, a town found by search, or a spot touched on the map. */
type TowPlace = { id: string; name: string; address: string; coords: LatLng };

/**
 * The same layout as the SOS request: the map (you, and the garages the vehicle can be taken to) fills the top with a round close button and a pill that says
 * which step this is, and the step itself sits in a rounded sheet under it with the progress segments. A destination can be picked by touching its pin as
 * well as from the list.
 */
const MapShell: React.FC<{
  onClose: () => void;
  pickup: LatLng;
  pins?: { id: string; name: string; coords: LatLng }[];
  pickedId?: string | null;
  onPick?: (id: string) => void;
  /** While set, a touch on the map itself (not on a pin) picks that spot. */
  onPressMap?: (c: LatLng, name?: string, address?: string) => void;
  /** Pins that only show (the moving truck): the map is framed to hold them too. */
  extraPins?: { id: string; coords: LatLng; icon: string }[];
  /** The picked pin's mark: the finish flag for where it is taken to, a pin for where it is. */
  pickedIcon?: string;
  /** Shown over the whole screen (a pop-up message). */
  overlay?: React.ReactNode;
  /** The pill's second line: "පියවර 2/4" for the form, nothing once the truck is asked. */
  stepIndex?: number;
  /** Whether the map shows at all: only the steps and views that need it have it, the rest is a plain full-screen form. */
  showMap?: boolean;
  /** Choosing a spot on the map: the map takes the whole screen (no form); a touch drops a marker and the "ස්ථානය තෝරන්න" chip confirms it. */
  fullMap?: boolean;
  onCancelPick?: () => void;
  /** The back arrow on the left of the top bar: the step before (shown from the second step on). */
  onBack?: () => void;
  /** The "my location" button: the map goes back to where the vehicle is and the GPS reading is refreshed. */
  onMyLocation?: () => void;
  /** The search bar over the full-screen map: the places that can be found by name, and a look-up for the rest (throws when nothing is found). */
  searchPlaces?: TowPlace[];
  findPlace?: (q: string) => Promise<TowPlace>;
  label: string;
  children: React.ReactNode;
}> = ({ onClose, pickup, pins = [], pickedId, onPick, onPressMap, extraPins, overlay, pickedIcon = '🏁', stepIndex, showMap = true, fullMap, onCancelPick, onBack, onMyLocation, searchPlaces = [], findPlace, label, children }) => {
  const [topH, setTopH] = useState(0);
  const [atMe, setAtMe] = useState(false);
  const [pending, setPending] = useState<LatLng | null>(null);
  const [pendingName, setPendingName] = useState<TowPlace | null>(null);
  const [mapQuery, setMapQuery] = useState('');
  const [mapFocus, setMapFocus] = useState<LatLng | null>(null);
  const [mapNote, setMapNote] = useState('');
  const [mapBusy, setMapBusy] = useState(false);
  const backAction = fullMap ? onCancelPick : stepIndex !== undefined && stepIndex > 0 ? onBack : undefined;
  const dest = pins.find((p) => p.id === pickedId)?.coords;
  useEffect(() => setAtMe(false), [pickedId, fullMap]);
  useEffect(() => {
    setPending(null);
    setPendingName(null);
    setMapQuery('');
    setMapFocus(null);
    setMapNote('');
  }, [fullMap]);
  const mq = mapQuery.trim().toLowerCase();
  const found = mq ? searchPlaces.filter((s) => `${s.name} ${s.address}`.toLowerCase().includes(mq)).slice(0, 5) : [];
  // A place found by the search: the map goes to it and a marker is dropped there, for the chip to confirm.
  const goTo = (s: TowPlace) => {
    setPending(s.coords);
    setPendingName(s);
    setMapFocus(s.coords);
    setMapQuery('');
    setMapNote('');
  };
  const lookUp = async () => {
    if (!mq || !findPlace) return;
    setMapBusy(true);
    setMapNote('');
    try {
      goTo(await findPlace(mapQuery.trim()));
    } catch {
      setMapNote('ඒ තැන සොයාගන්න බැරි වුණා.');
    }
    setMapBusy(false);
  };
  const mid0 = dest ? { latitude: (pickup.latitude + dest.latitude) / 2, longitude: (pickup.longitude + dest.longitude) / 2 } : pickup;
  const framed = extraPins?.length ? [pickup, ...(dest ? [dest] : []), ...extraPins.map((x) => x.coords)] : null;
  const mid = extraPins?.length ? { latitude: [pickup, ...(dest ? [dest] : []), ...extraPins.map((x) => x.coords)].reduce((s, c) => s + c.latitude, 0) / (extraPins.length + 1 + (dest ? 1 : 0)), longitude: [pickup, ...(dest ? [dest] : []), ...extraPins.map((x) => x.coords)].reduce((s, c) => s + c.longitude, 0) / (extraPins.length + 1 + (dest ? 1 : 0)) } : mid0;
  const km = framed ? Math.max(...framed.map((c) => distanceKm(mid, c))) * 2 : dest ? distanceKm(pickup, dest) : pins.reduce((m, p) => Math.max(m, distanceKm(pickup, p.coords)), 0);
  const zoom = zoomToFit(Math.max(km * 1.6, 3), mid.latitude, Math.max(120, topH * 0.6));
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={[styles.topArea, !showMap && styles.topAreaBare, fullMap && styles.topAreaFull]} onLayout={(e) => setTopH(Math.round(e.nativeEvent.layout.height))}>
        {showMap && topH > 0 && (
          <GoogleMap
            style={StyleSheet.absoluteFill}
            center={mapFocus ?? (atMe ? pickup : mid)}
            zoom={mapFocus ? 15 : atMe ? 16 : zoom}
            onPressCoordinate={fullMap ? (c) => { setPending(c); setPendingName(null); } : undefined}
            renderOverlay={(project) => (
              <>
                {pins.map((p) => {
                  const pt = project(p.coords);
                  const on = p.id === pickedId;
                  return pt ? (
                    <Pressable key={p.id} style={[styles.mapPin, { left: pt.x, top: pt.y }, on && styles.mapPinOn]} onPress={() => onPick?.(p.id)} disabled={!onPick} hitSlop={8} accessibilityLabel={`Map pin ${p.name}`}>
                      <Text style={styles.mapPinText}>{on ? pickedIcon : '🔧'}</Text>
                    </Pressable>
                  ) : null;
                })}
                {extraPins?.map((x) => {
                  const pt = project(x.coords);
                  return pt ? (
                    <View key={x.id} style={[styles.truckPin, { left: pt.x, top: pt.y }]} pointerEvents="none">
                      <Text style={styles.truckPinText}>{x.icon}</Text>
                    </View>
                  ) : null;
                })}
                {(() => {
                  const mk = pending && project(pending);
                  return mk ? (
                    <View style={[styles.mapPin, styles.mapPinOn, { left: mk.x, top: mk.y }]} pointerEvents="none">
                      <Text style={styles.mapPinText}>{pickedIcon}</Text>
                    </View>
                  ) : null;
                })()}
                {(() => {
                  const me = project(pickup);
                  return me ? <View style={[styles.meDot, { left: me.x, top: me.y }]} pointerEvents="none" /> : null;
                })()}
              </>
            )}
          />
        )}
        {/* The SOS band's build (a gradient behind the floating controls), in the Quotes posting header's blue. */}
        {stepIndex !== undefined && (
          <View style={styles.navyBand} pointerEvents="none">
            <Gradient stops={TOW_BAND} />
          </View>
        )}
        <View style={styles.topBar}>
          {fullMap ? (
            <>
            {/* The back arrow in front of the search bar leaves the map and returns to the step. */}
            <Pressable style={styles.roundBtn} onPress={onCancelPick} accessibilityLabel="Back">
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={Colors.textMain} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M15 5l-7 7 7 7" />
              </Svg>
            </Pressable>
            <View style={styles.mapSearch}>
              <Text style={styles.mapSearchIcon}>🔍</Text>
              <TextInput
                style={styles.mapSearchInput}
                value={mapQuery}
                onChangeText={(v) => { setMapQuery(v); setMapNote(''); }}
                onSubmitEditing={lookUp}
                returnKeyType="search"
                placeholder="ස්ථානය සොයන්න (garage, නගරය...)"
                placeholderTextColor={Colors.textMuted}
                accessibilityLabel="Search on the map"
              />
              {/* Close: clears what was typed, and with nothing typed leaves the map. */}
              <Pressable style={styles.mapSearchClose} onPress={() => (mapQuery ? (setMapQuery(''), setMapNote('')) : onCancelPick?.())} hitSlop={8} accessibilityLabel="Close the map search">
                <Text style={styles.mapSearchCloseText}>✕</Text>
              </Pressable>
            </View>
            </>
          ) : (
          <>
          {/* On the left: a back arrow (to the step before, or out of the full-screen map); on the first step and the live view, the close button. */}
          {backAction ? (
            <Pressable style={styles.roundBtn} onPress={backAction} accessibilityLabel="Back">
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={Colors.textMain} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M15 5l-7 7 7 7" />
              </Svg>
            </Pressable>
          ) : (
            <Pressable style={styles.roundBtn} onPress={onClose} accessibilityLabel="Close towing">
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          )}
          <View style={styles.stepPill}>
            <View style={styles.stepPillIcon}>
              <Text style={styles.pillEmoji}>🛻</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.stepPillTitle} numberOfLines={1}>Ongarage Towing</Text>
              <View style={styles.stepPillRow}>
                {stepIndex !== undefined && (
                  <Text style={styles.stepPillCount}>{`${stepIndex + 1}/${TOW_STEPS.length}`}</Text>
                )}
                <Text style={styles.stepPillSub} numberOfLines={1}>{label}</Text>
              </View>
            </View>
          </View>
          </>
          )}
        </View>
        {stepIndex !== undefined && (
          <View style={styles.progressWrap} pointerEvents="none">
            <View style={styles.progressRow}>
              {TOW_STEPS.map((_, i) => (
                <View key={i} style={styles.progressSeg}>
                  <View style={[styles.progressBar, i <= stepIndex && styles.progressBarOn]} />
                </View>
              ))}
            </View>
          </View>
        )}
        {showMap && topH > 0 && (
          <Pressable style={[styles.myLocation, fullMap && styles.myLocationHigh]} onPress={() => { setAtMe(true); onMyLocation?.(); }} accessibilityLabel="My location">
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth={2} strokeLinecap="round">
              <Circle cx={12} cy={12} r={3.5} fill="#1a73e8" />
              <Circle cx={12} cy={12} r={7.5} />
              <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </Svg>
          </Pressable>
        )}
        {fullMap && (
          <View style={styles.mapSearchWrap} pointerEvents="box-none">
            {!!mq && (
              <View style={styles.mapResults}>
                {found.map((s) => (
                  <Pressable key={s.id} style={styles.mapResult} onPress={() => goTo(s)} accessibilityLabel={`Map result ${s.name}`}>
                    <Text style={styles.mapResultName} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.mapResultSub} numberOfLines={1}>{s.address}</Text>
                  </Pressable>
                ))}
                {!!findPlace && (
                  <Pressable style={styles.mapResult} onPress={lookUp} disabled={mapBusy} accessibilityLabel="Look the place up">
                    <Text style={styles.mapResultName} numberOfLines={1}>{mapBusy ? 'සොයමින්...' : `"${mapQuery.trim()}" සොයන්න`}</Text>
                  </Pressable>
                )}
                {!!mapNote && <Text style={styles.mapResultNote}>{mapNote}</Text>}
              </View>
            )}
          </View>
        )}
        {fullMap && (
          <View style={styles.pickBar} pointerEvents="box-none">
            <Pressable style={[styles.pickChip, !pending && styles.pickChipOff]} disabled={!pending} onPress={() => pending && onPressMap?.(pending, pendingName?.name, pendingName?.address)} accessibilityLabel="Confirm the place">
              <Text style={styles.pickChipText}>ස්ථානය තෝරන්න</Text>
            </Pressable>
          </View>
        )}
      </View>
      {!fullMap && (
      <View style={[styles.sheet, !showMap && styles.sheetFull]}>
        {showMap && <View style={styles.handle} />}
        {stepIndex !== undefined && (
          <View style={styles.stepper}>
            {TOW_STEPS.map((s, i) => (
              <View key={s} style={[styles.stepSeg, i < stepIndex && styles.stepSegDone, i === stepIndex && styles.stepSegActive]} />
            ))}
          </View>
        )}
        {children}
      </View>
      )}
      {overlay}
      <Toast topOffset={84} />
    </SafeAreaView>
  );
};

/**
 * The view once the truck is asked: the map fills the screen with the truck moving on it, and the details are a sheet that can be pulled right down (like the
 * other categories' sheets). With the sheet down the map is all there is, and the sheet's top bar shows only the step the job is at.
 */
const LiveShell: React.FC<{
  onClose: () => void;
  pickup: LatLng;
  destination: LatLng;
  truck: LatLng | null;
  steps: string[];
  stepIdx: number;
  label: string;
  onMyLocation?: () => void;
  children: (api: SheetApi) => React.ReactNode;
}> = ({ onClose, pickup, destination, truck, steps, stepIdx, label, onMyLocation, children }) => {
  const [area, setArea] = useState(0);
  const [sheetH, setSheetH] = useState<Animated.Value | null>(null);
  const [atMe, setAtMe] = useState(false);
  const [state, setState] = useState<SheetState>('collapsed');
  const pts = [pickup, destination, ...(truck ? [truck] : [])];
  const mid = { latitude: pts.reduce((s, c) => s + c.latitude, 0) / pts.length, longitude: pts.reduce((s, c) => s + c.longitude, 0) / pts.length };
  const km = Math.max(...pts.map((c) => distanceKm(mid, c))) * 2;
  const zoom = zoomToFit(Math.max(km * 1.3, 2), mid.latitude, Math.max(120, area * 0.45));
  // With the sheet up, the route is moved into the part of the map that shows above it.
  const mpp = (156543.03 * Math.cos((mid.latitude * Math.PI) / 180)) / 2 ** zoom;
  useEffect(() => setAtMe(false), [state]);
  const center = atMe ? pickup : state === 'peek' ? mid : { latitude: mid.latitude - (area * 0.2 * mpp) / 111320, longitude: mid.longitude };
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.flex1} onLayout={(e) => setArea(Math.round(e.nativeEvent.layout.height))}>
        {area > 0 && (
          <GoogleMap
            style={StyleSheet.absoluteFill}
            center={center}
            zoom={atMe ? 16 : zoom}
            renderOverlay={(project) => (
              <>
                {(() => {
                  const d = project(destination);
                  return d ? (
                    <View style={[styles.mapPin, styles.mapPinOn, { left: d.x, top: d.y }]} pointerEvents="none">
                      <Text style={styles.mapPinText}>🏁</Text>
                    </View>
                  ) : null;
                })()}
                {(() => {
                  const me = project(pickup);
                  return me ? <View style={[styles.meDot, { left: me.x, top: me.y }]} pointerEvents="none" /> : null;
                })()}
                {(() => {
                  const tr = truck && project(truck);
                  return tr ? (
                    <View style={[styles.truckPin, { left: tr.x, top: tr.y }]} pointerEvents="none">
                      <Text style={styles.truckPinText}>🛻</Text>
                    </View>
                  ) : null;
                })()}
              </>
            )}
          />
        )}
        <View style={styles.topBar}>
          <Pressable style={styles.roundBtn} onPress={onClose} accessibilityLabel="Close towing">
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <View style={styles.stepPill}>
            <View style={styles.stepPillIcon}>
              <Text style={styles.pillEmoji}>🛻</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.stepPillTitle} numberOfLines={1}>Ongarage Towing</Text>
              <Text style={styles.stepPillSub} numberOfLines={1}>{label}</Text>
            </View>
          </View>
        </View>
        {/* My location: rides on the sheet's top edge, as on the other maps. */}
        {!!sheetH && (
          <Animated.View style={[styles.myLocationLive, { bottom: Animated.add(sheetH, 12) }]} pointerEvents="box-none">
            <Pressable style={styles.myLocationBtn} onPress={() => { setAtMe(true); onMyLocation?.(); }} accessibilityLabel="My location">
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth={2} strokeLinecap="round">
                <Circle cx={12} cy={12} r={3.5} fill="#1a73e8" />
                <Circle cx={12} cy={12} r={7.5} />
                <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </Svg>
            </Pressable>
          </Animated.View>
        )}
        {area > 0 && (
          <ThreeStateSheet
            areaHeight={area}
            peekHeight={104}
            surface={pageBg()}
            rounded
            onHeight={setSheetH}
            onStateChange={setState}
            peek={
              <View style={styles.peek}>
                <View style={styles.peekDisc}>
                  <Text style={styles.peekEmoji}>🛻</Text>
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.peekCount}>
                    පියවර {stepIdx + 1}/{steps.length}
                  </Text>
                  <Text style={styles.peekText} numberOfLines={1}>{label}</Text>
                </View>
              </View>
            }
          >
            {children}
          </ThreeStateSheet>
        )}
      </View>
      <Toast topOffset={84} />
    </SafeAreaView>
  );
};

const CONDITION_TEXT: Record<TowCondition, { label: string; hint: string }> = {
  rolls: { label: 'රෝද කැරකෙනවා', hint: 'වාහනය තල්ලු කළ හැකියි' },
  wontRoll: { label: 'ගමන් කරන්නේ නැහැ', hint: 'engine / gearbox / රෝද අගුළු වැටී' },
  stuck: { label: 'හිරවී ඇත', hint: 'කානුවක / මඩේ / ගොහොරුවක' },
  accident: { label: 'අනතුරකට ලක්වී', hint: 'හානි වූ වාහනයක්' },
};
const CONDITION_ICON: Record<TowCondition, string> = { rolls: '🛞', wontRoll: '⛔', stuck: '🕳️', accident: '💥' };
/**
 * Where the truck is on the map: it drives from its base to the vehicle (the first two stages), waits there, then drives to the destination. The demo moves it
 * smoothly over the same seconds the simulation takes for each leg (`TowContext`).
 */
const DRIVE_MS = { toPickup: 12000, toDestination: 8000 };
const useTruckPos = (req: TowRequest | null): LatLng | null => {
  const [now, setNow] = useState(Date.now());
  const since = useRef<Record<string, number>>({});
  if (req && since.current[`${req.id}:${req.stage}`] === undefined) since.current[`${req.id}:${req.stage}`] = Date.now();
  const moving = !!req && !req.cancelled && ['searching', 'accepted', 'enroute', 'transporting'].includes(req.stage);
  useEffect(() => {
    if (!moving) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [moving, req?.stage]);
  if (!req) return null;
  const op = TOW_OPERATORS.find((o) => o.id === req.operatorId);
  if (!op) return null;
  const at = (stage: string) => since.current[`${req.id}:${stage}`];
  const lerp = (a: LatLng, b: LatLng, k: number): LatLng => ({ latitude: a.latitude + (b.latitude - a.latitude) * k, longitude: a.longitude + (b.longitude - a.longitude) * k });
  const clamp = (k: number) => Math.max(0, Math.min(1, k));
  if (req.stage === 'transporting') return lerp(req.pickup, req.destination, clamp((now - at('transporting')) / DRIVE_MS.toDestination));
  if (req.stage === 'delivered') return req.destination;
  if (req.stage === 'arrived' || req.stage === 'loading') return req.pickup;
  // accepted (4 s) and then enroute (8 s) are one drive
  const started = at('accepted') ?? at('searching') ?? at('enroute') ?? now;
  const k = req.stage === 'enroute' ? clamp((now - started) / DRIVE_MS.toPickup) : clamp((now - started) / DRIVE_MS.toPickup);
  return lerp(op.coords, req.pickup, k);
};

/** The few steps the owner follows: the operator is already chosen, so asking and accepting are not steps, and loading is part of arriving. */
const LIVE_STEPS: { label: string; stages: TowStage[] }[] = [
  { label: 'Truck එක ඔබ වෙත මග', stages: ['searching', 'accepted', 'enroute'] },
  { label: 'ඔබ ළඟට ළඟා වුණා', stages: ['arrived', 'loading'] },
  { label: 'ගමනාන්තයට රැගෙන යමින්', stages: ['transporting'] },
  { label: 'ගමනාන්තයට ළඟා වුණා', stages: ['delivered'] },
];
const STAGE_TEXT: Record<TowStage, string> = {
  searching: 'Operator සොයමින්',
  accepted: 'Operator පිළිගත්තා',
  enroute: 'Truck එක මග',
  arrived: 'ඔබ ළඟට ළඟා වුණා',
  loading: 'වාහනය පටවමින්',
  transporting: 'ගමනාන්තයට රැගෙන යමින්',
  delivered: 'වාහනය බාගත්තා',
};

/** The towing breakdown, so an owner sees what the price is made of. */
const QuoteLines: React.FC<{ q: TowQuote }> = ({ q }) => (
  <View style={styles.lines}>
    <Line label="මූලික ගාස්තුව" value={q.baseFee} />
    <Line label={`ගමන (km ${q.tripKm})`} value={q.tripFee} />
    {q.pickupFee > 0 && <Line label="Truck එක ඔබ වෙත එන දුර" value={q.pickupFee} />}
    {q.recoveryFee > 0 && <Line label="ගොඩ ගැනීමේ (recovery) ගාස්තුව" value={q.recoveryFee} />}
    {q.nightFee > 0 && <Line label="රාත්‍රී අමතර ගාස්තුව" value={q.nightFee} />}
    <Line label="ඇස්තමේන්තු මුළු මුදල" value={q.total} bold />
  </View>
);
/** An operator's reviews: the summary and the latest as Google-style cards that scroll sideways; once the owner's job is closed they can add their own. */
const OperatorReviews: React.FC<{ id: string; name: string; rating: number; count: number; mine?: ReviewView | null; write?: React.ReactNode }> = ({ id, name, rating, count, mine, write }) => (
  <ReviewsSection avg={rating} count={count + (mine ? 1 : 0)} reviews={[...(mine ? [mine] : []), ...towReviewsOf(id, name)]} write={write} />
);
const Line: React.FC<{ label: string; value: number; bold?: boolean }> = ({ label, value, bold }) => (
  <View style={styles.lineRow}>
    <Text style={[styles.lineLabel, bold && styles.bold]}>{label}</Text>
    <Text style={[styles.lineValue, bold && styles.bold]}>රු. {value}</Text>
  </View>
);

/**
 * Towing (service mode 'dispatch'): the owner says where the vehicle is, where it should go and what is wrong, sees the operators that can carry it with the
 * price of each (cheapest first, never paid placement) and asks one; then follows the truck like an SOS call. A final price above the estimate's limit needs the
 * owner's approval. The price is an estimate and is paid to the operator directly.
 */
export const TowingScreen: React.FC<{ vehicleId?: string; onClose: () => void }> = ({ vehicleId, onClose }) => {
  const user = useUserLocation();
  const { vehicles } = useVehicles();
  const tow = useTow();
  const [vid, setVid] = useState<string | undefined>(vehicleId ?? vehicles[0]?.id);
  const [condition, setCondition] = useState<TowCondition>('wontRoll');
  const [destId, setDestId] = useState<string | null>(null);
  const [optionId, setOptionId] = useState<string | null>(null);
  const [mine, setMine] = useState<ReviewView | null>(null);
  const [step, setStep] = useState(0);
  // The operator whose profile is open (a full-screen tab of its own).
  const [profileId, setProfileId] = useState<string | null>(null);
  // An answer stays shown as chosen for a moment (the card's blue outline and tick) before the next step opens.
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goTo = (next: number) => {
    if (moveTimer.current) clearTimeout(moveTimer.current);
    moveTimer.current = setTimeout(() => setStep(next), 450);
  };
  useEffect(() => () => { if (moveTimer.current) clearTimeout(moveTimer.current); }, []);
  // After "Tow truck ඉල්ලන්න": a short wait, with a pop-up, for the operator to accept (demo timing until a backend) before the truck is on its way.
  const [asking, setAsking] = useState<string | null>(null);
  const askTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (askTimer.current) clearTimeout(askTimer.current); }, []);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchNote, setSearchNote] = useState('');
  const [pickMode, setPickMode] = useState(false);
  // Step 3 has both ends of the trip: where the vehicle is (the current location unless it is changed) and where it is taken to.
  const [target, setTarget] = useState<'from' | 'to'>('to');
  const [fromId, setFromId] = useState('me');
  const [customs, setCustoms] = useState<{ from?: TowPlace; to?: TowPlace }>({});
  const me = useMemo<TowPlace>(() => ({ id: 'me', name: 'දැන් ඉන්න තැන', address: user.address, coords: user.coords }), [user.address, user.coords]);

  // Any garage can be found by searching its name or town, a place that is not a garage by looking it up, or a spot can be touched on the map.
  const places = useMemo<TowPlace[]>(
    () => MOCK_GARAGES.map((g) => ({ id: g.id, name: g.name, address: g.address, coords: g.coords })).sort((a, b) => distanceKm(user.coords, a.coords) - distanceKm(user.coords, b.coords)),
    [user.coords]
  );
  const q = query.trim().toLowerCase();
  const shown = useMemo(() => (q ? places.filter((p) => `${p.name} ${p.address}`.toLowerCase().includes(q)).slice(0, 8) : places.slice(0, 5)), [places, q]);
  const customOf = customs[target];
  const listFor = customOf ? [customOf, ...shown.filter((p) => p.id !== customOf.id)] : shown;
  // The start's list begins with the current location; the vehicle's own spot is not a pin (the blue dot is it).
  const choices = target === 'from' ? [me, ...listFor] : listFor;
  const selectedId = target === 'from' ? fromId : destId;
  const lookup = (id: string | null, c?: TowPlace) => (id === 'me' ? me : c && c.id === id ? c : places.find((p) => p.id === id));
  const pickup = lookup(fromId, customs.from) ?? me;
  const dest = lookup(destId, customs.to);

  // `advance`: choosing from the list goes straight on to the operators; a spot chosen on the full-screen map comes back to this step instead, showing what was chosen.
  const choosePlace = (id: string, advance = true) => {
    setPickMode(false);
    setOptionId(null);
    if (target === 'from') {
      setFromId(id);
      setTarget('to');
      setQuery('');
      return;
    }
    // Choosing where it is taken to is the last answer of this step: the operators come next.
    setDestId(id);
    if (advance) goTo(3);
  };
  const useSpot = (coords: LatLng, name: string, address: string, advance = true) => {
    setCustoms((c) => ({ ...c, [target]: { id: 'custom', name, address, coords } }));
    choosePlace('custom', advance);
  };
  // A spot touched on the map; its address is looked up afterwards (the map's own name for it is kept if the lookup is not available).
  const pickOnMap = (coords: LatLng, name?: string, address?: string) => {
    const side = target;
    setPickMode(false);
    setSearchNote('');
    useSpot(coords, name ?? 'Map එකෙන් තෝරපු තැන', address ?? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`, false);
    if (name) return;
    reverseGeocode(coords)
      .then((r) => setCustoms((c) => (c[side]?.coords === coords ? { ...c, [side]: { ...c[side]!, name: r.locality || c[side]!.name, address: r.address } } : c)))
      .catch(() => {});
  };
  // Enter in the search box: a place that is not a garage (a town, a street) is looked up on the map.
  const searchPlace = async () => {
    if (!q) return;
    setSearching(true);
    setSearchNote('');
    try {
      const r = await geocodeAddress(query.trim());
      useSpot(r.coords, query.trim(), r.address);
    } catch {
      setSearchNote('ඒ තැන සොයාගන්න බැරි වුණා. garage නමක් හෝ map එකෙන් තෝරන්න.');
    }
    setSearching(false);
  };
  const options = useMemo(() => (dest ? rankTowOperators(TOW_OPERATORS, pickup.coords, dest.coords, condition, Date.now()) : []), [dest, condition, pickup.coords]);
  const picked = options.find((o) => o.op.id === optionId) ?? null;
  // Step 4 is the request's answers: once the trip is set the request goes to the operators that suit it, and each shows here, with its price, when it replies.
  const [replied, setReplied] = useState<string[]>([]);
  const askKey = `${fromId}|${destId}|${condition}|${options.map((o) => o.op.id).join(',')}`;
  useEffect(() => {
    setReplied([]);
    if (step !== 3 || options.length === 0) return;
    const timers = options.map((o, i) => setTimeout(() => setReplied((r) => (r.includes(o.op.id) ? r : [...r, o.op.id])), 1200 + i * 1800 + (o.etaMin % 5) * 150));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step === 3, askKey]);
  const answers = options.filter((o) => replied.includes(o.op.id));
  const waiting = options.length > answers.length;
  const silent = TOW_OPERATORS.filter((op) => !answers.some((a) => a.op.id === op.id))
    .map((op) => ({ op, km: roadKm(pickup.coords, op.coords), pending: options.some((o) => o.op.id === op.id) }))
    .sort((a, b) => a.km - b.km);
  const req = tow.request;
  const truckPos = useTruckPos(req);
  const liveIdx = req ? Math.max(0, LIVE_STEPS.findIndex((s) => s.stages.includes(req.stage))) : 0;

  const reviewOperator = async (stars: number, text: string) => {
    if (text.trim()) {
      const m = await getAi().moderate(text);
      if (m.confidence >= SUGGEST_MIN_CONFIDENCE && !m.value.ok) return { ok: false as const, reason: 'මෙම සටහන ප්‍රකාශයට පත් කළ නොහැක. අසභ්‍ය වචන, දුරකථන අංක හෝ සබැඳි ඉවත් කරන්න.' };
    }
    tow.rate(stars);
    setMine({ id: 'mine', name: 'ඔබ', rating: stars, at: Date.now(), text: text.trim() || undefined, meta: '✓ ඔබේ Tow request එක' });
    return { ok: true as const };
  };

  const request = () => {
    if (!picked || !dest || asking) return;
    const op = picked;
    const input = { pickup: pickup.coords, pickupText: pickup.id === 'me' ? user.address : pickup.name, destination: dest.coords, destinationText: dest.name, condition, vehicleId: vid };
    setAsking(op.op.name);
    askTimer.current = setTimeout(() => {
      setAsking(null);
      tow.start(op, input);
    }, 3200);
  };
  const cancelAsking = () => {
    if (askTimer.current) clearTimeout(askTimer.current);
    setAsking(null);
  };

  // A request in progress (or just finished): the live view.
  if (req) {
    const op = TOW_OPERATORS.find((o) => o.id === req.operatorId);
    const idx = liveIdx;
    const closed = towClosed(req);
    return (
      <LiveShell onClose={onClose} pickup={req.pickup} destination={req.destination} truck={req.cancelled ? null : truckPos} steps={LIVE_STEPS.map((s) => s.label)} stepIdx={liveIdx} onMyLocation={() => { user.refresh().catch(() => {}); }} label={req.cancelled ? 'අවලංගු කළා' : LIVE_STEPS[liveIdx].label}>
        {(api) => (
        <ScrollView ref={api.scrollRef} onScroll={(e) => api.onScroll(e.nativeEvent.contentOffset.y)} scrollEventThrottle={16} style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {req.cancelled ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>අවලංගු කළා</Text>
              <ActionButton label="අලුත් request එකක්" variant="primary" compact onPress={tow.dismiss} />
            </View>
          ) : (
            <>
              {/* Once the operator has accepted: the truck that is coming, with its picture and number plate, to recognise it by. */}
              {!!op && !!TOW_TRUCKS[op.id] && (
                <TowTruckCard truck={TOW_TRUCKS[op.id]} body={`${op.name} ඔබේ ඉල්ලීම පිළිගත්තා. මේ truck එකේ අංකය බලා හඳුනාගන්න.`} />
              )}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{op?.name}</Text>
                <Text style={styles.sub}>
                  ★ {op?.rating} · {req.condition && CONDITION_TEXT[req.condition].label} · ඇස්තමේන්තු පැමිණීම මිනි. {req.etaMin}
                </Text>
                <Text style={styles.sub}>📍 {req.pickupText} → 🏁 {req.destinationText}</Text>
                <View style={styles.row}>
                  <View style={styles.flex1}>
                    <ActionButton label="අමතන්න" icon="📞" variant="ghost" compact onPress={() => op && Linking.openURL(`tel:${op.phone.replace(/\s/g, '')}`)} />
                  </View>
                  <View style={styles.flex1}>
                    <ActionButton label="මාර්ගය" icon="🧭" variant="ghost" compact onPress={() => Linking.openURL(directionsUrl(req.destination, req.pickup))} />
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                {LIVE_STEPS.map((s, i) => (
                  <View key={s.label} style={styles.stageRow}>
                    <View style={[styles.dot, i < idx && styles.dotDone, i === idx && styles.dotNow]} />
                    <Text style={[styles.stageText, i === idx && styles.bold, i > idx && styles.dim]}>{s.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>මිල</Text>
                <QuoteLines q={req.quote} />
                <Text style={styles.note}>ගෙවන්නේ operator ට කෙලින්ම; අවසන් මිල ඇස්තමේන්තුවට වඩා {TOW_OVERRUN_PCT}% ට වැඩි නම් ඔබේ අනුමැතිය ඕන.</Text>
              </View>

              {req.finalPrice !== undefined && (
                <View style={[styles.card, req.approval === 'pending' && styles.cardWarn]}>
                  <Text style={styles.cardTitle}>අවසන් මිල: රු. {req.finalPrice}</Text>
                  {req.approval === 'pending' && (
                    <>
                      <Text style={styles.sub}>ඇස්තමේන්තුවේ සීමාව රු. {req.quote.limit}. මේ මිල අනුමත කරනවාද?</Text>
                      <View style={styles.row}>
                        <View style={styles.flex1}>
                          <ActionButton label="ගැටලුවක් තියෙනවා" variant="ghost" compact onPress={() => tow.answerPrice(false)} />
                        </View>
                        <View style={styles.flex1}>
                          <ActionButton label="අනුමත කරනවා" variant="primary" compact onPress={() => tow.answerPrice(true)} />
                        </View>
                      </View>
                    </>
                  )}
                  {req.approval === 'approved' && <Text style={styles.good}>✓ ඔබ අනුමත කළා</Text>}
                  {req.approval === 'disputed' && <Text style={styles.bad}>⚠️ ගැටලුවක් ලෙස වාර්තා කළා — OnGarage සමාලෝචනය කරයි</Text>}
                  {!req.approval && <Text style={styles.good}>✓ ඇස්තමේන්තුව ඇතුළත</Text>}
                </View>
              )}

              {!!op && (
                <View style={styles.card}>
                  <OperatorReviews id={op.id} name={op.name} rating={op.rating} count={op.reviews} mine={mine} write={closed ? <WriteReview done={!!mine} doneText="✓ ඔබේ සමාලෝචනය එකතු කළා." onSubmit={reviewOperator} /> : undefined} />
                </View>
              )}

              {closed && <ActionButton label="වසන්න" variant="primary" compact onPress={() => { tow.dismiss(); onClose(); }} />}

              {/* Cancelling is free until the vehicle is loaded; after that the option stays in sight but frozen. */}
              {canCancelTow(req) ? (
                <ActionButton label="Request එක අවලංගු කරන්න" variant="ghost" compact onPress={tow.cancel} />
              ) : (
                !closed && (
                  <>
                    <ActionButton label="🔒 Request එක අවලංගු කරන්න" variant="ghost" compact disabled onPress={() => {}} />
                    <Text style={styles.note}>වාහනය truck එකට පටවා ඇති නිසා දැන් අවලංගු කළ නොහැක.</Text>
                  </>
                )
              )}
            </>
          )}
        </ScrollView>
        )}
      </LiveShell>
    );
  }

  return (
    <MapShell
      onClose={onClose}
      pickup={target === 'from' && step === 2 ? me.coords : pickup.coords}
      pins={(step === 2 ? listFor : dest ? [dest] : []).map((p) => ({ id: p.id, name: p.name, coords: p.coords }))}
      pickedId={step === 2 ? (target === 'from' ? fromId : destId) : destId}
      pickedIcon={step === 2 && target === 'from' ? '📍' : '🏁'}
      onPick={step === 2 ? (id) => choosePlace(id, !pickMode) : undefined}
      onPressMap={step === 2 && pickMode ? pickOnMap : undefined}
      stepIndex={step}
      overlay={
        asking ? (
          <ModalCard icon="🛻" tone="primary" title="ඉල්ලීම යැව්වා" body={`${asking} ඔබේ Tow request එක පිළිගන්නකන් ටිකක් ඉන්න...`}>
            <ActivityIndicator color="#1a73e8" />
            <ActionButton label="අවලංගු කරන්න" variant="ghost" compact onPress={cancelAsking} />
          </ModalCard>
        ) : undefined
      }
      showMap={step === 2}
      fullMap={step === 2 && pickMode}
      onCancelPick={() => setPickMode(false)}
      onBack={() => { if (moveTimer.current) clearTimeout(moveTimer.current); setStep(step - 1); }}
      onMyLocation={() => { user.refresh().catch(() => {}); }}
      searchPlaces={places}
      findPlace={async (q) => {
        const r = await geocodeAddress(q);
        return { id: 'found', name: q, address: r.address, coords: r.coords };
      }}
      label={TOW_STEPS[step]}
    >
      <ScrollView style={styles.flex1} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <>
            <Text style={styles.stepTitle}>ඔබේ වාහනය තෝරන්න</Text>
            <Text style={styles.stepHint}>Tow කරන්න ඕන වාහනය touch කරන්න.</Text>
            {/* One vehicle under the other: its number plate, its name and the few details a tow driver needs. */}
            {vehicles.map((v) => {
              const details = [v.type, v.color, v.fuelType].filter(Boolean).join(' · ');
              const on = vid === v.id;
              return (
                <Pressable key={v.id} style={[styles.option, on && styles.optionOn]} onPress={() => { setVid(v.id); goTo(1); }} accessibilityLabel={`Tow vehicle ${v.name}`}>
                  <View style={styles.optRow}>
                    <LkPlate plate={v.registrationNo || v.plate} stacked={v.type === 'Motorbike'} small fontSize={12} />
                    <View style={styles.flex1}>
                      <Text style={styles.optionTitle} numberOfLines={1}>{v.name}</Text>
                      {!!details && <Text style={styles.sub} numberOfLines={1}>{details}</Text>}
                    </View>
                    <View style={[styles.radio, on && styles.radioOn]}>{on && <Text style={styles.radioTick}>✓</Text>}</View>
                  </View>
                </Pressable>
              );
            })}
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.stepTitle}>වාහනයට වුණේ මොකක්ද?</Text>
            <Text style={styles.stepHint}>නිවැරදි truck එක එවන්න මේක උදව් වෙනවා. ඉන්න තත්වය touch කරන්න.</Text>
            {TOW_CONDITION_LIST.map((c) => {
              const on = condition === c;
              return (
                <Pressable key={c} style={[styles.option, on && styles.optionOn]} onPress={() => { setCondition(c); setOptionId(null); goTo(2); }} accessibilityLabel={`Tow condition ${c}`}>
                  <View style={styles.optRow}>
                    <View style={[styles.iconDisc, on && styles.iconDiscOn]}>
                      <Text style={styles.iconDiscText}>{CONDITION_ICON[c]}</Text>
                    </View>
                    <View style={styles.flex1}>
                      <Text style={styles.optionTitle}>{CONDITION_TEXT[c].label}</Text>
                      <Text style={styles.sub}>{CONDITION_TEXT[c].hint}</Text>
                    </View>
                    <View style={[styles.radio, on && styles.radioOn]}>{on && <Text style={styles.radioTick}>✓</Text>}</View>
                  </View>
                </Pressable>
              );
            })}
          </>
        )}

        {step === 2 && (
          <>
            {/* Like booking a ride: the two ends of the trip in one card (where it is, where it goes), the one being filled in is the text box, and the places to pick come under it. */}
            <Text style={styles.stepTitle}>ඔබේ ස්ථානය තෝරන්න</Text>
            <View style={styles.tripCard}>
              <View style={styles.tripRail}>
                <View style={styles.railDot} />
                <View style={styles.railLine} />
                <View style={styles.railSquare} />
              </View>
              <View style={styles.flex1}>
                {(['from', 'to'] as const).map((k) => {
                  const place = k === 'from' ? pickup : dest;
                  const active = target === k;
                  const empty = k === 'from' ? 'ආරම්භක ස්ථානය' : 'ගමනාන්තය තෝරන්න';
                  return (
                    <Pressable key={k} style={[styles.tripField, active && styles.tripFieldOn]} onPress={() => { setTarget(k); setQuery(''); setSearchNote(''); }} accessibilityLabel={`Trip ${k}`}>
                      {active ? (
                        <TextInput
                          style={styles.tripInput}
                          value={query}
                          onChangeText={(v) => { setQuery(v); setSearchNote(''); }}
                          onSubmitEditing={searchPlace}
                          returnKeyType="search"
                          placeholder={place ? place.name : empty}
                          placeholderTextColor={place ? Colors.textMain : Colors.textMuted}
                          accessibilityLabel="Search the place"
                        />
                      ) : (
                        <Text style={place ? styles.tripFieldText : styles.tripFieldHint} numberOfLines={1}>{place ? place.name : empty}</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable style={styles.listRow} onPress={() => setPickMode(true)} accessibilityLabel="Pick the place on the map">
              <View style={[styles.iconDisc, styles.iconDiscOn]}>
                <Text style={styles.iconDiscText}>🗺️</Text>
              </View>
              <Text style={[styles.optionTitle, styles.flex1]}>Map එකෙන් තෝරන්න</Text>
              <Text style={styles.listChevron}>›</Text>
            </Pressable>
            {!!q && (
              <Pressable style={styles.listRow} onPress={searchPlace} disabled={searching} accessibilityLabel="Look the place up on the map">
                <View style={styles.iconDisc}>
                  <Text style={styles.iconDiscText}>🔍</Text>
                </View>
                <Text style={[styles.optionTitle, styles.flex1]} numberOfLines={1}>{searching ? 'සොයමින්...' : `"${query.trim()}" map එකේ සොයන්න`}</Text>
              </Pressable>
            )}
            {!!searchNote && <Text style={styles.noteBad}>{searchNote}</Text>}
            {choices.length === 0 && !searchNote && <Text style={styles.sub}>ගැළපෙන garage නැහැ. map එකේ සොයන්න හෝ map එකෙන් තෝරන්න.</Text>}
            {choices.map((p) => {
              const on = selectedId === p.id;
              const mark = p.id === 'me' || p.id === 'custom' ? '📍' : '🔧';
              return (
                <Pressable key={p.id} style={styles.listRow} onPress={() => choosePlace(p.id)} accessibilityLabel={`Trip ${target} ${p.name}`}>
                  <View style={[styles.iconDisc, on && styles.iconDiscOn]}>
                    <Text style={styles.iconDiscText}>{mark}</Text>
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.optionTitle} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.sub} numberOfLines={1}>{p.address}</Text>
                  </View>
                  {on ? (
                    <Text style={styles.listTick}>✓</Text>
                  ) : (
                    p.id !== 'me' && (
                      <View style={styles.kmChip}>
                        <Text style={styles.kmChipText}>{roadKm(me.coords, p.coords)} km</Text>
                      </View>
                    )
                  )}
                </Pressable>
              );
            })}
          </>
        )}

        {step === 3 && (
          <>
            <View style={styles.titleRow}>
              <Text style={[styles.stepTitle, styles.flex1]}>ප්‍රතිචාර දැක්වූ සේවා</Text>
            </View>
            <Text style={styles.stepHint}>ඔබේ ඉල්ලීම ගමනට ගැළපෙන ළඟම towing සේවාවලට යැව්වා. ඒවා ප්‍රතිචාර දක්වන විට මිලත් සමඟ මෙතැන පෙනේ; එකක් touch කරලා ප්‍රොෆයිලය බලන්න.</Text>
            {!dest ? (
              <Text style={styles.sub}>ගමනාන්තයක් තෝරන්න.</Text>
            ) : options.length === 0 ? (
              <Text style={styles.sub}>මේ තත්වයට සුදුසු truck එකක් දැනට නැහැ.</Text>
            ) : (
              <>
                <Text style={styles.sectionHead}>✅ ප්‍රතිචාර දැක්වූ ({answers.length})</Text>
                {answers.map((o, i) => (
                  <TowOperatorCard key={o.op.id} op={o.op} index={TOW_OPERATORS.indexOf(o.op)} etaMin={o.etaMin} pickupKm={o.pickupKm} total={o.quote.total} cheapest={i === 0} selected={optionId === o.op.id} onPress={() => setProfileId(o.op.id)} />
                ))}
                {waiting && (
                  <View style={styles.waitCard}>
                    <ActivityIndicator color="#1a73e8" />
                    <Text style={styles.waitText}>
                      ප්‍රතිචාර බලාපොරොත්තුවෙමින්... ({answers.length}/{options.length})
                    </Text>
                  </View>
                )}
                {silent.length > 0 && (
                  <>
                    <Text style={styles.sectionHead}>⏳ ප්‍රතිචාර නොදැක්වූ ළඟම සේවා ({silent.length})</Text>
                    {silent.map(({ op, km, pending }) => (
                      <Pressable key={op.id} style={styles.silentRow} onPress={() => setProfileId(op.id)} accessibilityLabel={`Tow operator ${op.name}`}>
                        <View style={styles.silentDisc}>
                          <Text style={styles.silentTruck}>🛻</Text>
                        </View>
                        <View style={styles.flex1}>
                          <Text style={styles.optionTitle} numberOfLines={1}>{op.name}</Text>
                          <Text style={styles.sub} numberOfLines={1}>
                            ★ {op.rating.toFixed(1)} ({op.reviews}) · 📍 {km} km
                          </Text>
                          <Text style={pending ? styles.silentWait : styles.silentNo} numberOfLines={1}>
                            {pending ? 'ප්‍රතිචාරය බලාපොරොත්තුවෙමින්...' : op.available ? 'මේ ගමනට සුදුසු truck නැහැ' : 'දැන් කාර්යබහුලයි'}
                          </Text>
                        </View>
                        <Pressable style={styles.silentCall} onPress={() => Linking.openURL(`tel:${op.phone.replace(/\s/g, '')}`)} accessibilityLabel={`Call ${op.name}`}>
                          <Text style={styles.silentCallText}>📞</Text>
                        </Pressable>
                      </Pressable>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
      {/* The choosing steps have no buttons: touching an answer moves on (the back arrow is in the top bar). Only the route step once a place is set, and the last step's request. */}
      {step === 2 && !!dest && (
        <View style={styles.footer}>
          <ActionButton label="ඊළඟ" variant="primary" onPress={() => setStep(3)} />
        </View>
      )}
      {(() => {
        const op = TOW_OPERATORS.find((x) => x.id === profileId) ?? null;
        const o = op ? options.find((x) => x.op.id === op.id) ?? null : null;
        const answered = !!o && replied.includes(o.op.id);
        const km = op ? (o ? o.pickupKm : roadKm(pickup.coords, op.coords)) : 0;
        const eta = o ? o.etaMin : etaMinutes(km);
        return (
          <Sheet
            visible={!!op}
            fullScreen
            title={op?.name ?? ''}
            subtitle="Towing සේවා ප්‍රොෆයිලය"
            onClose={() => setProfileId(null)}
            footer={
              o && answered ? (
                <ActionButton
                  label={optionId === o.op.id ? '✓ තෝරා ඇත' : `මෙය තෝරන්න · රු. ${o.quote.total}`}
                  variant="primary"
                  onPress={() => { setOptionId(o.op.id); setProfileId(null); }}
                />
              ) : undefined
            }
          >
            {op && (
              <View style={styles.profile}>
                <View style={styles.profileCover}>
                  <TowCover index={TOW_OPERATORS.indexOf(op)} height={150} />
                </View>
                <View style={styles.profileHead}>
                  <Text style={styles.profileName}>{op.name}</Text>
                  <Text style={styles.sub}>
                    ★ {op.rating.toFixed(1)} ({op.reviews}) · 📍 {km} km · ⏱️ ~මිනි. {eta} · {op.available ? '🟢 Online' : '🟠 Busy'}
                  </Text>
                </View>
                <View style={styles.row}>
                  {op.trucks.map((k) => (
                    <View key={k} style={styles.truckChip}>
                      <Text style={styles.truckChipText}>🛻 {k}</Text>
                    </View>
                  ))}
                </View>
                <ActionButton label={`අමතන්න · ${op.phone}`} icon="📞" variant="ghost" compact onPress={() => Linking.openURL(`tel:${op.phone.replace(/\s/g, '')}`)} />
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>මිල (මේ ගමනට)</Text>
                  {o && answered ? (
                    <QuoteLines q={o.quote} />
                  ) : o ? (
                    <Text style={styles.sub}>ප්‍රතිචාරය බලාපොරොත්තුවෙමින්... ප්‍රතිචාර දැක්වූ පසු මෙහි මිල පෙන්වයි.</Text>
                  ) : (
                    <Text style={styles.sub}>{op.available ? 'මේ ගමනට සුදුසු truck එකක් මේ සේවාව ළඟ නැහැ.' : 'මේ සේවාව දැන් කාර්යබහුලයි, ප්‍රතිචාර දක්වන්නේ නැහැ.'}</Text>
                  )}
                </View>
                <OperatorReviews id={op.id} name={op.name} rating={op.rating} count={op.reviews} />
              </View>
            )}
          </Sheet>
        );
      })()}
      {step === TOW_STEPS.length - 1 && (
        <View style={styles.footer}>
          <ActionButton label={picked ? `Tow truck ඉල්ලන්න · රු. ${picked.quote.total}` : 'Operator කෙනෙක් තෝරන්න'} icon="🛻" variant="primary" disabled={!picked} onPress={request} />
          <Text style={styles.note}>මිල ඇස්තමේන්තුවක්; operator ට කෙලින්ම ගෙවන්න.</Text>
        </View>
      )}
    </MapShell>
  );
};

const FLOAT_SHADOW = { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 14, elevation: 5 } as const;

const dark = () => getThemeMode() === 'dark';
const soft = () => (dark() ? 'rgba(255, 255, 255, 0.06)' : '#f1f4f9');

const styles = themedStyles(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.bgBody },
    topArea: { height: '42%', overflow: 'hidden' },
    topAreaFull: { height: '100%' },
    myLocation: { position: 'absolute', right: 14, bottom: 38, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: dark() ? '#1c2b4a' : '#ffffff', ...FLOAT_SHADOW },
    myLocationLive: { position: 'absolute', right: 14, zIndex: 6 },
    myLocationBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: dark() ? '#1c2b4a' : '#ffffff', ...FLOAT_SHADOW },
    myLocationHigh: { bottom: 96 },
    pillClose: { fontSize: 15, color: Colors.textMuted, paddingLeft: 6 },
    mapSearchWrap: { position: 'absolute', top: 72, left: 72, right: 16, gap: 6 },
    mapSearch: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 9, height: 52, borderRadius: 24, backgroundColor: Colors.bgCard, ...FLOAT_SHADOW },
    mapSearchIcon: { fontSize: 15 },
    mapSearchInput: { flex: 1, height: 48, outlineWidth: 0, fontSize: 14, fontFamily: FONTS.bodyRegular, color: Colors.textMain },
    mapSearchClose: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: dark() ? 'rgba(255, 255, 255, 0.1)' : '#f1f3f4' },
    mapSearchCloseText: { fontSize: 13, color: Colors.textMuted, fontWeight: '700' },
    mapResults: { borderRadius: 18, overflow: 'hidden', backgroundColor: Colors.bgCard, ...FLOAT_SHADOW },
    mapResult: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: dark() ? 'rgba(255, 255, 255, 0.08)' : '#e4e7ec' },
    mapResultName: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    mapResultSub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    mapResultNote: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: dark() ? '#f28b82' : '#b3261e', padding: 12 },
    pickBar: { position: 'absolute', left: 16, right: 16, bottom: 28, alignItems: 'center' },
    pickChip: { paddingHorizontal: 28, height: 48, borderRadius: 24, justifyContent: 'center', backgroundColor: '#1a73e8', ...FLOAT_SHADOW },
    pickChipOff: { backgroundColor: dark() ? '#2a3550' : '#b9c4d6', shadowOpacity: 0 },
    pickChipText: { fontSize: 14.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    topAreaBare: { height: 76, overflow: 'visible', backgroundColor: pageBg() },
    sheetFull: { marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, shadowOpacity: 0, elevation: 0 },
    topBar: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 31 },
    roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center', ...FLOAT_SHADOW },
    stepPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: Colors.bgCard, ...FLOAT_SHADOW },
    stepPillIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: dark() ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', justifyContent: 'center', alignItems: 'center' },
    pillEmoji: { fontSize: 18 },
    // The bidding header's size: 12px top, the 52px pill, and 68px of room below it; the grey sheet overlaps its bottom 24px.
    navyBand: { position: 'absolute', top: 0, left: 0, right: 0, height: 132, backgroundColor: '#1d367f', zIndex: 1 },
    progressWrap: { position: 'absolute', top: 128, left: 16, right: 16 },
    progressRow: { flexDirection: 'row', gap: 6 },
    progressSeg: { flex: 1 },
    progressBar: { height: 6, borderRadius: 3, backgroundColor: Colors.subtleBorder },
    progressBarOn: { backgroundColor: '#1a73e8' },
    stepPillTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    stepPillRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    stepPillCount: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: '#1a73e8', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: dark() ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    stepPillSub: { flexShrink: 1, fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    sheet: { flex: 1, marginTop: -24, backgroundColor: pageBg(), borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', shadowColor: '#3c4043', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 8 },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder, marginTop: 10 },
    stepper: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
    stepSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder },
    stepSegDone: { backgroundColor: 'rgba(26, 115, 232, 0.6)' },
    stepSegActive: { backgroundColor: '#1a73e8' },
    closeText: { fontSize: 16, color: Colors.textMain },
    mapPin: { position: 'absolute', width: 28, height: 28, marginLeft: -14, marginTop: -14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#1e40af' },
    mapPinOn: { borderColor: '#16a34a', width: 34, height: 34, marginLeft: -17, marginTop: -17, borderRadius: 17 },
    peek: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 6 },
    peekDisc: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: dark() ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    peekEmoji: { fontSize: 24 },
    peekCount: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 1, borderRadius: 9, overflow: 'hidden', fontSize: 11.5, fontFamily: FONTS.bodyBold, color: '#1a73e8', backgroundColor: dark() ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    peekText: { fontSize: 19, lineHeight: 26, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 2 },
    truckPin: { position: 'absolute', width: 40, height: 40, marginLeft: -20, marginTop: -20, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8', borderWidth: 3, borderColor: '#ffffff', ...FLOAT_SHADOW },
    truckPinText: { fontSize: 18 },
    mapPinText: { fontSize: 14 },
    meDot: { position: 'absolute', width: 16, height: 16, marginLeft: -8, marginTop: -8, borderRadius: 8, backgroundColor: Colors.primary, borderWidth: 3, borderColor: '#fff' },
    body: { padding: 16, gap: 10, paddingBottom: 40 },
    flex1: { flex: 1 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
    label: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, marginTop: 8 },
    sub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18 },
    note: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    bold: { fontFamily: FONTS.bodyBold, color: Colors.textMain },
    dim: { opacity: 0.5 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.08)' : '#e8eef7' },
    chipOn: { backgroundColor: '#1a73e8' },
    chipText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chipTextOn: { color: '#ffffff' },
    option: { padding: 14, borderRadius: 18, gap: 8, backgroundColor: Colors.bgCard, borderWidth: 2, borderColor: 'transparent', ...(cardGlow() as object) },
    optionOn: { borderColor: '#1a73e8' },
    tripCard: { flexDirection: 'row', alignItems: 'stretch', gap: 8, padding: 10, borderRadius: 20, backgroundColor: Colors.bgCard, ...(cardGlow() as object) },
    tripRail: { width: 18, alignItems: 'center', paddingVertical: 20 },
    railDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1a73e8' },
    railLine: { flex: 1, width: 2, marginVertical: 4, backgroundColor: Colors.subtleBorder },
    railSquare: { width: 10, height: 10, borderRadius: 2, backgroundColor: '#e53935' },
    tripField: { height: 46, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent' },
    tripFieldOn: { borderColor: '#1a73e8', backgroundColor: dark() ? 'rgba(141, 177, 255, 0.1)' : '#f3f8ff' },
    tripFieldText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    tripFieldHint: { fontSize: 14, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    tripInput: { height: 44, fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: dark() ? 'rgba(255, 255, 255, 0.08)' : '#e4e7ec' },
    listChevron: { fontSize: 22, color: Colors.textMuted },
    listTick: { fontSize: 18, fontFamily: FONTS.bodyBold, color: '#1a73e8' },
    noteBad: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: dark() ? '#f28b82' : '#b3261e' },
    profile: { gap: 14, paddingBottom: 12 },
    profileCover: { borderRadius: 18, overflow: 'hidden' },
    profileHead: { gap: 4 },
    profileName: { fontSize: 20, fontFamily: FONTS.titleBold, color: Colors.textMain },
    truckChip: { paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: dark() ? 'rgba(255, 255, 255, 0.08)' : '#eef2f7' },
    truckChipText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    sectionHead: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMain, marginTop: 8 },
    silentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.05)' : '#f1f3f4' },
    silentDisc: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: dark() ? 'rgba(255, 255, 255, 0.08)' : '#e4e7ec' },
    silentTruck: { fontSize: 20 },
    silentWait: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: '#1a73e8', marginTop: 2 },
    silentNo: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, marginTop: 2 },
    silentCall: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: dark() ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    silentCallText: { fontSize: 16 },
    waitCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 18, backgroundColor: dark() ? 'rgba(141, 177, 255, 0.1)' : '#e8f0fe' },
    waitText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: '#1a73e8' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepTitle: { fontSize: 19, fontFamily: FONTS.titleBold, color: Colors.textMain },
    stepHint: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18, marginTop: -4, marginBottom: 2 },
    optRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconDisc: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: dark() ? 'rgba(255, 255, 255, 0.08)' : '#eef2f7' },
    iconDiscOn: { backgroundColor: dark() ? 'rgba(141, 177, 255, 0.2)' : '#dbe9fd' },
    iconDiscText: { fontSize: 20 },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.subtleBorder, alignItems: 'center', justifyContent: 'center' },
    radioOn: { borderColor: '#1a73e8', backgroundColor: '#1a73e8' },
    radioTick: { fontSize: 13, fontFamily: FONTS.bodyBold, color: '#ffffff', lineHeight: 15 },
    kmChip: { paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center', backgroundColor: dark() ? 'rgba(255, 255, 255, 0.08)' : '#eef2f7' },
    kmChipText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    cheapTag: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 8, height: 20, borderRadius: 10, justifyContent: 'center', backgroundColor: 'rgba(22, 163, 74, 0.12)' },
    cheapTagText: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: '#16a34a' },
    optionTitle: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    price: { fontSize: 15, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    footer: { padding: 16, paddingTop: 12, gap: 8, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: dark() ? 'rgba(255, 255, 255, 0.08)' : '#e8eaed' },
    card: { padding: 14, borderRadius: 14, gap: 8, backgroundColor: soft() },
    cardWarn: { backgroundColor: dark() ? 'rgba(251, 188, 4, 0.14)' : '#fef7e0' },
    cardTitle: { fontSize: 14.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    reviews: { marginTop: 6 },
    lines: { gap: 4, marginTop: 4 },
    lineRow: { flexDirection: 'row', justifyContent: 'space-between' },
    lineLabel: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    lineValue: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    stageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
    dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.2)' : '#cbd5e1' },
    dotDone: { backgroundColor: '#16a34a' },
    dotNow: { backgroundColor: '#1a73e8' },
    stageText: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMain },
    good: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: '#16a34a' },
    bad: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: dark() ? '#f28b82' : '#b3261e' },
    star: { fontSize: 32, color: Colors.subtleBorder },
    starOn: { color: Colors.warning },
  })
);
