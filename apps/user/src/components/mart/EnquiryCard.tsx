import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, ago, Colors, countdown, dealLabel, DEFAULT_COMMISSION_PERCENT, FitmentBadge, fitmentLevel, FONTS, martShop, money, nextRing, onWall as audienceOnWall, PriceTagChip, priceTag, reachesShops, ReferralBadge, referralDisclosure, SEARCH_RINGS, themedStyles, softEdge, softFill, softShadow, type ShopOffer } from '@ongarage/shared';
import type { MartEnquiry, MartPurchase } from '../../context/MartContext';
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
  onCancel: () => void;
  /** The reservation or purchase made from this enquiry, if any. */
  purchase?: MartPurchase;
  onReserve: (offer: ShopOffer) => void;
  onChat: (offer: ShopOffer) => void;
  onOpenOrders: () => void;
}> = ({ me, offers, now, onOpenShop, onWiden, onWall, onCancel, purchase, onReserve, onChat, onOpenOrders }) => {
  const e = me.enquiry;
  const brief = e.briefs[0];
  const left = e.quoteUntil - now;
  const expired = e.status === 'open' && left <= 0;
  const open = e.status === 'open' && !expired;
  const yes = offers.filter((o) => o.available).sort((a, b) => a.total - b.total);
  const no = offers.filter((o) => !o.available);
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
                <Text style={styles.price}>{money(o.total)}</Text>
                <Text style={styles.sub}>
                  {money(o.unitPrice)} × {o.qty}
                </Text>
                {!!o.wasUnitPrice && <Text style={[styles.sub, { textDecorationLine: 'line-through' }]}>{money(o.wasUnitPrice)}</Text>}
              </View>
            </Pressable>
            {o.qty < brief.qty && <Text style={styles.warn}>⚠ ඉල්ලූ {brief.qty} න් ඇත්තේ {o.qty} ක් පමණි</Text>}
            <View style={styles.chips}>
              <Chip text={`${o.partType}${o.brand ? ` · ${o.brand}` : ''}`} accent />
              {!!o.dealPercent && <Chip text={`🏷️ ${dealLabel(o.dealPercent)} දීමනාව`} accent />}
              <PriceTagChip tag={priceTag(brief.name, o.partType, o.unitPrice)} />
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
                  <ActionButton label="අසන්න" icon="💬" variant="ghost" compact onPress={() => onChat(o)} />
                </View>
                <View style={styles.flex2}>
                  <ActionButton label="වෙන් කර ගන්න" icon="🔒" variant="primary" compact onPress={() => onReserve(o)} />
                </View>
              </View>
            )}
          </View>
        );
      })}

      {no.length > 0 && (
        <Text style={styles.sub}>
          තොගයේ නැත: {no.map((o) => o.shop.name).join(', ')}
        </Text>
      )}

      {open && !me.searching && yes.length === 0 && (
        <View style={styles.escalate}>
          <Text style={styles.escalateTitle}>තවම කොටස හමු වී නැත</Text>
          <Text style={styles.sub}>{wider ? 'සෙවුම් පරාසය විශාල කරන්න, නැත්නම් විවෘත පෝස්ට් එකට දමන්න — කොටස ඇති වෙළඳසැලක් දැනුම් දෙයි.' : 'විවෘත පෝස්ට් එකට දමා සිටින්න — කොටස ඇති වෙළඳසැලක් දැනුම් දෙයි.'}</Text>
          {wider && <ActionButton label={`පරාසය විශාල කරන්න · ${widerLabel}`} icon="🔭" variant="primary" compact onPress={onWiden} />}
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
    <Text style={[styles.chipText, accent && { color: Colors.primary }]}>{text}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    offerActions: { flexDirection: 'row', gap: 8 },
    banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 12, borderRadius: 14, backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    bannerText: { flex: 1, fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.successText },
    bannerLink: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 20, padding: 14, gap: 10, ...softShadow() },
    title: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    status: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: softFill() },
    statusOpen: { backgroundColor: 'rgba(2, 132, 199, 0.12)' },
    statusText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: softFill() },
    chipAccent: { backgroundColor: 'rgba(2, 132, 199, 0.12)' },
    chipText: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    searching: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    offer: { padding: 12, borderRadius: 16, backgroundColor: softFill(), gap: 8 },
    offerBest: { borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.45)' },
    shop: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    priceBox: { alignItems: 'flex-end' },
    price: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.successText },
    warn: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning },
    call: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: Colors.bgCard },
    callText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    escalate: { padding: 12, borderRadius: 16, backgroundColor: 'rgba(245, 158, 11, 0.1)', gap: 8 },
    escalateTitle: { fontSize: 12.5, fontFamily: FONTS.titleBold, color: Colors.warning },
    cancel: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.errorText, textAlign: 'center' },
  })
);
