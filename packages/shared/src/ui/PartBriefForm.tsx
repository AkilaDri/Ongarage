import { VehicleLine } from './LkPlate';
import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, getThemeMode, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import type { PartBrief, PartType } from '../types';
import { canonicalPartName, partCategory } from '../marketplace/partsMart';
import { SERVICE_CATEGORIES } from '../constants/categories';
import { softEdge, softFill } from './Glass';

/** The categories a part can belong to (what shops are matched by), in the order they are shown. */
const PART_CATEGORY_IDS = ['7', '1', '2', '11', '4', '14', '6', '5', '3', '15'];

const TYPES: { id: PartType; label: string }[] = [
  { id: 'Genuine', label: 'Genuine' },
  { id: 'OEM', label: 'OEM' },
  { id: 'Recon', label: 'Recon' },
  { id: 'GarageChoice', label: 'ඕනෑම වර්ගයක්' },
];

/** The vehicle the part is for (model and number plate, and the chassis / engine number shops check against). The request sheet shows it at its very top. */
export const PartVehicleBox: React.FC<{ vehicle: PartBrief['vehicle'] }> = ({ vehicle: v }) => (
    <View style={styles.vehicle}>
      <VehicleLine vehicle={v} textStyle={styles.vehicleTitle} />
      <Text style={styles.vehicleSub}>
        {[v.make, v.model, v.year].filter(Boolean).join(' ') || v.type}
        {v.chassisNo ? ` · Chassis ${v.chassisNo}` : ''}
        {v.engineNo ? ` · Engine ${v.engineNo}` : ''}
      </Text>
      {!v.chassisNo && !v.engineNo && <Text style={styles.vehicleWarn}>චැසි / එන්ජින් අංකය එක් කළොත් වෙළඳසැලට නිවැරදි කොටස තහවුරු කළ හැක.</Text>}
    </View>
);

/**
 * The part a buyer (owner or garage) is looking for, with what a shop needs to be sure it fits:
 * name, how many, Genuine / OEM / Recon, the part number and a note. The vehicle comes with the
 * brief (its chassis and engine number are what shops check against). Photos and voice notes are
 * attached by the app around this form.
 */
