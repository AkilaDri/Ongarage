import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles, VehicleLine } from '@ongarage/shared';
import { VehiclePicker } from './Header';
import { useVehicles } from '../context/VehiclesContext';

/**
 * The compact vehicle card at the top of a request: which vehicle it is for, with a button that opens the owner's vehicles to pick another. The first thing
 * to settle when an owner has several vehicles; the quote request and the garage booking both begin with it.
 */
export const FlowVehicleCard: React.FC<{ vehicleId: string; onChange: (id: string) => void }> = ({ vehicleId, onChange }) => {
  const { findVehicle } = useVehicles();
  const [open, setOpen] = useState(false);
  const anchor = useRef<View>(null);
  const vehicle = findVehicle(vehicleId);
  return (
    <>
      <View style={styles.card}>
        <Pressable ref={anchor} style={styles.row} onPress={() => setOpen(true)} accessibilityLabel="Change job vehicle">
          <View style={styles.flex1}>
            <Text style={styles.label}>වාහනය</Text>
            {vehicle && <VehicleLine vehicle={vehicle} textStyle={styles.title} />}
          </View>
          <View style={styles.btn}>
            <Text style={styles.btnText}>වෙනස් කරන්න</Text>
          </View>
        </Pressable>
      </View>
      <VehiclePicker visible={open} activeVehicle={vehicleId} anchorRef={anchor} onSelect={onChange} onClose={() => setOpen(false)} />
    </>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    card: { borderRadius: 26, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.55)', backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff', shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: getThemeMode() === 'dark' ? 0.6 : 0.16, shadowRadius: 22, elevation: 6, paddingHorizontal: 16, paddingVertical: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4 },
    title: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    btn: { height: 40, minWidth: 96, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 20, borderWidth: 1.5, borderColor: '#facc15', backgroundColor: '#dbeafe' },
    btnText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: '#1e3a8a' },
  })
);
