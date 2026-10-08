import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import type { PartBrief, PartType } from '../types';
import { canonicalPartName, partCategory } from '../marketplace/partsMart';
import { softEdge, softFill } from './Glass';

const TYPES: { id: PartType; label: string }[] = [
  { id: 'Genuine', label: 'Genuine' },
  { id: 'OEM', label: 'OEM' },
  { id: 'Recon', label: 'Recon' },
  { id: 'GarageChoice', label: 'ඕනෑම වර්ගයක්' },
];

/**
 * The part a buyer (owner or garage) is looking for, with what a shop needs to be sure it fits:
 * name, how many, Genuine / OEM / Recon, the part number and a note. The vehicle comes with the
 * brief (its chassis and engine number are what shops check against). Photos and voice notes are
 * attached by the app around this form.
 */
export const PartBriefForm: React.FC<{ brief: PartBrief; onChange: (b: PartBrief) => void; children?: React.ReactNode }> = ({ brief, onChange, children }) => {
  const canonical = canonicalPartName(brief.name);
  const set = (change: Partial<PartBrief>) => onChange({ ...brief, ...change });
  const v = brief.vehicle;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>කොටසේ නම</Text>
      <TextInput
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

      <View style={styles.vehicle}>
        <Text style={styles.vehicleTitle}>
          🚗 {v.name} · {v.plate}
        </Text>
        <Text style={styles.vehicleSub}>
          {[v.make, v.model, v.year].filter(Boolean).join(' ') || v.type}
          {v.chassisNo ? ` · Chassis ${v.chassisNo}` : ''}
          {v.engineNo ? ` · Engine ${v.engineNo}` : ''}
        </Text>
        {!v.chassisNo && !v.engineNo && <Text style={styles.vehicleWarn}>චැසි / එන්ජින් අංකය එක් කළොත් වෙළඳසැලට නිවැරදි කොටස තහවුරු කළ හැක.</Text>}
      </View>
      {children}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    wrap: { gap: 10 },
    label: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    input: { backgroundColor: softFill(), borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 13.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, borderWidth: 1, borderColor: softEdge() },
    note: { minHeight: 64, textAlignVertical: 'top' },
    suggest: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(2, 132, 199, 0.12)' },
    suggestText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: softFill(), alignItems: 'center', justifyContent: 'center' },
    stepText: { fontSize: 18, fontWeight: '800', color: Colors.textMain },
    qty: { minWidth: 22, textAlign: 'center', fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: softFill(), borderWidth: 1, borderColor: softEdge() },
    chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    chipTextOn: { color: '#ffffff' },
    vehicle: { padding: 12, borderRadius: 14, backgroundColor: softFill(), gap: 2 },
    vehicleTitle: { fontSize: 12.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    vehicleSub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    vehicleWarn: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, marginTop: 2 },
  })
);
