import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, LkPlate, themedStyles, VehicleLabel } from '@ongarage/shared';
import { Sheet } from './Sheet';
import { plateKey, vehicleRecords } from './VehicleRecordPanel';
import { useGarage } from '../context/GarageContext';
import { formatDate, money } from '../utils/format';
import type { Booking } from '../types';

const Field: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text style={styles.fieldValue}>{value || '—'}</Text>
  </View>
);

/**
 * A vehicle's number plate (or whatever stands in its place) that opens a popup with everything known about the vehicle when it is touched: the
 * number, make, model, colour, chassis, engine and insurance numbers, its owner, and what this garage has already done on it.
 */
export const VehiclePlateTap: React.FC<{ booking: Booking; children: React.ReactNode }> = ({ booking: b, children }) => {
  const [open, setOpen] = useState(false);
  const { bookings } = useGarage();
  const v = b.vehicle;
  const key = plateKey(v.registrationNo ?? v.plate);
  const past = key ? (vehicleRecords(bookings, key)[0] ?? []).filter((x) => x.id !== b.id && x.status === 'completed') : [];
  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={6} accessibilityLabel={`Vehicle details ${v.plate}`} style={styles.tap}>
        {children}
      </Pressable>
      <Sheet visible={open} title={v.name} subtitle="වාහනයේ සම්පූර්ණ විස්තර" onClose={() => setOpen(false)}>
        <View style={styles.plateRow}>
          <LkPlate plate={v.registrationNo ?? v.plate} stacked={v.type === 'Motorbike'} />
          <VehicleLabel type={v.type} style={styles.type}>
            {v.type}
          </VehicleLabel>
        </View>
        <View style={styles.box}>
          <Field label="Make" value={v.make} />
          <Field label="Model" value={v.model ?? v.name} />
          <Field label="වර්ණය" value={v.color} />
          <Field label="ලියාපදිංචි අංකය" value={v.registrationNo ?? v.plate} />
          <Field label="Chassis අංකය" value={v.chassisNo} />
          <Field label="Engine අංකය" value={v.engineNo} />
          <Field label="රක්ෂණ අංකය" value={v.insuranceNo} />
        </View>
        {!v.chassisNo && !v.engineNo && <Text style={styles.empty}>පාරිභෝගිකයා මෙම වාහනයේ ලියාපදිංචි විස්තර ඇතුළත් කර නැත.</Text>}
        <Text style={styles.section}>අයිතිකරු</Text>
        <View style={styles.box}>
          <Field label="නම" value={b.customer.name} />
          <Field label="දුරකථනය" value={b.customer.phone} />
        </View>
        <Text style={styles.section}>මෙම ගරාජයේ කළ රැකියා{past.length ? ` (${past.length})` : ''}</Text>
        {past.length === 0 ? (
          <Text style={styles.empty}>මෙම වාහනයට මෙහි කළ වෙනත් රැකියා නැත.</Text>
        ) : (
          <View style={styles.box}>
            {past.slice(0, 5).map((x) => (
              <View key={x.id} style={styles.field}>
                <Text style={[styles.fieldLabel, styles.flex1]} numberOfLines={1}>
                  {formatDate(x.completedAt ?? x.scheduledAt)} · {x.title}
                </Text>
                <Text style={styles.fieldValue}>{money(x.price)}</Text>
              </View>
            ))}
          </View>
        )}
      </Sheet>
    </>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    tap: { flexShrink: 0 },
    plateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    type: { fontSize: 14, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    box: { padding: 14, borderRadius: 12, backgroundColor: Colors.bgCard, gap: 10 },
    field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    fieldLabel: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    fieldValue: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    section: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary, marginTop: 8 },
    empty: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
  })
);
