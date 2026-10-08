import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { useNotice } from '../context/NoticeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';
import { LOCATION_SUGGESTIONS } from '../constants/mockData';
import { Gradient, GRADIENTS } from '@ongarage/shared';
import { GoogleMap } from '@ongarage/shared';
import { useUserLocation } from '../context/LocationContext';
import {
  autocompletePlaces,
  geocodeAddress,
  placeDetails,
  reverseGeocode,
  type PlaceSuggestion,
} from '@ongarage/shared';
import type { LatLng, PickedLocation } from '@ongarage/shared';

interface SOSMapPickerScreenProps {
  initialLocation: PickedLocation | null;
  onConfirm: (location: PickedLocation) => void;
  onClose: () => void;
}

const MIN_ZOOM = 11;
const MAX_ZOOM = 19;

const offlineSuggestions = (query: string): PlaceSuggestion[] =>
  LOCATION_SUGGESTIONS.filter((l) => !query || l.address.includes(query)).map((l, i) => ({
    placeId: `local:${i}`,
    mainText: l.address,
    secondaryText: '',
  }));

export const SOSMapPickerScreen: React.FC<SOSMapPickerScreenProps> = ({ initialLocation, onConfirm, onClose }) => {
  const { notify } = useNotice();
  const user = useUserLocation();
  const [searchText, setSearchText] = useState('');
  const [center, setCenter] = useState<LatLng>(initialLocation?.coords ?? user.coords);
  const [address, setAddress] = useState(initialLocation?.address ?? user.address);
  const [zoom, setZoom] = useState(16);
  const [resolving, setResolving] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const geocodeSeq = useRef(0);

  const moveTo = async (coords: LatLng, knownAddress?: string) => {
    setCenter(coords);
    const seq = ++geocodeSeq.current;
    if (knownAddress) {
      setAddress(knownAddress);
      return;
    }
    setResolving(true);
    try {
      const geo = await reverseGeocode(coords);
      if (seq === geocodeSeq.current) setAddress(geo.address);
    } catch {
      if (seq === geocodeSeq.current) setAddress(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
    } finally {
      if (seq === geocodeSeq.current) setResolving(false);
    }
  };

  useEffect(() => {
    if (!initialLocation && user.status === 'ready') moveTo(user.coords, user.address);
    // Only follow GPS until the user picks a spot themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.status]);

  useEffect(() => {
    const query = searchText.trim();
    if (!showSuggestions || query.length < 2) {
      setSuggestions(offlineSuggestions(query));
      return;
    }
    const timer = setTimeout(() => {
      autocompletePlaces(query, center)
        .then((s) => setSuggestions(s.length ? s : offlineSuggestions(query)))
        .catch(() => setSuggestions(offlineSuggestions(query)));
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, showSuggestions]);

  const handleSuggestionSelect = async (s: PlaceSuggestion) => {
    setSearchText(s.mainText);
    setShowSuggestions(false);
    if (s.placeId.startsWith('local:')) {
      const local = LOCATION_SUGGESTIONS[Number(s.placeId.slice(6))];
      moveTo(local.coords, local.address);
      return;
    }
    try {
      const place = await placeDetails(s.placeId);
      moveTo(place.coords, place.address);
    } catch {
      notify({ icon: '📍', title: 'ස්ථානය ලබා ගත නොහැකි විය', body: 'නැවත උත්සාහ කරන්න.', tone: 'danger' });
    }
  };

  const handleSearch = async () => {
    const val = searchText.trim();
    setShowSuggestions(false);
    if (!val) {
      notify({ icon: '🔍', title: 'ස්ථානයක් ඇතුළත් කරන්න', body: 'සෙවීමට නගරයක් හෝ ලිපිනයක් ටයිප් කරන්න.', tone: 'primary' });
      return;
    }
    try {
      const result = await geocodeAddress(val);
      moveTo(result.coords, result.address);
    } catch {
      notify({ icon: '🗺️', title: 'ස්ථානය හමු නොවීය', body: val, tone: 'danger' });
    }
  };

  const useMyLocation = async () => {
    const coords = await user.refresh();
    moveTo(coords);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* PickMe-style: the map fills the screen; the close button and search float over it, and a card at the bottom confirms. */}
      <View style={styles.mapArea}>
        <GoogleMap
          style={styles.mapCanvas}
          center={center}
          zoom={zoom}
          onPressCoordinate={(coords) => {
            setShowSuggestions(false);
            moveTo(coords);
          }}
        >
          {/* The pin: a label on a stem, a dot, and its shadow on the ground. */}
          <View style={styles.centerMarker} pointerEvents="none">
            <View style={styles.pinBubble}>
              <Text style={styles.pinText}>🚗  මෙතැනද?</Text>
            </View>
            <View style={styles.pinStem} />
            <View style={styles.pinPoint} />
            <View style={styles.pinShadow} />
          </View>
        </GoogleMap>

        <View style={styles.topBar}>
          <Pressable style={styles.roundBtn} onPress={onClose} accessibilityLabel="Close location picker">
            <Text style={styles.roundBtnText}>✕</Text>
          </Pressable>
          <View style={styles.searchPill}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.input}
              placeholder="ප්‍රදේශය හෝ ලිපිනය සොයන්න"
              placeholderTextColor={Colors.textMuted}
              value={searchText}
              onFocus={() => setShowSuggestions(true)}
              onChangeText={(text) => {
                setSearchText(text);
                setShowSuggestions(true);
              }}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <Pressable style={styles.searchGo} onPress={handleSearch} accessibilityLabel="Search">
                <Text style={styles.searchGoText}>→</Text>
              </Pressable>
            )}
          </View>
        </View>

        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsDropdown}>
            {suggestions.map((s, i) => (
              <Pressable
                key={s.placeId}
                style={({ pressed }) => [
                  styles.suggestionItem,
                  i === suggestions.length - 1 && { borderBottomWidth: 0 },
                  pressed && { backgroundColor: Colors.bgCardHover },
                ]}
                onPress={() => handleSuggestionSelect(s)}
              >
                <Text style={styles.suggestionText} numberOfLines={1}>
                  📍 {s.mainText}
                </Text>
                {!!s.secondaryText && (
                  <Text style={styles.suggestionSubText} numberOfLines={1}>
                    {s.secondaryText}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.mapControls}>
          <Pressable style={styles.roundBtn} onPress={useMyLocation} accessibilityLabel="Use my location">
            <Text style={styles.mapControlText}>◎</Text>
          </Pressable>
          <Pressable style={styles.roundBtn} onPress={() => setZoom((z) => Math.min(z + 1, MAX_ZOOM))} accessibilityLabel="Zoom in">
            <Text style={styles.mapControlText}>＋</Text>
          </Pressable>
          <Pressable style={styles.roundBtn} onPress={() => setZoom((z) => Math.max(z - 1, MIN_ZOOM))} accessibilityLabel="Zoom out">
            <Text style={styles.mapControlText}>－</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>වාහනය නැවතී ඇති තැන තෝරන්න</Text>
        <Text style={styles.sheetSub}>සිතියම මත ස්පර්ශ කර හෝ සොයා පින් එක නිවැරදි තැනට ගෙන එන්න</Text>
        <View style={styles.locationRow}>
          <View style={styles.locationDisc}>
            <Text style={styles.locationIcon}>📍</Text>
          </View>
          <View style={styles.flex1}>
            <Text style={styles.locationName} numberOfLines={2}>
              {address}
            </Text>
            <Text style={styles.locationStatus}>
              {center.latitude.toFixed(5)}, {center.longitude.toFixed(5)}
              {user.status === 'ready' ? ' • GPS Locked' : ''}
            </Text>
          </View>
          {resolving && <ActivityIndicator size="small" color={Colors.primary} />}
        </View>
        <Pressable style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]} onPress={() => onConfirm({ address, coords: center })}>
          <Gradient stops={GRADIENTS.sos} />
          <Text style={styles.confirmBtnText}>ස්ථානය තහවුරු කර ඉදිරියට යන්න</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

// Soft shadow in place of an outline, like Home and the other tabs.
const SOFT_SHADOW = { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 16, elevation: 4 } as const;

const styles = themedStyles(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBody },
  flex1: { flex: 1 },
  mapArea: { flex: 1 },
  mapCanvas: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center' },

  // Floating over the map
  topBar: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center', ...SOFT_SHADOW },
  roundBtnText: { fontSize: 16, fontWeight: '700', color: Colors.textMain },
  searchPill: { flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 5, borderRadius: 23, backgroundColor: Colors.bgCard, ...SOFT_SHADOW },
  searchIcon: { fontSize: 14 },
  // No browser focus outline on the web; the pill itself is the field.
  input: { flex: 1, color: Colors.textMain, fontSize: 12.5, fontFamily: FONTS.bodyMedium, paddingVertical: 0, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}) },
  searchGo: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  searchGoText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  suggestionsDropdown: {
    position: 'absolute',
    top: 66,
    left: 16,
    right: 16,
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 100,
    ...SOFT_SHADOW,
  },
  suggestionItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  suggestionText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
  suggestionSubText: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2, marginLeft: 20 },
  mapControls: { position: 'absolute', right: 16, bottom: 40, gap: 10 },
  mapControlText: { fontSize: 19, color: Colors.textMain, fontWeight: '700' },

  // The pin (its dot sits on the map's centre)
  centerMarker: { alignItems: 'center', transform: [{ translateY: -30 }] },
  pinBubble: { backgroundColor: '#dc2626', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, shadowColor: '#dc2626', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  pinText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: '#fff' },
  pinStem: { width: 3, height: 16, backgroundColor: '#dc2626' },
  pinPoint: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#dc2626', borderWidth: 3, borderColor: '#fff', marginTop: -2 },
  pinShadow: { width: 18, height: 6, borderRadius: 9, backgroundColor: 'rgba(15, 23, 42, 0.22)', marginTop: 2 },

  // Bottom card, overlapping the map with rounded corners
  bottomSheet: {
    marginTop: -24,
    backgroundColor: Colors.bgCard,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 10,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder, marginBottom: 4 },
  sheetTitle: { fontSize: 17, fontFamily: FONTS.titleBold, color: Colors.textMain },
  sheetSub: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: -4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, backgroundColor: Colors.subtleFill },
  locationDisc: { width: 40, height: 40, borderRadius: 20, backgroundColor: getThemeMode() === 'dark' ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2', justifyContent: 'center', alignItems: 'center' },
  locationIcon: { fontSize: 18 },
  locationName: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
  locationStatus: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.success, marginTop: 2 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 28, overflow: 'hidden' },
  confirmBtnText: { fontSize: 14, fontFamily: FONTS.bodyBold, color: '#fff' },
}));
