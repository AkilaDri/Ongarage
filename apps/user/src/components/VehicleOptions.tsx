import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, LkPlate, themedStyles } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { AddVehicleSheet } from './AddVehicleSheet';

/**
 * Every vehicle of the owner in one list: the name leads each row in bold, its number plate sits under it, and the chosen one is ringed in blue with a tick.
 * A row at the bottom adds a vehicle that is not there yet, and the new one is chosen when it is saved.
 */
export const VehicleOptions: React.FC<{ value: string; onChange: (vehicleId: string) => void }> = ({ value, onChange }) => {
  const { vehicles } = useVehicles();
  const [adding, setAdding] = useState(false);
  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {vehicles.map((v) => {
        const on = v.id === value;
        return (
          <Pressable key={v.id} style={[styles.row, on && styles.rowOn]} onPress={() => onChange(v.id)} accessibilityRole="radio" accessibilityLabel={`Vehicle ${v.name}`} accessibilityState={{ selected: on }}>
            <View style={styles.text}>
              <Text style={styles.name}>{v.name}</Text>
              <LkPlate plate={v.registrationNo || v.plate} small />
            </View>
            <View style={[styles.radio, on && styles.radioOn]}>{on && <Text style={styles.tick}>✓</Text>}</View>
          </Pressable>
        );
      })}
      <Pressable style={styles.addRow} onPress={() => setAdding(true)} accessibilityLabel="Add a new vehicle">
        <Text style={styles.addText}>+ නව වාහනයක් එකතු කරන්න</Text>
      </Pressable>
      <AddVehicleSheet
        visible={adding}
        onClose={() => setAdding(false)}
        onAdded={(vehicle) => {
          setAdding(false);
          onChange(vehicle.id);
        }}
      />
    </View>
  );
};

const dark = () => getThemeMode() === 'dark';

const styles = themedStyles(() =>
  StyleSheet.create({
    list: { gap: 10 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 14, borderRadius: 14, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.06)' : '#f4f7fb', borderWidth: 1, borderColor: dark() ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0' },
    rowOn: { borderColor: '#1a73e8', backgroundColor: dark() ? 'rgba(141, 177, 255, 0.14)' : '#e8f0fe' },
    text: { flex: 1, gap: 6, alignItems: 'flex-start' },
    // The vehicle's name leads each row in bold; its number plate sits under it.
    name: { fontSize: 15, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    // The empty circle has a darker edge, so each row reads as something to tap.
    radio: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.textSoft },
    radioOn: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
    tick: { fontSize: 13, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    addRow: { padding: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#93c5fd', alignItems: 'center' },
    addText: { fontSize: 14, fontFamily: FONTS.bodyBold, color: '#1d4ed8' },
  })
);
