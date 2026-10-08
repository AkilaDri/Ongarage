import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, FONTS, money, themedStyles, softEdge, softFill } from '@ongarage/shared';
import { useMart, type MartPurchase } from '../../context/MartContext';
import { Sheet } from '../Sheet';

const CHECKS = ['කොටස නිවැරදි වර්ගයයි (නම / කොටස් අංකය)', 'කොටස හොඳ තත්ත්වයේ ඇත — කැඩී, ගෑරී හෝ පරණ නැත', 'ප්‍රමාණය නිවැරදියි', 'මිල සහ වගකීම ඉල්ලූ ආකාරයටයි'];
const REASONS = ['වැරදි කොටසක්', 'හානියට පත්වී ඇත', 'විස්තරයට අනුව නැත', 'මිල වෙනස්', 'වෙනත් හේතුවක්'];

/**
 * At the counter (or the door): look the part over, then buy it or turn it down. Nothing is paid until the owner
 * accepts it; turning it down reopens the request so another shop's offer can be chosen.
 */
export const CounterSheet: React.FC<{ item: MartPurchase | null; onClose: () => void }> = ({ item, onClose }) => {
  const { buy, reject } = useMart();
  const [shown, setShown] = useState<MartPurchase | null>(item);
  const [checked, setChecked] = useState<boolean[]>(CHECKS.map(() => false));
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    if (!item) return;
    setShown(item);
    setChecked(CHECKS.map(() => false));
    setRejecting(false);
  }, [item]);

  if (!shown) return null;
  const p = shown;
  const delivered = p.purchase.fulfilment === 'delivery';
  const all = checked.every(Boolean);
  const v = p.brief.vehicle;

  const accept = () => {
    buy(p.purchase.id);
    onClose();
  };
  const turnDown = (reason: string) => {
    reject(p.purchase.id, reason);
    onClose();
  };

  return (
    <Sheet
      visible={!!item}
      title={delivered ? 'දොරකඩදී කොටස පරීක්ෂා කරන්න' : 'කවුන්ටරයේදී කොටස පරීක්ෂා කරන්න'}
      subtitle={`${p.offer.shop.name} · ${p.brief.name} ×${p.offer.qty}`}
      onClose={onClose}
      footer={
        rejecting ? (
          <ActionButton label="ආපසු" variant="ghost" onPress={() => setRejecting(false)} />
        ) : (
          <View style={styles.footer}>
            <View style={styles.flex1}>
              <ActionButton label="ප්‍රතික්ෂේප කරන්න" icon="✕" variant="ghost" compact onPress={() => setRejecting(true)} />
            </View>
            <View style={styles.flex2}>
              <ActionButton label={`මිලදී ගන්න · ${money(p.offer.total)}`} icon="✓" variant="success" compact disabled={!all} onPress={accept} />
            </View>
          </View>
        )
      }
    >
      <View style={styles.card}>
        <Text style={styles.title}>
          {p.brief.name} ×{p.offer.qty} · {p.offer.partType}
          {p.offer.brand ? ` · ${p.offer.brand}` : ''}
        </Text>
        {!!p.brief.partNo && <Text style={styles.sub}>ඔබ ඉල්ලූ කොටස් අංකය: {p.brief.partNo}</Text>}
        <Text style={styles.sub}>
          {v.name} · {v.plate}
          {v.chassisNo ? ` · Chassis ${v.chassisNo}` : ''}
          {v.engineNo ? ` · Engine ${v.engineNo}` : ''}
        </Text>
      </View>

      {rejecting ? (
        <>
          <Text style={styles.label}>ප්‍රතික්ෂේප කරන්නේ ඇයි?</Text>
          {REASONS.map((r) => (
            <Pressable key={r} style={styles.reason} onPress={() => turnDown(r)} accessibilityLabel={`Reject: ${r}`}>
              <Text style={styles.reasonText}>{r}</Text>
            </Pressable>
          ))}
          <Text style={styles.sub}>ඔබ ගෙවන්නේ නැත. ඉල්ලීම නැවත විවෘත වී, වෙනත් වෙළඳසැලක පිළිතුරක් තෝරා ගත හැක.</Text>
        </>
      ) : (
        <>
          <Text style={styles.label}>පරීක්ෂා කර ටික් කරන්න — සියල්ල නිවැරදි නම් පමණක් මිලදී ගන්න</Text>
          {CHECKS.map((c, i) => (
            <Pressable key={c} style={styles.checkRow} onPress={() => setChecked((prev) => prev.map((x, k) => (k === i ? !x : x)))} accessibilityRole="checkbox" accessibilityState={{ checked: checked[i] }}>
              <View style={[styles.check, checked[i] && styles.checkOn]}>{checked[i] && <Text style={styles.checkMark}>✓</Text>}</View>
              <Text style={[styles.sub, styles.flex1]}>{c}</Text>
            </Pressable>
          ))}
          <Text style={styles.sub}>මුදල {delivered ? 'දොරකඩදී' : 'කවුන්ටරයේදී'} වෙළඳසැලට ගෙවන්න{p.delivery?.fee ? ` (බෙදාහැරීම රු. ${p.delivery.fee.toLocaleString()} අමතරව)` : ''}. වෙළඳසැල ඔබගේ කේතය {p.purchase.code.slice(0, 3)} {p.purchase.code.slice(3)} පරීක්ෂා කර බිල්පතක් දෙයි.</Text>
        </>
      )}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    footer: { flexDirection: 'row', gap: 8 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 18, padding: 14, gap: 4 },
    title: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    label: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, marginTop: 4 },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    check: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: Colors.subtleBorder, alignItems: 'center', justifyContent: 'center' },
    checkOn: { backgroundColor: Colors.success, borderColor: Colors.success },
    checkMark: { fontSize: 14, fontWeight: '900', color: '#ffffff' },
    reason: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 16, backgroundColor: softFill() },
    reasonText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
  })
);
