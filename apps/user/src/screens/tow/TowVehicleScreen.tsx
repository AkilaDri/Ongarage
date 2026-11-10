import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton, Colors, FONTS, Gradient, TOW_CONDITION_LIST, getThemeMode, VehicleLine, themedStyles, type TowCondition } from '@ongarage/shared';
import { VehiclePicker } from '../../components/Header';
import type { Vehicle } from '@ongarage/shared';
import { TowAddVehicleSheet } from './TowAddVehicleSheet';
import { useVehicles } from '../../context/VehiclesContext';

import { elevation1, outline } from '../../utils/material';

// An icon on a soft disc (no outline), the same as the SOS flow's.
const SoftIcon: React.FC<{ emoji: string }> = ({ emoji }) => (
  <View style={styles.softIcon}>
    <Text style={styles.softIconEmoji}>{emoji}</Text>
  </View>
);

/** The vehicle as the owner picked it: a saved one, or a temporary one typed in for this job. */
export type TowVehicleDraft =
  | { source: 'saved'; vehicleId: string }
  | { source: 'temp'; plate: string; makeModel: string; friendPhone: string };

/** The vehicle once its condition is known: this is what the route, bids and the rest of the flow carry. */
export type TowVehicleFull = TowVehicleDraft & { condition: TowCondition };

/** Screen 1 of the towing flow, in the SOS confirmation format: the vehicle as a row to change, then one question with four picture tiles. */
const CONDITION_TEXT: Record<TowCondition, { label: string; hint: string; icon: string; tint: string }> = {
  rolls: { label: 'ගමන් කරන්න පුළුවන්', hint: 'එන්ජිම ස්ටාර්ට් වෙනවා, වාහනය තමන්ම යනවා', icon: '🚗', tint: '#22c55e' },
  wontRoll: { label: 'ගමන් කරන්න බැහැ', hint: 'ස්ටාර්ට් වෙන්නේ නැහැ හෝ රෝද කැරකෙන්නේ නැහැ', icon: '🛑', tint: '#f59e0b' },
  stuck: { label: 'හිර වෙලා තියෙනවා', hint: 'මඩේ, වැලි හෝ වළක හිරවෙලා, ඇදගෙන ඉවත් කරන්න ඕන', icon: '🪨', tint: '#8b5cf6' },
  accident: { label: 'අනතුරකින් පසු', hint: 'අනතුරකින් හානි වෙලා, ට්‍රක් එකෙන් ගෙනියන්න ඕන', icon: '💥', tint: '#ef4444' },
};

/** The blue band (the Quotes posting header's blue, with the SOS band's gradient). */
const TOW_BAND = [
  { offset: '0', color: '#1d367f' },
  { offset: '1', color: '#111f4d' },
];

