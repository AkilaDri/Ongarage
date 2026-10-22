import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, dayText, FONTS, getThemeMode, paymentDue, PaymentReceivedSheet, themedStyles } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { money } from '../utils/format';
import { Toast } from './Toast';
import type { Booking } from '../types';

/** The bill of a closed job: labour and parts together (what the customer has to pay). */
export const billOf = (b: Booking) => b.progress?.handover?.bill.total ?? b.price + (b.partsCost ?? 0);

/**
 * On a closed job's card and in its chat: what was paid. Until the garage has recorded it, a button asks for it (the prompt that follows the owner's code can be
 * dismissed and answered later); afterwards it reads as paid in full, or as a balance with its promised date and the customer's answer. A balance is followed up
 * here: "received" (all or part, with a new day for the rest), "did not pay" once the promised day has come (the customer then names a new day), and the customer's
 * "I paid" to confirm or deny.
 */
export const PaymentNote: React.FC<{ booking: Booking }> = ({ booking: b }) => {
  const { recordPayment, collectPayment, markPaymentMissed, answerPaymentClaim } = useGarage();
  const [open, setOpen] = useState(false);
  const [collect, setCollect] = useState(false);
  const p = b.progress;
  if (!p || p.stage !== 'closed') return null;
  const pay = p.payment;
  const subject = { title: b.title, vehicle: `${b.vehicle.name} · ${b.vehicle.plate}` };

  if (!pay) {
    return (
      <View style={[styles.box, styles.warn]} accessibilityLabel="Payment not recorded">
        <Text style={styles.title}>💰 ගෙවීම තවම සටහන් කර නැත</Text>
        <Text style={styles.text}>{b.customer.name} සම්පූර්ණ බිල ({money(billOf(b))}) ගෙව්වාද? ලැබුණු මුදල සටහන් කරන්න.</Text>
        <ActionButton label="ගෙවීම තහවුරු කරන්න" icon="💰" variant="primary" compact onPress={() => setOpen(true)} />
        <PaymentReceivedSheet visible={open} onClose={() => setOpen(false)} overlay={<Toast topOffset={40} />} subject={subject} total={billOf(b)} onSubmit={(r) => recordPayment(b.id, r)} />
      </View>
    );
  }

  if (pay.status === 'paid') {
    return <Text style={[styles.text, { color: Colors.successText }]}>💰 ගෙවීම සම්පූර්ණයි — {money(pay.total)}{pay.installments?.length ? ` (වාරික ${pay.installments.length + 1}කින්)` : ''}</Text>;
  }

  const due = paymentDue(pay);
  const dueText = due === 'today' ? '⏰ අද ලැබිය යුතුයි' : due === 'overdue' ? '⚠️ පොරොන්දු දිනය ඉක්මවා ඇත' : null;

  return (
    <View style={[styles.box, due === 'overdue' ? styles.danger : styles.warn]} accessibilityLabel="Balance owed">
      <Text style={styles.title}>💰 ඉතිරි {money(pay.balance)} ලැබිය යුතුයි</Text>
      <Text style={styles.text}>
        බිල {money(pay.total)} · ලැබුණු {money(pay.received)} · {dayText(pay.promisedAt ?? pay.recordedAt)} දිනට ගෙවන බවට පොරොන්දුයි
        {pay.note ? ` · “${pay.note}”` : ''}
      </Text>
      {!!dueText && <Text style={[styles.text, { color: due === 'overdue' ? Colors.errorText : Colors.warning, fontFamily: FONTS.bodyBold }]}>{dueText}</Text>}
      <Text style={[styles.text, { color: pay.confirm === 'confirmed' ? Colors.successText : pay.confirm === 'disputed' ? Colors.errorText : Colors.warning }]}>
        {pay.confirm === 'confirmed' ? '✓ පාරිභෝගිකයා තහවුරු කළා' : pay.confirm === 'disputed' ? `⚠️ පාරිභෝගිකයා එකඟ නොවේ${pay.disputeNote ? `: ${pay.disputeNote}` : ''}` : '⏳ පාරිභෝගිකයාගේ තහවුරු කිරීම බලාපොරොත්තුවෙන්'}
      </Text>
      {!!pay.missedCount && <Text style={styles.text}>⏰ ලැබුණේ නැති බව {pay.missedCount} වතාවක් දැනුම් දී ඇත{pay.missedAt ? ' — පාරිභෝගිකයා නව දිනයක් දන්වන තුරු' : ''}.</Text>}

      {pay.claim?.status === 'pending' && (
        <View style={styles.claim}>
          <Text style={styles.text}>🧾 පාරිභෝගිකයා කියන්නේ රු. {pay.claim.amount.toLocaleString('en-US')} ක් ගෙවූ බවයි. ලැබුණාද?</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <ActionButton label="ලැබුණා" icon="✓" variant="success" compact onPress={() => answerPaymentClaim(b.id, true)} />
            </View>
            <View style={styles.flex1}>
              <ActionButton label="ලැබී නැත" icon="✖" variant="ghost" compact onPress={() => answerPaymentClaim(b.id, false)} />
            </View>
          </View>
        </View>
      )}

      {pay.confirm !== 'disputed' && (
        <View style={styles.row}>
          <View style={styles.flex1}>
            <ActionButton label="ගෙවීමක් ලැබුණා" icon="💰" variant="primary" compact onPress={() => setCollect(true)} />
          </View>
          {(due === 'today' || due === 'overdue') && !pay.missedAt && (
            <View style={styles.flex1}>
              <ActionButton label="ගෙවුවේ නැහැ" icon="⏰" variant="ghost" compact onPress={() => markPaymentMissed(b.id)} />
            </View>
          )}
        </View>
      )}
      <PaymentReceivedSheet
        visible={collect}
        onClose={() => setCollect(false)}
        overlay={<Toast topOffset={40} />}
        subject={subject}
        total={pay.balance}
        onSubmit={(r) => collectPayment(b.id, r.received, r.promisedAt)}
      />
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', gap: 8 },
    box: { gap: 6, padding: 12, borderRadius: 12, borderWidth: 1 },
    warn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(245, 158, 11, 0.1)' : '#fef7e0', borderColor: 'rgba(245, 158, 11, 0.45)' },
    danger: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fce8e6', borderColor: 'rgba(239, 68, 68, 0.45)' },
    claim: { gap: 6, padding: 10, borderRadius: 10, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.1)' : '#e8f0fe' },
    title: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    text: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 18 },
  })
);