export const PartBriefForm: React.FC<{ brief: PartBrief; onChange: (b: PartBrief) => void; /** Each time this number changes the part name box is focused (the form starts again for the next part). */ focusKey?: number; /** The sheet shows the vehicle box itself (at its top). */ hideVehicle?: boolean; children?: React.ReactNode }> = ({ brief, onChange, focusKey, hideVehicle, children }) => {
  const nameRef = useRef<TextInput>(null);
  useEffect(() => {
    if (focusKey) setTimeout(() => nameRef.current?.focus(), 250);
  }, [focusKey]);
  const canonical = canonicalPartName(brief.name);
  const set = (change: Partial<PartBrief>) => onChange({ ...brief, ...change });
  const v = brief.vehicle;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>කොටසේ නම</Text>
      <TextInput
        ref={nameRef}
        style={styles.input}
        value={brief.name}
        onChangeText={(t) => set({ name: t, categoryId: partCategory(canonicalPartName(t) ?? '') ?? brief.categoryId })}
        placeholder="උදා: Brake pads, බැටරි, alternator"
        placeholderTextColor={Colors.textMuted}
        accessibilityLabel="Part name"
      />
      {!!canonical && canonical !== brief.name && (
        <Pressable style={styles.suggest} onPress={() => set({ name: canonical, categoryId: partCategory(canonical) })} accessibilityLabel={`Use ${canonical}`}>
          <Text style={styles.suggestText}>“{canonical}” ලෙස සොයන්න</Text>
        </Pressable>
      )}

      {/* The category the part belongs to: found from the name, and changeable here. Shown as icons in two rows that scroll sideways. */}
      <Text style={styles.label}>කොටසේ කාණ්ඩය</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catGrid}>
        {PART_CATEGORY_IDS.map((id) => SERVICE_CATEGORIES.find((c) => c.id === id)).filter((c): c is (typeof SERVICE_CATEGORIES)[number] => !!c).map((c) => {
          const on = brief.categoryId === c.id;
          return (
            <Pressable key={c.id} style={[styles.cat, on && styles.catOn]} onPress={() => set({ categoryId: on ? undefined : c.id })} accessibilityLabel={`Category ${c.name}`} accessibilityState={{ selected: on }}>
              <Text style={styles.catIcon}>{c.icon}</Text>
              <Text style={[styles.catName, on && styles.catNameOn]} numberOfLines={1}>{c.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.row}>
        <Text style={[styles.label, styles.flex1]}>ප්‍රමාණය</Text>
        <View style={styles.stepper}>
          <Pressable style={styles.stepBtn} onPress={() => set({ qty: Math.max(1, brief.qty - 1) })} accessibilityLabel="Decrease quantity">
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text style={styles.qty}>{brief.qty}</Text>
          <Pressable style={styles.stepBtn} onPress={() => set({ qty: Math.min(20, brief.qty + 1) })} accessibilityLabel="Increase quantity">
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.label}>කොටසේ වර්ගය</Text>
      <View style={styles.types}>
        {TYPES.map((t) => {
          const on = brief.partType === t.id;
          return (
            <Pressable key={t.id} style={[styles.chip, on && styles.chipOn]} onPress={() => set({ partType: t.id })} accessibilityLabel={`Type ${t.label}`}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>කොටස් අංකය (ඇත්නම්)</Text>
      <TextInput style={styles.input} value={brief.partNo ?? ''} onChangeText={(t) => set({ partNo: t || undefined })} placeholder="උදා: 04465-20520" placeholderTextColor={Colors.textMuted} autoCapitalize="characters" accessibilityLabel="Part number" />

      <Text style={styles.label}>වෙළඳසැලට දැන ගැනීමට (විකල්ප)</Text>
      <TextInput
        style={[styles.input, styles.note]}
        value={brief.note ?? ''}
        onChangeText={(t) => set({ note: t || undefined })}
        placeholder="වම් පැත්තේ, ඉදිරිපස… පැරණි කොටසේ තත්ත්වය"
        placeholderTextColor={Colors.textMuted}
        multiline
        accessibilityLabel="Note for the shop"
      />

      {!hideVehicle && <PartVehicleBox vehicle={v} />}
      {children}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    wrap: { gap: 12 },
    label: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? Colors.textMuted : '#5f6368' },
    input: { backgroundColor: Colors.bgCard, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: FONTS.bodyRegular, color: Colors.textMain, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0' },
    note: { minHeight: 76, textAlignVertical: 'top' },
    catGrid: { flexDirection: 'column', flexWrap: 'wrap', height: 142, alignContent: 'flex-start', gap: 8 },
    cat: { width: 84, height: 66, borderRadius: 12, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center', gap: 4, marginRight: 8 },
    catOn: { borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.4)' : '#d2e3fc', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    catIcon: { fontSize: 22 },
    catName: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? Colors.textMuted : '#5f6368', paddingHorizontal: 4 },
    catNameOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    suggest: { alignSelf: 'flex-start', paddingHorizontal: 12, minHeight: 32, justifyContent: 'center', borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    suggestText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', alignItems: 'center', justifyContent: 'center' },
    stepText: { fontSize: 18, fontWeight: '700', color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    qty: { minWidth: 22, textAlign: 'center', fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, minHeight: 34, justifyContent: 'center', borderRadius: 8, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0' },
    chipOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.4)' : '#d2e3fc' },
    chipText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? Colors.textMuted : '#3c4043' },
    chipTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    vehicle: { padding: 12, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#f8f9fa', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e8eaed', gap: 2 },
    vehicleTitle: { fontSize: 12.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    vehicleSub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    vehicleWarn: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, marginTop: 2 },
  })
);
