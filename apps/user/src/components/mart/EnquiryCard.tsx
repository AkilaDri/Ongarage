import { elevation1, outline } from '../../utils/material';
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, OnMartIcon, ANSWER_WINDOW_MIN, checkWindowText, answerOverdue, ago, Colors, countdown, dealLabel, DEFAULT_COMMISSION_PERCENT, FitmentBadge, fitmentLevel, FONTS, getThemeMode, martShop, money, nextRing, onWall as audienceOnWall, PriceTagChip, priceTag, reachesShops, ReferralBadge, referralDisclosure, SEARCH_RINGS, themedStyles, softEdge, softFill, softShadow, type ShopOffer } from '@ongarage/shared';
import type { MartEnquiry, MartPurchase } from '../../context/MartContext';
import { useMart } from '../../context/MartContext';
import { TxnTag } from '../TxnTag';

const STATUS: Record<string, string> = { open: 'ක්‍රියාත්මකයි', reserved: 'වෙන් කළා', bought: 'මිලදී ගත්තා', cancelled: 'අවලංගු කළා', expired: 'කල් ඉකුත් විය' };

/**
 * One enquiry of the owner's: what was asked, who was asked, and the shops' answers, cheapest first, each with
 * a price tag against the market and whether the shop confirmed the part fits the vehicle.
 */
