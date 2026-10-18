import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, themedStyles } from '../../theme/colors';
import { FONTS } from '../../theme/fonts';
import { dayText, MAX_PROMISE_DAYS, promiseAt, PROMISE_PRESETS } from '../../marketplace/payment';
import { money } from '../../utils/format';
import { ActionButton } from '../Glass';
import { Sheet } from '../Sheet';

/**
 * The job closed with the owner's code: how much did the customer actually pay? Full payment closes the books; less than the bill leaves a balance the customer
 * promises to pay by a date (they confirm it in their app, get reminded, and the garage follows it up). The payment itself happens outside the app.
 */
export const PaymentReceivedSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  overlay?: React.ReactNode;
  subject: { title: string; vehicle: string };
  /** The bill: labour and parts. */
  total: number;
  onSubmit: (r: { received: number; promisedAt?: number; note?: string }) => void;
}> = ({ visible, onClose, overlay, subject, total, onSubmit }) => {
  const [amount, setAmount] = useState(String(total));
  const [days, setDays] = useState(1);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) return;
    setAmount(String(total));
    setDays(1);
    setNote('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const received = Math.min(Number(amount) || 0, total);
  const balance = total - received;

  return (
    <Sheet
      visible={visible}
      title="ගෙවීම තහවුරු කරන්න"
      subtitle={`${subject.title} · ${subject.vehicle}`}
      onClose={onClose}
      overlay={overlay}
      footer={
        <ActionButton
          label={balance > 0 ? `${money(received)} ලැබුණා · ඉතිරිය සටහන් කරන්න` : 'සම්පූර්ණ මුදල ලැබුණා ✓'}
          icon={balance > 0 ? '📝' : '💰'}
          variant={balance > 0 ? 'primary' : 'success'}
          onPress={() => {
            onSubmit({ received, promisedAt: balance > 0 ? promiseAt(days) : undefined, note: note.trim() || undefined });
            onClose();
          }}
        />
      }
    >
      <View style={styles.bill}>
        <Text style={styles.billLabel}>රැකියාවේ බිල (වැඩ + කොටස්)</Text>
        <Text style={styles.billAmount}>{money(total)}</Text>
      </View>

      <Text style={styles.label}>ඔබට ලැබුණු මුදල</Text>
      <View style={styles.box}>
        <Text style={styles.currency}>රු.</Text>
        <TextInput style={styles.input} keyboardType="number-pad" value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))} maxLength={8} accessibilityLabel="Amount received" />
      </View>
      <Pressable style={styles.full} onPress={() => setAmount(String(total))} accessibilityLabel="Received in full">
        <Text style={styles.fullText}>{balance <= 0 ? '✓ සම්පූර්ණ මුදල ලැබුණා' : 'සම්පූර්ණ මුදල ලැබුණා'}</Text>
      </Pressable>

      {balance > 0 && (
        <View style={styles.owed} accessibilityLabel="Balance owed">
          <Text style={styles.owedTitle}>ඉතිරි {money(balance)}</Text>
          <Text style={styles.hint}>පාරිභෝගිකයා කවදා ගෙවන බවට පොරොන්දු වුණාද? ඒ දිනයේ උදේ දෙපාර්ශ්වයටම මතක් කරනවා.</Text>
          <View style={styles.chips}>
            {PROMISE_PRESETS.map((p) => (
              <Pressable key={p.id} style={[styles.chip, days === p.days && styles.chipOn]} onPress={() => setDays(p.days)} accessibilityLabel={`Promised ${p.label}`} accessibilityState={{ selected: days === p.days }}>
                <Text style={[styles.chipText, days === p.days && styles.chipTextOn]}>{days === p.days ? '✓ ' : ''}{p.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.stepper}>
            <Pressable style={styles.stepBtn} onPress={() => setDays((d) => Math.max(1, d - 1))} accessibilityLabel="Earlier day"><Text style={styles.stepText}>−</Text></Pressable>
            <Text style={styles.stepValue}>{dayText(promiseAt(days))} (දින {days})</Text>
            <Pressable style={styles.stepBtn} onPress={() => setDays((d) => Math.min(MAX_PROMISE_DAYS, d + 1))} accessibilityLabel="Later day"><Text style={styles.stepText}>＋</Text></Pressable>
          </View>
        </View>
      )}

      <TextInput style={styles.note} multiline placeholder="සටහනක් (විකල්ප) — උදා: ගෙවන්නේ බැංකු ගිණුමට" placeholderTextColor={Colors.textMuted} value={note} onChangeText={setNote} maxLength={160} accessibilityLabel="Payment note" />
      <Text style={styles.hint}>මුදල ගනුදෙනුව යෙදුමෙන් පිටතයි; මෙය ඔබගේ සහ පාරිභෝගිකයාගේ වාර්තාවට පමණයි.</Text>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    bill: { padding: 12, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 2 },
    billLabel: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    billAmount: { fontSize: 22, fontFamily: FONTS.titleBold, color: Colors.textMain },
    label: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    box: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    currency: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMuted },
    input: { flex: 1, fontSize: 26, fontWeight: '800', color: Colors.textMain, paddingVertical: 8 },
    full: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    fullText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.success },
    owed: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.12)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.45)' },
    owedTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.warning },
    hint: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    chipOn: { borderColor: Colors.primary, backgroundColor: 'rgba(56, 189, 248, 0.14)' },
    chipText: { fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    chipTextOn: { color: Colors.primary, fontFamily: FONTS.bodyBold },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepBtn: { width: 36, height: 36, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    stepText: { fontSize: 18, color: Colors.textMain, fontWeight: '700' },
    stepValue: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    note: { minHeight: 56, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard, color: Colors.textMain, fontSize: 13, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top' },
  })
);
