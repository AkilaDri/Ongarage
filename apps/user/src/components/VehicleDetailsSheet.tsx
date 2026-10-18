import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, FONTS, getThemeMode, themedStyles, vehicleIcon, type Vehicle } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { useNotice } from '../context/NoticeContext';
import { outline } from '../utils/material';
import { Sheet } from './Sheet';

/** The details an owner can keep about a vehicle (the progress in Profile counts these). */
export const VEHICLE_DETAIL_FIELDS: { id: 'registrationNo' | 'chassisNo' | 'engineNo' | 'make' | 'model' | 'color' | 'insuranceNo'; label: string; placeholder: string }[] = [
  { id: 'registrationNo', label: 'ලියාපදිංචි අංකය (Reg No)', placeholder: 'උදා: CAD-8821' },
  { id: 'chassisNo', label: 'චැසි අංකය (Chassis No)', placeholder: 'උදා: JMBF05090D6226789' },
  { id: 'engineNo', label: 'එන්ජින් අංකය (Engine No)', placeholder: 'උදා: 3AZFE-2235601' },
  { id: 'make', label: 'නිෂ්පාදකයා (Make)', placeholder: 'උදා: Toyota' },
  { id: 'model', label: 'මාදිලිය (Model)', placeholder: 'උදා: Premio' },
  { id: 'color', label: 'වර්ණය (Color)', placeholder: 'උදා: Silver' },
  { id: 'insuranceNo', label: 'රක්ෂණ අංකය (Insurance No)', placeholder: 'උදා: INS-2024-001' },
];

/** How many of the details a vehicle has filled in. */
export const vehicleDetailsDone = (v: Vehicle) => VEHICLE_DETAIL_FIELDS.filter((f) => !!(v[f.id] ?? '').toString().trim()).length;

/** One form for a vehicle's details: type them in, save, and Profile's progress and the vehicle card update. */
export const VehicleDetailsSheet: React.FC<{ vehicle: Vehicle | null; onClose: () => void }> = ({ vehicle, onClose }) => {
  const { updateVehicle } = useVehicles();
  const { notify } = useNotice();
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!vehicle) return;
    setValues(Object.fromEntries(VEHICLE_DETAIL_FIELDS.map((f) => [f.id, (vehicle[f.id] ?? '').toString()])));
  }, [vehicle]);

  if (!vehicle) return null;
  const save = () => {
    updateVehicle(vehicle.id, Object.fromEntries(VEHICLE_DETAIL_FIELDS.map((f) => [f.id, (values[f.id] ?? '').trim()])));
    notify({ icon: '✓', title: 'වාහන තොරතුරු සුරැකිණි', body: vehicle.name, tone: 'success' });
    onClose();
  };

  return (
    <Sheet visible={!!vehicle} title="වාහන තොරතුරු" subtitle={`${vehicleIcon(vehicle.type)} ${vehicle.name} · ${vehicle.plate}`} onClose={onClose}>
      {VEHICLE_DETAIL_FIELDS.map((f) => (
        <View key={f.id} style={styles.field}>
          <Text style={styles.label}>{f.label}</Text>
          <TextInput
            style={styles.input}
            value={values[f.id] ?? ''}
            onChangeText={(t) => setValues((v) => ({ ...v, [f.id]: t }))}
            placeholder={f.placeholder}
            placeholderTextColor={Colors.textMuted}
            autoCapitalize={f.id === 'make' || f.id === 'model' || f.id === 'color' ? 'words' : 'characters'}
            accessibilityLabel={f.label}
          />
        </View>
      ))}
      <ActionButton label="සුරකින්න" icon="✓" variant="success" onPress={save} />
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    field: { gap: 6 },
    label: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    input: { height: 48, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard, color: Colors.textMain, fontSize: 15, fontFamily: FONTS.bodyRegular },
  })
);
