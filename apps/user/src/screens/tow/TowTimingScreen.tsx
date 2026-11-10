import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';
import { Colors, distanceKm, FONTS, Gradient, themedStyles, zoomToFit } from '@ongarage/shared';
import { elevation1, outline } from '../../utils/material';
import type { Role, TowPlaces, TowRouteDraft, TowTiming } from './TowRouteScreen';
import { AppMap } from '../../components/map/AppMap';

/** Step 3 of the towing flow: now, or a day and an hour. Its own step, so the places are settled before the time is chosen. */
/** Days shown before "තවත්" (more); the rest open with it. */
const DAY_COLLAPSED = 3;
const DAY_CHIPS = [0, 1, 2, 3, 4, 5, 6, 7];
const HOUR_CHIPS = [7, 9, 11, 13, 15, 17];
/** A place name that is really a pair of coordinates (the address lookup failed) is not shown as a name. */
const isCoords = (t: string) => /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(t.trim());
/** A place with no readable name says it was picked on the map (the address lookup has no key yet). */
const placeTitle = (p: { name: string; address: string }) => (isCoords(p.name) ? (isCoords(p.address) ? 'මැප් මත තෝරා ඇත' : p.address) : p.name);
/** Today and tomorrow are one word each; later days keep the date and the English weekday. */
const dayLabel = (offset: number) => (offset === 0 ? 'අද' : offset === 1 ? 'හෙට' : new Date(Date.now() + offset * 86400000).toLocaleDateString('si-LK', { weekday: 'short', day: 'numeric' }));

/** The blue band the header sits on (as the other towing steps do). */
const TOW_BAND = [
  { offset: '0', color: '#1d367f' },
  { offset: '1', color: '#111f4d' },
];

