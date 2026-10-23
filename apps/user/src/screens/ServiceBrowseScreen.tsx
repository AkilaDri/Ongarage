import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Animated, Easing, Linking, PanResponder, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, getThemeMode, themedStyles } from '@ongarage/shared';
import { MOCK_GARAGES } from '../constants/mockData';
import { GarageTile } from '../components/home/GarageTile';
import { GARAGE_INFO } from '../constants/home';
import { GoogleMap } from '@ongarage/shared';
import { Icon } from '@ongarage/shared';
import { useUserLocation } from '../context/LocationContext';
import { useNotice } from '../context/NoticeContext';
import { GarageReviewsSheet } from '../components/GarageReviewsSheet';
import { directionsUrl, distanceKm } from '@ongarage/shared';
import type { Garage, ServiceCategory } from '@ongarage/shared';

const COLLAPSED_HEIGHT = 420;
const TOP_RATED_MIN = 4.5;
// Fallback until the "Top Rated" row is measured; the minimised sheet ends just below it.
const DEFAULT_PEEK_HEIGHT = 140;

type SheetState = 'peek' | 'collapsed' | 'expanded';

interface ServiceBrowseScreenProps {
  service: ServiceCategory;
  onClose: () => void;
  /** Book this garage directly for this service. */
  onBook: (garage: Garage) => void;
}

