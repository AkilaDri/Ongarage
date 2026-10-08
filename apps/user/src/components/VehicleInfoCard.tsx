import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, softEdge, softShadow, themedStyles } from '@ongarage/shared';
import type { Vehicle } from '@ongarage/shared';

export const VehicleInfoCard: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => {
  const info = [
    { label: 'Registration No', value: vehicle.registrationNo || '—' },
    { label: 'Chassis No', value: vehicle.chassisNo || '—' },
    { label: 'Engine No', value: vehicle.engineNo || '—' },
    { label: 'Make', value: vehicle.make || '—' },
    { label: 'Model', value: vehicle.model || '—' },
    { label: 'Color', value: vehicle.color || '—' },
    { label: 'Insurance No', value: vehicle.insuranceNo || '—' },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{vehicle.name}</Text>
      <View style={styles.grid}>
        {info.map((item) => (
          <View key={item.label} style={styles.row}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.value} numberOfLines={1}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 20, padding: 16, gap: 12, ...softShadow() },
    title: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    grid: { gap: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: softEdge() },
    label: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    value: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, maxWidth: '60%' },
  })
);
