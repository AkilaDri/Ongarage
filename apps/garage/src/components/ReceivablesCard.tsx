import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, paymentDue, themedStyles } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { money } from '../utils/format';
import { PaymentNote } from './PaymentNote';
import { elevation1, outline } from '../utils/material';

/** What customers still owe this garage on closed jobs: the total, and each balance with its follow-up actions (the same note as on the job's card). */
export const ReceivablesCard: React.FC = () => {
  const { bookings } = useGarage();
  const owed = bookings
    .filter((b) => b.status === 'completed' && (b.progress?.payment?.balance ?? 0) > 0)
    .sort((a, b) => (a.progress!.payment!.promisedAt ?? 0) - (b.progress!.payment!.promisedAt ?? 0));
  if (!owed.length) return null;
  const total = owed.reduce((s, b) => s + b.progress!.payment!.balance, 0);
  const late = owed.filter((b) => paymentDue(b.progress!.payment) === 'overdue').length;

  return (
    <View style={styles.card} accessibilityLabel="Receivables">
      <View style={styles.head}>
        <Text style={styles.title}>💰 ලබා ගැනීමට ඇති මුදල්</Text>
        <Text style={styles.total}>{money(total)}</Text>
      </View>
      <Text style={styles.sub}>
        පාරිභෝගිකයන් {owed.length}ක්{late ? ` · ප්‍රමාද ${late}` : ''}
      </Text>
      {owed.map((b) => (
        <View key={b.id} style={styles.item}>
          <Text style={styles.who}>
            {b.customer.name} · {b.title}
          </Text>
          <PaymentNote booking={b} />
        </View>
      ))}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    card: { gap: 10, padding: 14, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    title: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    total: { fontSize: 16, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#fdd663' : '#b06000' },
    sub: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    item: { gap: 6 },
    who: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
  })
);