export const EnquiryCard: React.FC<{
  me: MartEnquiry;
  offers: ShopOffer[];
  now: number;
  onOpenShop: (shopId: string) => void;
  onWiden: () => void;
  onWall: () => void;
  onAskMore: () => void;
  onAskShops: (shopIds: string[]) => void;
  onCancel: () => void;
  /** The reservation or purchase made from this enquiry, if any. */
  purchase?: MartPurchase;
  onReserve: (offer: ShopOffer) => void;
  onChat: (offer: ShopOffer) => void;
  onOpenOrders: () => void;
}> = ({ me, offers, now, onOpenShop, onWiden, onWall, onAskMore, onAskShops, onCancel, purchase, onReserve, onChat, onOpenOrders }) => {
  const { cart, addToCart, removeFromCart } = useMart();
  const e = me.enquiry;
  const brief = e.briefs[0];
  const left = e.quoteUntil - now;
  const expired = e.status === 'open' && left <= 0;
  const open = e.status === 'open' && !expired;
  // Priced answers first, cheapest first; a "have it" with no price (to be asked at the counter) after them.
  const yes = offers.filter((o) => o.available).sort((a, b) => (a.total || Infinity) - (b.total || Infinity));
  const checking = offers.filter((o) => !o.available && o.reply === 'check');
  const no = offers.filter((o) => !o.available && o.reply !== 'check');
  // Neighbour shops the "don't have it" answers point to, that have not been asked yet.
  const pointedTo = [...new Set(no.flatMap((o) => o.suggestedShopIds ?? []))].filter((id) => !me.askedShopIds.includes(id));
  const answered = new Set(offers.map((o) => o.shop.id));
  const silent = me.askedShopIds.filter((id) => !answered.has(id)).length;
  const ring = SEARCH_RINGS.find((r) => r.ring === e.ring)!;
  const wider = nextRing(e.ring);
  const widerLabel = wider ? SEARCH_RINGS.find((r) => r.ring === wider)!.label : '';

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={styles.flex1}>
          <Text style={styles.title} numberOfLines={1}>
            {brief.name} ×{brief.qty}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {brief.partType === 'GarageChoice' ? 'ඕනෑම වර්ගයක්' : brief.partType} · {brief.vehicle.name} · {brief.vehicle.plate} · {ago(now - e.createdAt)}
          </Text>
          <TxnTag kind="REQ" source={e.id} />
        </View>
        <View style={[styles.status, open && styles.statusOpen]}>
          <Text style={[styles.statusText, open && { color: Colors.primary }]}>{expired ? STATUS.expired : STATUS[e.status]}</Text>
        </View>
      </View>

      <View style={styles.chips}>
        {reachesShops(e.audience) && <Chip text={me.onlyShopIds?.length ? '🏪 තෝරාගත් වෙළඳසැල' : `🏪 ${ring.label}`} />}
        {audienceOnWall(e.audience) && <Chip text="📣 විවෘත පෝස්ට් එක" accent />}
        {open && <Chip text={`⏳ ${countdown(left)}`} />}
        {!!brief.photos?.length && <Chip text={`📷 ${brief.photos.length}`} />}
      </View>

      {open && me.searching && <Text style={styles.searching}>🔎 වෙළඳසැල් {me.askedShopIds.length} කට ඉල්ලා ඇත — පිළිතුරු බලාපොරොත්තුවෙන්…</Text>}

      {!!purchase && (e.status === 'reserved' || e.status === 'bought') && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            {e.status === 'bought' ? '✅' : '🔒'} {purchase.offer.shop.name} වෙතින් {e.status === 'bought' ? 'මිලදී ගත්තා' : 'වෙන් කළා'}
          </Text>
          <Pressable onPress={onOpenOrders} accessibilityLabel="Open orders">
            <Text style={styles.bannerLink}>ඇණවුම් බලන්න ›</Text>
          </Pressable>
        </View>
      )}

      {yes.map((o, i) => {
        const level = fitmentLevel(brief, o.fitmentConfirmed);
        return (
          <View key={o.id} style={[styles.offer, i === 0 && styles.offerBest]}>
            <Pressable style={styles.rowBetween} onPress={() => onOpenShop(o.shop.id)} accessibilityLabel={`Offer from ${o.shop.name}`}>
              <View style={styles.flex1}>
                <Text style={styles.shop} numberOfLines={1}>
                  {i === 0 && yes.length > 1 ? '🏆 ' : ''}
                  {o.shop.name}
                </Text>
                <Text style={styles.sub}>
                  ★ {o.shop.rating.toFixed(1)} · {o.shop.distanceKm < 10 ? o.shop.distanceKm.toFixed(1) : Math.round(o.shop.distanceKm)} කි.මී.
                </Text>
              </View>
              <View style={styles.priceBox}>
                {o.unitPrice > 0 ? (
                  <>
                    <Text style={styles.price}>{money(o.total)}</Text>
                    <Text style={styles.sub}>
                      {money(o.unitPrice)} × {o.qty}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.priceAsk}>මිල කවුන්ටරයේදී</Text>
                )}
                {!!o.wasUnitPrice && <Text style={[styles.sub, { textDecorationLine: 'line-through' }]}>{money(o.wasUnitPrice)}</Text>}
              </View>
            </Pressable>
            {o.qty < brief.qty && <Text style={styles.warn}>⚠ ඉල්ලූ {brief.qty} න් ඇත්තේ {o.qty} ක් පමණි</Text>}
            <View style={styles.chips}>
              <Chip text={`${o.partType}${o.brand ? ` · ${o.brand}` : ''}`} accent />
              {!!o.dealPercent && <Chip text={`🏷️ ${dealLabel(o.dealPercent)} දීමනාව`} accent />}
              {o.unitPrice > 0 && <PriceTagChip tag={priceTag(brief.name, o.partType, o.unitPrice)} />}
              <Chip text={`🛡️ ${o.warrantyMonths ? `මාස ${o.warrantyMonths}` : 'නැත'}`} />
              <Chip text={`🏪 මිනි. ${o.readyInMin}න් සූදානම්`} />
              {o.delivery && <Chip text={`🛵 ${o.delivery.fee ? money(o.delivery.fee) : 'නොමිලේ'} · මිනි. ${o.delivery.etaMin}`} />}
            </View>
            <FitmentBadge level={level} />
            {!!e.jobRef && e.jobRef.recommendedShopIds.includes(o.shop.id) && (
              <>
                <ReferralBadge garageName={e.jobRef.garage.name} />
                <Text style={styles.sub}>{referralDisclosure(e.jobRef.garage.name, martShop(o.shop.id)?.referralPercent ?? DEFAULT_COMMISSION_PERCENT)}</Text>
              </>
            )}
            <Pressable style={styles.call} onPress={() => Linking.openURL(`tel:${o.shop.phone.replace(/\s/g, '')}`)} accessibilityLabel={`Call ${o.shop.name}`}>
              <Text style={styles.callText}>📞 {o.shop.phone}</Text>
            </Pressable>
            {open && (
              <View style={styles.offerActions}>
                <View style={styles.flex1}>
                  <ActionButton label="අසන්න" icon={<OnMartIcon size={16} color={getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8'} />} variant="ghost" compact onPress={() => onChat(o)} />
                </View>
                <View style={styles.flex2}>
                  {cart.some((l) => l.offerId === o.id) ? (
                    <ActionButton label="Cart එකේ ✓" icon="🛒" variant="success" compact onPress={() => removeFromCart(e.id)} />
                  ) : (
                    <ActionButton label="Add to cart" icon="🛒" variant="primary" compact onPress={() => addToCart([o.id])} />
                  )}
                </View>
              </View>
            )}
          </View>
        );
      })}

      {checking.length > 0 && <Text style={styles.sub}>⏳ කොටස සොයමින් — පිළිතුර බලා සිටින්න: {checking.map((o) => `${o.shop.name}${o.checkUntil ? ` (${checkWindowText(o.checkUntil, now)})` : ''}`).join(', ')}</Text>}

      {no.length > 0 && <Text style={styles.sub}>නැත: {no.map((o) => o.shop.name).join(', ')}</Text>}

      {open && silent > 0 && answerOverdue(e.createdAt, now) && <Text style={styles.sub}>පිළිතුරු නොදුන් වෙළඳසැල් {silent} (විනාඩි {ANSWER_WINDOW_MIN}ක් ගත විය) — ඊළඟ වෙළඳසැල්වලට ඉල්ලන්න.</Text>}

      {open && !me.searching && yes.length === 0 && (
        <View style={styles.escalate}>
          <Text style={styles.escalateTitle}>තවම කොටස හමු වී නැත</Text>
          <Text style={styles.sub}>කොටස හමු වී නැත්නම් සෙවුම් පරාසය card එකේ map එකෙන් විශාල කරන්න, නැත්නම් විවෘත පෝස්ට් එකට දමන්න.</Text>
          {!audienceOnWall(e.audience) && <ActionButton label="විවෘත දුර්ලභ කොටස් පෝස්ට් එකට දමන්න" icon="📣" variant="success" compact onPress={onWall} />}
        </View>
      )}

      {open && (
        <Pressable onPress={onCancel} hitSlop={6} accessibilityLabel="Cancel enquiry">
          <Text style={styles.cancel}>ඉල්ලීම අවලංගු කරන්න</Text>
        </Pressable>
      )}
    </View>
  );
};

