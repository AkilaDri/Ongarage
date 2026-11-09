import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FONTS, GoogleMap, Gradient, geocodeAddress, reverseGeocode, themedStyles } from '@ongarage/shared';
import { useUserLocation } from '../../context/LocationContext';
import { elevation1, outline } from '../../utils/material';

/** Screen 2 of the towing flow, in the SOS confirmation format: when, then where from and where to, on one card. Each place opens its own map picker. */
export type TowPlace = { id: string; name: string; address: string; coords: { latitude: number; longitude: number } };
export type TowTiming = { mode: 'now' } | { mode: 'scheduled'; dayOffset: number; hour: number };
export type TowRouteDraft = { pickup: TowPlace; drop: TowPlace; timing: TowTiming };

/** The next seven days, and the hours a truck can be booked for. */
const DAY_CHIPS = [0, 1, 2, 3, 4, 5, 6, 7];
const HOUR_CHIPS = [7, 9, 11, 13, 15, 17];
const dayLabel = (offset: number) => (offset === 0 ? 'අද' : offset === 1 ? 'හෙට' : new Date(Date.now() + offset * 86400000).toLocaleDateString('si-LK', { weekday: 'short', day: 'numeric' }));

/** The blue band the header sits on when there is no map (as the SOS band does). */
const TOW_BAND = [
  { offset: '0', color: '#1d367f' },
  { offset: '1', color: '#111f4d' },
];

type Screen = 'confirm' | 'pickup' | 'drop';

