import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, LkPlate, themedStyles, vehicleIcon, type Vehicle } from '@ongarage/shared';

/** The vehicle a job is for: its name and its number plate, as the owner registered them. */
export const VehicleBlock: React.FC<{ vehicle: Vehicle }> = ({ vehicle: v }) => (
  <View style={styles.wrap}>
    <Text style={styles.model}>
      {vehicleIcon(v.type)} {v.name}
    </Text>
    <LkPlate plate={v.registrationNo || v.plate} stacked={v.type === 'Motorbike'} small />
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { gap: 6, marginTop: 4 },
    model: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
  })
);
