import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, FONTS, themedStyles, softEdge, softFill } from '@ongarage/shared';
import { buyerLabel, useShop } from '../context/ShopContext';
import { money } from '../utils/format';
import { Sheet } from './Sheet';
import type { ShopSale } from '../types';

/**
 * At the counter: the buyer shows the purchase code (QR or six digits). The shop enters it with what was
 * paid; that confirms the sale, and for a customer a garage sent it also tells the garage.
 */
export const VerifyPurchaseSheet: React.FC<{ visible: boolean; sale?: ShopSale | null; onClose: () => void }> = ({ visible, sale, onClose }) => {
  const { sales, verifyPurchase } = useShop();
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [invoice, setInvoice] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setCode('');
    setInvoice('');
    setError(null);
    setAmount(sale ? String(sale.offer.total) : '');
  }, [visible, sale]);

  // With six digits typed, show whose code it is and what the part costs.
  const match = code.length === 6 ? sales.find((s) => s.purchase.code === code && s.purchase.fulfilment === 'pickup' && (s.stage === 'reserved' || s.stage === 'ready')) : undefined;
  useEffect(() => {
    if (match && !sale) setAmount(String(match.offer.total));
  }, [match, sale]);
  const target = sale ?? match;
  const referred = !!target?.purchase.jobRef;

  const confirm = () => {
    const res = verifyPurchase(code, Number(amount) || 0, invoice.trim() || undefined);
    if (res.ok) {
      onClose();
      return;
    }
    setError(res.error === 'code' ? 'කේතය නොගැළපේ — නැවත අසන්න.' : `නිර්දේශිත ගනුදෙනුකරුට ලැයිස්තුගත මිලට (${money(res.listed ?? 0)}) වඩා අය කළ නොහැක.`);
  };

  return (
    <Sheet
      visible={visible}
      title="මිලදී ගැනීමේ කේතය පරීක්ෂා කරන්න"
      subtitle={target ? `${buyerLabel(target.offer.request)} · ${target.offer.brief.name} ×${target.offer.qty}` : 'ගනුදෙනුකරුගේ කේතය ඇතුළත් කරන්න'}
      onClose={onClose}
      footer={<ActionButton label="තහවුරු කර මුදල් ලබා ගන්න" icon="✓" variant="success" disabled={code.length !== 6 || !(Number(amount) > 0)} onPress={confirm} />}
    >
      <Text style={styles.hint}>ගනුදෙනුකරුගේ දුරකථනයේ QR කේතය ස්කෑන් කරන්න, නැත්නම් ඔහු කියන ඉලක්කම් 6 ඇතුළත් කරන්න. කොටස පරීක්ෂා කිරීමට ඉඩ දී පසුව මුදල් ලබා ගන්න.</Text>
      <TextInput
        style={[styles.code, !!error && error.startsWith('කේතය') && styles.inputError]}
        value={code}
        onChangeText={(t) => {
          setCode(t.replace(/[^0-9]/g, '').slice(0, 6));
          setError(null);
        }}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="______"
        placeholderTextColor={Colors.textMuted}
        accessibilityLabel="Purchase code"
      />
      {!!sale && <Text style={styles.hint}>(අනුකරණය: නිවැරදි කේතය {sale.purchase.code})</Text>}
      {!!target && (
        <View style={styles.box}>
          <Text style={styles.title}>
            {target.offer.brief.name} ×{target.offer.qty} · {target.offer.partType}
          </Text>
          <Text style={styles.hint}>ලැයිස්තුගත මුළු මිල {money(target.offer.total)}</Text>
          {referred && <Text style={styles.referral}>🤝 {target.purchase.jobRef!.garage.name} ගරාජය නිර්දේශ කළ ගනුදෙනුවකි — මිල ලැයිස්තුගත මිලට වඩා වැඩි නොවිය යුතුයි.</Text>}
        </View>
      )}
      <Text style={styles.label}>ගෙවූ මුදල (රු.)</Text>
      <TextInput style={styles.input} value={amount} onChangeText={(t) => { setAmount(t.replace(/[^0-9]/g, '')); setError(null); }} keyboardType="number-pad" accessibilityLabel="Amount paid" />
      <Text style={styles.label}>බිල්පත් අංකය (විකල්ප)</Text>
      <TextInput style={styles.input} value={invoice} onChangeText={setInvoice} placeholder="උදා: INV-0412" placeholderTextColor={Colors.textMuted} autoCapitalize="characters" />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    hint: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    label: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, marginTop: 4 },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    error: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
    referral: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.primary, lineHeight: 17 },
    box: { padding: 12, borderRadius: 14, backgroundColor: softFill(), gap: 3 },
    code: { height: 52, paddingHorizontal: 14, borderRadius: 18, backgroundColor: softFill(), borderWidth: 1, borderColor: softEdge(), color: Colors.textMain, fontSize: 22, fontWeight: '800', letterSpacing: 6 },
    inputError: { borderColor: Colors.errorText },
    input: { backgroundColor: softFill(), borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, borderWidth: 1, borderColor: softEdge() },
  })
);
