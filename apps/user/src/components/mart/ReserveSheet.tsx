import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, DEFAULT_COMMISSION_PERCENT, FitmentBadge, fitmentLevel, FONTS, martShop, money, PriceTagChip, priceTag, ReferralBadge, referralDisclosure, themedStyles, softEdge, softFill, type JobPartsRef, type PartBrief, type ShopOffer } from '@ongarage/shared';
import { useMart } from '../../context/MartContext';
import { Sheet } from '../Sheet';

/** Reserve an offer: the shop holds the part; collect it from the counter, or have it delivered. Payment is at the counter or the door. */
export const ReserveSheet: React.FC<{ offer: ShopOffer | null; brief: PartBrief | null; jobRef?: JobPartsRef; onClose: () => void; onReserved: () => void }> = ({ offer, brief, jobRef, onClose, onReserved }) => {
  const { reserve } = useMart();
  const [shown, setShown] = useState<ShopOffer | null>(offer);
  const [how, setHow] = useState<'pickup' | 'delivery'>('pickup');

  useEffect(() => {
    if (!offer) return;
    setShown(offer);
    setHow('pickup');
  }, [offer]);

  if (!shown || !brief) return null;
  const o = shown;
  const del = how === 'delivery' ? o.delivery : undefined;
  const total = o.total + (del?.fee ?? 0);

  const confirm = () => {
    reserve(o.id, del ? 'delivery' : 'pickup');
    onReserved();
    onClose();
  };

  return (
    <Sheet
      visible={!!offer}
      title="කොටස වෙන් කර ගන්න"
      subtitle={`${o.shop.name} · ${brief.name} ×${o.qty}`}
      onClose={onClose}
      footer={<ActionButton label={`වෙන් කර ගන්න · ${money(total)}`} icon="🔒" variant="primary" onPress={confirm} />}
    >
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>
            {brief.name} ×{o.qty}
          </Text>
          <Text style={styles.price}>{money(o.total)}</Text>
        </View>
        <Text style={styles.sub}>
          {o.partType}
          {o.brand ? ` · ${o.brand}` : ''} · වගකීම {o.warrantyMonths ? `මාස ${o.warrantyMonths}` : 'නැත'}
        </Text>
        <View style={styles.chips}>
          <PriceTagChip tag={priceTag(brief.name, o.partType, o.unitPrice)} />
        </View>
        <FitmentBadge level={fitmentLevel(brief, o.fitmentConfirmed)} />
      </View>

      {!!jobRef && jobRef.recommendedShopIds.includes(o.shop.id) && (
        <View style={styles.disclosure}>
          <ReferralBadge garageName={jobRef.garage.name} />
          <Text style={styles.sub}>{referralDisclosure(jobRef.garage.name, martShop(o.shop.id)?.referralPercent ?? DEFAULT_COMMISSION_PERCENT)}</Text>
          <Text style={styles.sub}>වෙළඳසැලට ඔබෙන් ලැයිස්තුගත මිලට වඩා අය කළ නොහැක; ඔබට වෙනත් වෙළඳසැලකින් ද මිලදී ගත හැක.</Text>
        </View>
      )}

      <Text style={styles.label}>කොටස ලබා ගන්නේ කෙසේද?</Text>
      <Pressable style={[styles.option, how === 'pickup' && styles.optionOn]} onPress={() => setHow('pickup')} accessibilityLabel="Collect from the counter">
        <View style={[styles.radio, how === 'pickup' && styles.radioOn]}>{how === 'pickup' && <View style={styles.dot} />}</View>
        <View style={styles.flex1}>
          <Text style={styles.optionTitle}>🏪 කවුන්ටරයෙන් එකතු කරමි</Text>
          <Text style={styles.sub}>
            මිනිත්තු {o.readyInMin}කින් සූදානම් · පැය {o.holdHours} ක් තබා ගනී · පරීක්ෂා කර බලා කවුන්ටරයේදීම ගෙවන්න
          </Text>
        </View>
      </Pressable>
      {o.delivery && (
        <Pressable style={[styles.option, how === 'delivery' && styles.optionOn]} onPress={() => setHow('delivery')} accessibilityLabel="Deliver to me">
          <View style={[styles.radio, how === 'delivery' && styles.radioOn]}>{how === 'delivery' && <View style={styles.dot} />}</View>
          <View style={styles.flex1}>
            <Text style={styles.optionTitle}>{o.delivery.courier ? `🛵 ${o.delivery.courier} මගින් ගෙදරටම` : '🚚 වෙළඳසැලේ රියදුරා මගින්'}</Text>
            <Text style={styles.sub}>
              බෙදාහැරීම {o.delivery.fee ? money(o.delivery.fee) : 'නොමිලේ'} · මිනිත්තු {o.delivery.etaMin}ක් පමණ · දොරකඩදී පරීක්ෂා කර ගෙවන්න
            </Text>
          </View>
        </Pressable>
      )}

      <View style={styles.note}>
        <Text style={styles.sub}>• ගෙවීම යෙදුමෙන් කෙරෙන්නේ නැත — කවුන්ටරයේදී හෝ භාරදෙන විටදී.</Text>
        <Text style={styles.sub}>• කොටස පරීක්ෂා කර ගැළපෙන්නේ නැත්නම් ප්‍රතික්ෂේප කළ හැක — ඔබ ගෙවන්නේ නැත.</Text>
        <Text style={styles.sub}>• මිලදී ගත් පසු දින 7ක් ඇතුළත ආපසු දිය හැක.</Text>
      </View>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 18, padding: 14, gap: 8 },
    title: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    price: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.successText },
    sub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    label: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, marginTop: 4 },
    option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: softFill(), borderWidth: 1, borderColor: softEdge() },
    optionOn: { borderColor: Colors.primary },
    optionTitle: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.subtleBorder, alignItems: 'center', justifyContent: 'center' },
    radioOn: { borderColor: Colors.primary },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
    note: { gap: 4, padding: 12, borderRadius: 14, backgroundColor: softFill() },
    disclosure: { gap: 6, padding: 12, borderRadius: 14, backgroundColor: 'rgba(2, 132, 199, 0.08)' },
  })
);
