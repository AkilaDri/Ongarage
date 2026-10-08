import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton, ago, Colors, FONTS, martShop, money, themedStyles, softEdge, softFill } from '@ongarage/shared';
import { useParts } from '../context/PartsContext';
import { Sheet } from './Sheet';
import type { Booking } from '../types';

/**
 * Parts the customer buys themselves (through OnMart): which shops this garage recommended, whether the customer
 * has bought it yet, and the garage's own check of the part before it is fitted. Handover waits for the purchase.
 */
export const OwnerPartsSheet: React.FC<{ booking: Booking; visible: boolean; onClose: () => void }> = ({ booking, visible, onClose }) => {
  const { ownerParts, checkOwnerPart } = useParts();
  const items = ownerParts(booking);
  return (
    <Sheet visible={visible} title="පාරිභෝගිකයා මිලදී ගන්නා කොටස්" subtitle={`${booking.customer.name} · ${booking.vehicle.name} · ${booking.vehicle.plate}`} onClose={onClose}>
      <Text style={styles.sub}>මෙම කොටස් පාරිභෝගිකයා OnMart හි මිලදී ගනී. මිලදී ගත් බව වෙළඳසැල තහවුරු කළ පසු දැනුම් දෙනු ඇත; භාරදීම ඊට පසුවයි.</Text>
      {items.map(({ line, buy }) => (
        <View key={line.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.title} numberOfLines={1}>
              🔩 {line.name} ×{line.qty}
            </Text>
            <Text style={styles.price}>{money(line.price)}</Text>
          </View>
          <Text style={styles.sub}>
            {line.partType}
            {line.partNo ? ` · ${line.partNo}` : ''}
          </Text>
          <Text style={styles.sub}>
            නිර්දේශිත: {(line.recommendedShopIds ?? []).map((id) => martShop(id)?.name ?? id).join(', ') || 'නැත'}
          </Text>
          {buy ? (
            <>
              <View style={styles.bought}>
                <Text style={styles.boughtText}>
                  ✓ {buy.shopName} වෙතින් මිලදී ගත්තා · {money(buy.amount)} · {ago(Date.now() - buy.boughtAt)}
                </Text>
              </View>
              {buy.checked ? (
                <Text style={styles.ok}>🔧 කොටස පරීක්ෂා කළා — සවි කිරීමට සූදානම්</Text>
              ) : (
                <ActionButton label="කොටස පරීක්ෂා කළා (අංකය, තත්ත්වය)" icon="🔍" variant="success" compact onPress={() => checkOwnerPart(booking.id, line.id)} />
              )}
            </>
          ) : (
            <Text style={styles.wait}>⏳ පාරිභෝගිකයා තවම මිලදී ගෙන නැත — භාරදීමට බාධාවක්</Text>
          )}
        </View>
      ))}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 18, padding: 14, gap: 8 },
    title: { flex: 1, fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    price: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMuted },
    sub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    bought: { padding: 10, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    boughtText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.successText, lineHeight: 17 },
    ok: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.successText },
    wait: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, padding: 10, borderRadius: 12, backgroundColor: softFill() },
  })
);