export const ServiceBrowseScreen: React.FC<ServiceBrowseScreenProps> = ({ service, onClose, onBook }) => {
  const [searchText, setSearchText] = useState('');
  // A garage touched on the map: it is picked (its pin lights up and its card comes first in the list) until it is touched again or cleared.
  const [pickedId, setPickedId] = useState<string | null>(null);
  // Only the garages that have an offer running (the tag on their photo: a free check, 10% off the first service, ...).
  const [listMode, setListMode] = useState<'all' | 'offers' | 'top'>('all');
  const [reviewsFor, setReviewsFor] = useState<Garage | null>(null);
  const { notify } = useNotice();
  const [selectedSub, setSelectedSub] = useState(0);
  const [mapHeight, setMapHeight] = useState(0);
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

  const fullHeight = mapHeight || 700;
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
    Animated.timing(headerFold, { toValue: target === 'expanded' ? 1 : 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
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
  const query = searchText.trim().toLowerCase();
  const found = MOCK_GARAGES.filter(
    (g) => !query || g.name.toLowerCase().includes(query) || g.specialization.toLowerCase().includes(query)
  )
    .map((g) => ({ ...g, distance: Number(distanceKm(user.coords, g.coords).toFixed(1)) }))
    .sort((a, b) => a.distance - b.distance);
  const withOffers = found.filter((g) => !!GARAGE_INFO[g.id]?.offer);
  // Top rated: the garages owners rate best (TOP_RATED_MIN stars and up), the best first.
  const topRated = found.filter((g) => g.rating >= TOP_RATED_MIN).sort((a, b) => b.rating - a.rating);
  const garages = listMode === 'offers' ? withOffers : listMode === 'top' ? topRated : found;
  // The picked garage (if it is still in the search) comes first, and the other garages follow it below, nearest first.
  const openCount = garages.filter((g) => g.status === 'open').length;
  const pickedGarage = pickedId ? garages.find((g) => g.id === pickedId) : undefined;
  const shownGarages = pickedGarage ? [pickedGarage, ...garages.filter((g) => g.id !== pickedGarage.id)] : garages;
  const pickGarage = (id: string) => {
    setPickedId((cur) => (cur === id ? null : id));
    // Bring its card into view: the sheet leaves its small peek and shows the list from the top.
    if (sheetRef.current === 'peek') animateTo('collapsed');
    listRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View
        style={
          headerH > 0
            ? { height: headerFold.interpolate({ inputRange: [0, 1], outputRange: [headerH, 0] }), opacity: headerFold.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), overflow: 'hidden' }
            : undefined
        }
      >
      <View style={styles.header} onLayout={(e) => headerH === 0 && setHeaderH(Math.round(e.nativeEvent.layout.height))}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={searchRef}
            autoFocus={false}
            style={styles.searchInput}
            placeholder="ගරාජයක් හෝ සේවාවක් සොයන්න..."
            placeholderTextColor={Colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
          />
          {/* The close button lives inside the search bar now that the header bar is gone. */}
          <Pressable style={({ pressed }) => [styles.searchClose, pressed && styles.sheetClosePressed]} onPress={onClose} hitSlop={8} accessibilityLabel="Close screen">
            <Icon name="x" size={16} strokeWidth={2.5} color={Colors.textMain} />
          </Pressable>
        </View>
      </View>
      </Animated.View>

      <View style={styles.mapArea} onLayout={(e) => setMapHeight(e.nativeEvent.layout.height)}>
        <GoogleMap
          style={[StyleSheet.absoluteFill, { bottom: sheet === 'peek' ? peekHeight - 20 : collapsedHeight - 24 }]}
          center={user.coords}
          zoom={14}
          renderOverlay={(project) => (
            <>
              {garages.map((g) => {
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
                    <Text style={[styles.mapPinText, pickedId === g.id && styles.mapPinTextPicked]}>
                      {service.icon} {g.name.split(' ')[0]}
                    </Text>
                  </Pressable>
                ) : null;
              })}
              {(() => {
                const me = project(user.coords);
                return me ? <View style={[styles.meDot, { left: me.x, top: me.y }]} pointerEvents="none" /> : null;
              })()}
            </>
          )}
        />

        <Animated.View pointerEvents="none" style={[styles.mapDim, { opacity: mapDim }]} />

        <Animated.View
          style={[styles.sheet, { height: sheetHeight, borderTopLeftRadius: sheetRadius, borderTopRightRadius: sheetRadius }]}
          {...sheetPan.panHandlers}
        >
          <Pressable style={styles.handleHitArea} onPress={tapHandle} hitSlop={12}>
            <Animated.View style={[styles.handleBar, { width: handleWidth }]} />
          </Pressable>

          <View style={styles.sheetHeader}>
            <Pressable style={styles.sheetTitleRow} onPress={() => sheet === 'peek' && animateTo('collapsed')}>
              <Text style={[styles.sheetIcon, { color: service.color }]}>{service.icon}</Text>
              <Text style={styles.sheetTitle}>{service.name}</Text>
            </Pressable>
            <View style={styles.headerRight}>
              {/* A sticker with how many of these garages are open right now, always in the sheet's header bar. */}
              <View style={styles.openSticker} accessibilityLabel={`${openCount} garages open`}>
                <View style={styles.openDot} />
                <Text style={styles.openStickerText}>විවෘත {openCount}</Text>
              </View>
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
          <View style={styles.offerRow}>
            {(
              [
                ['all', `සියලු ගරාජ ${found.length}`, 'All garages'],
                ['offers', `🏷️ දීමනා ඇති ${withOffers.length}`, 'Garages with offers'],
                ['top', `⭐ Top Rated ${topRated.length}`, 'Top rated garages'],
              ] as const
            ).map(([id, label, a11y]) => (
              <Pressable key={id} style={[styles.offerChip, listMode === id && styles.offerChipOn]} onPress={() => setListMode(id)} accessibilityLabel={a11y} accessibilityState={{ selected: listMode === id }}>
                <Text style={[styles.offerChipText, listMode === id && styles.offerChipTextOn]}>{label}</Text>
              </Pressable>
            ))}
            {pickedGarage && (
              <Pressable style={styles.offerChip} onPress={() => setPickedId(null)} accessibilityLabel="Clear the selected garage">
                <Text style={styles.offerChipText}>තෝරාගත් ගරාජය ඉහළින් · ✕</Text>
              </Pressable>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll} contentContainerStyle={styles.subRow}>
            {service.subcategories.map((sub, i) => {
              const active = i === selectedSub;
              return (
                <Pressable key={sub} style={[styles.subChip, active && styles.subChipActive]} onPress={() => setSelectedSub(i)}>
                  <Text style={[styles.subChipText, active && styles.subChipTextActive]}>{sub}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

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
            scrollEventThrottle={16}
            onScroll={(e) => {
              listY.current = e.nativeEvent.contentOffset.y;
              // Mouse wheel / trackpad on web never reaches the pan responder.
              if (listY.current > 2 && sheetRef.current !== 'expanded' && Date.now() - lastSnap.current > 700) animateTo('expanded');
            }}
          >
            {shownGarages.map((g) => (
              <GarageTile
                key={g.id}
                garage={g}
                width="100%"
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
      <GarageReviewsSheet
        garage={reviewsFor}
        inquiryCategoryId={service.id}
        onClose={() => setReviewsFor(null)}
        onCall={reviewsFor ? () => Linking.openURL(`tel:${reviewsFor.phone.replace(/s/g, '')}`) : undefined}
        onBook={
          reviewsFor
            ? () => {
                const g = reviewsFor;
                setReviewsFor(null);
                onBook(g);
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
  searchClose: { width: 28, height: 28, borderRadius: 14, marginLeft: 6, justifyContent: 'center', alignItems: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  searchIcon: { fontSize: 14, color: Colors.textMuted, marginRight: 8 },
  // On the web the browser draws its own coloured box round a focused text field; the search bar already is the box, so that outline is off.
  searchInput: { flex: 1, color: Colors.textMain, fontSize: 12, paddingVertical: 0, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as object) : null) },
  mapArea: { flex: 1, backgroundColor: Colors.mapBg, overflow: 'hidden' },
  mapPin: {
    position: 'absolute',
    transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
    backgroundColor: Colors.cardGlass,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
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
  mapDim: { ...StyleSheet.absoluteFill, backgroundColor: '#000' },
  handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder },
  // Fixed height so the row does not jump when the minimize button appears.
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, minHeight: 28 },
  peekEnd: { height: 0, marginTop: -9 },
  offerRow: { flexWrap: 'wrap', flexDirection: 'row', gap: 6, paddingBottom: 0 },
  offerChip: { paddingHorizontal: 12, height: 28, borderRadius: 15, justifyContent: 'center', borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
  offerChipOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
  offerChipText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  offerChipTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  openSticker: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.18)' : '#e6f4ea' },
  openDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' },
  openStickerText: { fontSize: 12, fontWeight: '800', color: getThemeMode() === 'dark' ? '#81c995' : '#137333' },
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
  subScroll: { flexGrow: 0, flexShrink: 0 },
  subRow: { gap: 6, paddingBottom: 0 },
  subChip: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  subChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  subChipText: { fontSize: 11, fontWeight: '700', color: Colors.textMain },
  subChipTextActive: { color: Colors.bgDark },
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
