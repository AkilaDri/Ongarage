import React, { useEffect, useRef, useState } from 'react';
import { shortCategoryName } from '../components/home/CategoryStrip';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Animated, Easing, Linking, Modal, PanResponder, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';
import { MOCK_GARAGES } from '../constants/mockData';
import { GarageTile } from '../components/home/GarageTile';
import { GARAGE_INFO } from '../constants/home';
import { GARAGE_SUB_SERVICES } from '../constants/garageSubServices';
import { CategoryPhoto } from '../components/home/CategoryPhoto';
import { GoogleMap } from '@ongarage/shared';
import { Icon, Gradient } from '@ongarage/shared';
import { useUserLocation } from '../context/LocationContext';
import { useNotice } from '../context/NoticeContext';
import { GarageReviewsSheet } from '../components/GarageReviewsSheet';
import { AMENITIES, canBid, directionsUrl, distanceKm, FUEL_NAMES, filterDefaultsFor, filterPlaces, PLUG_TYPES, serviceModeOf, type Amenity, type Place, type PlaceFilter } from '@ongarage/shared';
import { PlaceTile } from '../components/home/PlaceTile';
import { PlaceSheet } from '../components/PlaceSheet';
import { AMENITY_ICON, AMENITY_LABEL, placesOfCategory } from '../constants/places';
import { useVehicles } from '../context/VehiclesContext';
import type { Garage, LatLng, ServiceCategory } from '@ongarage/shared';

const COLLAPSED_HEIGHT = 420;
/** The blue of the Free Quotes banner on Home. */
const QUOTE_GRADIENT = [
  { offset: '0', color: '#2f5bd6' },
  { offset: '0.5', color: '#1b3a96' },
  { offset: '1', color: '#0b1c52' },
];
/** The search range the bar over the map covers (km), in half-km steps. */
const RADIUS_MIN = 0.5;
const RADIUS_MAX = 10;
const TOP_RATED_MIN = 4.5;
// Fallback until the "Top Rated" row is measured; the minimised sheet ends just below it.
const DEFAULT_PEEK_HEIGHT = 140;

type SheetState = 'peek' | 'collapsed' | 'expanded';

interface ServiceBrowseScreenProps {
  service: ServiceCategory;
  onClose: () => void;
  /** Book this garage directly for this service. */
  onBook: (garage: Garage, back?: () => void) => void;
  /** Ask every nearby garage for bids on this service (shown only in the search-first Home). */
  onPostJob?: (categoryId: string) => void;
  /** The owner's active vehicle: stations and chargers start with filters that suit it (its fuel, or an electric one's plug). */
  vehicleId?: string;
  /** A sub-service to start on (a suggested job from Home). */
  initialSub?: string;
}

/** The colour of the chosen sub-service. */
const SELECTED_GREEN = '#16a34a';

/** How many sub-services show before "සියල්ල බලන්න". */
const SUB_PREVIEW = 4;

