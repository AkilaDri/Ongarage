import { EmptyState } from '@ongarage/shared';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, LkPlate, getThemeMode, themedStyles } from '@ongarage/shared';
import { CategoryArt } from './CategoryArt';
import { formatDate, money } from '../utils/format';
import type { Booking } from '../types';

/** Letters and digits only, upper case: "wp cab-1234" and "WP-CAB-1234" are the same registration number. */
export const plateKey = (s?: string) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** The finished jobs of every vehicle that matches the registration number typed (a part of it is enough), vehicle by vehicle. */
export const vehicleRecords = (bookings: Booking[], query: string) => {
  const q = plateKey(query);
  if (!q) return [];
  const groups = new Map<string, Booking[]>();
  for (const b of bookings) {
    const keys = [plateKey(b.vehicle.registrationNo), plateKey(b.vehicle.plate)].filter(Boolean);
    if (!keys.some((k) => k.includes(q))) continue;
    const id = keys[0];
    groups.set(id, [...(groups.get(id) ?? []), b]);
  }
  return [...groups.values()].map((jobs) => jobs.sort((a, b) => (b.completedAt ?? b.scheduledAt) - (a.completedAt ?? a.scheduledAt)));
};

const SOURCE: Record<Booking['source'], string> = { sos: 'SOS', direct: 'Booking', bid: 'ලංසු' };

/**
 * A vehicle's whole record: every job finished on it through the app (found by its registration number), newest first, with what was
 * done, when, what it cost and the warranty. Tapping a job opens its details.
 */
export const VehicleRecordPanel: React.FC<{ bookings: Booking[]; query: string; onOpen: (id: string) => void }> = ({ bookings, query, onOpen }) => {
  const records = vehicleRecords(bookings, query);
  if (records.length === 0) {
    return <EmptyState icon="🔎" title="වාහන වාර්තා නැත" text="මෙම වාහන අංකයට අදාළ රැකියා නැත — අංකය නැවත පරීක්ෂා කරන්න." />;
  }
  return (
    <>
      {records.map((jobs) => {
        const v = jobs[0].vehicle;
        const total = jobs.reduce((n, b) => n + b.price, 0);
        return (
          <View key={plateKey(v.registrationNo) || plateKey(v.plate)} style={styles.card}>
            <View style={styles.head}>
              <View style={styles.flex1}>
                <Text style={styles.name} numberOfLines={1}>
                  {v.name}
                </Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {[v.type, v.make, v.model, v.color].filter(Boolean).join(' · ')}
                </Text>
                {!!v.registrationNo && <Text style={styles.sub}>ලියාපදිංචි අංකය: {v.registrationNo}</Text>}
                {!!v.chassisNo && <Text style={styles.sub}>චැසි අංකය: {v.chassisNo}</Text>}
              </View>
              <LkPlate plate={v.registrationNo || v.plate} stacked={v.type === 'Motorbike'} small />
            </View>
            <View style={styles.totals}>
              <Text style={styles.totalText}>රැකියා {jobs.length}</Text>
              <Text style={styles.totalText}>මුළු වටිනාකම {money(total)}</Text>
            </View>
            {jobs.map((b) => (
              <Pressable key={b.id} style={styles.job} onPress={() => onOpen(b.id)} accessibilityLabel={`${b.title} record`}>
                <CategoryArt emoji={b.icon} size={36} />
                <View style={styles.flex1}>
                  <Text style={styles.jobTitle} numberOfLines={1}>
                    {b.title}
                  </Text>
                  <Text style={styles.sub} numberOfLines={1}>
                    {formatDate(b.completedAt ?? b.scheduledAt)} · {SOURCE[b.source]} · {b.customer.name}
                  </Text>
                  {!!b.progress?.warrantyUntil && <Text style={styles.sub}>🛡️ වගකීම {formatDate(b.progress.warrantyUntil)} දක්වා</Text>}
                </View>
                <View style={styles.right}>
                  <Text style={styles.price}>{money(b.price)}</Text>
                  <Text style={styles.link}>විස්තර ›</Text>
                </View>
              </Pressable>
            ))}
          </View>
        );
      })}
    </>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    empty: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', paddingVertical: 28 },
    card: { gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    name: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    totals: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    totalText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    job: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e8eaed' },
    jobTitle: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    right: { alignItems: 'flex-end', gap: 2 },
    price: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    link: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  })
);
