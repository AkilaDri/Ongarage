import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';
import { Colors, distanceKm, FONTS, geocodeAddress, reverseGeocode, themedStyles, TOW_SITE_LIST, zoomToFit, type LatLng, type TowSite } from '@ongarage/shared';
import { useUserLocation } from '../../context/LocationContext';
import { TOW_SITE_TEXT } from '../../constants/towSites';
import { elevation1, outline } from '../../utils/material';
import { AppMap } from '../../components/map/AppMap';

/**
 * Step 2 of the towing flow: the two places on one full-screen map, as in the SOS location picker.
 * The bottom card has a row for each place; the row chosen is the one the centre pin moves.
 */
export type TowPlace = { id: string; name: string; address: string; coords: { latitude: number; longitude: number } };
export type TowTiming = { mode: 'now' } | { mode: 'scheduled'; dayOffset: number; hour: number };
/** The two places the vehicle moves between (step 2). */
export type TowPlaces = { pickup: TowPlace; drop: TowPlace; sites?: TowSite[] };
/** The places and the timing together (step 3 completes it). */
export type TowRouteDraft = TowPlaces & { timing: TowTiming };

export type Role = 'pickup' | 'drop';

const MIN_ZOOM = 11;
const MAX_ZOOM = 19;
/** Two places closer than this are the same spot: the flow asks for two different places. */
const MIN_TRIP_KM = 0.2;
const COLOR = { pickup: '#1d367f', drop: '#ee5e16' };
const isCoords = (t: string) => /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(t.trim());
/** A place with no readable name is shown as "selected", and its coordinates only as small detail. */
const placeTitle = (p: TowPlace) => (isCoords(p.name) ? (isCoords(p.address) ? 'මැප් මත තෝරා ඇත' : p.address) : p.name);
/** Coordinates are never shown as text: a place with no name shows its address, or nothing. */
const placeDetail = (p: TowPlace) => (isCoords(p.name) ? '' : p.address !== p.name ? p.address : '');
/** A nice scale-bar length for the zoom: the longest of these that fits in about 110px. */
const SCALE_STEPS_M = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
const scaleBar = (lat: number, zoom: number) => {
  const metresPerPx = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
  const step = [...SCALE_STEPS_M].reverse().find((m) => m / metresPerPx <= 110) ?? SCALE_STEPS_M[0];
  return { px: Math.round(step / metresPerPx), label: step >= 1000 ? `${step / 1000} km` : `${step} m` };
};
const ROLE_PIN = { pickup: '🚗  මෙතැනද?', drop: '🛻  මෙතැනටද?' };

