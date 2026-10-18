import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, dayText, FONTS, getThemeMode, paymentDue, promiseAt, PROMISE_PRESETS, themedStyles } from '@ongarage/shared';
import { useWorkshops, type OwnerWorkshop } from '../../context/WorkshopContext';
import { money } from '../../utils/format';
import { Sheet } from '../Sheet';

/** "I do not agree with the garage's payment record": the owner says why (the garage reads it). */
const DisputeSheet: React.FC<{ workshop: OwnerWorkshop | null; onClose: () => void }> = ({ workshop, onClose }) => {
  const { confirmPayment } = useWorkshops();
  const [shown, setShown] = useState(workshop);
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!workshop) return;
    setShown(workshop);
    setNote('');
  }, [workshop?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const w = workshop ?? shown;
  if (!w?.progress.payment) return null;
  const pay = w.progress.payment;
  return (
    <Sheet
      visible={!!workshop}
      title="ගෙවීම් සටහනට එකඟ නොවේ"
      subtitle={`${w.garageName} · බිල ${money(pay.total)}`}
      onClose={onClose}
      footer={
        <ActionButton
          label="ගරාජයට දැනුම් දෙන්න"
          icon="⚠️"
          variant="primary"
          disabled={!note.trim()}
          onPress={() => {
            confirmPayment(w.id, false, note);
            onClose();
          }}
        />
      }
    >
      <Text style={styles.text}>ගරාජය කියන්නේ ඔබ රු. {pay.received.toLocaleString('en-US')} ක් ගෙවා ඇති බවයි, ඉතිරි රු. {pay.balance.toLocaleString('en-US')}. වෙනස කුමක්ද?</Text>
      <TextInput style={styles.input} multiline placeholder="උදා: මම සම්පූර්ණ මුදල ගෙවා ඇත (රිසිට් අංකය…)" placeholderTextColor={Colors.textMuted} value={note} onChangeText={setNote} maxLength={200} accessibilityLabel="Payment dispute note" />
    </Sheet>
  );
};

/**
 * What was paid for a closed job, as the garage recorded it: paid in full, or a balance the owner promised to pay by a date, which the owner confirms or disputes,
 * and follows up: "I paid" (the garage confirms), and, once the garage says the promised day passed without payment, a new day to pay by.
 * Shown on the job's card (the tracker), in its chat and in the owner's list of what is owed.
 */
export const PaymentStatus: React.FC<{ workshop: OwnerWorkshop }> = ({ workshop: w }) => {
  const { confirmPayment, claimPayment, reschedulePayment } = useWorkshops();
  const [disputing, setDisputing] = useState(false);
  const pay = w.progress.payment;
  if (!pay) return null;

  if (pay.status === 'paid') return <Text style={[styles.text, { color: Colors.successText }]}>💰 ගෙවීම සම්පූර්ණයි — {money(pay.total)}</Text>;

  const due = paymentDue(pay);
  return (
    <View style={[styles.box, due === 'overdue' && styles.late]} accessibilityLabel="Payment balance">
      <Text style={styles.title}>💰 ඉතිරි {money(pay.balance)} ගෙවිය යුතුයි</Text>
      <Text style={styles.text}>
        බිල {money(pay.total)} · ඔබ ගෙවූ {money(pay.received)} · {dayText(pay.promisedAt ?? pay.recordedAt)} දිනට ගෙවන බවට පොරොන්දුයි
        {pay.note ? ` · “${pay.note}”` : ''}
      </Text>
      {due === 'today' && <Text style={[styles.text, { color: Colors.warning, fontFamily: FONTS.bodyBold }]}>⏰ අද ගෙවිය යුතු දිනයයි — {w.garageName} ට ගෙවන්න.</Text>}
      {due === 'overdue' && <Text style={[styles.text, { color: Colors.errorText, fontFamily: FONTS.bodyBold }]}>⚠️ පොරොන්දු දිනය ඉක්මවා ඇත — {w.garageName} ට ගෙවන්න.</Text>}

      {pay.confirm === 'pending' ? (
        <View style={styles.row}>
          <View style={styles.flex1}>
            <ActionButton label="එකඟයි" icon="✓" variant="success" compact onPress={() => confirmPayment(w.id, true)} />
          </View>
          <View style={styles.flex1}>
            <ActionButton label="එකඟ නොවේ" icon="⚠️" variant="ghost" compact onPress={() => setDisputing(true)} />
          </View>
        </View>
      ) : pay.confirm === 'disputed' ? (
        <Text style={[styles.text, { color: Colors.errorText }]}>⚠️ ඔබ එකඟ නොවන බව ගරාජයට දැනුම් දුන්නා{pay.disputeNote ? `: “${pay.disputeNote}”` : ''}</Text>
      ) : (
        <>
          <Text style={[styles.text, { color: Colors.successText }]}>✓ ඔබ තහවුරු කළා{due === 'upcoming' ? ' — එදින ගෙවීමට අමතක නොකරන්න.' : ''}</Text>

          {/* The garage said the promised day passed without payment: name a new day. */}
          {!!pay.missedAt && (
            <View style={styles.missed} accessibilityLabel="Choose a new day to pay">
              <Text style={styles.text}>⏰ {w.garageName} ඔබෙන් ඉතිරි මුදල නොලැබුණු බව දැනුම් දුන්නා. ගෙවිය හැකි නව දිනයක් තෝරන්න:</Text>
              <View style={styles.chips}>
                {PROMISE_PRESETS.map((p) => (
                  <Pressable key={p.id} style={styles.chip} onPress={() => reschedulePayment(w.id, promiseAt(p.days))} accessibilityLabel={`Pay ${p.label}`}>
                    <Text style={styles.chipText}>{p.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {pay.claim?.status === 'pending' ? (
            <Text style={styles.text}>🧾 ඔබ රු. {pay.claim.amount.toLocaleString('en-US')} ගෙවූ බව දැනුම් දුන්නා — {w.garageName} තහවුරු කරන තුරු.</Text>
          ) : (
            <>
              {pay.claim?.status === 'denied' && <Text style={[styles.text, { color: Colors.errorText }]}>✖ {w.garageName} කියන්නේ ගෙවීම ලැබී නැති බවයි.</Text>}
              <ActionButton label="මම ගෙව්වා" icon="🧾" variant="primary" compact onPress={() => claimPayment(w.id)} />
            </>
          )}
        </>
      )}
      <DisputeSheet workshop={disputing ? w : null} onClose={() => setDisputing(false)} />
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', gap: 8 },
    box: { gap: 6, padding: 12, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? 'rgba(245, 158, 11, 0.1)' : '#fef7e0', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.45)' },
    late: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fce8e6', borderColor: 'rgba(239, 68, 68, 0.45)' },
    missed: { gap: 6, padding: 10, borderRadius: 10, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.1)' : '#e8f0fe' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    chipText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    title: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    text: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 18 },
    input: { minHeight: 70, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard, color: Colors.textMain, fontSize: 13, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top' },
  })
);
