import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles, VehicleLine } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';

/**
 * Every vehicle of the owner in one list, one row each (its name and number plate), the chosen one ringed in blue with a tick: the vehicle step of the forms,
 * where the owner sees all their vehicles at once instead of opening a picker.
 */
export const VehicleOptions: React.FC<{ value: string; onChange: (vehicleId: string) => void }> = ({ value, onChange }) => {
  const { vehicles } = useVehicles();
  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {vehicles.map((v) => {
        const on = v.id === value;
        return (
          <Pressable key={v.id} style={[styles.row, on && styles.rowOn]} onPress={() => onChange(v.id)} accessibilityRole="radio" accessibilityLabel={`Vehicle ${v.name}`} accessibilityState={{ selected: on }}>
            <VehicleLine vehicle={v} textStyle={styles.name} />
            <View style={[styles.radio, on && styles.radioOn]}>{on && <Text style={styles.tick}>✓</Text>}</View>
          </Pressable>
        );
      })}
    </View>
  );
};

const dark = () => getThemeMode() === 'dark';

const styles = themedStyles(() =>
  StyleSheet.create({
    list: { gap: 10 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 14, borderRadius: 14, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.06)' : '#f4f7fb', borderWidth: 1.5, borderColor: 'transparent' },
    rowOn: { borderColor: '#1a73e8', backgroundColor: dark() ? 'rgba(141, 177, 255, 0.14)' : '#e8f0fe' },
    name: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    radio: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.subtleBorder },
    radioOn: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
    tick: { fontSize: 13, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  })
);
