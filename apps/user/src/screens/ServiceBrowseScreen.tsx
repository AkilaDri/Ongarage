import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Alert, Animated, Linking, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, getThemeMode, themedStyles } from '@ongarage/shared';
import { MOCK_GARAGES } from '../constants/mockData';
import { GarageCard } from '@ongarage/shared';
import { GoogleMap } from '@ongarage/shared';
import { Icon } from '@ongarage/shared';
import { useUserLocation } from '../context/LocationContext';
import { directionsUrl, distanceKm } from '@ongarage/shared';
import type { ServiceCategory } from '@ongarage/shared';

const COLLAPSED_HEIGHT = 420;
// Fallback until the "Top Rated" row is measured; the minimised sheet ends just below it.
const DEFAULT_PEEK_HEIGHT = 140;

type SheetState = 'peek' | 'collapsed' | 'expanded';

interface ServiceBrowseScreenProps {
  service: ServiceCategory;
  onClose: () => void;
}

export const ServiceBrowseScreen: React.FC<ServiceBrowseScreenProps> = ({ service, onClose }) => {
  const [searchText, setSearchText] = useState('');
  const [selectedSub, setSelectedSub] = useState(0);
  const [mapHeight, setMapHeight] = useState(0);
  const [sheet, setSheet] = useState<SheetState>('collapsed');
  const [peekHeight, setPeekHeight] = useState(DEFAULT_PEEK_HEIGHT);
  const sheetRef = useRef<SheetState>(sheet);
  sheetRef.current = sheet;
  const listRef = useRef<ScrollView>(null);
  const listY = useRef(0);
  const sheetHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const currentHeight = useRef(COLLAPSED_HEIGHT);
  const dragStart = useRef(COLLAPSED_HEIGHT);

  const fullHeight = mapHeight || 700;
  const collapsedHeight = Math.max(peekHeight + 60, Math.min(COLLAPSED_HEIGHT, fullHeight * 0.6));
  const heights = useRef({ peek: peekHeight, collapsed: collapsedHeight, expanded: fullHeight });
  heights.current = { peek: peekHeight, collapsed: collapsedHeight, expanded: fullHeight };

  useEffect(() => {
    const id = sheetHeight.addListener(({ value }) => (currentHeight.current = value));
    return () => sheetHeight.removeListener(id);
  }, [sheetHeight]);

  const animateTo = (target: SheetState, velocity = 0) => {
    setSheet(target);
    sheetRef.current = target;
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
  const garages = MOCK_GARAGES.filter(
    (g) => !query || g.name.toLowerCase().includes(query) || g.specialization.toLowerCase().includes(query)
  )
    .map((g) => ({ ...g, distance: Number(distanceKm(user.coords, g.coords).toFixed(1)) }))
    .sort((a, b) => a.distance - b.distance);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="ගරාජයක් හෝ සේවාවක් සොයන්න..."
            placeholderTextColor={Colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <Pressable
          style={({ pressed }) => [styles.headerClose, pressed && styles.sheetClosePressed]}
          onPress={onClose}
          hitSlop={6}
          accessibilityLabel="Close screen"
        >
          <Icon name="x" size={16} strokeWidth={2.5} color={Colors.textMain} />
        </Pressable>
      </View>

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
                  <View key={g.id} style={[styles.mapPin, { left: p.x, top: p.y }]} pointerEvents="none">
                    <Text style={styles.mapPinText}>
                      {service.icon} {g.name.split(' ')[0]}
                    </Text>
                  </View>
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

          <View
            style={styles.listHeader}
            onLayout={(e) => setPeekHeight(Math.round(e.nativeEvent.layout.y + e.nativeEvent.layout.height + 14))}
          >
            <Text style={styles.listLabel}>⭐ ඉහළම ශ්‍රේණිගත කිරීම් (Top Rated)</Text>
            <Text style={styles.countLabel}>ගරාජ {garages.length}ක් හමුවිය</Text>
          </View>

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
              if (listY.current > 2 && sheetRef.current !== 'expanded') animateTo('expanded');
            }}
          >
            {garages.map((g, idx) => (
              <GarageCard
                key={g.id}
                garage={g}
                variant="map"
                thumbColor={idx === 0 ? '#10b981' : '#38bdf8'}
                onCall={() => Alert.alert(`${g.name} වෙත ඇමතුමක් ලබා දෙයි`)}
                onDirections={() => Linking.openURL(directionsUrl(g.coords, user.coords))}
                onBook={() => Alert.alert(`${g.name} සඳහා බුකින් පෝරමය විවෘත විය`)}
              />
            ))}
          </Animated.ScrollView>
        </Animated.View>
      </View>
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.barBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
  },
  headerClose: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  searchInput: { flex: 1, color: Colors.textMain, fontSize: 12, paddingVertical: 0 },
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
    paddingTop: 10,
    paddingHorizontal: 14,
    paddingBottom: 20,
    gap: 10,
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
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, minHeight: 30 },
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
  subRow: { gap: 8, paddingBottom: 2 },
  subChip: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    paddingHorizontal: 14,
    paddingVertical: 6,
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
  countLabel: { fontSize: 10, color: '#10b981', fontWeight: '700' },
  garageList: { gap: 12, paddingBottom: 8 },
}));
