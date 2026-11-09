import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, themedStyles } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { VehiclePicker } from './Header';

/**
 * The owner's active vehicle, in every tab header: its name and plate, or "සියලු වාහන" when Bids and Activity show every vehicle.
 * Touching it opens the same picker as the SOS flow, with a row for every vehicle at once. Choosing a vehicle leaves the all-vehicles view.
 */
export const VehicleChip: React.FC = () => {
  const { activeVehicle, showAllVehicles, setActiveVehicleId, setShowAllVehicles } = useVehicles();
  const anchor = useRef<View>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable ref={anchor} style={({ pressed }) => [styles.chip, pressed && styles.pressed]} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={showAllVehicles ? 'Showing every vehicle. Change vehicle' : `Vehicle ${activeVehicle.name}. Change vehicle`}>
        {showAllVehicles ? (
          <Text style={styles.allText} numberOfLines={1}>
            සියලු වාහන
          </Text>
        ) : (
          <Text style={styles.name} numberOfLines={1}>
            {activeVehicle.name}
          </Text>
        )}
        <Text style={styles.caret}>▾</Text>
      </Pressable>
      <VehiclePicker
        visible={open}
        activeVehicle={showAllVehicles ? '' : activeVehicle.id}
        anchorRef={anchor}
        withAll
        onSelect={(id) => {
          setActiveVehicleId(id);
          setShowAllVehicles(false);
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingLeft: 10, paddingRight: 8, minHeight: 44, borderRadius: 22, backgroundColor: Colors.bgCard, flexShrink: 1 },
    pressed: { opacity: 0.7 },
    name: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMain, flexShrink: 1 },
    allText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.primary },
    caret: { fontSize: 11, color: Colors.textMuted },
  })
);