export const TowTimingScreen: React.FC<{
  places: TowPlaces;
  /** The timing already chosen, when the owner comes back from changing a place. */
  initialTiming?: TowTiming;
  onBack: () => void;
  onClose: () => void;
  /** The owner wants to change a place: the map opens on it, and the timing so far is kept. */
  onEditPlace: (role: Role, timing: TowTiming) => void;
  /** The timing is set: the flow moves on to the bids. */
  onNext: (route: TowRouteDraft) => void;
}> = ({ places, initialTiming, onBack, onClose, onEditPlace, onNext }) => {
  const [mode, setMode] = useState<'now' | 'scheduled'>(initialTiming?.mode ?? 'now');
  const [dayOffset, setDayOffset] = useState<number | null>(initialTiming?.mode === 'scheduled' ? initialTiming.dayOffset : null);
  const [hour, setHour] = useState<number | null>(initialTiming?.mode === 'scheduled' ? initialTiming.hour : null);
  // All days are shown when asked for, or when the chosen day is one of the hidden ones.
  const [showAllDays, setShowAllDays] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scheduleY = useRef(0);

  const from = places.pickup.coords;
  const to = places.drop.coords;
  const km = distanceKm(from, to);
  const mid = { latitude: (from.latitude + to.latitude) / 2, longitude: (from.longitude + to.longitude) / 2 };
  const mapZoom = zoomToFit(Math.max(km * 1.8, 2), mid.latitude, 150);

  const ready = mode === 'now' || (dayOffset !== null && hour !== null);
  const timing = mode === 'now' ? { mode: 'now' as const } : { mode: 'scheduled' as const, dayOffset: dayOffset ?? 0, hour: hour ?? HOUR_CHIPS[0] };
  const daysOpen = showAllDays || (dayOffset !== null && dayOffset >= DAY_COLLAPSED);
  // What the choice means, said under the switch, so the owner knows what the next button does.
  const helper = mode === 'now' ? 'දැන් ට්‍රක් සොයනවා.' : dayOffset === null || hour === null ? 'දිනය සහ වේලාව තෝරන්න.' : `${dayLabel(dayOffset)} ${hour}:00 ට ඉල්ලීම යවා, ඒ වේලාවට නිදහස් ට්‍රක් තහවුරු කරයි.`;
  const nowNote = 'ට්‍රක් කෙනෙක් ඉල්ලීම පිළිගන්නා තුරු නොමිලේ අවලංගු කළ හැක.';
  // The owner's own result, once the day and hour are chosen (the same tiers as the cancellation rule).
  const scheduleNote =
    dayOffset === null || hour === null
      ? null
      : dayOffset >= 3
        ? 'දින 3ක් හෝ ඊට වැඩි නම් නොමිලේ අවලංගු කළ හැක.'
        : dayOffset >= 1
          ? 'දින 1–2ක් ඇතිව අවලංගු කළොත් ගාස්තුවෙන් 5%ක් අයවේ.'
          : 'අදම අවලංගු කළොත් ගාස්තුවෙන් 10%ක් අයවේ.';

  const onNotReady = () => {
    // The button explains what is missing; tapping it brings the schedule into view.
    scrollRef.current?.scrollTo({ y: Math.max(0, scheduleY.current - 8), animated: true });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.band}>
        <Gradient stops={TOW_BAND} />
        <View style={styles.topBar}>
          <Pressable style={styles.roundBtn} onPress={onClose} accessibilityLabel="Close towing">
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <View style={styles.pill}>
            <View style={styles.pillDisc}>
              <Text style={styles.pillEmoji}>🛻</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.pillTitle} numberOfLines={1}>Ongarage Towing</Text>
              <View style={styles.stepRow}>
                <View style={styles.stepChip}>
                  <Text style={styles.stepNo}>3/6</Text>
                </View>
                <Text style={styles.pillSub} numberOfLines={1}>· කාලය</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.progressRow}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.progressBar, i <= 2 && styles.progressBarOn]} />
          ))}
        </View>

        {/* The two places stay in view while the time is chosen; the owner can change either one from here. */}
        <View style={styles.strip}>
          <Text style={styles.kmLine}>{`දුර: km ${km.toFixed(1)}`}</Text>
          {(['pickup', 'drop'] as Role[]).map((role) => {
            const p = role === 'pickup' ? places.pickup : places.drop;
            const isPickup = role === 'pickup';
            return (
              <View key={role} style={styles.stripRow}>
                <View style={[styles.dot, { backgroundColor: isPickup ? '#1d367f' : '#ee5e16' }]} />
                <View style={styles.flex1}>
                  <Text style={styles.label}>{isPickup ? 'වාහනය තිබෙන තැන' : 'ගෙනයන්න ඕන තැන'}</Text>
                  <Text style={styles.placeName} numberOfLines={1}>{placeTitle(p)}</Text>
                </View>
                <Pressable style={styles.rowEdit} onPress={() => onEditPlace(role, timing)} accessibilityLabel={isPickup ? 'Change where the vehicle is' : 'Change where the vehicle goes'}>
                  <Text style={styles.rowEditText}>වෙනස් කරන්න</Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <ScrollView ref={scrollRef} style={styles.flex1} contentContainerStyle={styles.body}>
          {/* The trip on the map: both places and the distance. The map scrolls away; the places above stay. */}
          <View style={styles.card}>
            <View style={styles.summaryMap}>
              <AppMap
                style={StyleSheet.absoluteFill}
                center={mid}
                zoom={mapZoom}
                fallbackColor="#94a3b8"
                renderOverlay={(project) => {
                  const a = project(from);
                  const b = project(to);
                  return (
                    <>
                      {a && b && (
                        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
                          <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#1d367f" strokeWidth={3} strokeLinecap="round" strokeDasharray="1 7" />
                          <Circle cx={a.x} cy={a.y} r={11} fill="rgba(29, 54, 127, 0.18)" />
                          <Circle cx={b.x} cy={b.y} r={11} fill="rgba(238, 94, 22, 0.18)" />
                        </Svg>
                      )}
                      {a && (
                        <View style={[styles.marker, { left: a.x, top: a.y, backgroundColor: '#ffffff', borderColor: '#1d367f', borderWidth: 3 }]} pointerEvents="none">
                          <Text style={styles.markerText}>🚗</Text>
                        </View>
                      )}
                      {b && (
                        <View style={[styles.marker, { left: b.x, top: b.y, backgroundColor: '#ffffff', borderColor: '#ee5e16', borderWidth: 3 }]} pointerEvents="none">
                          <Text style={styles.markerText}>🛻</Text>
                        </View>
                      )}
                    </>
                  );
                }}
              />
            </View>
          </View>

          <View style={styles.card} onLayout={(e) => (scheduleY.current = e.nativeEvent.layout.y)}>
            <Text style={styles.question}>සේවය ලබා ගැනීමට අවශ්‍යය කවදා ද?</Text>
            <View style={styles.segment}>
              <Pressable style={[styles.segBtn, mode === 'now' && styles.segBtnOn]} onPress={() => setMode('now')} accessibilityLabel="Tow now" accessibilityState={{ selected: mode === 'now' }}>
                <Text style={[styles.segText, mode === 'now' && styles.segTextOn]}>මේ මොහොතේ</Text>
              </Pressable>
              <Pressable style={[styles.segBtn, mode === 'scheduled' && styles.segBtnOn]} onPress={() => setMode('scheduled')} accessibilityLabel="Schedule a tow" accessibilityState={{ selected: mode === 'scheduled' }}>
                <Text style={[styles.segText, mode === 'scheduled' && styles.segTextOn]}>ඉදිරි දිනක</Text>
              </Pressable>
            </View>
            {mode === 'now' ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteHead}>{helper}</Text>
                <Text style={styles.noteBody}>{`ℹ  ${nowNote}`}</Text>
              </View>
            ) : (
              <Text style={styles.helper}>{helper}</Text>
            )}

            {mode === 'scheduled' && (
              <>
                <Text style={styles.label}>දිනය</Text>
                <View style={styles.grid}>
                  {(daysOpen ? DAY_CHIPS : DAY_CHIPS.slice(0, DAY_COLLAPSED)).map((d) => (
                    <Pressable key={d} style={[styles.chip, styles.gridDay, dayOffset === d && styles.chipOn]} onPress={() => setDayOffset(d)} accessibilityLabel={`Day ${dayLabel(d)}`} accessibilityState={{ selected: dayOffset === d }}>
                      <Text style={[styles.chipText, dayOffset === d && styles.chipTextOn]} numberOfLines={1}>{dayLabel(d)}</Text>
                    </Pressable>
                  ))}
                  {!daysOpen && (
                    <Pressable style={[styles.chip, styles.gridDay, styles.chipMore]} onPress={() => setShowAllDays(true)} accessibilityLabel="Show more days">
                      <Text style={styles.moreText}>තවත්</Text>
                    </Pressable>
                  )}
                </View>
                {daysOpen && (
                  <Pressable onPress={() => setShowAllDays(false)} accessibilityLabel="Show fewer days">
                    <Text style={styles.lessText}>අඩුවෙන් පෙන්වන්න</Text>
                  </Pressable>
                )}

                {/* The hours appear once a day is chosen: one question at a time. */}
                {dayOffset !== null && (
                  <>
                    <Text style={styles.label}>වේලාව</Text>
                    <View style={styles.grid}>
                      {HOUR_CHIPS.map((h) => (
                        <Pressable key={h} style={[styles.chip, styles.gridHour, hour === h && styles.chipOn]} onPress={() => setHour(h)} accessibilityLabel={`Hour ${h}:00`} accessibilityState={{ selected: hour === h }}>
                          <Text style={[styles.chipText, hour === h && styles.chipTextOn]}>{`${h}:00`}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}

                {scheduleNote && <Text style={styles.noteText}>{`ℹ  ${scheduleNote}`}</Text>}
              </>
            )}
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <View style={styles.footRow}>
            <Pressable style={styles.backBtn} onPress={onBack} accessibilityLabel="Back to the places">
              <Text style={styles.backText}>‹ ස්ථාන</Text>
            </Pressable>
            <Pressable
              style={[styles.action, styles.flex1, !ready && styles.actionNotReady]}
              onPress={() => (ready ? onNext({ ...places, timing }) : onNotReady())}
              accessibilityLabel={ready ? 'Confirm the trip and find trucks' : 'Choose a day and an hour'}
              accessibilityState={{ disabled: !ready }}
            >
              <Text style={styles.actionText} numberOfLines={1}>
                {ready ? (mode === 'now' ? 'ට්‍රක් සොයන්න' : 'ඉල්ලීම යවන්න') : 'දිනය සහ වේලාව තෝරන්න'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.bgBody },
    flex1: { flex: 1 },
    band: { height: 130, overflow: 'hidden' },
    topBar: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
    closeText: { fontSize: 18, color: Colors.textMain },
    pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: Colors.bgCard },
    pillDisc: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
    pillEmoji: { fontSize: 20 },
    pillTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    pillSub: { flexShrink: 1, fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stepChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#dbeafe' },
    stepNo: { fontSize: 12, color: '#1d367f', fontFamily: FONTS.bodyBold },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder, marginTop: 10 },
    progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, paddingTop: 12 },
    progressBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: Colors.subtleBorder },
    progressBarOn: { backgroundColor: '#1a73e8' },
    sheet: { flex: 1, marginTop: -24, backgroundColor: Colors.bgBody, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
    strip: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, gap: 8, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.subtleBorder },
    stripRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    body: { padding: 16, gap: 12, paddingBottom: 24 },
    card: { padding: 16, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1(), gap: 12 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    label: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, lineHeight: 18 },
    placeName: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    rowEdit: { minHeight: 44, minWidth: 44, paddingHorizontal: 10, justifyContent: 'center', alignItems: 'center' },
    rowEditText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: '#1d367f' },
    kmLine: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMain, marginBottom: 2 },
    noteBox: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.subtleFill, gap: 4 },
    noteHead: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, lineHeight: 19 },
    noteBody: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 19 },
    summaryMap: { height: 96, borderRadius: 16, overflow: 'hidden', backgroundColor: Colors.subtleFill, borderWidth: 1, borderColor: outline() },
    marker: { position: 'absolute', width: 32, height: 32, marginLeft: -16, marginTop: -16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
    markerText: { fontSize: 14 },
    distChip: { position: 'absolute', left: 10, top: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: Colors.bgCard },
    distText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    question: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    segment: { flexDirection: 'row', padding: 4, borderRadius: 14, backgroundColor: Colors.subtleFill, gap: 4 },
    segBtn: { flex: 1, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    segBtnOn: { backgroundColor: '#1d367f' },
    segText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    segTextOn: { color: '#ffffff', fontFamily: FONTS.bodyBold },
    helper: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 19, marginTop: -4 },
    noteText: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 19, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.subtleFill },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
    gridDay: { width: '23.5%' },
    gridHour: { width: '31%' },
    chip: { height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.subtleFill, paddingHorizontal: 6 },
    chipMore: { backgroundColor: 'transparent', borderWidth: 1, borderColor: outline() },
    chipOn: { backgroundColor: '#1d367f' },
    chipText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chipTextOn: { color: '#ffffff' },
    moreText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: '#1d367f' },
    lessText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: '#1d367f', alignSelf: 'flex-start', paddingVertical: 4 },
    bottomBar: { padding: 16, paddingTop: 12, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.subtleBorder },
    action: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1d367f' },
    actionNotReady: { backgroundColor: '#64748b' },
    actionText: { fontSize: 15, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    footRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    backBtn: { height: 52, paddingHorizontal: 18, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.subtleFill },
    backText: { fontSize: 14.5, fontFamily: FONTS.bodySemiBold, color: '#1d367f' },
  })
);
