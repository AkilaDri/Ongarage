import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FONTS, Gradient, themedStyles } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { ONGARAGE_COMMISSION_PERCENT } from '../constants/commission';
import { money } from '../utils/format';

// The summary card's colour: teal through blue to indigo.
const EARN_GRADIENT = [
  { offset: '0', color: '#0f9d8a' },
  { offset: '0.55', color: '#1a73e8' },
  { offset: '1', color: '#5b5ff0' },
];

/** The summary card of the Activity page: what the finished jobs earned, split by the kind of job, the commission to OnGarage and what is left. */
export const EarningsSummaryCard: React.FC = () => {
  const { bookings } = useGarage();
  const completed = bookings.filter((b) => b.status === 'completed');
  const earnRows = [
    { label: 'ලංසු', color: '#8fd3ff', items: completed.filter((b) => b.source === 'bid') },
    { label: 'Booking', color: '#7ee8b5', items: completed.filter((b) => b.source === 'direct') },
    { label: 'SOS', color: '#ffa8b4', items: completed.filter((b) => b.source === 'sos') },
  ].map((x) => ({ ...x, amount: x.items.reduce((n, b) => n + b.price, 0), count: x.items.length }));
  const totalEarned = earnRows.reduce((n, x) => n + x.amount, 0);
  const commission = Math.round((totalEarned * ONGARAGE_COMMISSION_PERCENT) / 100);

  return (
              <View style={styles.earnCard} accessibilityLabel="Completed jobs summary">
          <Gradient stops={EARN_GRADIENT} />
          <Text style={styles.earnCaption}>මුළු ආදායම</Text>
          <Text style={styles.earnTotal}>{money(totalEarned)}</Text>
          <View style={styles.earnBar}>
            {totalEarned > 0 ? earnRows.filter((x) => x.amount > 0).map((x) => <View key={x.label} style={{ flex: x.amount, backgroundColor: x.color }} />) : <View style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.25)' }} />}
          </View>
          <View style={styles.earnSplit}>
            <View style={styles.earnCol}>
              <Text style={styles.earnLabel}>OnGarage කොමිස් ({ONGARAGE_COMMISSION_PERCENT}%)</Text>
              <Text style={styles.earnAmount}>{money(commission)}</Text>
            </View>
            <View style={styles.earnCol}>
              <Text style={styles.earnLabel}>ඔබට ඉතිරි වන්නේ</Text>
              <Text style={styles.earnAmount}>{money(totalEarned - commission)}</Text>
            </View>
          </View>
          <View style={styles.earnCols}>
            {earnRows.map((x) => (
              <View key={x.label} style={styles.earnCol}>
                <View style={styles.earnLabelRow}>
                  <View style={[styles.earnDot, { backgroundColor: x.color }]} />
                  <Text style={styles.earnLabel} numberOfLines={1}>{x.label}</Text>
                </View>
                <Text style={styles.earnAmount} numberOfLines={1} adjustsFontSizeToFit>{money(x.amount)}</Text>
                <Text style={styles.earnCount}>{x.count > 0 ? `${x.count} ක්` : '—'}</Text>
              </View>
            ))}
          </View>
        </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    earnCard: { padding: 18, borderRadius: 24, gap: 6, overflow: 'hidden', backgroundColor: '#1a73e8', shadowColor: '#1a73e8', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8 },
    earnCaption: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: 'rgba(255, 255, 255, 0.85)' },
    earnTotal: { fontSize: 30, fontFamily: FONTS.titleBold, color: '#ffffff' },
    earnBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2, marginTop: 4, marginBottom: 6 },
    earnSplit: { flexDirection: 'row', gap: 10, paddingVertical: 8, marginBottom: 2, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255, 255, 255, 0.22)' },
    earnCols: { flexDirection: 'row', gap: 10 },
    earnCol: { flex: 1, gap: 2 },
    earnLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    earnDot: { width: 7, height: 7, borderRadius: 4 },
    earnLabel: { flex: 1, fontSize: 12, fontFamily: FONTS.bodyMedium, color: 'rgba(255, 255, 255, 0.85)' },
    earnAmount: { fontSize: 13, fontFamily: FONTS.titleBold, color: '#ffffff' },
    earnCount: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: 'rgba(255, 255, 255, 0.75)' },
  })
);
