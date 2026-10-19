import { elevation1, outline } from '../../utils/material';
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { TxnTag } from '../TxnTag';
import { openFittingJob } from '../../utils/fittingBridge';
import { ActionButton, ago, getThemeMode, ChatIconButton, Colors, countdown, directionsUrl, EmptyState, FONTS, formatDate, martShop, money, PurchaseCode, purchaseGroupProgress, themedStyles, softEdge, softFill, softShadow } from '@ongarage/shared';
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
  // The order whose full record is open.
  const [open, setOpen] = useState<string | null>(null);

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
      <Pressable key={p.purchase.id} style={[styles.card, failed && styles.dim]} onPress={() => setOpen(p.purchase.id)} accessibilityLabel={`Order ${p.brief.name}`}>
        {/* The chat button sits in the very top right corner of the card: it opens the shop's conversation. */}
        <View style={styles.chatCorner}>
          <ChatIconButton size={40} onPress={() => setThread({ enquiryId: p.purchase.enquiryId ?? o.enquiryId, shop: o.shop })} label={`Chat with ${o.shop.name}`} />
        </View>
        <View style={styles.headRow}>
          <Text style={styles.title} numberOfLines={1}>
            {p.brief.name} ×{o.qty}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.rowBetween}>
          <View style={styles.flex1}>
            <Text style={styles.sub} numberOfLines={1}>
              {o.shop.name}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {o.partType} · {ago(now - p.createdAt)}
            </Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.price}>{o.total ? money(o.total) : 'මිල කවුන්ටරයේදී'}</Text>
            <View style={[styles.chip, failed ? styles.chipFail : p.stage === 'bought' ? styles.chipDone : styles.chipLive]}>
              <Text style={[styles.chipText, { color: failed ? Colors.errorText : p.stage === 'bought' ? Colors.success : Colors.warning }]}>
                {failed ? { rejected: '✕ ප්‍රතික්ෂේප', released: '✕ අවසන්', returned: '↩ ආපසු දුන්නා' }[p.stage as 'rejected' | 'released' | 'returned'] : p.stage === 'bought' ? '✓ මිලදී ගත්තා' : '● ' + (steps[Math.max(0, step)]?.label ?? '')}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.divider} />

        <View style={styles.rowBetween}>
          <Text style={[styles.sub, styles.flex1]} numberOfLines={1}>
            {p.stage === 'ready' || p.stage === 'arrived' ? '🔍 කොටස පරීක්ෂා කිරීමට සූදානම්' : p.stage === 'bought' && p.warrantyUntil ? `🛡️ වගකීම ${formatDate(p.warrantyUntil)} දක්වා` : 'සියලු විස්තර සහ වාර්තාව'}
          </Text>
          <Text style={styles.link}>විස්තර ›</Text>
        </View>
        {p.stage === 'bought' && (
          <>
            <View style={styles.divider} />
            <Pressable style={styles.fitRow} onPress={() => openFittingJob(p.brief.name)} accessibilityLabel="Find a garage to fit the part">
              <Text style={styles.fitText}>🔩 සවි කිරීමට ගරාජයක් සොයන්න</Text>
              <Text style={styles.fitText}>›</Text>
            </Pressable>
          </>
        )}
      </Pressable>
    );
  };

  // The full record of one order: where it stands, the code to show at the counter, calls and directions, the warranty, rating and return.
  const detailBody = (p: MartPurchase) => {
    const o = p.offer;
    const del = p.purchase.fulfilment === 'delivery';
    const steps = del ? DELIVERY_STEPS : PICKUP_STEPS;
    const step = steps.findIndex((x) => x.id === p.stage);
    const active = ACTIVE_STAGES.includes(p.stage);
    const left = p.purchase.reservedUntil - now;
    const shop = martShop(o.shop.id);
    const failed = p.stage === 'rejected' || p.stage === 'released' || p.stage === 'returned';
    const canReturn = p.stage === 'bought' && (p.purchase.returnBy ?? 0) > now;
    return (
      <>
        <View style={styles.record}>
          <Text style={styles.sub}>වෙළඳසැල: {o.shop.name}</Text>
          <Text style={styles.sub}>
            {o.partType} · ×{o.qty} · {o.total ? money(o.total) : 'මිල කවුන්ටරයේදී'}
          </Text>
          <Text style={styles.sub}>ඇණවුම් කළේ {ago(now - p.createdAt)} · {del ? 'බෙදාහැරීම' : 'කවුන්ටරයෙන් ගැනීම'}</Text>
          <TxnTag kind="ORD" source={p.purchase.id} />
        </View>
        {!failed && (
          <View style={styles.steps}>
            {steps.map((x, i) => (
              <View key={x.id} style={styles.step}>
                <View style={[styles.dot, i <= step && styles.dotDone]} />
                <Text style={[styles.stepText, i <= step && { color: Colors.textMain }]}>{x.label}</Text>
              </View>
            ))}
          </View>
        )}
        {!!p.purchase.jobRef && (
          <Text style={styles.ref}>🤝 {p.purchase.jobRef.garage.name} නිර්දේශ කළා — ඔබ මිලදී ගත් විට ගරාජයට දැනුම් දෙයි</Text>
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
            <ActionButton label="සවි කිරීමට ගරාජයක් සොයන්න" icon="🔩" variant="ghost" compact onPress={() => openFittingJob(p.brief.name)} />
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
      </>
    );
  };

  return (
    <>
      {compact && <Text style={styles.heading}>OnMart කොටස් ඇණවුම්</Text>}
      {purchases.map(card)}
      <Sheet visible={!!open} title={purchases.find((x) => x.purchase.id === open)?.brief.name ?? ''} subtitle={purchases.find((x) => x.purchase.id === open)?.offer.shop.name} onClose={() => setOpen(null)}>
        {(() => {
          const cur = purchases.find((x) => x.purchase.id === open);
          return cur ? detailBody(cur) : null;
        })()}
      </Sheet>
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
    heading: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary, letterSpacing: 0.2, marginTop: 10 },
    // The same modern card as OnMart's "My requests": big round corners, no hard outline, a soft wide shadow.
    card: { backgroundColor: Colors.bgCard, borderWidth: getThemeMode() === 'dark' ? 1 : 0, borderColor: Colors.borderColor, borderRadius: 24, padding: 16, gap: 12, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 3 },
    dim: { opacity: 0.6 },
    title: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    chatCorner: { position: 'absolute', top: 6, right: 8, zIndex: 2 },
    price: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.successText },
    fitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: softFill() },
    fitText: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.primary },
    link: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.primary },
    record: { padding: 12, borderRadius: 14, backgroundColor: softFill(), gap: 3 },
    steps: { flexDirection: 'row', justifyContent: 'space-between' },
    step: { alignItems: 'center', gap: 4, flex: 1 },
    dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.subtleBorder },
    dotDone: { backgroundColor: Colors.success },
    stepText: { fontSize: 9.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, textAlign: 'center' },
    headRow: { minHeight: 40, justifyContent: 'center', paddingRight: 56 },
    divider: { height: 1, backgroundColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0' },
    right: { alignItems: 'flex-end', gap: 5 },
    chip: { paddingHorizontal: 10, height: 24, justifyContent: 'center', borderRadius: 12, borderWidth: 1 },
    chipLive: { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)' },
    chipDone: { backgroundColor: 'rgba(16, 185, 129, 0.16)', borderColor: 'rgba(16, 185, 129, 0.35)' },
    chipFail: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' },
    chipText: { fontSize: 11, fontFamily: FONTS.bodySemiBold },
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
