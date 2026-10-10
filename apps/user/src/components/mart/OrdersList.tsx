import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { TxnTag } from '../TxnTag';
import { ActionButton, ago, Colors, countdown, directionsUrl, EmptyState, FONTS, formatDate, martShop, money, PurchaseCode, themedStyles, softEdge, softFill, softShadow } from '@ongarage/shared';
import { ACTIVE_STAGES, useMart, type MartPurchase, type PurchaseStage } from '../../context/MartContext';
import { useUserLocation } from '../../context/LocationContext';
import { CounterSheet } from './CounterSheet';
import { ThreadSheet, type ThreadTarget } from './ThreadSheet';
import { Sheet } from '../Sheet';

const PICKUP_STEPS: { id: PurchaseStage; label: string }[] = [
  { id: 'reserved', label: 'වෙන් කළා' },
  { id: 'ready', label: 'කවුන්ටරයේ සූදානම්' },
  { id: 'bought', label: 'මිලදී ගත්තා' },
];
const DELIVERY_STEPS: { id: PurchaseStage; label: string }[] = [
  { id: 'reserved', label: 'වෙන් කළා' },
  { id: 'dispatched', label: 'මගදී' },
  { id: 'arrived', label: 'දොරකඩ' },
  { id: 'bought', label: 'මිලදී ගත්තා' },
];
const RETURN_REASONS = ['වැරදි කොටසක්', 'සවි කළ විට නොගැළපේ', 'දෝෂ සහිතයි', 'තවදුරටත් අවශ්‍ය නැත'];