export const TowRouteScreen: React.FC<{
  onClose: () => void;
  /** Both places are set and the owner confirmed them: the flow moves on to the timing step. */
  onNext: (places: TowPlaces) => void;
  /** Opened from the timing step to change a place: the overview opens with both places, on the place chosen. */
  start?: { places: TowPlaces; role: Role };
  /** With `start`, the back arrow returns to the timing step without changing anything. */
  onBack?: () => void;
}> = ({ onClose, onNext, start, onBack }) => {
  const user = useUserLocation();
  const gps: TowPlace = useMemo(() => ({ id: 'here', name: 'ඔබ සිටින තැන', address: user.address, coords: user.coords }), [user.address, user.coords]);

  // The pickup follows GPS until the owner moves it; the drop-off starts empty (unless we are editing a chosen place).
  const [pickup, setPickup] = useState<TowPlace>(start?.places.pickup ?? gps);
  const pickupTouched = useRef(!!start);
  const [drop, setDrop] = useState<TowPlace | null>(start?.places.drop ?? null);
  const [active, setActive] = useState<Role>(start?.role ?? 'pickup');
  // What the pickup spot is like. Optional: the owner names what the trucks must be ready for.
  const [sites, setSites] = useState<TowSite[]>(start?.places.sites ?? []);
  const toggleSite = (s: TowSite) => setSites((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  const [center, setCenter] = useState<LatLng>(start ? start.places[start.role].coords : user.coords);
  const [zoom, setZoom] = useState(14);
  const [resolving, setResolving] = useState(false);
  // The spinner shows only when the address lookup is slow; a quick lookup needs no sign.
  const [showSpin, setShowSpin] = useState(false);
  useEffect(() => {
    if (!resolving) {
      setShowSpin(false);
      return;
    }
    const t = setTimeout(() => setShowSpin(true), 1000);
    return () => clearTimeout(t);
  }, [resolving]);
  // Placing: the centre pin moves a place. Overview: both places on the map, for checking the trip.
  // Opened from the timing step, the map is live at once on the place chosen (no extra tap needed).
  const [editing, setEditing] = useState(true);
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const geocodeSeq = useRef(0);

  useEffect(() => {
    if (pickupTouched.current) return;
    setPickup(gps);
    setCenter(user.coords);
  }, [gps, user.coords]);

  const commit = (role: Role, p: TowPlace) => {
    if (role === 'pickup') {
      pickupTouched.current = true;
      setPickup(p);
    } else {
      setDrop(p);
    }
  };

  // The centre pin moved (or a search or GPS put it somewhere): the active place takes the new spot and its address.
  const moveTo = async (c: LatLng, role: Role = active, known?: string) => {
    setCenter(c);
    const seq = ++geocodeSeq.current;
    const id = role === 'pickup' ? 'here' : 'drop';
    if (known) {
      commit(role, { id, name: known, address: known, coords: c });
      return;
    }
    setResolving(true);
    let address = `${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`;
    let name = address;
    try {
      const g = await reverseGeocode(c);
      address = g.address;
      name = g.locality || g.address;
    } catch {
      /* the coordinates stay as the name */
    }
    if (seq === geocodeSeq.current) {
      commit(role, { id, name, address, coords: c });
      setResolving(false);
    }
  };

  const chooseRole = (role: Role) => {
    setActive(role);
    setEditing(true);
    const p = role === 'pickup' ? pickup : drop;
    if (p) setCenter(p.coords);
  };

  // "මෙතැන තහවුරු කරන්න": the pin's place is this place. The pickup moves on to the drop-off; the drop-off opens the overview.
  const confirmPlace = async () => {
    if (active === 'pickup' && !drop) {
      setActive('drop');
      setCenter(pickup.coords);
      return;
    }
    if (active === 'drop' && !drop) await moveTo(center, 'drop');
    setEditing(false);
  };

  // Opened from the timing step: confirming the place goes straight back to the timing step with both places.
  const confirmForTiming = () => {
    if (!drop || tooClose) return;
    onNext({ pickup, drop, sites });
  };

  // The overview fits both places once, when it opens.
  useEffect(() => {
    if (!editing && drop) showBoth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setNote('');
    try {
      const r = await geocodeAddress(q);
      moveTo(r.coords, active, r.address);
      setQuery('');
    } catch {
      setNote('ඒ තැන සොයාගන්න බැරි වුණා.');
    }
  };

  const useMyLocation = async () => {
    const c = await user.refresh();
    moveTo(c);
  };

  const trip = drop ? distanceKm(pickup.coords, drop.coords) : null;
  const scale = scaleBar(center.latitude, zoom);

  // Both places on screen: the midpoint, zoomed to fit the distance between them.
  const showBoth = () => {
    if (!drop) return;
    const mid = { latitude: (pickup.coords.latitude + drop.coords.latitude) / 2, longitude: (pickup.coords.longitude + drop.coords.longitude) / 2 };
    const km = distanceKm(pickup.coords, drop.coords);
    setCenter(mid);
    setZoom(zoomToFit(Math.max(km * 1.8, 2), mid.latitude, 380));
  };
  const tooClose = trip !== null && trip < MIN_TRIP_KM;
  const ready = !!drop && !tooClose;
  const label = (role: Role) => (role === 'pickup' ? 'වාහනය දැන් ඉන්නේ' : 'ගෙනයන්න ඕන තැන');

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.mapArea}>
        <AppMap
          style={styles.mapCanvas}
          center={center}
          zoom={zoom}
          fallbackColor="#ef4444"
          // While placing, a tap or drag moves the active place. In the overview the map only pans and zooms, so it can't change a place by accident.
          onPressCoordinate={editing ? (c) => moveTo(c) : undefined}
          onRegionChange={(c, z) => {
            setZoom(z);
            if (editing) moveTo(c);
            else setCenter(c);
          }}
          renderOverlay={(project) => {
            const a = project(pickup.coords);
            const b = drop ? project(drop.coords) : null;
            return (
              <>
                {a && b && (
                  <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
                    <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={COLOR.pickup} strokeWidth={2} strokeDasharray="6 5" />
                  </Svg>
                )}
                {a && (
                  <View style={[styles.marker, { left: a.x, top: a.y, backgroundColor: '#ffffff', borderColor: COLOR.pickup, borderWidth: 3 }]} pointerEvents="none">
                    <Text style={styles.markerText}>🚗</Text>
                  </View>
                )}
                {b && drop && (
                  <View style={[styles.marker, { left: b.x, top: b.y, backgroundColor: '#ffffff', borderColor: COLOR.drop, borderWidth: 3 }]} pointerEvents="none">
                    <Text style={styles.markerText}>🛻</Text>
                  </View>
                )}
                {/* In the overview each marker carries its name, so the owner can check the trip without reading the card. */}
                {!editing && a && <View style={[styles.markerLabel, { left: a.x, top: a.y + 22 }]} pointerEvents="none"><Text style={styles.markerLabelText}>ඔබ සිටින තැන</Text></View>}
                {!editing && b && drop && <View style={[styles.markerLabel, { left: b.x, top: b.y + 22 }]} pointerEvents="none"><Text style={styles.markerLabelText}>ගෙනයන තැන</Text></View>}
              </>
            );
          }}
        >
          {/* The centre pin moves the active place: its label says which one. It leaves the map in the overview. */}
          {editing && (
            <View style={styles.centerMarker} pointerEvents="none">
              <View style={[styles.pinBubble, { backgroundColor: COLOR[active] }]}>
                <Text style={styles.pinText}>{ROLE_PIN[active]}</Text>
              </View>
              <View style={[styles.pinStem, { backgroundColor: COLOR[active] }]} />
              <View style={[styles.pinPoint, { backgroundColor: COLOR[active] }]} />
              <View style={styles.pinShadow} />
            </View>
          )}
        </AppMap>

        {/* The header, as in SOS: close on the left, the step pill, and the right slot kept clear. */}
        <View style={styles.topBar}>
          <Pressable style={styles.roundBtn} onPress={onBack ?? onClose} accessibilityLabel={onBack ? 'Back to timing' : 'Close towing'}>
            <Text style={styles.closeText}>{onBack ? '‹' : '✕'}</Text>
          </Pressable>
          <View style={styles.pill}>
            <View style={styles.pillDisc}>
              <Text style={styles.pillEmoji}>🛻</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.pillTitle} numberOfLines={1}>Ongarage Towing</Text>
              <View style={styles.stepRow}>
                <View style={styles.stepChip}>
                  <Text style={styles.stepNo}>2/6</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {editing && (
        <View style={styles.searchFloat}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              setNote('');
            }}
            onSubmitEditing={search}
            returnKeyType="search"
            placeholder={`${active === 'pickup' ? 'වාහනය ඉන්න තැන' : 'ගෙනයන තැන'} සොයන්න`}
            placeholderTextColor={Colors.textMuted}
            accessibilityLabel="Search for the active place"
            {...(Platform.OS === 'web' ? { ...({ outlineStyle: 'none' } as object) } : {})}
          />
          {!!query && (
            <Pressable style={styles.searchGo} onPress={search} accessibilityLabel="Search">
              <Text style={styles.searchGoText}>→</Text>
            </Pressable>
          )}
        </View>
        )}

        {!!note && (
          <View style={styles.noteWrap} pointerEvents="none">
            <Text style={styles.note}>{note}</Text>
          </View>
        )}

        {drop && trip !== null && editing && (
          <View style={styles.distChip} pointerEvents="none">
            <Text style={styles.distText}>{`km ${trip.toFixed(1)}`}</Text>
          </View>
        )}

        <View style={styles.scaleWrap} pointerEvents="none">
          <View style={[styles.scaleLine, { width: scale.px }]} />
          <Text style={styles.scaleText}>{scale.label}</Text>
        </View>

        <View style={styles.mapControls}>
          {drop && editing && (
            <Pressable style={styles.roundBtn} onPress={showBoth} accessibilityLabel="Show both places">
              <Text style={styles.controlText}>⤢</Text>
            </Pressable>
          )}
          <Pressable style={styles.roundBtn} onPress={useMyLocation} accessibilityLabel="Use my location">
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.textMain} strokeWidth={2} strokeLinecap="round">
              <Circle cx="12" cy="12" r="7" />
              <Circle cx="12" cy="12" r="2.5" />
              <Line x1="12" y1="1.5" x2="12" y2="4.5" />
              <Line x1="12" y1="19.5" x2="12" y2="22.5" />
              <Line x1="1.5" y1="12" x2="4.5" y2="12" />
              <Line x1="19.5" y1="12" x2="22.5" y2="12" />
            </Svg>
          </Pressable>
          <Pressable style={styles.roundBtn} onPress={() => setZoom((z) => Math.min(z + 1, MAX_ZOOM))} accessibilityLabel="Zoom in">
            <Text style={styles.controlText}>＋</Text>
          </Pressable>
          <Pressable style={styles.roundBtn} onPress={() => setZoom((z) => Math.max(z - 1, MIN_ZOOM))} accessibilityLabel="Zoom out">
            <Text style={styles.controlText}>－</Text>
          </Pressable>
        </View>
      </View>

      {/* The bottom card: one row per place. The row chosen is the one the centre pin moves. */}
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>{editing ? 'ස්ථාන දෙක තෝරන්න' : 'ඔබේ ගමන'}</Text>
        {(['pickup', 'drop'] as Role[]).map((role) => {
          const p = role === 'pickup' ? pickup : drop;
          const on = active === role;
          return (
            <Pressable key={role} style={[styles.row, on && styles.rowOn]} onPress={() => chooseRole(role)} accessibilityLabel={`Set ${label(role)}`} accessibilityState={{ selected: on }}>
              <View style={[styles.rowDisc, { backgroundColor: '#ffffff', borderWidth: 3, borderColor: COLOR[role] }]}>
                <Text style={styles.rowDiscText}>{role === 'pickup' ? '🚗' : '🛻'}</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.rowLabel}>{label(role)}</Text>
                <Text style={p ? styles.rowName : styles.rowEmpty} numberOfLines={2}>{p ? placeTitle(p) : 'මැප් එකේ තෝරන්න'}</Text>
                {!!p && !!placeDetail(p) && <Text style={styles.rowAddress} numberOfLines={1}>{placeDetail(p)}</Text>}
              </View>
              {on && resolving && showSpin ? (
                <ActivityIndicator size="small" color={COLOR[role]} />
              ) : on ? null : (
                <Text style={styles.rowAction}>{p ? 'වෙනස් කරන්න' : 'තෝරන්න'}</Text>
              )}
            </Pressable>
          );
        })}

        {trip !== null && (
          <Text style={[styles.tripText, tooClose && styles.tripWarn]}>
            {tooClose ? 'ආරම්භ තැනට ඉතා ළඟයි. වෙනත් තැනක් තෝරන්න.' : `දුර: km ${trip.toFixed(1)}`}
          </Text>
        )}

        {/* The site, named before the trucks quote: the trucks that cannot do it are left out, and the labour is priced in. */}
        {!!drop && (
          <View style={styles.siteBox}>
            <Text style={styles.siteTitle}>ස්ථානයේ තත්ත්වය</Text>
            <View style={styles.siteRow}>
              {TOW_SITE_LIST.map((s) => {
                const on = sites.includes(s);
                return (
                  <Pressable key={s} style={[styles.siteChip, on && styles.siteChipOn]} onPress={() => toggleSite(s)} accessibilityLabel={`Site ${TOW_SITE_TEXT[s]}`} accessibilityState={{ selected: on }}>
                    <Text style={[styles.siteText, on && styles.siteTextOn]}>{TOW_SITE_TEXT[s]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {editing ? (
          <Pressable style={[styles.action, start && (!drop || tooClose) && styles.actionOff]} disabled={!!start && (!drop || tooClose)} onPress={start ? confirmForTiming : confirmPlace} accessibilityLabel="Confirm this place">
            <Text style={styles.actionText}>{start ? (tooClose ? 'ස්ථාන දෙක වෙනස් කරන්න' : 'මෙතැන තහවුරු කරන්න') : !drop && active === 'pickup' ? 'ඊළඟ: ගෙනයන තැන' : 'මෙතැන තහවුරු කරන්න'}</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.action, !ready && styles.actionOff]} disabled={!ready} onPress={() => drop && onNext({ pickup, drop, sites })} accessibilityLabel="Confirm both places">
            <Text style={[styles.actionText, !ready && styles.actionTextOff]}>{tooClose ? 'ස්ථාන දෙක වෙනස් කරන්න' : 'ස්ථාන දෙක තහවුරු කරන්න'}</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.bgBody },
    flex1: { flex: 1 },
    mapArea: { flex: 1 },
    mapCanvas: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },

    topBar: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center', elevation: 3 },
    closeText: { fontSize: 18, color: Colors.textMain },
    pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: Colors.bgCard },
    pillDisc: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
    pillEmoji: { fontSize: 20 },
    pillTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    pillSub: { flexShrink: 1, fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stepChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#dbeafe' },
    stepNo: { fontSize: 12, color: '#1d367f', fontFamily: FONTS.bodyBold },

    searchFloat: { position: 'absolute', top: 72, left: 16, right: 16, height: 46, borderRadius: 23, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 6, backgroundColor: Colors.bgCard, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
    searchIcon: { fontSize: 14 },
    searchInput: { flex: 1, height: 46, fontFamily: FONTS.bodyRegular, fontSize: 14, color: Colors.textMain },
    searchGo: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1d367f', alignItems: 'center', justifyContent: 'center' },
    searchGoText: { fontSize: 16, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    noteWrap: { position: 'absolute', top: 128, left: 16, right: 16, alignItems: 'center' },
    note: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: Colors.bgCard, fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, overflow: 'hidden' },
    mapControls: { position: 'absolute', right: 16, bottom: 24, gap: 10 },
    controlText: { fontSize: 18, lineHeight: 22, color: Colors.textMain, fontFamily: FONTS.bodyBold },

    centerMarker: { alignItems: 'center', transform: [{ translateY: -30 }] },
    pinBubble: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
    pinText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: '#fff' },
    pinStem: { width: 3, height: 16 },
    pinPoint: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: '#fff', marginTop: -2 },
    pinShadow: { width: 18, height: 6, borderRadius: 9, backgroundColor: 'rgba(15, 23, 42, 0.22)', marginTop: 2 },
    marker: { position: 'absolute', width: 34, height: 34, marginLeft: -17, marginTop: -17, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    markerText: { fontSize: 15 },

    sheet: { marginTop: -24, backgroundColor: Colors.bgCard, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 16, gap: 10, borderTopLeftRadius: 28, borderTopRightRadius: 28, shadowColor: '#3c4043', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 8 },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder, marginBottom: 2 },
    sheetTitle: { fontSize: 18, lineHeight: 26, fontFamily: FONTS.titleBold, color: Colors.textMain },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard },
    rowOn: { borderColor: '#1d367f', borderWidth: 2 },
    rowDisc: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    rowDiscText: { fontSize: 17 },
    rowLabel: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.3 },
    rowName: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 2 },
    rowEmpty: { fontSize: 15, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    rowAddress: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    rowAction: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: '#1d367f' },
    tripText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, textAlign: 'center' },
    tripWarn: { color: '#b45309' },
    action: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1d367f' },
    actionOff: { backgroundColor: '#cbd5e1' },
    actionTextOff: { color: '#334155' },
    activeChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 11, backgroundColor: '#1d367f' },
    activeChipText: { fontSize: 11.5, lineHeight: 16, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    markerLabel: { position: 'absolute', marginLeft: -48, width: 96, alignItems: 'center', paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.92)' },
    markerLabelText: { fontSize: 11, lineHeight: 16, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    distChip: { position: 'absolute', left: 16, top: 128, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: Colors.bgCard, elevation: 3 },
    distText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    scaleWrap: { position: 'absolute', left: 16, bottom: 16, alignItems: 'flex-start', gap: 2 },
    scaleLine: { height: 3, borderLeftWidth: 2, borderRightWidth: 2, borderBottomWidth: 2, borderColor: Colors.textMain },
    scaleText: { fontSize: 11, lineHeight: 15, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 3 },
    actionText: { fontSize: 15, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    siteBox: { gap: 6 },
    siteTitle: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    siteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    siteChip: { minHeight: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: Colors.subtleFill, alignItems: 'center', justifyContent: 'center' },
    siteChipOn: { backgroundColor: '#1d367f' },
    siteText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    siteTextOn: { color: '#ffffff' },
  })
);
