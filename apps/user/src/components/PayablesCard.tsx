import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { categoryInfo, Colors, FONTS, getThemeMode, paymentDue, themedStyles } from '@ongarage/shared';
import { useWorkshops } from '../context/WorkshopContext';
import { money } from '../utils/format';
import { elevation1, outline } from '../utils/material';
import { PaymentStatus } from './workshop/PaymentStatus';

/** What the owner still has to pay garages for closed jobs: the total, and each balance with its follow-up (agree, "I paid", a new day). */
export const PayablesCard: React.FC = () => {
  const { workshops } = useWorkshops();
  const owed = Object.values(workshops)
    .filter((w) => (w.progress.payment?.balance ?? 0) > 0 && !w.progress.cancelled)
    .sort((a, b) => (a.progress.payment!.promisedAt ?? 0) - (b.progress.payment!.promisedAt ?? 0));
  if (!owed.length) return null;
  const total = owed.reduce((s, w) => s + w.progress.payment!.balance, 0);
  const late = owed.filter((w) => paymentDue(w.progress.payment) === 'overdue').length;

  return (
    <View style={styles.card} accessibilityLabel="Payments owed">
      <View style={styles.head}>
        <Text style={styles.title}>💳 ගෙවිය යුතු මුදල්</Text>
        <Text style={styles.total}>{money(total)}</Text>
      </View>
      <Text style={styles.sub}>ගරාජ {owed.length}ක්{late ? ` · ප්‍රමාද ${late}` : ''}</Text>
      {owed.map((w) => (
        <View key={w.id} style={styles.item}>
          <Text style={styles.who}>
            {w.garageName} · {w.title ?? categoryInfo(w.categoryId).name}
          </Text>
          <PaymentStatus workshop={w} />
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
