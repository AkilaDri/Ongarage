import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, getThemeMode, themedStyles } from '@ongarage/shared';
import { LOCATION_SUGGESTIONS } from '../constants/mockData';
import { Gradient, GRADIENTS } from '@ongarage/shared';
import { GoogleMap } from '../components/GoogleMap';
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
      Alert.alert('ස්ථානය ලබා ගැනීමට නොහැකි විය. නැවත උත්සාහ කරන්න.');
    }
  };

  const handleSearch = async () => {
    const val = searchText.trim();
    setShowSuggestions(false);
    if (!val) {
      Alert.alert('කරුණාකර සෙවීමට ස්ථානයක් ඇතුළත් කරන්න.');
      return;
    }
    try {
      const result = await geocodeAddress(val);
      moveTo(result.coords, result.address);
    } catch {
      Alert.alert('එම ස්ථානය සිතියමේ සොයා ගත නොහැකි විය: ' + val);
    }
  };

  const useMyLocation = async () => {
    const coords = await user.refresh();
    moveTo(coords);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Gradient stops={GRADIENTS.slate} />
        <View style={styles.flex1}>
          <Text style={styles.headerTitle}>වාහනය නැවතී ඇති තැන තෝරන්න</Text>
          <Text style={styles.headerSubtitle}>ස්ථානය සිතියමේ නිවැරදි කරන්න</Text>
        </View>
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.searchBarWrap}>
        <View style={styles.searchInputBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder="ප්‍රදේශය හෝ ලිපිනය සොයන්න (උදා: ගාල්ල, වැලිගම)..."
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
        </View>
        <Pressable style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>සොයන්න</Text>
        </Pressable>
      </View>

      <GoogleMap
        style={styles.mapCanvas}
        center={center}
        zoom={zoom}
        onPressCoordinate={(coords) => {
          setShowSuggestions(false);
          moveTo(coords);
        }}
      >
        <View style={styles.instructionOverlay} pointerEvents="none">
          <Text style={styles.instructionText}>📍 බ්‍රේක්ඩවුන් වූ ස්ථානය සිතියම මත ස්පර්ශ කරන්න</Text>
          <Text style={styles.instructionSubText} numberOfLines={1}>
            {address}
          </Text>
        </View>

        <View style={styles.centerMarker} pointerEvents="none">
          <View style={styles.pinBubble}>
            <Text style={styles.pinText}>🚗</Text>
            <Text style={styles.pinText}>මෙතැනද?</Text>
          </View>
          <View style={styles.pinPoint} />
        </View>

        <View style={styles.mapControls}>
          <Pressable style={styles.mapControlBtn} onPress={useMyLocation}>
            <Text style={styles.mapControlText}>◎</Text>
          </Pressable>
          <Pressable style={styles.mapControlBtn} onPress={() => setZoom((z) => Math.min(z + 1, MAX_ZOOM))}>
            <Text style={styles.mapControlText}>＋</Text>
          </Pressable>
          <Pressable style={styles.mapControlBtn} onPress={() => setZoom((z) => Math.max(z - 1, MIN_ZOOM))}>
            <Text style={styles.mapControlText}>－</Text>
          </Pressable>
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
      </GoogleMap>

      <View style={styles.bottomSheet}>
        <View style={styles.locationInfoBox}>
          <Text style={styles.locationIcon}>📍</Text>
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
        <Pressable style={styles.confirmBtn} onPress={() => onConfirm({ address, coords: center })}>
          <Gradient stops={GRADIENTS.sos} />
          <Text style={styles.confirmBtnText}>✓</Text>
          <Text style={styles.confirmBtnText}>ස්ථානය තහවුරු කර ඉදිරියට යන්න</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = themedStyles(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBody },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 10, color: Colors.primary, fontWeight: '700' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: Colors.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { fontSize: 14, color: '#fff' },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
  },
  searchInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgDark,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  input: { flex: 1, color: Colors.textMain, fontSize: 12, fontWeight: '600', paddingVertical: 0 },
  searchBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
  },
  searchBtnText: { fontSize: 12, fontWeight: '800', color: Colors.bgDark },
  mapCanvas: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapControls: { position: 'absolute', right: 12, bottom: 16, gap: 8 },
  mapControlBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.cardGlass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapControlText: { fontSize: 18, color: Colors.textMain, fontWeight: '700' },
  suggestionSubText: { fontSize: 10, color: Colors.textMuted, marginTop: 2, marginLeft: 18 },
  suggestionsDropdown: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: getThemeMode() === 'dark' ? 0.5 : 0.1,
    shadowRadius: 25,
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
  },
  suggestionText: { fontSize: 11.5, fontWeight: '700', color: Colors.textMain },
  instructionOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: Colors.cardGlass,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  instructionText: { fontSize: 11.5, fontWeight: '700', color: Colors.textMain, textAlign: 'center' },
  instructionSubText: { fontSize: 10, color: Colors.textMuted, fontWeight: '500', textAlign: 'center' },
  centerMarker: { alignItems: 'center', gap: 4, transform: [{ translateY: -16 }] },
  pinBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 6,
  },
  pinText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  pinPoint: {
    width: 12,
    height: 12,
    backgroundColor: '#ef4444',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#ef4444',
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  bottomSheet: {
    backgroundColor: Colors.cardGlass,
    borderTopWidth: 1,
    borderTopColor: Colors.borderColor,
    padding: 16,
    gap: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  locationInfoBox: {
    backgroundColor: Colors.bgDark,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationIcon: { fontSize: 20 },
  locationName: { fontSize: 12.5, fontWeight: '800', color: Colors.textMain },
  locationStatus: { fontSize: 10, color: Colors.success, fontWeight: '700', marginTop: 1 },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 13,
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
}));