const Chip: React.FC<{ text: string; accent?: boolean }> = ({ text, accent }) => (
  <View style={[styles.chip, accent && styles.chipAccent]}>
    <Text style={[styles.chipText, accent && styles.chipTextAccent]}>{text}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    offerActions: { flexDirection: 'row', gap: 8 },
    banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.4)' : '#b7e1c1', backgroundColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.12)' : '#e6f4ea' },
    bannerText: { flex: 1, fontSize: 12.5, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#81c995' : '#188038' },
    bannerLink: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    // Day theme: a visible edge, so the white card stands out on the grey page.
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), borderRadius: 12, padding: 12, gap: 12, ...elevation1() },
    title: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: getThemeMode() === 'dark' ? Colors.textMuted : '#5f6368', lineHeight: 17 },
    status: { paddingHorizontal: 10, height: 24, justifyContent: 'center', borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#f1f3f4' },
    statusOpen: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    statusText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? Colors.textMuted : '#5f6368' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 9, height: 24, justifyContent: 'center', borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#f1f3f4' },
    chipAccent: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    chipTextAccent: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    chipText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? Colors.textMuted : '#3c4043' },
    searching: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    offer: { padding: 12, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), gap: 10, ...elevation1() },
    offerBest: { borderWidth: 1.5, borderColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.6)' : '#81c995' },
    shop: { fontSize: 14.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    priceBox: { alignItems: 'flex-end' },
    price: { fontSize: 16, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#81c995' : '#188038' },
    priceAsk: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? Colors.textMuted : '#5f6368' },
    warn: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#fdd663' : '#b06000' },
    call: { alignSelf: 'flex-start', paddingHorizontal: 12, minHeight: 32, justifyContent: 'center', borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    callText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    escalate: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(253, 214, 99, 0.35)' : '#fde293', backgroundColor: getThemeMode() === 'dark' ? 'rgba(253, 214, 99, 0.1)' : '#fef7e0', gap: 8 },
    escalateTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#fdd663' : '#b06000' },
    cancel: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#f28b82' : '#d93025', textAlign: 'center' },
  })
);
