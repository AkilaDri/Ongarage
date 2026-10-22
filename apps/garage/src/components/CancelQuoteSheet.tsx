import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, cancelCompensationFor, Colors, FONTS, themedStyles } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { money } from '../utils/format';
import { Sheet } from './Sheet';
import type { Booking } from '../types';

/**
 * The owner asked to cancel a job in progress. The garage approves it and states what it charges for the work done so far (prefilled from
 * the stage the job reached, editable); the owner then accepts it (cancelling and rating the garage) or withdraws the request.
 */
export const CancelQuoteSheet: React.FC<{ booking: Booking | null; onClose: () => void }> = ({ booking, onClose }) => {
  const { quoteCancel } = useGarage();
  const [shown, setShown] = useState(booking);
  const [amount, setAmount] = useState('');
  const [workDone, setWorkDone] = useState('');

  useEffect(() => {
    if (!booking?.progress) return;
    setShown(booking);
    const suggestion = cancelCompensationFor(booking.progress, booking.price);
    setAmount(String(suggestion.amount));
    setWorkDone(suggestion.workDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id]);

  const b = booking ?? shown;
  const req = b?.progress?.cancelRequest;
  if (!b || !req) return null;
  const value = Number(amount) || 0;

  return (
    <Sheet
      visible={!!booking}
      title="අවලංගු කිරීම අනුමත කරන්න"
      subtitle={`${b.customer.name} · ${b.title}`}
      onClose={onClose}
      footer={<ActionButton label={`අනුමත කර ${money(value)} වන්දිය දන්වන්න`} icon="💰" variant="primary" compact onPress={() => { if (quoteCancel(b.id, { compensation: value, workDone })) onClose(); }} />}
    >
      <View style={styles.box}>
        <Text style={styles.label}>අයිතිකරුගේ ඉල්ලීම</Text>
        <Text style={styles.text}>
          හේතුව: {req.reason}
          {req.note ? ` · “${req.note}”` : ''}
        </Text>
      </View>

      <Text style={styles.label}>මෙතෙක් කළ වැඩවලට ඔබගේ වන්දිය</Text>
      <View style={styles.priceBox}>
        <Text style={styles.currency}>රු.</Text>
        <TextInput style={styles.priceInput} keyboardType="number-pad" value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))} maxLength={7} accessibilityLabel="Compensation amount" />
      </View>
      <Text style={styles.hint}>රැකියාවේ මිල {money(b.price)}. අයිතිකරුට මෙය අනුමත කර අවලංගු කළ හැක, නැත්නම් ඉල්ලීම ඉවත් කර වැඩ දිගටම කරගෙන යා හැක.</Text>

      <Text style={styles.label}>කළ වැඩ (අයිතිකරුට පෙනේ)</Text>
      <TextInput style={styles.note} multiline value={workDone} onChangeText={setWorkDone} maxLength={200} placeholder="උදා: වාහනය පරීක්ෂා කර, කොටස් ඇණවුම් කළා" placeholderTextColor={Colors.textMuted} accessibilityLabel="Work done so far" />
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    box: { gap: 4, padding: 12, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    label: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    text: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 19 },
    hint: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    priceBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    currency: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMuted },
    priceInput: { flex: 1, fontSize: 26, fontWeight: '800', color: Colors.textMain, paddingVertical: 8 },
    note: { minHeight: 64, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard, color: Colors.textMain, fontSize: 13, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top' },
  })
);
