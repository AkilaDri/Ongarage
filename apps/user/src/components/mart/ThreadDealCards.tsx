import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, formatDate, getThemeMode, money, PurchaseCode, themedStyles } from '@ongarage/shared';
import { OnMartAsk } from '@ongarage/shared';
import { useMart, type MartPurchase, type PurchaseStage } from '../../context/MartContext';
import { CounterSheet } from './CounterSheet';
import { Sheet } from '../Sheet';
import { elevation1, outline } from '../../utils/material';

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

/**
 * What the OnMart chat with one shop can do about the part, right under the conversation, like the job chat's cards: the shop's offer with "reserve" (collect it, or have it
 * delivered); then the purchase step by step (reserved, ready at the counter or on its way, the purchase code, inspecting the part and buying or turning it down at the counter or
 * the door), and afterwards the warranty, the shop's rating, and returning the part. The same actions as the Orders list, without leaving the chat.
 */
export const ThreadDealCards: React.FC<{ enquiryId: string; shopId: string }> = ({ enquiryId, shopId }) => {
  const { enquiries, offersFor, purchases, reserve, askShops, cancelReservation, returnPart, rate } = useMart();
  const [inspect, setInspect] = useState<MartPurchase | null>(null);
  const [returning, setReturning] = useState<MartPurchase | null>(null);
  const enquiry = enquiries.find((m) => m.enquiry.id === enquiryId);
  const offers = offersFor(enquiryId).filter((o) => o.shop.id === shopId && o.available && o.reply !== 'none' && o.reply !== 'check');
  const answer = offersFor(enquiryId).find((o) => o.shop.id === shopId);
  const asked = !!enquiry?.askedShopIds.includes(shopId) || !!answer;
  const mine = purchases.filter((p) => p.purchase.enquiryId === enquiryId && p.offer.shop.id === shopId);
  const live = mine.filter((p) => p.stage !== 'rejected' && p.stage !== 'released' && p.stage !== 'returned');
  // Another shop's purchase of the same part: this chat has nothing to offer.
  const elsewhere = purchases.some((p) => p.purchase.enquiryId === enquiryId && p.offer.shop.id !== shopId && p.stage !== 'rejected' && p.stage !== 'released' && p.stage !== 'returned');
  const canReserve = !!enquiry && enquiry.enquiry.status === 'open' && !elsewhere && live.length === 0;

  const purchaseCard = (p: MartPurchase) => {
    const o = p.offer;
    const del = p.purchase.fulfilment === 'delivery';
    const steps = del ? DELIVERY_STEPS : PICKUP_STEPS;
    const step = steps.findIndex((s) => s.id === p.stage);
    const failed = p.stage === 'rejected' || p.stage === 'released' || p.stage === 'returned';
    const canReturn = p.stage === 'bought' && (p.purchase.returnBy ?? 0) > Date.now();
    return (
      <View key={p.purchase.id} style={styles.card} accessibilityLabel="Part purchase">
        <Text style={styles.head}>🛍️ {p.brief.name} ×{o.qty} · {o.total ? money(o.total) : 'මිල කවුන්ටරයේදී'}</Text>
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
            <Text style={styles.text}>🔒 වෙළඳසැල පැය {o.holdHours} ක් කවුන්ටරයේ තබා ගනී — කොටස පරීක්ෂා කර කවුන්ටරයේදීම ගෙවන්න. ඔබගේ කේතය පෙන්වන්න:</Text>
            <PurchaseCode code={p.purchase.code} size={130} />
            {p.stage === 'ready' ? (
              <Pressable style={[styles.btn, styles.yes]} onPress={() => setInspect(p)} accessibilityLabel="Inspect the part">
                <Text style={styles.yesText}>🔍 කවුන්ටරයේ ඇත — කොටස පරීක්ෂා කරන්න</Text>
              </Pressable>
            ) : (
              <Text style={styles.text}>⏳ වෙළඳසැල කොටස ඇසුරුම් කරමින් — සූදානම් වූ විට මෙහි දැනුම් දෙයි.</Text>
            )}
            <View style={styles.buttons}>
              <Pressable style={[styles.btn, styles.part]} onPress={() => Linking.openURL(`tel:${o.shop.phone.replace(/\s/g, '')}`)} accessibilityLabel="Call shop">
                <Text style={styles.partText}>📞 අමතන්න</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.no]} onPress={() => cancelReservation(p.purchase.id)} accessibilityLabel="Cancel reservation">
                <Text style={styles.noText}>වෙන් කිරීම අවලංගු</Text>
              </Pressable>
            </View>
          </>
        )}
        {p.stage === 'reserved' && del && <Text style={styles.text}>⏳ වෙළඳසැල කොටස ඇසුරුම් කර පිටත් කරමින් — පිටත් වූ විට මෙහි දැනුම් දෙයි.</Text>}

        {p.stage === 'dispatched' && p.delivery && (
          <>
            <Text style={styles.text}>🛵 {p.delivery.rider.name} · {p.delivery.courier ?? 'වෙළඳසැලේ රියදුරු'} · මිනි. {Math.max(0, Math.round((p.delivery.etaAt - Date.now()) / 60000))}කින් — දොරකඩදී කොටස පරීක්ෂා කර ගෙවන්න.</Text>
            <Pressable style={[styles.btn, styles.part]} onPress={() => Linking.openURL(`tel:${p.delivery!.rider.phone}`)} accessibilityLabel="Call the rider">
              <Text style={styles.partText}>📞 රියදුරු අමතන්න</Text>
            </Pressable>
          </>
        )}
        {p.stage === 'arrived' && (
          <>
            <Text style={styles.text}>🚪 රියදුරු දොරකඩ — කොටස පරීක්ෂා කර ගෙවන්න{p.delivery?.fee ? ` (බෙදාහැරීම රු. ${p.delivery.fee.toLocaleString()})` : ''}.</Text>
            <Pressable style={[styles.btn, styles.yes]} onPress={() => setInspect(p)} accessibilityLabel="Inspect the part">
              <Text style={styles.yesText}>🔍 කොටස පරීක්ෂා කරන්න</Text>
            </Pressable>
          </>
        )}

        {p.stage === 'bought' && (
          <>
            <Text style={styles.text}>
              ✅ මිලදී ගත්තා · බිල්පත {p.purchase.invoiceNo} · {formatDate(p.purchase.boughtAt!)}
              {'\n'}🛡️ {p.warrantyUntil ? `වගකීම ${formatDate(p.warrantyUntil)} දක්වා` : 'වගකීමක් නැත'}
              {canReturn ? ` · ආපසු දීමට ${formatDate(p.purchase.returnBy!)} දක්වා` : ''}
            </Text>
            {p.rating ? (
              <Text style={styles.text}>ඔබගේ ශ්‍රේණිය: {'★'.repeat(p.rating.stars)}{'☆'.repeat(5 - p.rating.stars)}</Text>
            ) : (
              <View style={styles.stars}>
                <Text style={styles.text}>වෙළඳසැලට ශ්‍රේණි දෙන්න:</Text>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => rate(p.purchase.id, n)} hitSlop={4} accessibilityLabel={`Rate ${n} stars`}>
                    <Text style={styles.star}>☆</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {canReturn && (
              <Pressable style={[styles.btn, styles.no]} onPress={() => setReturning(p)} accessibilityLabel="Return the part">
                <Text style={styles.noText}>↩️ කොටස ආපසු දෙන්න</Text>
              </Pressable>
            )}
          </>
        )}

        {p.stage === 'rejected' && <Text style={styles.fail}>↩️ ප්‍රතික්ෂේප කළා — {p.purchase.rejectedReason}. ඔබ ගෙවූයේ නැත.</Text>}
        {p.stage === 'released' && <Text style={styles.fail}>🔓 වෙන් කිරීම අවසන් විය</Text>}
        {p.stage === 'returned' && <Text style={styles.fail}>↩️ ආපසු දුන්නා — {p.returnReason}</Text>}
      </View>
    );
  };

  if (!enquiry) return null;
  const part = enquiry.enquiry.briefs.map((b) => `${b.name}${b.qty > 1 ? ` ×${b.qty}` : ''}`).join(', ');
  // The first step of the deal: the part asked of this shop, and what it has said so far (nothing yet, has it, has none, will check).
  const requestCard = canReserve && !offers.length && (
    <View style={styles.card} accessibilityLabel="Part request">
      <Text style={styles.head}>📨 ඉල්ලූ කොටස — {part}</Text>
      <Text style={styles.text}>
        {!asked
          ? 'මෙම වෙළඳසැලෙන් තවම අසා නැත.'
          : answer?.reply === 'none'
            ? '✖ මෙම වෙළඳසැලේ මේ කොටස නැත. වෙනත් වෙළඳසැලකින් අසන්න.'
            : answer?.reply === 'check'
              ? '🔎 වෙළඳසැල පරීක්ෂා කරමින් — පිළිතුරු දෙන විට මෙහි දැනුම් දෙයි.'
              : '⏳ ඉල්ලීම යැව්වා — වෙළඳසැල පිළිතුරු දෙන තෙක් බලා සිටී. එන තෙක් පහත ප්‍රශ්න අසන්නත් පුළුවන්.'}
      </Text>
      {!asked && (
        <Pressable style={[styles.btn, styles.part]} onPress={() => askShops(enquiryId, [shopId])} accessibilityLabel="Ask this shop">
          <OnMartAsk label="මෙම වෙළඳසැලෙන් අසන්න" textStyle={styles.partText} />
        </Pressable>
      )}
    </View>
  );
  return (
    <View style={styles.wrap}>
      {requestCard}
      {canReserve &&
        offers.map((o) => (
          <View key={o.id} style={styles.card} accessibilityLabel="Shop offer">
            <Text style={styles.head}>💬 වෙළඳසැලේ පිළිතුර — {enquiry?.enquiry.briefs.find((b) => b.id === o.briefId)?.name ?? ''}</Text>
            <Text style={styles.text}>
              {o.partType}{o.brand ? ` · ${o.brand}` : ''} ×{o.qty} · {o.total ? money(o.total) : 'මිල කවුන්ටරයේදී'}
              {'\n'}{o.fitmentConfirmed ? '✓ ඔබගේ වාහනයට ගැළපෙන බව පරීක්ෂා කළා' : 'ගැළපීම කවුන්ටරයේදී පරීක්ෂා කරන්න'}
              {o.warrantyMonths ? ` · 🛡️ මාස ${o.warrantyMonths} වගකීම` : ''}
              {'\n'}මිනිත්තු {o.readyInMin}කින් සූදානම් · පැය {o.holdHours} ක් තබා ගනී
              {o.note ? `\n“${o.note}”` : ''}
            </Text>
            <View style={styles.buttons}>
              <Pressable style={[styles.btn, styles.yes]} onPress={() => reserve(o.id, 'pickup')} accessibilityLabel="Reserve to collect">
                <Text style={styles.yesText}>🔒 වෙන් කරන්න</Text>
              </Pressable>
              {!!o.delivery && (
                <Pressable style={[styles.btn, styles.part]} onPress={() => reserve(o.id, 'delivery')} accessibilityLabel="Reserve with delivery">
                  <Text style={styles.partText}>🛵 ගෙදරටම · රු. {o.delivery.fee.toLocaleString()}</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      {mine.map(purchaseCard)}
      <CounterSheet item={inspect} onClose={() => setInspect(null)} />
      <Sheet visible={!!returning} title="කොටස ආපසු දෙන්න" subtitle={returning ? `${returning.offer.shop.name} · ${returning.brief.name}` : undefined} onClose={() => setReturning(null)}>
        <Text style={styles.text}>වෙළඳසැල කොටස පරීක්ෂා කර මුදල ආපසු දෙයි. කොටස සවි කර ඇත්නම් ගරාජය සමඟ සාකච්ඡා කරන්න.</Text>
        {RETURN_REASONS.map((r) => (
          <Pressable
            key={r}
            style={[styles.btn, styles.no]}
            onPress={() => {
              if (returning) returnPart(returning.purchase.id, r);
              setReturning(null);
            }}
            accessibilityLabel={`Return: ${r}`}
          >
            <Text style={styles.noText}>{r}</Text>
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
};

const BLUE = () => (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8');

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { gap: 8, paddingVertical: 4 },
    card: { alignSelf: 'center', width: '94%', gap: 6, padding: 14, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    head: { fontSize: 13.5, fontFamily: FONTS.bodyBold, color: BLUE() },
    text: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 18 },
    fail: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.errorText, lineHeight: 18 },
    steps: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    step: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.borderColor },
    dotDone: { backgroundColor: Colors.primary },
    stepText: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    stars: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    star: { fontSize: 24, color: '#f59e0b' },
    buttons: { flexDirection: 'row', gap: 8, marginTop: 4 },
    btn: { flex: 1, minHeight: 40, paddingHorizontal: 8, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    part: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    partText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: BLUE() },
    yes: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.16)' : '#e6f4ea', borderColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.3)' : '#ceead6' },
    yesText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#81c995' : '#188038' },
    no: { backgroundColor: Colors.bgCard, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0' },
    noText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#f28b82' : '#d93025' },
  })
);
