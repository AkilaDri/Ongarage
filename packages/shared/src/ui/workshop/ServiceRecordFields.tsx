import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, getThemeMode, themedStyles } from '../../theme/colors';
import { FONTS } from '../../theme/fonts';
import { SERVICE_FLUIDS, SERVICE_KINDS, defaultFluids, nextServiceDefaults } from '../../marketplace/service';
import { formatDate } from '../../utils/format';
import type { ServiceDetails, ServiceFluid, ServiceKind } from '../../types';

/** What the garage types into the service form (text as typed, so a half-written number is fine). */
export type ServiceFormValue = {
  kind: ServiceKind;
  fluids: ServiceFluid[];
  mileage: string;
  /** Set once the garage types its own next-service km; until then it follows the mileage. */
  nextKm: string;
  nextKmEdited: boolean;
  months: number;
  notes: string;
};

const MONTH_CHOICES = [3, 6, 12];
const digits = (t: string) => t.replace(/[^0-9]/g, '');

/** The record the form describes, or undefined while the mileage is missing. */
export const toServiceDetails = (v: ServiceFormValue, now = Date.now()): ServiceDetails | undefined => {
  const mileageKm = parseInt(digits(v.mileage), 10);
  if (!mileageKm) return undefined;
  const auto = nextServiceDefaults(v.kind, mileageKm, now);
  const nextKm = v.nextKmEdited ? parseInt(digits(v.nextKm), 10) || auto.nextServiceKm : auto.nextServiceKm;
  return { kind: v.kind, fluids: v.fluids, mileageKm, nextServiceKm: nextKm, nextServiceAt: now + v.months * 30 * 24 * 60 * 60 * 1000, notes: v.notes.trim() || undefined };
};

export const emptyServiceForm = (kind: ServiceKind = 'full', fluid?: ServiceFluid, lastMileageKm?: number): ServiceFormValue => ({
  kind,
  fluids: kind === 'fluids' && fluid ? [fluid] : defaultFluids(kind),
  mileage: lastMileageKm ? String(lastMileageKm) : '',
  nextKm: '',
  nextKmEdited: false,
  months: kind === 'oil' ? 3 : kind === 'full' ? 6 : 12,
  notes: '',
});

/**
 * The part of a handover that only a routine service has: what kind of service it was, which fluids were changed, the
 * odometer reading, when the next service is due (km and date) and a note. The owner keeps all of it as a service record
 * and is reminded before the next service.
 */
export const ServiceRecordFields: React.FC<{ value: ServiceFormValue; onChange: (v: ServiceFormValue) => void }> = ({ value, onChange }) => {
  const mileageKm = parseInt(digits(value.mileage), 10) || 0;
  const auto = nextServiceDefaults(value.kind, mileageKm);
  const nextKmShown = value.nextKmEdited ? value.nextKm : mileageKm ? String(auto.nextServiceKm) : '';
  const dueDate = Date.now() + value.months * 30 * 24 * 60 * 60 * 1000;
  const set = (change: Partial<ServiceFormValue>) => onChange({ ...value, ...change });

  return (
    <View style={styles.box} accessibilityLabel="Service record">
      <Text style={styles.heading}>🛠️ සේවා වාර්තාව</Text>

      <Text style={styles.label}>කළ සේවාව</Text>
      <View style={styles.chips}>
        {SERVICE_KINDS.map((k) => {
          const on = value.kind === k.id;
          return (
            <Pressable key={k.id} style={[styles.chip, on && styles.chipOn]} onPress={() => set({ kind: k.id, fluids: defaultFluids(k.id), months: k.id === 'oil' ? 3 : k.id === 'full' ? 6 : 12 })} accessibilityLabel={`Service ${k.label}`}>
              {on && <Text style={styles.chipTextOn}>✓</Text>}
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{k.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>වෙනස් කළ තරල</Text>
      <View style={styles.chips}>
        {SERVICE_FLUIDS.map((f) => {
          const on = value.fluids.includes(f.id);
          return (
            <Pressable key={f.id} style={[styles.chip, on && styles.chipOn]} onPress={() => set({ fluids: on ? value.fluids.filter((x) => x !== f.id) : [...value.fluids, f.id] })} accessibilityLabel={`Fluid ${f.label}`}>
              {on && <Text style={styles.chipTextOn}>✓</Text>}
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>වාහනයේ මීටර් කියවීම (km) *</Text>
      <TextInput style={styles.input} value={value.mileage} onChangeText={(t) => set({ mileage: digits(t) })} keyboardType="number-pad" placeholder="උදා: 84500" placeholderTextColor={Colors.textMuted} accessibilityLabel="Mileage km" />

      <Text style={styles.label}>ඊළඟ සේවාව</Text>
      <View style={styles.nextRow}>
        <View style={styles.nextCol}>
          <Text style={styles.hint}>km</Text>
          <TextInput style={styles.input} value={nextKmShown} onChangeText={(t) => set({ nextKm: digits(t), nextKmEdited: true })} keyboardType="number-pad" placeholder="—" placeholderTextColor={Colors.textMuted} accessibilityLabel="Next service km" />
        </View>
        <View style={styles.nextCol}>
          <Text style={styles.hint}>මාස</Text>
          <View style={styles.chips}>
            {MONTH_CHOICES.map((m) => {
              const on = value.months === m;
              return (
                <Pressable key={m} style={[styles.monthChip, on && styles.chipOn]} onPress={() => set({ months: m })} accessibilityLabel={`Next service in ${m} months`}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{m}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
      <Text style={styles.hint}>🔔 {formatDate(dueDate)} වන විට අයිතිකරුට ඊළඟ සේවාව ගැන මතක් කෙරේ</Text>

      <Text style={styles.label}>වෙනත් සටහන්</Text>
      <TextInput style={[styles.input, styles.notes]} value={value.notes} onChangeText={(t) => set({ notes: t })} multiline placeholder="පෙරහන් මාරු කළාද, ටයර් පීඩනය, උපදෙස්…" placeholderTextColor={Colors.textMuted} accessibilityLabel="Service notes" />
    </View>
  );
};

const BLUE = () => (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8');

const styles = themedStyles(() =>
  StyleSheet.create({
    box: { gap: 8, padding: 14, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.08)' : '#f8fafd', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#d2e3fc' },
    heading: { fontSize: 14, fontFamily: FONTS.titleBold, color: BLUE() },
    label: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, marginTop: 4 },
    hint: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 34, borderRadius: 8, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard },
    chipOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    monthChip: { minWidth: 44, alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 8, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard },
    chipText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    chipTextOn: { color: BLUE() },
    input: { height: 44, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard, color: Colors.textMain, fontSize: 14.5, fontFamily: FONTS.bodyRegular },
    notes: { height: 70, paddingTop: 10, textAlignVertical: 'top' },
    nextRow: { flexDirection: 'row', gap: 12 },
    nextCol: { flex: 1, gap: 4 },
  })
);
