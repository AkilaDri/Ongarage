import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton, canRateCustomer, Colors, FONTS, getThemeMode, tagLabel, themedStyles } from '@ongarage/shared';
import { CustomerRatingSheet } from './CustomerRatingSheet';
import type { Booking } from '../types';

/** On a closed job's card and in its chat: rate the customer, or what the garage said and how the customer answered. */
export const CustomerRatingNote: React.FC<{ booking: Booking }> = ({ booking: b }) => {
  const [open, setOpen] = useState(false);
  const p = b.progress;
  if (!p || p.stage !== 'closed') return null;
  const r = p.customerRating;

  if (!r && canRateCustomer(p)) {
    return (
      <View style={styles.box} accessibilityLabel="Rate the customer">
        <Text style={styles.title}>⭐ {b.customer.name} ශ්‍රේණිගත කරන්න</Text>
        <Text style={styles.text}>ගෙවීම සහ හැසිරීම ගැන සටහනක් අනෙක් ගරාජවලටත් ප්‍රයෝජනවත් වේ.</Text>
        <ActionButton label="ශ්‍රේණිගත කරන්න" icon="⭐" variant="ghost" compact onPress={() => setOpen(true)} />
        <CustomerRatingSheet booking={open ? b : null} onClose={() => setOpen(false)} />
      </View>
    );
  }
  if (!r) return null;

  return (
    <View style={styles.box} accessibilityLabel="Customer rating">
      <Text style={styles.text}>
        ⭐ ඔබ {b.customer.name} ★{r.stars} ලෙස ශ්‍රේණිගත කළා{r.tags.length ? ` · ${r.tags.map(tagLabel).join(', ')}` : ''}
        {r.note ? ` — “${r.note}”` : ''}
      </Text>
      {!!r.reply && <Text style={styles.text}>💬 පාරිභෝගිකයාගේ පිළිතුර: “{r.reply.text}”</Text>}
      {r.dispute && r.dispute.status === 'open' && <Text style={[styles.text, { color: Colors.warning }]}>⚠️ පාරිභෝගිකයා ගැටලුවක් ඉදිරිපත් කළා: “{r.dispute.note}” — OnGarage සලකා බලන තෙක් මෙය පොදු වාර්තාවට ගණන් නොගනී.</Text>}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    box: { gap: 6, padding: 12, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.08)' : '#f1f6fe', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#d2e3fc' },
    title: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    text: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 18 },
  })
);