export const TowRouteScreen: React.FC<{
  onBack: () => void;
  onClose: () => void;
  /** Called once the owner taps the confirm button: the flow moves on to bids. */
  onNext: (draft: TowRouteDraft) => void;
}> = ({ onBack, onClose, onNext }) => {
  const { coords, address } = useUserLocation();
  const gps: TowPlace = useMemo(() => ({ id: 'here', name: 'ඔබ සිටින තැන', address, coords }), [address, coords]);

  const [screen, setScreen] = useState<Screen>('confirm');
  // Timing comes first: now (the default), or a day and an hour.
  const [mode, setMode] = useState<'now' | 'scheduled'>('now');
  const [dayOffset, setDayOffset] = useState<number | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [pickup, setPickup] = useState<TowPlace>(gps);
  const [drop, setDrop] = useState<TowPlace | null>(null);

  // The map picker: a spot picked on the map or found by search, confirmed by the chip.
  const [pending, setPending] = useState<TowPlace | null>(null);
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const timingOk = mode === 'now' || (dayOffset !== null && hour !== null);
  const ready = !!drop && timingOk;
  const timing: TowTiming = mode === 'now' ? { mode: 'now' } : { mode: 'scheduled', dayOffset: dayOffset ?? 0, hour: hour ?? HOUR_CHIPS[0] };

  const openPicker = (which: 'pickup' | 'drop') => {
    setPending(null);
    setQuery('');
    setNote('');
    setScreen(which);
  };
  const confirmPending = () => {
    if (!pending) return;
    if (screen === 'pickup') setPickup(pending);
    else setDrop(pending);
    setPending(null);
    setScreen('confirm');
  };

  // Search: the address is looked up and marked on the map for the chip to confirm.
  const search = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setNote('');
    try {
      const r = await geocodeAddress(query.trim());
      setPending({ id: 'found', name: query.trim(), address: r.address, coords: r.coords });
      setQuery('');
    } catch {
      setNote('ඒ තැන සොයාගන්න බැරි වුණා.');
    }
    setBusy(false);
  };

  // A touch on the map marks the spot; its address is looked up for the name shown.
  const touchMap = async (c: { latitude: number; longitude: number }) => {
    setPending({ id: 'touched', name: 'තෝරාගත් ස්ථානය', address: '', coords: c });
    try {
      const r = await reverseGeocode(c);
      setPending({ id: 'touched', name: r.locality || r.address, address: r.address, coords: c });
    } catch {
      /* the spot stays marked without a name */
    }
  };

  const header = (title: string, sub: string, onBackPress: () => void) => (
    <View style={styles.topBar}>
      <Pressable style={styles.roundBtn} onPress={onBackPress} accessibilityLabel={screen === 'confirm' ? 'Close towing' : 'Back'}>
        <Text style={styles.roundText}>{screen === 'confirm' ? '✕' : '‹'}</Text>
      </Pressable>
      <View style={styles.pill}>
        <View style={styles.pillDisc}>
          <Text style={styles.pillEmoji}>🛻</Text>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.pillTitle} numberOfLines={1}>{title}</Text>
          <View style={styles.stepRow}>
            <View style={styles.stepChip}>
              <Text style={styles.stepNo}>2/5</Text>
            </View>
            <Text style={styles.pillSub} numberOfLines={1}>{sub}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  // ---------- The map picker: one place at a time, full screen ----------
  if (screen !== 'confirm') {
    const picking = screen === 'pickup';
    const center = pending?.coords ?? (picking ? pickup.coords : drop?.coords ?? pickup.coords);
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.mapFill}>
          <GoogleMap
            style={StyleSheet.absoluteFill}
            center={center}
            zoom={14}
            onPressCoordinate={touchMap}
            renderOverlay={(project) => {
              const p = pending ? project(pending.coords) : null;
              return p ? (
                <View style={[styles.pin, { left: p.x, top: p.y }]} pointerEvents="none">
                  <Text style={styles.pinText}>📍</Text>
                </View>
              ) : null;
            }}
          />
        </View>

        {header(picking ? 'ඔබ සිටින තැන' : 'ගෙනයන්න ඕන තැන', picking ? 'සිතියමේ තෝරන්න' : 'සිතියමේ තෝරන්න', () => setScreen('confirm'))}

        <View style={styles.searchFloat}>
          <View style={styles.searchIcon}>
            <Text style={styles.searchIconText}>🔍</Text>
          </View>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              setNote('');
            }}
            onSubmitEditing={search}
            returnKeyType="search"
            placeholder={busy ? 'සොයමින්...' : 'ස්ථානය සොයන්න'}
            placeholderTextColor={Colors.textMuted}
            accessibilityLabel="Search for a place"
          />
        </View>

        {picking && (
          <Pressable style={styles.gpsChip} onPress={() => setPending(gps)} accessibilityLabel="Use my current location">
            <Text style={styles.gpsChipText}>📍 දැන් සිටින තැන</Text>
          </Pressable>
        )}
        {!!note && (
          <View style={styles.noteWrap} pointerEvents="none">
            <Text style={styles.note}>{note}</Text>
          </View>
        )}

        <View style={styles.pickBar}>
          <Pressable style={[styles.action, !pending && styles.actionOff]} disabled={!pending} onPress={confirmPending} accessibilityLabel="Confirm the place">
            <Text style={styles.actionText}>{pending ? `ස්ථානය තෝරන්න · ${pending.name}` : 'සිතියමේ ස්ථානයක් තෝරන්න'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ---------- The confirmation card ----------
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.band}>
        <Gradient stops={TOW_BAND} />
        {header('Ongarage Towing', '· ස්ථානය තෝරන්න', onClose)}
        <View style={styles.progressRow}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.progressBar, i <= 1 && styles.progressBarOn]} />
          ))}
        </View>
      </View>

      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* 1. When: the first decision, so the places are chosen knowing the timing. */}
          <View style={styles.card}>
            <Text style={styles.label}>කවදාද?</Text>
            <View style={styles.segment}>
              <Pressable style={[styles.segBtn, mode === 'now' && styles.segBtnOn]} onPress={() => setMode('now')} accessibilityLabel="Tow now" accessibilityState={{ selected: mode === 'now' }}>
                <Text style={[styles.segText, mode === 'now' && styles.segTextOn]}>දැන්ම</Text>
              </Pressable>
              <Pressable style={[styles.segBtn, mode === 'scheduled' && styles.segBtnOn]} onPress={() => setMode('scheduled')} accessibilityLabel="Schedule a tow" accessibilityState={{ selected: mode === 'scheduled' }}>
                <Text style={[styles.segText, mode === 'scheduled' && styles.segTextOn]}>කාලසටහන්</Text>
              </Pressable>
            </View>
            {mode === 'scheduled' && (
              <>
                <View style={styles.chipWrap}>
                  {DAY_CHIPS.map((d) => (
                    <Pressable key={d} style={[styles.chip, dayOffset === d && styles.chipOn]} onPress={() => setDayOffset(d)} accessibilityLabel={`Day ${dayLabel(d)}`}>
                      <Text style={[styles.chipText, dayOffset === d && styles.chipTextOn]}>{dayLabel(d)}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.chipWrap}>
                  {HOUR_CHIPS.map((h) => (
                    <Pressable key={h} style={[styles.chip, hour === h && styles.chipOn]} onPress={() => setHour(h)} accessibilityLabel={`Hour ${h}:00`}>
                      <Text style={[styles.chipText, hour === h && styles.chipTextOn]}>{`${h}:00`}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* 2. Where: the two places, each with a change link that opens its own picker. */}
          <View style={styles.card}>
            <View style={styles.placeRow}>
              <View style={[styles.dot, { backgroundColor: '#1d367f' }]} />
              <View style={styles.flex1}>
                <Text style={styles.label}>වාහනය දැන් ඉන්නේ</Text>
                <Text style={styles.placeName} numberOfLines={1}>{pickup.name}</Text>
                <Text style={styles.placeSub} numberOfLines={1}>{pickup.address}</Text>
              </View>
              <Pressable onPress={() => openPicker('pickup')} accessibilityLabel="Change where the vehicle is">
                <Text style={styles.linkText}>වෙනස් කරන්න</Text>
              </Pressable>
            </View>
            <View style={styles.divider} />
            <View style={styles.placeRow}>
              <View style={[styles.dot, { backgroundColor: '#ee5e16' }]} />
              <View style={styles.flex1}>
                <Text style={styles.label}>ගෙනයන්න ඕන තැන</Text>
                <Text style={drop ? styles.placeName : styles.placeEmpty} numberOfLines={1}>{drop ? drop.name : 'තෝරන්න'}</Text>
                {!!drop && <Text style={styles.placeSub} numberOfLines={1}>{drop.address}</Text>}
              </View>
              <Pressable onPress={() => openPicker('drop')} accessibilityLabel="Choose where the vehicle goes">
                <Text style={styles.linkText}>{drop ? 'වෙනස් කරන්න' : 'තෝරන්න'}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <Pressable style={[styles.action, !ready && styles.actionOff]} disabled={!ready} onPress={() => drop && onNext({ pickup, drop, timing })} accessibilityLabel="Continue to bids">
            <Text style={styles.actionText}>{ready ? 'ඊළඟ' : !drop ? 'ගමනාන්තය තෝරන්න' : 'වේලාව තෝරන්න'}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.bgBody },
    flex1: { flex: 1 },
    mapFill: { ...StyleSheet.absoluteFillObject },
    band: { height: 130, overflow: 'hidden' },
    topBar: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
    roundText: { fontSize: 18, color: Colors.textMain, marginTop: -2 },
    pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: Colors.bgCard },
    pillDisc: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
    pillEmoji: { fontSize: 20 },
    pillTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    pillSub: { flexShrink: 1, fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stepChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#dbeafe' },
    stepNo: { fontSize: 12, color: '#1d367f', fontFamily: FONTS.bodyBold },
    progressRow: { position: 'absolute', left: 16, right: 16, bottom: 14, flexDirection: 'row', gap: 6 },
    progressBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
    progressBarOn: { backgroundColor: '#ffffff' },
    sheet: { flex: 1, marginTop: -24, backgroundColor: Colors.bgBody, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
    body: { padding: 16, gap: 12, paddingBottom: 24 },
    card: { padding: 16, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1(), gap: 12 },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4 },
    segment: { flexDirection: 'row', padding: 4, borderRadius: 14, backgroundColor: Colors.subtleFill, gap: 4 },
    segBtn: { flex: 1, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    segBtnOn: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    segText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    segTextOn: { color: '#1d367f', fontFamily: FONTS.bodyBold },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, height: 36, borderRadius: 18, justifyContent: 'center', backgroundColor: Colors.subtleFill },
    chipOn: { backgroundColor: '#1d367f' },
    chipText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chipTextOn: { color: '#ffffff' },
    placeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    placeName: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    placeEmpty: { fontSize: 15, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    placeSub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    linkText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: '#1d367f' },
    divider: { height: 1, backgroundColor: Colors.borderColor },
    bottomBar: { padding: 16, paddingTop: 12, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.subtleBorder },
    action: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1d367f' },
    actionOff: { opacity: 0.4 },
    actionText: { fontSize: 15, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    searchFloat: { position: 'absolute', top: 72, left: 16, right: 16, height: 46, borderRadius: 23, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 16, backgroundColor: Colors.bgCard, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
    searchIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.subtleFill, alignItems: 'center', justifyContent: 'center', marginLeft: 3 },
    searchIconText: { fontSize: 16 },
    searchInput: { flex: 1, height: 46, fontFamily: FONTS.bodyRegular, fontSize: 15, color: Colors.textMain },
    gpsChip: { position: 'absolute', top: 128, right: 16, paddingHorizontal: 12, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: Colors.bgCard, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
    gpsChipText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: '#1d367f' },
    noteWrap: { position: 'absolute', top: 172, left: 16, right: 16, alignItems: 'center' },
    note: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: Colors.bgCard, fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, overflow: 'hidden' },
    pickBar: { position: 'absolute', left: 16, right: 16, bottom: 16 },
    pin: { position: 'absolute', width: 34, height: 34, marginLeft: -17, marginTop: -34, borderRadius: 17, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
    pinText: { fontSize: 16 },
  })
);
