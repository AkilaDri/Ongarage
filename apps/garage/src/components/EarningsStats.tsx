import { outline } from '../utils/material';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, themedStyles, softEdge, softShadow } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { isSameDay, money } from '../utils/format';

const WEEK_MS = 7 * 24 * 3600 * 1000;

// Today's and the last 7 days' earnings plus the completed-job count, shown on the Garage tab.
export const EarningsStats: React.FC = () => {
  const { bookings } = useGarage();
  const now = Date.now();
  const completed = bookings.filter((b) => b.status === 'completed');
  // What an owner pays a garage when cancelling a job in progress counts as earned, on the day it was agreed.
  const paidCancels = bookings.filter((b) => b.status === 'cancelled' && !!b.cancelled?.compensation).map((b) => ({ at: b.cancelled!.at, amount: b.cancelled!.compensation! }));
  const today = completed.filter((b) => b.completedAt && isSameDay(b.completedAt, now)).reduce((s, b) => s + b.price, 0) + paidCancels.filter((c) => isSameDay(c.at, now)).reduce((s, c) => s + c.amount, 0);
  const week = completed.filter((b) => b.completedAt && now - b.completedAt < WEEK_MS).reduce((s, b) => s + b.price, 0) + paidCancels.filter((c) => now - c.at < WEEK_MS).reduce((s, c) => s + c.amount, 0);
  return (
    <View style={styles.row}>
      <Stat value={money(today)} label="අද ආදායම" color={Colors.success} />
      <Stat value={money(week)} label="දින 7 ආදායම" color={Colors.primary} />
      <Stat value={String(completed.length)} label="සම්පූර්ණ රැකියා" color={Colors.warning} />
    </View>
  );
};

const Stat: React.FC<{ value: string; label: string; color: string }> = ({ value, label, color }) => (
  <View style={styles.stat}>
    <Text style={[styles.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: 8 },
    stat: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, borderRadius: 20, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard, ...softShadow() },
    value: { fontSize: 15, fontFamily: FONTS.titleBold },
    label: { fontSize: 10, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
  })
);