/** The owner's OnMart orders: reserved parts (with the purchase code to show at the counter), deliveries, and what was bought. */
export const OrdersList: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { purchases, cancelReservation, returnPart, rate } = useMart();
  const { coords } = useUserLocation();
  const [inspect, setInspect] = useState<MartPurchase | null>(null);
  const [thread, setThread] = useState<ThreadTarget | null>(null);
  const [returning, setReturning] = useState<MartPurchase | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (purchases.length === 0) {
    return compact ? null : <EmptyState icon="🛍️" title="OnMart ඇණවුම් නැත" text="වෙළඳසැලක පිළිතුරක් “වෙන් කර ගන්න” ඔබන විට ඇණවුම මෙහි පෙන්වයි." />;
  }

  const card = (p: MartPurchase) => {
    const o = p.offer;
    const del = p.purchase.fulfilment === 'delivery';
    const steps = del ? DELIVERY_STEPS : PICKUP_STEPS;
    const step = steps.findIndex((s) => s.id === p.stage);
    const active = ACTIVE_STAGES.includes(p.stage);
    const left = p.purchase.reservedUntil - now;
    const shop = martShop(o.shop.id);
    const failed = p.stage === 'rejected' || p.stage === 'released' || p.stage === 'returned';
    const canReturn = p.stage === 'bought' && (p.purchase.returnBy ?? 0) > now;

    return (
      <View key={p.purchase.id} style={[styles.card, failed && styles.dim]}>
        <View style={styles.rowBetween}>
          <View style={styles.flex1}>
            <Text style={styles.title} numberOfLines={1}>
              {p.brief.name} ×{o.qty}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {o.shop.name} · {o.partType} · {ago(now - p.createdAt)}
            </Text>
            <TxnTag kind="ORD" source={p.purchase.id} />
          </View>
          <Text style={styles.price}>{money(o.total)}</Text>
        </View>

        {!!p.purchase.jobRef && (
          <Text style={styles.ref}>🤝 {p.purchase.jobRef.garage.name} නිර්දේශ කළා — ඔබ මිලදී ගත් විට ගරාජයට දැනුම් දෙයි</Text>
        )}

        {!failed && (
          <View style={styles.steps}>
            {steps.map((s, i) => (
              <View key={s.id} style={styles.step}>
                <View style={[styles.dot, i <= step && styles.dotDone]} />
                <Text style={[styles.stepText, i <= step && { color: Colors.textMain }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {(p.stage === 'reserved' || p.stage === 'ready') && !del && (
          <>
            <Text style={[styles.hold, left <= 0 && { color: Colors.errorText }]}>{left > 0 ? `🔒 ${countdown(left)} ඉතිරියි — කවුන්ටරයේ තබා ගනී` : '⌛ තබා ගන්නා කාලය ඉකුත් විය — වෙළඳසැල හා සම්බන්ධ වන්න'}</Text>
            <PurchaseCode code={p.purchase.code} size={150} />
            <View style={styles.actions}>
              <Pressable style={styles.action} onPress={() => Linking.openURL(`tel:${o.shop.phone.replace(/\s/g, '')}`)} accessibilityLabel="Call shop">
                <Text style={styles.actionText}>📞 අමතන්න</Text>
              </Pressable>
              {!!shop && (
                <Pressable style={styles.action} onPress={() => Linking.openURL(directionsUrl(shop.coords, coords))} accessibilityLabel="Directions to shop">
                  <Text style={styles.actionText}>🧭 මාර්ගය</Text>
                </Pressable>
              )}
              <Pressable style={styles.action} onPress={() => setThread({ enquiryId: p.purchase.enquiryId ?? o.enquiryId, shop: o.shop })} accessibilityLabel="Message shop">
                <Text style={styles.actionText}>💬 පණිවිඩය</Text>
              </Pressable>
            </View>
            {p.stage === 'ready' ? (
              <ActionButton label="කවුන්ටරයේ ඇත — කොටස පරීක්ෂා කරන්න" icon="🔍" variant="success" compact onPress={() => setInspect(p)} />
            ) : (
              <Text style={styles.sub}>⏳ වෙළඳසැල කොටස ඇසුරුම් කරමින් — සූදානම් වූ විට දැනුම් දෙයි.</Text>
            )}
            <Pressable onPress={() => cancelReservation(p.purchase.id)} hitSlop={6} accessibilityLabel="Cancel reservation">
              <Text style={styles.cancel}>වෙන් කිරීම අවලංගු කරන්න</Text>
            </Pressable>
          </>
        )}

        {p.stage === 'dispatched' && p.delivery && (
          <View style={styles.rowBetween}>
            <Text style={[styles.sub, styles.flex1]}>
              🛵 {p.delivery.rider.name} · {p.delivery.courier ?? 'වෙළඳසැලේ රියදුරු'} · මිනි. {Math.max(0, Math.round((p.delivery.etaAt - now) / 60000))}කින්
            </Text>
            <Pressable style={styles.action} onPress={() => Linking.openURL(`tel:${p.delivery!.rider.phone}`)}>
              <Text style={styles.actionText}>📞 රියදුරු</Text>
            </Pressable>
          </View>
        )}
        {p.stage === 'arrived' && (
          <>
            <Text style={styles.hold}>🚪 රියදුරු දොරකඩ — කොටස පරීක්ෂා කර ගෙවන්න{p.delivery?.fee ? ` (බෙදාහැරීම රු. ${p.delivery.fee.toLocaleString()})` : ''}</Text>
            <ActionButton label="කොටස පරීක්ෂා කරන්න" icon="🔍" variant="success" compact onPress={() => setInspect(p)} />
          </>
        )}

        {p.stage === 'bought' && (
          <>
            <View style={styles.warranty}>
              <Text style={styles.warrantyTitle}>🛡️ {p.warrantyUntil ? `වගකීම ${formatDate(p.warrantyUntil)} දක්වා` : 'වගකීමක් නැත'}</Text>
              <Text style={styles.sub}>
                බිල්පත {p.purchase.invoiceNo} · මිලදී ගත්තේ {formatDate(p.purchase.boughtAt!)}
                {canReturn ? ` · ආපසු දීමට ${formatDate(p.purchase.returnBy!)} දක්වා` : ''}
              </Text>
            </View>
            {p.rating ? (
              <Text style={styles.stars}>
                ඔබගේ ශ්‍රේණිය: {'★'.repeat(p.rating.stars)}
                {'☆'.repeat(5 - p.rating.stars)}
              </Text>
            ) : (
              <View style={styles.rateRow}>
                <Text style={styles.sub}>වෙළඳසැලට ශ්‍රේණි දෙන්න:</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => rate(p.purchase.id, n)} hitSlop={4} accessibilityLabel={`Rate ${n} stars`}>
                      <Text style={styles.star}>☆</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            {canReturn && (
              <Pressable onPress={() => setReturning(p)} hitSlop={6} accessibilityLabel="Return the part">
                <Text style={styles.cancel}>කොටස ආපසු දෙන්න</Text>
              </Pressable>
            )}
          </>
        )}

        {p.stage === 'rejected' && <Text style={styles.fail}>↩️ ප්‍රතික්ෂේප කළා — {p.purchase.rejectedReason}. ඔබ ගෙවූයේ නැත.</Text>}
        {p.stage === 'released' && <Text style={styles.fail}>🔓 වෙන් කිරීම අවසන් විය</Text>}
        {p.stage === 'returned' && <Text style={styles.fail}>↩️ ආපසු දුන්නා — {p.returnReason}</Text>}
        {active && p.stage === 'dispatched' && <Text style={styles.sub}>දොරකඩදී කොටස පරීක්ෂා කර ගෙවන්න.</Text>}
      </View>
    );
  };

  return (
    <>
      {compact && <Text style={styles.heading}>OnMart කොටස් ඇණවුම්</Text>}
      {purchases.map(card)}
      <CounterSheet item={inspect} onClose={() => setInspect(null)} />
      <ThreadSheet target={thread} onClose={() => setThread(null)} />
      <Sheet visible={!!returning} title="කොටස ආපසු දෙන්න" subtitle={returning ? `${returning.offer.shop.name} · ${returning.brief.name}` : undefined} onClose={() => setReturning(null)}>
        <Text style={styles.sub}>වෙළඳසැල කොටස පරීක්ෂා කර මුදල ආපසු දෙයි. කොටස සවි කර ඇත්නම් ගරාජය සමඟ සාකච්ඡා කරන්න.</Text>
        {RETURN_REASONS.map((r) => (
          <Pressable
            key={r}
            style={styles.reason}
            onPress={() => {
              if (returning) returnPart(returning.purchase.id, r);
              setReturning(null);
            }}
            accessibilityLabel={`Return: ${r}`}
          >
            <Text style={styles.reasonText}>{r}</Text>
          </Pressable>
        ))}
      </Sheet>
    </>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    heading: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 8 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 20, padding: 14, gap: 10, ...softShadow() },
    dim: { opacity: 0.6 },
    title: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    price: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.successText },
    steps: { flexDirection: 'row', justifyContent: 'space-between' },
    step: { alignItems: 'center', gap: 4, flex: 1 },
    dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.subtleBorder },
    dotDone: { backgroundColor: Colors.success },
    stepText: { fontSize: 9.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, textAlign: 'center' },
    ref: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.primary, lineHeight: 17 },
    hold: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 17 },
    actions: { flexDirection: 'row', gap: 8 },
    action: { flex: 1, alignItems: 'center', paddingVertical: 9, paddingHorizontal: 8, borderRadius: 14, backgroundColor: softFill() },
    actionText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    cancel: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.errorText, textAlign: 'center' },
    fail: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.errorText, lineHeight: 17 },
    warranty: { padding: 12, borderRadius: 14, backgroundColor: 'rgba(16, 185, 129, 0.1)', gap: 3 },
    warrantyTitle: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.successText },
    stars: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.warning },
    rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    starRow: { flexDirection: 'row', gap: 6 },
    star: { fontSize: 22, color: Colors.warning },
    reason: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 16, backgroundColor: softFill() },
    reasonText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
  })
);
