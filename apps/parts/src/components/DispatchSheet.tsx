import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, FONTS, themedStyles, softEdge, softShadow } from '@ongarage/shared';
import { useShop } from '../context/ShopContext';
import { COURIER } from '../constants/mockData';
import { money } from '../utils/format';
import { Sheet } from './Sheet';
import type { ShopOrder } from '../types';

/**
 * Send a packed order: book a courier (the delivery fee the garage paid goes to the
 * courier) or give it to one of the shop's own riders. Defaults to what was quoted.
 */
export const DispatchSheet: React.FC<{ order: ShopOrder | null; onClose: () => void }> = ({ order, onClose }) => {
  const { profile, dispatchOrder } = useShop();
  const [shown, setShown] = useState<ShopOrder | null>(order);
  const [method, setMethod] = useState<'courier' | 'shop'>('courier');
  const [staffId, setStaffId] = useState(profile.staff[0]?.id);

  useEffect(() => {
    if (!order) return;
    setShown(order);
    setMethod(order.quote.delivery);
    setStaffId(profile.staff[0]?.id);
  }, [order, profile.staff]);

  if (!shown) return null;
  const q = shown.quote;
  const r = q.request;
  const changed = method !== q.delivery;

  return (
    <Sheet
      visible={!!order}
      title="බෙදාහැරීමට යවන්න"
      subtitle={`${r.garage.name} · කි.මී. ${r.distanceKm} · ${r.garage.address}`}
      onClose={onClose}
      footer={
        <ActionButton
          label={method === 'courier' ? `${COURIER} වෙන් කරන්න` : 'රියදුරුට භාර දෙන්න'}
          icon="🛵"
          variant="success"
          disabled={method === 'shop' && !staffId}
          onPress={() => {
            dispatchOrder(shown.id, method, staffId);
            onClose();
          }}
        />
      }
    >
      <View style={styles.card}>
        {r.lines.map((l, i) => (
          <View key={l.id} style={styles.row}>
            <Text style={styles.sub}>
              ☐ {l.name} ×{l.qty} · {q.partType}
            </Text>
            <Text style={styles.sub}>{money(q.unitPrices[i] * l.qty)}</Text>
          </View>
        ))}
        <Text style={styles.hint}>ඇසුරුම් කිරීමට පෙර කොටස් අංකය සහ වර්ගය ({q.partType}) නැවත පරීක්ෂා කරන්න — වැරදි කොටස් ආපසු එවනු ලැබේ.</Text>
      </View>

      <Text style={styles.label}>බෙදාහරින්නේ</Text>
      {profile.courierEnabled && (
        <Option active={method === 'courier'} onPress={() => setMethod('courier')} title={`🛵 ${COURIER}`} sub={`රියදුරෙකු සොයා ගනී · ගාස්තුව රු. ${q.delivery === 'courier' ? q.deliveryFee.toLocaleString() : '—'} කුරියර් වෙත`} />
      )}
      {profile.ownDelivery &&
        profile.staff.map((s) => (
          <Option
            key={s.id}
            active={method === 'shop' && staffId === s.id}
            onPress={() => {
              setMethod('shop');
              setStaffId(s.id);
            }}
            title={`🚚 ${s.name}`}
            sub={`අපගේ රියදුරු · ${s.phone}`}
          />
        ))}
      {changed && <Text style={styles.warn}>ඔබ මිල ගණනේ සඳහන් කළේ {q.delivery === 'courier' ? COURIER : 'ඔබගේම බෙදාහැරීම'} — ගරාජය ගෙවූ බෙදාහැරීමේ ගාස්තුව වෙනස් නොවේ.</Text>}
    </Sheet>
  );
};

const Option: React.FC<{ active: boolean; onPress: () => void; title: string; sub: string }> = ({ active, onPress, title, sub }) => (
  <Pressable style={[styles.option, active && styles.optionOn]} onPress={onPress}>
    <View style={[styles.radio, active && styles.radioOn]} />
    <View style={styles.flex1}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{sub}</Text>
    </View>
  </Pressable>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    card: { padding: 12, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), gap: 6, ...softShadow() },
    label: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 6 },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16, marginTop: 4 },
    warn: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 16 },
    option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: softEdge(), backgroundColor: Colors.bgCard, ...softShadow() },
    optionOn: { borderColor: Colors.primary, backgroundColor: 'rgba(56, 189, 248, 0.08)' },
    radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.subtleBorder },
    radioOn: { borderColor: Colors.primary, borderWidth: 6 },
  })
);