export const TowVehicleScreen: React.FC<{
  /** The vehicle and condition picked before, if the owner came back to this screen. */
  initial?: TowVehicleFull | null;
  onClose: () => void;
  /** Called once the vehicle and its condition are both chosen. */
  onNext: (vehicle: TowVehicleFull) => void;
}> = ({ initial, onClose, onNext }) => {
  const { vehicles } = useVehicles();
  const insets = useSafeAreaInsets();
  const vehicleRef = useRef<View>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [adding, setAdding] = useState(false);
  const [vehicleId, setVehicleId] = useState<string | null>(initial?.source === 'saved' ? initial.vehicleId : vehicles[0]?.id ?? null);
  const [condition, setCondition] = useState<TowCondition | null>(initial?.condition ?? null);
  // A friend's car typed in for this job: it is not in the owner's list, so it is kept here only, with the friend's phone.
  const [jobVehicle, setJobVehicle] = useState<Vehicle | null>(null);
  const [friendPhone, setFriendPhone] = useState('');

  const saved = jobVehicle ? null : vehicles.find((v) => v.id === vehicleId);
  // The owner's own vehicle, kept while a friend's car is in use, so the owner can switch back to it in one tap.
  const ownVehicle = vehicles.find((v) => v.id === vehicleId);
  const switchToOwn = () => {
    setJobVehicle(null);
    setFriendPhone('');
  };
  const vehicleOk = jobVehicle ? friendPhone.trim().length > 0 : !!saved;
  const ready = vehicleOk && condition !== null;

  const submit = () => {
    if (!ready || !condition) return;
    if (jobVehicle) onNext({ source: 'temp', plate: jobVehicle.plate, makeModel: jobVehicle.name, friendPhone: friendPhone.trim(), condition });
    else if (saved) onNext({ source: 'saved', vehicleId: saved.id, condition });
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
            <View style={styles.pillDisc}><Text style={styles.pillEmoji}>🛻</Text></View>
            <View style={styles.flex1}>
              <Text style={styles.pillTitle} numberOfLines={1}>Ongarage Towing</Text>
              <View style={styles.stepRow}><View style={styles.stepChip}><Text style={styles.stepNo}>1/5</Text></View><Text style={styles.pillSub} numberOfLines={1}>· විස්තර තහවුරු කිරීම</Text></View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.progressRow}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.progressBar, i === 0 && styles.progressBarOn]} />
          ))}
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Pressable ref={vehicleRef} style={styles.selectRow} onPress={() => (jobVehicle && ownVehicle ? switchToOwn() : setShowPicker(true))} accessibilityLabel={jobVehicle && ownVehicle ? 'Use my own vehicle' : 'Change tow vehicle'}>
              {/* Someone else's car: a person badge on the icon, and the label says whose it is. */}
              <View>
                <SoftIcon emoji="🚗" />
                {jobVehicle && (
                  <View style={styles.personBadge}>
                    <Text style={styles.personBadgeText}>👤</Text>
                  </View>
                )}
              </View>
              <View style={styles.flex1}>
                <Text style={styles.label}>{jobVehicle ? 'වෙනෙකුගේ වාහනයකි' : saved ? 'ඔබේ වාහනය' : 'වාහනය'}</Text>
                {jobVehicle ? (
                  <>
                    <VehicleLine vehicle={jobVehicle} textStyle={styles.cardTitle} />
                    {/* The owner's number as a key and value, so the label and the number read apart. */}
                    <View style={styles.ownerRow}>
                      <Text style={styles.ownerKey}>හිමිකරු</Text>
                      <Text style={styles.ownerVal}>{friendPhone}</Text>
                    </View>
                  </>
                ) : saved ? (
                  <VehicleLine vehicle={saved} textStyle={styles.cardTitle} />
                ) : (
                  <Text style={styles.cardTitle}>වාහනයක් තෝරන්න</Text>
                )}
              </View>
              <Text style={styles.linkText}>{jobVehicle && ownVehicle ? 'ඔබේ වාහනය' : 'වෙනස් කරන්න'}</Text>
            </Pressable>
            <View style={styles.divider} />
            {/* The other person's vehicle as a full-width button, with an add icon. */}
            <Pressable style={({ pressed }) => [styles.addBtn, pressed && { transform: [{ scale: 0.98 }] }]} onPress={() => setAdding(true)} accessibilityLabel="Add another person's vehicle">
              <View style={styles.addDisc}>
                <Text style={styles.addDiscText}>+</Text>
              </View>
              <Text style={styles.addBtnText}>වෙනෙකුගේ වාහනයක්</Text>
            </Pressable>
          </View>


          <View style={styles.card}>
            <View style={styles.panelHead}>
              <View style={styles.stepHead}>
                {/* A finished question shows a tick disc, as the job flow's steps do. */}
                {condition !== null && (
                  <View style={styles.stepBadgeDone}>
                    <Text style={styles.stepBadgeTextDone}>✓</Text>
                  </View>
                )}
                <Text style={[styles.stepTitle, styles.flex1]}>වාහනයට සිදුව ඇත්තේ කුමක් ද ?</Text>
              </View>
              {/* The same yellow "choose below" label as the job flow, until a condition is picked. */}
              {condition === null && (
                <View style={styles.requiredPill}>
                  <Text style={styles.requiredText}>පහළින් තෝරන්න</Text>
                </View>
              )}
            </View>
            {/* Two to a row, two rows: a big picture on a soft tinted tile, the situation under it. */}
            <View style={styles.list}>
              {TOW_CONDITION_LIST.map((c) => {
                const on = condition === c;
                return (
                  <Pressable key={c} style={({ pressed }) => [styles.option, on && styles.optionOn, pressed && { transform: [{ scale: 0.98 }] }]} onPress={() => setCondition(c)} accessibilityLabel={`Tow condition ${CONDITION_TEXT[c].label}`} accessibilityState={{ selected: on }}>
                    <View style={[styles.optionDisc, { backgroundColor: CONDITION_TEXT[c].tint + (on ? '55' : '33') }]}>
                      <Text style={styles.optionIcon}>{CONDITION_TEXT[c].icon}</Text>
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionLabel, on && styles.itemLabelOn]}>{CONDITION_TEXT[c].label}</Text>
                      <Text style={styles.optionHint}>{CONDITION_TEXT[c].hint}</Text>
                    </View>
                    {on ? (
                      <View style={styles.tick}>
                        <Text style={styles.tickText}>✓</Text>
                      </View>
                    ) : (
                      <View style={styles.radio} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <ActionButton label={ready ? 'ඊළඟ' : 'වර්ගයක් තෝරන්න'} icon="🛻" variant="primary" disabled={!ready} onPress={submit} />
        </View>
      </View>

      <VehiclePicker
        visible={showPicker}
        activeVehicle={vehicleId ?? ''}
        anchorRef={vehicleRef}
        onSelect={(id: string) => {
          setJobVehicle(null);
          setVehicleId(id);
        }}
        onClose={() => setShowPicker(false)}
      />
      <TowAddVehicleSheet
        visible={adding}
        onClose={() => setAdding(false)}
        onAdded={(v, phone) => {
          setJobVehicle(v);
          setFriendPhone(phone);
          setAdding(false);
        }}
      />
    </SafeAreaView>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.bgBody },
    band: { height: 130, overflow: 'hidden' },
    topBar: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
    closeText: { fontSize: 18, color: Colors.textMain },
    topSlot: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
    pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: Colors.bgCard },
    pillEmoji: { fontSize: 20 },
    pillDisc: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stepChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#dbeafe' },
    stepNo: { fontSize: 12, color: '#1d367f', fontFamily: FONTS.bodyBold },
    pillTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    pillSub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder, marginTop: 10 },
    progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, paddingTop: 12 },
    progressBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: Colors.subtleBorder },
    progressBarOn: { backgroundColor: '#1a73e8' },
    sheet: { flex: 1, marginTop: -24, backgroundColor: Colors.bgBody, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
    body: { padding: 16, gap: 12, paddingBottom: 24 },
    personBadge: { position: 'absolute', right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#1a73e8', borderWidth: 2, borderColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
    personBadgeText: { fontSize: 9 },
    card: { backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: outline(), ...elevation1(), padding: 16, gap: 12 },
    selectRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    divider: { height: 1, backgroundColor: Colors.borderColor },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4 },
    cardTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    vehicleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    linkText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: '#1d367f' },
    input: { height: 46, borderRadius: 14, paddingHorizontal: 14, backgroundColor: Colors.subtleFill, color: Colors.textMain, fontFamily: FONTS.bodyRegular, fontSize: 15 },
    hint: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18 },
    panelHead: { gap: 6 },
    stepHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepBadgeDone: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8' },
    stepBadgeTextDone: { color: '#ffffff', fontSize: 18, fontFamily: FONTS.titleBold },
    stepTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    requiredPill: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, backgroundColor: getThemeMode() === 'dark' ? 'rgba(245, 158, 11, 0.16)' : '#fef3c7', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(245, 158, 11, 0.4)' : '#f59e0b' },
    requiredPillDone: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
    requiredText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? Colors.warning : '#92400e' },
    requiredTextDone: { color: getThemeMode() === 'dark' ? '#93c5fd' : '#1d4ed8' },
    list: { gap: 8 },
    addBtn: { height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.subtleFill, borderWidth: 1, borderColor: outline() },
    addDisc: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#1d367f', alignItems: 'center', justifyContent: 'center' },
    addDiscText: { fontSize: 17, lineHeight: 19, fontFamily: FONTS.bodyBold, color: '#ffffff', marginTop: -1 },
    addBtnText: { fontSize: 14.5, fontFamily: FONTS.bodyBold, color: '#1d367f', letterSpacing: 0.1 },
    ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    ownerKey: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4 },
    ownerVal: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMain, letterSpacing: 0.3 },
    option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, backgroundColor: Colors.subtleFill, borderWidth: 2, borderColor: 'transparent' },
    optionOn: { borderColor: '#1d367f', backgroundColor: Colors.bgCard },
    optionDisc: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
    optionIcon: { fontSize: 22 },
    optionText: { flex: 1, gap: 2 },
    optionLabel: { fontSize: 15, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    optionHint: { fontSize: 12, lineHeight: 17, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.subtleBorder },
    grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
    item: { width: '33.33%', alignItems: 'center', gap: 4 },
    itemPressed: { transform: [{ scale: 0.96 }] },
    tile: { width: 84, height: 80, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    tileOn: { borderColor: '#1d367f', borderWidth: 3 },
    tileIcon: { fontSize: 30 },
    tick: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#1d367f', alignItems: 'center', justifyContent: 'center' },
    tickText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    itemLabel: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center', lineHeight: 22, height: 24, paddingTop: 2, paddingHorizontal: 2 },
    itemLabelOn: { color: '#1d367f' },
    bottomBar: { padding: 16, paddingTop: 12, gap: 8, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.subtleBorder },
    softIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.subtleFill, justifyContent: 'center', alignItems: 'center' },
    softIconEmoji: { fontSize: 21 },
    flex1: { flex: 1 },
  })
);
