import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, softCard, themedStyles } from '@ongarage/shared';
import type { TowRecord } from '../../context/TowRecordsContext';
import { money } from '../../utils/format';

const STATUS_TEXT: Record<TowRecord['status'], string> = {
  held: 'කාලසටහන් කළා',
  done: 'අවසන්',
  cancelled: 'අවලංගුයි',
};

/** A towing job in Activity: the trip, the truck, and the money (agreed and final, or the cancellation fee). */
export const TowRecordCard: React.FC<{ record: TowRecord }> = ({ record }) => (
  <View style={styles.card} accessibilityLabel={`Tow ${record.vehicleLabel} ${STATUS_TEXT[record.status]}`}>
    <View style={styles.top}>
      <Text style={styles.emoji}>🛻</Text>
      <View style={styles.flex1}>
        <Text style={styles.title} numberOfLines={1}>{`ටෝවින් · ${record.vehicleLabel}`}</Text>
        <Text style={styles.sub} numberOfLines={1}>{`${record.pickupText} → ${record.dropText}`}</Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{STATUS_TEXT[record.status]}</Text>
      </View>
    </View>
    <Text style={styles.sub}>
      {[record.bidName, record.slotLabel].filter(Boolean).join(' · ')}
    </Text>
    {record.status === 'done' && <Text style={styles.money}>{`ගෙවූ මුදල: ${money(record.finalAmount ?? record.agreedFee)}`}</Text>}
    {record.status === 'done' && !!record.rating && <Text style={styles.sub}>{`★ ${record.rating}${record.comment ? ` · ${record.comment}` : ''}`}</Text>}
    {record.status === 'held' && <Text style={styles.money}>{`ගිවිසගත් මිල: ${money(record.agreedFee)}`}</Text>}
    {record.status === 'cancelled' && (
      <Text style={styles.money}>{record.cancelFee > 0 ? `අවලංගු ගාස්තුව: ${money(record.cancelFee)}` : 'අවලංගු ගාස්තුවක් නැහැ'}</Text>
    )}
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    card: { ...softCard(), borderRadius: 20, padding: 14, gap: 6, marginBottom: 12 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    emoji: { fontSize: 22 },
    flex1: { flex: 1 },
    title: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#dbeafe' },
    badgeText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: '#1d367f' },
    money: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
  })
);