export const ServiceBrowseScreen: React.FC<ServiceBrowseScreenProps> = ({ service, onClose, onBook, initialSub, onPostJob, vehicleId }) => {
  const [searchText, setSearchText] = useState('');
  // A garage touched on the map: it is picked (its pin lights up and its card comes first in the list) until it is touched again or cleared.
  const [pickedId, setPickedId] = useState<string | null>(null);
  // Only the garages that have an offer running (the tag on their photo: a free check, 10% off the first service, ...).
  const [listMode, setListMode] = useState<'all' | 'offers' | 'top'>('all');
  // The filters of the stations / chargers list; they start from what the active vehicle suggests (its fuel, or an electric one's plug) and the owner can clear them.
  const { vehicles } = useVehicles();
  const activeVehicle = vehicles.find((v) => v.id === vehicleId);
  const [pf, setPf] = useState<PlaceFilter>(() => filterDefaultsFor(activeVehicle, service.id === '16' ? 'fuel' : 'ev'));
  const [detailPlace, setDetailPlace] = useState<(Place & { distance: number }) | null>(null);
  const togglePf = <K extends keyof PlaceFilter>(key: K, value: PlaceFilter[K]) => setPf((cur) => ({ ...cur, [key]: cur[key] === value ? undefined : value }));
  const toggleAmenity = (a: Amenity) => setPf((cur) => ({ ...cur, amenities: cur.amenities?.includes(a) ? cur.amenities.filter((x) => x !== a) : [...(cur.amenities ?? []), a] }));
  const [reviewsFor, setReviewsFor] = useState<Garage | null>(null);
  const { notify } = useNotice();
  // The sub-service chips: they slide in sideways whenever the category changes, and drift along the row by themselves (like the suggested services on
  // Home) until the owner touches the row; then they stay put for a while.
  // The sub-services show as a wrapping grid: a few first, the rest behind "සියල්ල බලන්න" (no sideways swiping, no sliding by itself).
  const [subsOpen, setSubsOpen] = useState(false);
  // The height of the sub-service grid, so the location row below it always starts under the last row of chips.
  const [subGridH, setSubGridH] = useState(0);
  const subIn = useRef(new Animated.Value(1)).current;
  const subDims = useRef({ view: 0, content: 0, x: 0, pausedUntil: 0 });
  const [selectedSub, setSelectedSub] = useState(() => Math.max(0, service.subcategories.indexOf(initialSub ?? '')));
  // When folded, the first few show, plus the picked one if it is further down the list, so the choice stays visible in green.
  const pickedIndex = selectedSub;
  // The row over the map never grows: the full list lives in the filter sheet (subsOpen), so nothing covers the map.
  const visibleSubs = pickedIndex >= SUB_PREVIEW
      ? [...service.subcategories.slice(0, SUB_PREVIEW - 1), service.subcategories[pickedIndex]]
      : service.subcategories.slice(0, SUB_PREVIEW);
  const [mapHeight, setMapHeight] = useState(0);
  const [mapW, setMapW] = useState(390);
  // Where the garages are searched from and how far: the owner's own spot by default, or a spot picked on the map (`origin`); the range is dragged on the bar over the map.
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [pickMode, setPickMode] = useState(false);
  // A place tapped on the map is shown first, then confirmed or cancelled from the bar.
  const [pendingOrigin, setPendingOrigin] = useState<LatLng | null>(null);
  const originBeforePick = useRef<LatLng | null>(null);
  const [radiusKm, setRadiusKm] = useState(RADIUS_MAX);
  const trackW = useRef(1);
  const dragFrom = useRef(0);
  // The sheet opens folded down at the bottom (just its title and the count); it is dragged up to see the garages and down to fold it again.
  const [sheet, setSheet] = useState<SheetState>('peek');
  const [peekHeight, setPeekHeight] = useState(DEFAULT_PEEK_HEIGHT);
  const sheetRef = useRef<SheetState>(sheet);
  sheetRef.current = sheet;
  // The search bar folds away while the sheet is fully open: 0 = shown, 1 = hidden.
  const [headerH, setHeaderH] = useState(0);
  const headerFold = useRef(new Animated.Value(0)).current;
  // The list scrolling itself back to the top after a snap must not re-open the sheet.
  const lastSnap = useRef(0);
  const listRef = useRef<ScrollView>(null);
  const listY = useRef(0);
  const sheetHeight = useRef(new Animated.Value(DEFAULT_PEEK_HEIGHT)).current;
  const currentHeight = useRef(DEFAULT_PEEK_HEIGHT);
  const dragStart = useRef(DEFAULT_PEEK_HEIGHT);
  // Opens at the middle, so the garages are the first thing seen; the map is still above it.
  useEffect(() => {
    const t = setTimeout(() => animateTo('collapsed'), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The map area grows by the search bar's height while the bar folds away. `mapHeight` is its height with the bar shown and is not updated during the fold
  // (a new height every frame made the sheet re-render and re-spring all the way up, which felt like a stall); the full-open sheet is that plus the bar.
  const folding = useRef(false);
  const lastMapH = useRef(0);
  const fullHeight = (mapHeight || 700) + (mapHeight ? headerH : 0);
  const collapsedHeight = Math.max(peekHeight + 60, Math.min(COLLAPSED_HEIGHT, fullHeight * 0.6));
  const heights = useRef({ peek: peekHeight, collapsed: collapsedHeight, expanded: fullHeight });
  heights.current = { peek: peekHeight, collapsed: collapsedHeight, expanded: fullHeight };

  // The screen opens with the search box idle: the web modal focuses its first field when it mounts, which would pop the keyboard
  // up over the map, so the focus is dropped again (a few times, as the modal can focus after the first frame).
  const searchRef = useRef<TextInput>(null);
  useEffect(() => {
    const drop = () => {
      searchRef.current?.blur();
      if (Platform.OS === 'web') (document.activeElement as HTMLElement | null)?.blur?.();
    };
    const timers = [0, 80, 250, 600].map((ms) => setTimeout(drop, ms));
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const id = sheetHeight.addListener(({ value }) => (currentHeight.current = value));
    return () => sheetHeight.removeListener(id);
  }, [sheetHeight]);

  const animateTo = (target: SheetState, velocity = 0) => {
    setSheet(target);
    sheetRef.current = target;
    lastSnap.current = Date.now();
    folding.current = true;
    Animated.timing(headerFold, { toValue: target === 'expanded' ? 1 : 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => {
      folding.current = false;
      // Back to the normal layout: take the map area's height again (it only changes when the bar is shown).
      if (sheetRef.current !== 'expanded' && lastMapH.current) setMapHeight(lastMapH.current);
    });
    if (target !== 'expanded') {
      listRef.current?.scrollTo({ y: 0, animated: true });
      listY.current = 0;
    }
    Animated.spring(sheetHeight, {
      toValue: heights.current[target],
      velocity,
      stiffness: 210,
      damping: 26,
      mass: 1,
      overshootClamping: false,
      useNativeDriver: false,
    }).start();
  };

  // Re-snap when the measured sizes change (first layout, rotation, keyboard).
  useEffect(() => {
    if (!mapHeight) return;
    Animated.spring(sheetHeight, { toValue: heights.current[sheetRef.current], stiffness: 210, damping: 26, useNativeDriver: false }).start();
  }, [mapHeight, peekHeight, collapsedHeight, sheetHeight]);

  useEffect(() => {
    subIn.setValue(0);
    Animated.timing(subIn, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
    setSubsOpen(false);
  }, [service.id, subIn]);

  const tapHandle = () => animateTo(sheet === 'peek' ? 'collapsed' : sheet === 'collapsed' ? 'expanded' : 'collapsed');

  // The sheet follows the finger, then settles with the release velocity. A flick
  // down always minimises; a flick up steps up one level; a slow drag snaps to the
  // nearest level. While the expanded list is scrolled into its content the list
  // scrolls instead, until it is back at the first shop.
  const sheetPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => {
        if (Math.abs(g.dy) < 6 || Math.abs(g.dy) < Math.abs(g.dx)) return false;
        if (sheetRef.current !== 'expanded') return true;
        return g.dy > 0 && listY.current <= 0;
      },
      onPanResponderGrant: () => {
        sheetHeight.stopAnimation();
        dragStart.current = currentHeight.current;
      },
      onPanResponderMove: (_, g) => {
        const { peek, expanded } = heights.current;
        const raw = dragStart.current - g.dy;
        // Rubber-band past either end instead of stopping dead.
        const h = raw > expanded ? expanded + (raw - expanded) * 0.25 : raw < peek ? peek - (peek - raw) * 0.25 : raw;
        sheetHeight.setValue(h);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => settle(g.vy),
      // On web the browser can still take the gesture away mid-drag (e.g. to scroll the
      // list). Settle anyway, or the sheet is left mid-way with a stale state.
      onPanResponderTerminate: (_, g) => settle(g.vy),
    })
  ).current;

  // The range bar over the map is vertical, on its right side: touch or drag anywhere on its track; the thumb follows and the range snaps to half kilometres
  // (the top of the bar is the widest range, the bottom the nearest).
  const rangeAt = (y: number) => {
    const t = 1 - Math.min(1, Math.max(0, y / trackW.current));
    setRadiusKm(Math.round((RADIUS_MIN + (RADIUS_MAX - RADIUS_MIN) * t) * 2) / 2);
  };
  const radiusPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        dragFrom.current = e.nativeEvent.locationY;
        rangeAt(dragFrom.current);
      },
      onPanResponderMove: (_, g) => rangeAt(dragFrom.current + g.dy),
    })
  ).current;

  // Mouse wheel / trackpad on the web, as in Google Maps: the sheet rides the wheel (no steps) until it is fully up; only then does the list scroll. Pulling
  // the list back down from its top lowers the sheet again. When the wheel pauses the sheet snaps to the nearest level, leaning the way it was moving.
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelDir = useRef(0);
  const onSheetWheel = (e: { deltaY: number }) => {
    const dy = e.deltaY;
    if (!dy) return;
    const atTop = listY.current <= 0;
    // Fully up and the list not at its top, or scrolling it further down: the list scrolls by itself.
    if (sheetRef.current === 'expanded' && currentHeight.current >= heights.current.expanded - 1 && !(dy < 0 && atTop)) return;
    const { peek, expanded } = heights.current;
    sheetHeight.stopAnimation();
    const h = Math.min(expanded, Math.max(peek, currentHeight.current + dy));
    sheetHeight.setValue(h);
    currentHeight.current = h;
    wheelDir.current = dy > 0 ? 1 : -1;
    if (wheelTimer.current) clearTimeout(wheelTimer.current);
    wheelTimer.current = setTimeout(() => {
      const { peek: p, collapsed: c, expanded: x } = heights.current;
      const lean = currentHeight.current + wheelDir.current * 40;
      const options: [SheetState, number][] = [['peek', p], ['collapsed', c], ['expanded', x]];
      animateTo(options.reduce((best, o) => (Math.abs(o[1] - lean) < Math.abs(best[1] - lean) ? o : best))[0]);
    }, 140);
  };

  function settle(vy: number) {
    const velocity = -vy;
    const h = currentHeight.current;
    const { peek, collapsed, expanded } = heights.current;
    let target: SheetState;
    if (vy > 0.4) target = 'peek';
    else if (vy < -0.4) target = h < collapsed - 10 ? 'collapsed' : 'expanded';
    else {
      const options: [SheetState, number][] = [['peek', peek], ['collapsed', collapsed], ['expanded', expanded]];
      target = options.reduce((best, o) => (Math.abs(o[1] - h) < Math.abs(best[1] - h) ? o : best))[0];
    }
    animateTo(target, velocity);
  }

  // Interpolation ranges must be strictly increasing, even on very short screens.
  const dimTop = Math.max(fullHeight, collapsedHeight + 1);

  const listReveal = sheetHeight.interpolate({
    inputRange: [peekHeight, peekHeight + 90],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const mapDim = sheetHeight.interpolate({
    inputRange: [collapsedHeight, dimTop],
    outputRange: [0, 0.55],
    extrapolate: 'clamp',
  });
  const sheetRadius = sheetHeight.interpolate({
    inputRange: [fullHeight - 60, fullHeight],
    outputRange: [24, 0],
    extrapolate: 'clamp',
  });
  const handleWidth = sheetHeight.interpolate({
    inputRange: [peekHeight, collapsedHeight, dimTop],
    outputRange: [48, 36, 28],
    extrapolate: 'clamp',
  });

  const user = useUserLocation();
  const center = origin ?? user.coords;
  // The map zooms so the range ring takes about a third of its width: a wider range zooms out.
  const zoom = Math.min(16, Math.max(9, Math.round(Math.log2((156543.03392 * Math.cos((center.latitude * Math.PI) / 180) * 140) / (radiusKm * 1000)))));
  const ringPx = (radiusKm * 1000 * 2 ** zoom) / (156543.03392 * Math.cos((center.latitude * Math.PI) / 180));
  // The range bar sits between the controls at the top of the map and the peeking sheet. On a short screen that gap is small, so the bar's track shortens to fit
  // (down to a minimum) instead of running under the sheet; the bar's bottom stays a little above the sheet's top edge.
  const sheetTopY = (mapHeight || 700) - peekHeight;
  const BAR_CHROME = 76;
  const LOC_ROOM = 52; // the my-location button under the bar
  const barTrackH = Math.min(150, Math.max(70, sheetTopY - 14 - LOC_ROOM - 150 - BAR_CHROME));
  const barTop = Math.max(150, sheetTopY - 14 - LOC_ROOM - (barTrackH + BAR_CHROME)) - 108;
  const query = searchText.trim().toLowerCase();
  // The picked sub-service narrows the garages to the ones that ticked it at registration (places keep their own sub-service filter).
  const pickedSub = service.subcategories[selectedSub];
  const isPlaceService = serviceModeOf(service.id, pickedSub) === 'place';
  const ticksSub = (g: Garage) => !pickedSub || !!(g.subServices ?? GARAGE_SUB_SERVICES[g.id])?.[service.id]?.includes(pickedSub);
  const found = MOCK_GARAGES.filter(
    (g) => (!query || g.name.toLowerCase().includes(query) || g.specialization.toLowerCase().includes(query)) && (isPlaceService || ticksSub(g))
  )
    .map((g) => ({ ...g, distance: Number(distanceKm(center, g.coords).toFixed(1)) }))
    .filter((g) => g.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
  const withOffers = found.filter((g) => !!GARAGE_INFO[g.id]?.offer);
  // Top rated: the garages owners rate best (TOP_RATED_MIN stars and up), the best first.
  const topRated = found.filter((g) => g.rating >= TOP_RATED_MIN).sort((a, b) => b.rating - a.rating);
  const garages = listMode === 'offers' ? withOffers : listMode === 'top' ? topRated : found;
  // The picked garage (if it is still in the search) comes first, and the other garages follow it below, nearest first.
  const openCount = garages.filter((g) => g.status === 'open').length;
  const pickedGarage = pickedId ? garages.find((g) => g.id === pickedId) : undefined;
  const shownGarages = pickedGarage ? [pickedGarage, ...garages.filter((g) => g.id !== pickedGarage.id)] : garages;
  // How the picked service works (service mode): a fuel station or an EV charging point is a place (nearest first, navigate or call; no bids, no booking of garages),
  // the rest are garages. The sub-service chips then filter the places (Petrol, Diesel ... / AC Charging Port, DC Fast Charging).
  const activeSub = service.subcategories[selectedSub];
  const mode = serviceModeOf(service.id, activeSub);
  const placeMode = mode === 'place';
  const kind = service.id === '16' ? 'fuel' : 'ev';
  const placesFound = placeMode
    ? placesOfCategory(service.id)
        .filter((p) => !query || p.name.toLowerCase().includes(query) || p.brand.toLowerCase().includes(query))
        .filter((p) => p.services.includes(activeSub))
        .map((p) => ({ ...p, distance: Number(distanceKm(center, p.coords).toFixed(1)) }))
        .filter((p) => p.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance)
    : [];
  const placesList = filterPlaces(placesFound, pf) as typeof placesFound;
  const pickedPlace = pickedId ? placesList.find((p) => p.id === pickedId) : undefined;
  const shownPlaces = pickedPlace ? [pickedPlace, ...placesList.filter((p) => p.id !== pickedPlace.id)] : placesList;
  const placeOpenCount = placesList.filter((p) => p.open).length;
  const pins = placeMode
    ? shownPlaces.map((p) => ({ id: p.id, name: p.name, coords: p.coords, open: p.open, label: `${service.icon} ${p.brand}` }))
    : garages.map((g) => ({ id: g.id, name: g.name, coords: g.coords, open: g.status === 'open', label: `${service.icon} ${g.name.split(' ')[0]}` }));
  const pickGarage = (id: string) => {
    setPickedId((cur) => (cur === id ? null : id));
    // Bring its card into view: the sheet leaves its small peek and shows the list from the top.
    if (sheetRef.current === 'peek') animateTo('collapsed');
    listRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* The same top bar as the job form and the search screen: a solid blue band, a round back button on the left, and the search pill. It fades as the sheet rises. */}
        <Animated.View style={[styles.browseBand, { opacity: sheetHeight.interpolate({ inputRange: [collapsedHeight, collapsedHeight + 70], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close screen" style={styles.roundBack}>
            <Icon name="x" size={20} strokeWidth={2.5} color={Colors.textMain} />
          </Pressable>
          <View style={styles.searchPill}>
            <Icon name="search" size={18} color={Colors.textMuted} />
            <TextInput
              ref={searchRef}
              autoFocus={false}
              style={styles.searchInput}
              placeholder="ගරාජයක් හෝ සේවාවක් සොයන්න..."
              placeholderTextColor={getThemeMode() === 'dark' ? Colors.textMuted : '#94a3b8'}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </Animated.View>

      <View style={styles.mapArea} onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        setMapW(Math.round(e.nativeEvent.layout.width));
        // Only the layout with the search bar shown counts (see `fullHeight`).
        if (sheetRef.current !== 'expanded' && !folding.current) {
          lastMapH.current = h;
          setMapHeight(h);
        }
      }}>
        <GoogleMap
          // The map keeps one size whatever the sheet does (it slides over it): the height of the map area with the search bar shown, less the peeking sheet.
          // The map's top edge sits 24px into the blue band, so its rounded corners show over it (as the sheets do on the other screens).
          style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', top: 108 }, mapHeight ? { bottom: undefined, height: Math.max(0, mapHeight - (peekHeight - 20) - 108) } : { bottom: peekHeight - 20 }]}
          center={center}
          zoom={zoom}
          onPressCoordinate={pickMode ? (c) => { setOrigin(c); setPendingOrigin(c); } : undefined}
          renderOverlay={(project) => (
            <>
              {pins.map((g) => {
                const p = project(g.coords);
                return p ? (
                  <Pressable
                    key={g.id}
                    style={[styles.mapPin, { left: p.x, top: p.y }, pickedId === g.id && styles.mapPinPicked]}
                    onPress={() => pickGarage(g.id)}
                    hitSlop={8}
                    accessibilityLabel={`Select ${g.name}`}
                    accessibilityState={{ selected: pickedId === g.id }}
                  >
                    <Text style={[styles.mapPinText, pickedId === g.id && styles.mapPinTextPicked]}>{g.label}</Text>
                    {/* The pointer under the label: its tip is the exact spot on the map. */}
                    <View style={[styles.pinTip, pickedId === g.id && styles.pinTipPicked]} pointerEvents="none" />
                    {/* A small dot in the pin's top right corner: green when it is open now, red when it is closed. */}
                    <View style={[styles.pinDot, g.open ? styles.pinTagOpen : styles.pinTagClosed]} accessibilityLabel={g.open ? 'Open now' : 'Closed'} />
                  </Pressable>
                ) : null;
              })}
              {(() => {
                const c = project(center);
                return c ? <View style={[styles.rangeRing, { left: c.x - ringPx, top: c.y - ringPx, width: ringPx * 2, height: ringPx * 2, borderRadius: ringPx }]} pointerEvents="none" /> : null;
              })()}
              {origin && (() => {
                const o = project(origin);
                return o ? <View style={[styles.originPin, { left: o.x, top: o.y }]} pointerEvents="none"><Text style={styles.originPinText}>📍</Text></View> : null;
              })()}
              {(() => {
                const me = project(user.coords);
                return me ? <View style={[styles.meDot, { left: me.x, top: me.y }]} pointerEvents="none" /> : null;
              })()}
            </>
          )}
        />


        {/* The sub-services of the picked service (they slide by themselves to show there are more) float over the map right under the search bar, and fade out with it. */}
        <Animated.View
          onLayout={(e) => setSubGridH(Math.round(e.nativeEvent.layout.height))}
          style={[styles.subFloat, { opacity: sheetHeight.interpolate({ inputRange: [collapsedHeight, collapsedHeight + 70], outputRange: [1, 0], extrapolate: 'clamp' }) }]}
          pointerEvents={sheet === 'expanded' ? 'none' : 'box-none'}
        >
          <Animated.View style={{ opacity: subIn, transform: [{ translateX: subIn.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }] }}>
            <View style={styles.subGrid} accessibilityRole="radiogroup" accessibilityLabel={`${service.name} හි උප සේවා`}>
              {visibleSubs.map((sub) => {
                const i = service.subcategories.indexOf(sub);
                const active = i === selectedSub;
                return (
                  <Pressable
                    key={sub}
                    style={[styles.subChip, { backgroundColor: active ? SELECTED_GREEN : '#ffffff', borderColor: active ? SELECTED_GREEN : service.color + '8c' }]}
                    onPress={() => {
                      setSelectedSub(i);
                      setSubsOpen(false);
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    accessibilityRole="radio"
                    accessibilityLabel={`Sub service ${sub}`}
                    accessibilityState={{ selected: active }}
                  >
                    <CategoryPhoto categoryId={service.id} size={22} />
                    <Text style={[styles.subChipText, styles.subChipTextMap, active && styles.subChipTextActive]}>{active ? `✓ ${sub}` : sub}</Text>
                  </Pressable>
                );
              })}
              {service.subcategories.length > SUB_PREVIEW && (
                <Pressable style={[styles.subChip, styles.subMore]} onPress={() => setSubsOpen(true)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }} accessibilityRole="button" accessibilityLabel={subsOpen ? 'Show fewer sub services' : `Show all ${service.subcategories.length} sub services`}>
                  <Text style={styles.subMoreText}>{`සියල්ල බලන්න (${service.subcategories.length})`}</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        </Animated.View>

        {/* Over the map: the range bar (drag it to change how far garages are searched) and the choice of where to search from. They fade out with the search bar. */}
        <Animated.View style={[styles.mapControls, { top: 70 + subGridH + 8, opacity: sheetHeight.interpolate({ inputRange: [collapsedHeight, collapsedHeight + 70], outputRange: [1, 0], extrapolate: 'clamp' }) }]} pointerEvents="box-none">
          {/* Sits at the very bottom of the map, just above the peeking sheet. */}
          {/* It sits just above the peeking sheet, so it fades out as soon as the sheet starts to rise (and stops taking touches), instead of floating over the sheet. */}
          <Animated.View
            style={[styles.rangeBar, { top: barTop, opacity: sheetHeight.interpolate({ inputRange: [peekHeight, peekHeight + 40], outputRange: [1, 0], extrapolate: 'clamp' }) }]}
            pointerEvents={sheet === 'peek' ? 'auto' : 'none'}
          >
            <Text style={styles.rangeLabel}>{radiusKm}</Text>
            <Text style={styles.rangeUnit}>km</Text>
            <View style={[styles.rangeTrackBox, { height: barTrackH }]} onLayout={(e) => (trackW.current = Math.max(1, e.nativeEvent.layout.height))}>
              <View style={styles.rangeTrack} />
              <View style={[styles.rangeFill, { height: `${((radiusKm - RADIUS_MIN) / (RADIUS_MAX - RADIUS_MIN)) * 100}%` }]} />
              <View style={[styles.rangeThumb, { bottom: `${((radiusKm - RADIUS_MIN) / (RADIUS_MAX - RADIUS_MIN)) * 100}%` }]} />
              <View style={styles.rangeTouch} {...radiusPan.panHandlers} accessibilityLabel="Search range" accessibilityRole="adjustable" />
            </View>
          </Animated.View>
          <View style={styles.spotRow}>
            <Pressable
              style={[styles.spotChip, pickMode && styles.spotChipOn]}
              onPress={() => {
                originBeforePick.current = origin;
                setPendingOrigin(null);
                setPickMode((m) => !m);
              }}
              accessibilityLabel={pickMode ? 'Cancel choosing a place on the map' : origin ? 'Search centre: another place. Tap to choose on the map' : 'Search centre: my location. Tap to choose another place'}
              accessibilityState={{ selected: pickMode }}
            >
              <Text style={[styles.spotChipText, pickMode && styles.spotChipTextOn]}>
                {pickMode ? '🗺️ සිතියමේ ස්ථානයක් ඔබන්න' : origin ? '📍 වෙනත් ස්ථානයක්' : '📍 ඔබේ ස්ථානය'}
              </Text>
            </Pressable>
            {(!!origin || pickMode) && (
              <Pressable
                style={styles.spotChip}
                onPress={() => {
                  setOrigin(null);
                  setPickMode(false);
                }}
                accessibilityLabel="Back to my location"
              >
                <Text style={styles.spotChipText}>✕</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>

        {pickMode && pendingOrigin && (
          <View style={[styles.confirmBar, { bottom: peekHeight + 12 }]}>
            <Pressable style={styles.confirmYes} onPress={() => { setPickMode(false); setPendingOrigin(null); }} accessibilityLabel="Confirm this place">
              <Text style={styles.confirmYesText}>ස්ථානය තහවුරු කරන්න</Text>
            </Pressable>
            <Pressable style={styles.confirmNo} onPress={() => { setOrigin(originBeforePick.current); setPendingOrigin(null); setPickMode(false); }} accessibilityLabel="Cancel this place">
              <Text style={styles.confirmNoText}>අවලංගු</Text>
            </Pressable>
          </View>
        )}

        <Animated.View pointerEvents="none" style={[styles.mapDim, { opacity: mapDim }]} />

        {/* All the sub-services, in one place, with Done: opened from "සියල්ල බලන්න", so the map under it stays clear. */}
        <Modal visible={subsOpen} transparent animationType="fade" onRequestClose={() => setSubsOpen(false)}>
          <Pressable style={styles.filterBackdrop} onPress={() => setSubsOpen(false)} accessibilityLabel="Close the filter" />
          <View style={styles.filterSheet}>
            <Text style={styles.filterTitle}>{`${service.name} · උප සේවා`}</Text>
            <View style={styles.subGrid}>
              {service.subcategories.map((sub) => {
                const i = service.subcategories.indexOf(sub);
                const active = i === selectedSub;
                return (
                  <Pressable
                    key={sub}
                    style={[styles.subChip, { backgroundColor: active ? SELECTED_GREEN : '#ffffff', borderColor: active ? SELECTED_GREEN : service.color + '8c' }]}
                    onPress={() => {
                      setSelectedSub(i);
                      setSubsOpen(false);
                    }}
                    accessibilityRole="radio"
                    accessibilityLabel={`Sub service ${sub}`}
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.subChipText, active && styles.subChipTextActive]}>{active ? `✓ ${sub}` : sub}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable style={styles.filterDone} onPress={() => setSubsOpen(false)} accessibilityLabel="Done">
              <Text style={styles.filterDoneText}>සම්පූර්ණයි</Text>
            </Pressable>
          </View>
        </Modal>

        <Animated.View
          style={[styles.sheet, { height: sheetHeight, borderTopLeftRadius: sheetRadius, borderTopRightRadius: sheetRadius }]}
          {...sheetPan.panHandlers}
          {...(Platform.OS === 'web' ? ({ onWheel: onSheetWheel } as object) : {})}
        >
          <Pressable style={styles.handleHitArea} onPress={tapHandle} hitSlop={12}>
            {/* An up arrow instead of the grey line: it invites the pull, and fades away as soon as the sheet is raised (the space stays, so nothing jumps). */}
            <Animated.View style={[styles.handleArrow, { opacity: sheetHeight.interpolate({ inputRange: [peekHeight, peekHeight + 40], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>
              <Icon name="chevron-down" size={22} strokeWidth={2.5} color={Colors.textMuted} />
            </Animated.View>
          </Pressable>

          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <Pressable style={styles.sheetTitleRow} onPress={() => sheet === 'peek' && animateTo('collapsed')}>
                {/* The category's own artwork, the same picture as its tile on Home. */}
                <CategoryPhoto categoryId={service.id} size={34} />
                <Text style={styles.sheetTitle} numberOfLines={1}>{shortCategoryName(service.id) ?? service.name}</Text>
              </Pressable>
              <Text style={styles.listCount}>{placeMode ? `මෙම සේවාව දෙන ස්ථාන ${placesList.length}` : `ගරාජ ${found.length} ක් මෙය කරයි`}</Text>
            </View>
            <View style={styles.headerRight}>
              {/* Free quote: the same look as the Free Quotes banner on Home (the blue card with the white ＋), asking every nearby garage for bids on this service. */}
              {!!onPostJob && canBid(service.id, activeSub) && (
                <Pressable style={[styles.freeQuote, styles.freeQuoteHead]} onPress={() => onPostJob(service.id)} accessibilityLabel="Ask all garages for bids">
                  <Gradient stops={QUOTE_GRADIENT} />
                  <Text style={styles.freeQuoteText}>Free Quote</Text>
                  <View style={styles.freeQuotePlus}>
                    <Text style={styles.freeQuotePlusText}>＋</Text>
                  </View>
                </Pressable>
              )}
              {sheet === 'expanded' && (
                <Pressable
                  style={({ pressed }) => [styles.sheetClose, styles.sheetMinimize, pressed && styles.sheetClosePressed]}
                  onPress={() => animateTo('collapsed')}
                  hitSlop={8}
                  accessibilityLabel="Minimize"
                >
                  <Icon name="chevron-down" size={16} strokeWidth={2.5} color={Colors.primary} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Every garage, or only the ones that have an offer: above the sub-category filters. */}
          {placeMode ? (
            <>
              <View style={styles.offerRow}>
                {(
                  [
                    ['all', `සියලු ${placesFound.length}`, 'All places', !pf.open && !pf.open24 && !pf.freeNow, () => setPf((cur) => ({ ...cur, open: undefined, open24: undefined, freeNow: undefined }))],
                    ['open', `🟢 දැන් විවෘත ${filterPlaces(placesFound, { open: true }).length}`, 'Open places', !!pf.open, () => togglePf('open', true)],
                    ['special', kind === 'fuel' ? `🌙 24/7 ${filterPlaces(placesFound, { open24: true }).length}` : `🟢 නිදහස් ${filterPlaces(placesFound, { freeNow: true }).length}`, kind === 'fuel' ? 'Open all day' : 'Free chargers now', kind === 'fuel' ? !!pf.open24 : !!pf.freeNow, () => (kind === 'fuel' ? togglePf('open24', true) : togglePf('freeNow', true))],
                  ] as const
                ).map(([id, label, a11y, on, press]) => (
                  <Pressable key={id} style={[styles.offerChip, on && styles.offerChipOn]} onPress={press} accessibilityLabel={a11y} accessibilityState={{ selected: on }}>
                    <Text style={[styles.offerChipText, on && styles.offerChipTextOn]} numberOfLines={1}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {/* The finer filters, sliding sideways: fuel type (or plug and speed) and the facilities. The ones picked come first, side by side at the start of the row,
                  and the rest follow in their usual order. */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
                {(() => {
                  type FilterChip = { key: string; label: string; a11y: string; on: boolean; press: () => void };
                  const chips: FilterChip[] =
                    kind === 'fuel'
                      ? FUEL_NAMES.map((n) => ({ key: `fuel-${n}`, label: `⛽ ${n}`, a11y: `Fuel ${n}`, on: pf.fuel === n, press: () => togglePf('fuel', n) }))
                      : [
                          ...PLUG_TYPES.map((n) => ({ key: `plug-${n}`, label: `🔌 ${n}`, a11y: `Plug ${n}`, on: pf.plug === n, press: () => togglePf('plug', n) })),
                          { key: 'speed-fast', label: '⚡ වේගවත් 50kW+', a11y: 'Fast chargers', on: pf.speed === 'fast', press: () => togglePf('speed', 'fast') },
                          { key: 'speed-slow', label: '🐢 මන්දගාමී', a11y: 'Slow chargers', on: pf.speed === 'slow', press: () => togglePf('speed', 'slow') },
                        ];
                  AMENITIES.forEach((am) => chips.push({ key: `amenity-${am}`, label: `${AMENITY_ICON[am]} ${AMENITY_LABEL[am]}`, a11y: `Facility ${am}`, on: !!pf.amenities?.includes(am), press: () => toggleAmenity(am) }));
                  // Picked ones first (the sort keeps the order of the rest).
                  return [...chips.filter((c) => c.on), ...chips.filter((c) => !c.on)].map((c) => (
                    <Pressable key={c.key} style={[styles.fChip, c.on && styles.fChipOn]} onPress={c.press} accessibilityLabel={c.a11y} accessibilityState={{ selected: c.on }}>
                      <Text style={[styles.fChipText, c.on && styles.fChipTextOn]}>{c.label}</Text>
                      {/* A picked chip carries a small round plus tag on its top corner. */}
                      {c.on && (
                        <View style={styles.fChipTag} pointerEvents="none">
                          <Text style={styles.fChipTagText}>＋</Text>
                        </View>
                      )}
                    </Pressable>
                  ));
                })()}
              </ScrollView>
            </>
          ) : (
            <View style={styles.offerRow}>
              {(
                [
                  ['all', `සියලු ගරාජ ${found.length}`, 'All garages'],
                  ['offers', `🏷️ දීමනා ඇති ${withOffers.length}`, 'Garages with offers'],
                  ['top', `⭐ Top Rated ${topRated.length}`, 'Top rated garages'],
                ] as const
              ).map(([id, label, a11y]) => (
                <Pressable key={id} style={[styles.offerChip, listMode === id && styles.offerChipOn]} onPress={() => setListMode(id)} accessibilityLabel={a11y} accessibilityState={{ selected: listMode === id }}>
                  <Text style={[styles.offerChipText, listMode === id && styles.offerChipTextOn]} numberOfLines={1}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          {/* Once a garage is picked, the "picked garage first" tag (the Free Quote tag is up in the header, beside the category name). */}
          {(!!pickedGarage || !!pickedPlace) && (
            <View style={styles.tagRow}>
            {(pickedGarage || pickedPlace) && (
              <Pressable style={styles.pickedChip} onPress={() => setPickedId(null)} accessibilityLabel="Clear the selected garage">
                <Text style={styles.offerChipText}>{placeMode ? 'තෝරාගත් ස්ථානය ඉහළින් · ✕' : 'තෝරාගත් ගරාජය ඉහළින් · ✕'}</Text>
              </Pressable>
            )}
            </View>
          )}

          {/* No "Top Rated / N garages found" row any more. This empty marker still tells the sheet how tall its folded (peek) state is: down to here. */}
          <View style={styles.peekEnd} onLayout={(e) => setPeekHeight(Math.round(e.nativeEvent.layout.y + e.nativeEvent.layout.height + 14))} />

          <Animated.ScrollView
            ref={listRef}
            style={[
              styles.flex1,
              { opacity: listReveal, transform: [{ translateY: listReveal.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] },
            ]}
            contentContainerStyle={styles.garageList}
            showsVerticalScrollIndicator={false}
            // The garage cards only scroll once the sheet is fully up; before that a drag (or the wheel) lifts the sheet first.
            scrollEnabled={sheet === 'expanded'}
            scrollEventThrottle={16}
            onScroll={(e) => {
              listY.current = e.nativeEvent.contentOffset.y;
              // Mouse wheel / trackpad on web never reaches the pan responder.
              if (listY.current > 2 && sheetRef.current !== 'expanded' && Date.now() - lastSnap.current > 700) animateTo('expanded');
            }}
          >
            {placeMode
              ? shownPlaces.map((p) => <PlaceTile key={p.id} place={p} distance={p.distance} from={user.coords} picked={pickedId === p.id} onPress={() => setDetailPlace(p)} />)
              : shownGarages.map((g) => (
              <GarageTile
                    key={g.id}
                    garage={g}
                    width="100%"
                    compact
                    showStatus
                    showDetails
                    categoryId={service.id}
                    onOpen={() => setReviewsFor(g)}
                    onSaveChange={(saved) => notify({ icon: saved ? '♥' : '♡', title: saved ? 'සුරැකි ගරාජ වලට එක් කළා' : 'සුරැකි ලැයිස්තුවෙන් ඉවත් කළා', body: g.name, tone: 'primary' })}
                  />
                ))}
          </Animated.ScrollView>
        </Animated.View>
      </View>
      <PlaceSheet place={detailPlace} distance={detailPlace?.distance} from={user.coords} onClose={() => setDetailPlace(null)} />
      <GarageReviewsSheet
        garage={reviewsFor}
        inquiryCategoryId={service.id}
        onClose={() => setReviewsFor(null)}
        onReopen={setReviewsFor}
        onCall={reviewsFor ? () => Linking.openURL(`tel:${reviewsFor.phone.replace(/s/g, '')}`) : undefined}
        onBook={
          reviewsFor
            ? () => {
                const g = reviewsFor;
                setReviewsFor(null);
                onBook(g, () => setReviewsFor(g));
              }
            : undefined
        }
      />
    </SafeAreaView>
  );
};

const styles = themedStyles(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBody },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // No header bar any more (no band, no rule under it): only the search bar stands above the map.
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  // Floats over the map's top edge, like Google Maps' search box.
  browseBand: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 4, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 68, backgroundColor: '#1d367f' },
  roundBack: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center' },
  searchPill: { flex: 1, height: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, borderRadius: 26, backgroundColor: Colors.bgCard },
  floatSearch: { position: 'absolute', top: 12, left: 14, right: 14, zIndex: 4, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', marginLeft: -4 },
  searchClose: { width: 28, height: 28, borderRadius: 14, marginLeft: 6, justifyContent: 'center', alignItems: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    // The Home search bar's look: white (in both themes), rounded, a blue search icon; its height comes from padding so the app's shape rule keeps the corners square-ish.
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  searchIcon: { fontSize: 14, color: Colors.textMuted, marginRight: 8 },
  // On the web the browser draws its own coloured box round a focused text field; the search bar already is the box, so that outline is off.
  searchInput: { flex: 1, color: '#0f2a3d', fontSize: 13, paddingVertical: 0, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as object) : null) },
  mapArea: { flex: 1, backgroundColor: Colors.mapBg, overflow: 'hidden' },
  mapPin: {
    position: 'absolute',
    // Anchored by its bottom centre: the pointer's tip sits on the garage's coordinates (the label is above the spot).
    transform: [{ translateX: '-50%' }, { translateY: '-100%' }, { translateY: -7 }],
    backgroundColor: Colors.cardGlass,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pinTip: { position: 'absolute', bottom: -7, left: '50%', marginLeft: -6, width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'rgba(56, 189, 248, 0.9)' },
  pinTipPicked: { borderTopColor: '#1a73e8' },
  pinDot: { position: 'absolute', top: -4, right: -4, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: '#ffffff' },
  pinTagOpen: { backgroundColor: '#16a34a' },
  pinTagClosed: { backgroundColor: '#dc2626' },
  mapPinText: { fontSize: 10, fontWeight: '800', color: Colors.textMain },
  // The garage that is picked: filled and raised above the other pins.
  mapPinPicked: { backgroundColor: '#1a73e8', borderColor: '#1a73e8', zIndex: 5, elevation: 5, paddingVertical: 4 },
  mapPinTextPicked: { color: '#ffffff' },
  meDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    marginLeft: -8,
    marginTop: -8,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: '#fff',
  },
  sheet: {
    position: 'absolute',
    zIndex: 5,
    // Dragging the sheet with a mouse on web would otherwise select its text.
    userSelect: 'none',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.sheetBg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(56, 189, 248, 0.25)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    paddingTop: 9,
    paddingHorizontal: 6,
    paddingBottom: 20,
    gap: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: getThemeMode() === 'dark' ? 0.8 : 0.1,
    shadowRadius: 30,
    elevation: 16,
  },
  handleHitArea: { alignSelf: 'center', marginBottom: -2, flexShrink: 0, paddingVertical: 2 },
  // No background: just the dot and the words on the map (light words with a soft shadow so they read on any map).
  mapControls: { position: 'absolute', left: 14, right: 14, zIndex: 3, gap: 8 },
  // A vertical bar on the right side of the map: the km value on top, the track below it (top = widest range). No fill, only an outline round it.
  rangeBar: { position: 'absolute', right: 0, top: 96, width: 42, alignItems: 'center', paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.85)' },
  rangeLabel: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: '#ffffff', textShadowColor: 'rgba(0, 0, 0, 0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  rangeUnit: { fontSize: 10, fontFamily: FONTS.bodySemiBold, color: '#ffffff', marginBottom: 6, textShadowColor: 'rgba(0, 0, 0, 0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  rangeTrackBox: { width: 28, height: 150, alignItems: 'center', marginTop: 12, marginBottom: 10 },
  rangeTrack: { position: 'absolute', top: 0, bottom: 0, width: 4, borderRadius: 2, backgroundColor: '#d2dcec' },
  rangeFill: { position: 'absolute', bottom: 0, width: 4, borderRadius: 2, backgroundColor: '#1a73e8' },
  rangeThumb: { position: 'absolute', width: 20, height: 20, borderRadius: 10, marginBottom: -10, backgroundColor: '#ffffff', borderWidth: 3, borderColor: '#1a73e8', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  rangeTouch: { ...StyleSheet.absoluteFill, ...(Platform.OS === 'web' ? ({ touchAction: 'none', cursor: 'pointer' } as object) : null) },
  spotRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  countPill: { alignSelf: 'flex-start', paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.18)' : '#e8f0fe' },
  // The my-location button, under the range bar: a white disc as wide as the bar with the blue "you are here" dot (a soft halo round a dot with a white rim).
  myLoc: { position: 'absolute', right: 0 },
  // The garage filter chips: in a row at the left, ending before the my-location button.
  garageFilters: { position: 'absolute', left: 14, right: 80, zIndex: 5 },
  garageFilterScroll: { flexGrow: 0 },
  garageFilterRow: { gap: 6, alignItems: 'center', paddingRight: 8, paddingBottom: 6 },
  garageChip: { paddingHorizontal: 10 },
  myLocBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 },
  locHalo: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  locHaloOn: { backgroundColor: 'rgba(26, 115, 232, 0.22)' },
  locHaloOff: { backgroundColor: 'rgba(60, 64, 67, 0.16)' },
  locCore: { width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, borderColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.35, shadowRadius: 2, elevation: 2 },
  locCoreOn: { backgroundColor: '#1a73e8' },
  locCoreOff: { backgroundColor: '#5f6368' },
  spotChip: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  spotChipOn: { backgroundColor: '#1a73e8' },
  spotChipText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: '#0f2a3d' },
  spotChipTextOn: { color: '#ffffff' },
  rangeRing: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(26, 115, 232, 0.85)', backgroundColor: 'rgba(26, 115, 232, 0.07)' },
  originPin: { position: 'absolute', transform: [{ translateX: '-50%' }, { translateY: '-100%' }] },
  originPinText: { fontSize: 26 },
  mapDim: { ...StyleSheet.absoluteFill, backgroundColor: '#000' },
  handleArrow: { alignSelf: 'center', paddingVertical: 1, transform: [{ rotate: '180deg' }] },
  handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder },
  // Fixed height so the row does not jump when the minimize button appears.
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, minHeight: 28, marginTop: -16 },
  peekEnd: { height: 0, marginTop: -9 },
  // The three filters fill the bar between them, the same width each.
  offerRow: { flexDirection: 'row', gap: 8, paddingBottom: 0 },
  filterScroll: { flexGrow: 0, flexShrink: 0, marginTop: -7 },
  filterRow: { gap: 6, paddingRight: 12, paddingTop: 7 },
  fChipTag: { position: 'absolute', top: -6, right: -4, width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8', borderWidth: 1.5, borderColor: Colors.sheetBg },
  fChipTagText: { fontSize: 12, lineHeight: 14, color: '#ffffff', fontFamily: FONTS.bodyBold, marginTop: -1 },
  fChip: { paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: 'center', borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
  fChipOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
  fChipText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
  fChipTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  offerChip: { flex: 1, height: 44, paddingHorizontal: 6, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
  tagRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  pickedChip: { alignSelf: 'center', paddingHorizontal: 12, height: 28, borderRadius: 15, justifyContent: 'center', borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
  // Tag-sized: it is only as wide as its words and the little white circle.
  freeQuote: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, paddingLeft: 14, paddingRight: 5, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1b3a96' },
  freeQuoteText: { fontSize: 12.5, fontFamily: FONTS.titleBold, color: '#ffffff', letterSpacing: 0.2 },
  freeQuotePlus: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  freeQuotePlusText: { fontSize: 17, lineHeight: 19, color: '#1b3a96', fontFamily: FONTS.bodyBold, marginTop: -1 },
  offerChipOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
  offerChipText: { fontSize: 13, fontWeight: '700', color: getThemeMode() === 'dark' ? Colors.textMuted : '#475569' },
  offerChipTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  // The open count over the map, with no background of its own, at the right end of the line of the location chip.
  mapOpen: { position: 'absolute', right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'transparent' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  confirmBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 10, zIndex: 20 },
  confirmYes: { flex: 1, height: 48, borderRadius: 24, backgroundColor: '#1a73e8', justifyContent: 'center', alignItems: 'center' },
  confirmYesText: { fontSize: 14, fontWeight: '800', color: '#ffffff' },
  confirmNo: { paddingHorizontal: 18, height: 48, borderRadius: 24, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, justifyContent: 'center' },
  confirmNoText: { fontSize: 14, fontWeight: '700', color: Colors.textMain },
  filterBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  filterSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, gap: 14, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: Colors.bgCard },
  filterTitle: { fontSize: 16, fontWeight: '800', color: Colors.textMain },
  filterDone: { height: 46, borderRadius: 23, backgroundColor: '#1a73e8', justifyContent: 'center', alignItems: 'center' },
  filterDoneText: { fontSize: 14, fontWeight: '800', color: '#ffffff' },
  listCount: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a56b0' },
  freeQuoteHead: { alignSelf: 'center', gap: 6, paddingLeft: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  openSticker: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.18)' : '#e8f0fe' },
  openDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' },
  openStickerText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a56b0' },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sheetIcon: { fontSize: 18 },
  sheetTitle: { fontSize: 15, fontWeight: '800', color: Colors.textMain },
  sheetClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetMinimize: { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.45)' },
  sheetClosePressed: { transform: [{ scale: 0.9 }] },
  // The sub-service chips float over the map right under the search bar; the spot chip and the controls below start a little lower to make room.
  // Full width, so the chips slide edge to edge of the screen (the row's side margins are padding inside the scroller, not a clipping edge).
  subFloat: { position: 'absolute', top: 146, left: 0, right: 0, zIndex: 4 },
  subChipTextMap: { color: '#0f2a3d' },
  subGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingVertical: 4 },
  subMore: { backgroundColor: '#ffffff', borderColor: '#1a73e8' },
  subMoreText: { fontSize: 12.5, fontWeight: '700', color: '#1a56b0' },
  // Each chip takes its category's colour (a tint, with a border of the same colour); the picked one is filled with it. Same look as the suggested services on Home.
  subChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingLeft: 8, paddingRight: 12, height: 34, borderRadius: 17 },
  subChipText: { fontSize: 11.5, fontWeight: '700', color: Colors.textMain },
  subChipTextActive: { color: '#ffffff' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 },
  listLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countLabel: { fontSize: 10, color: Colors.successText, fontWeight: '700' },
  garageList: { gap: 12, paddingBottom: 8 },
}));
