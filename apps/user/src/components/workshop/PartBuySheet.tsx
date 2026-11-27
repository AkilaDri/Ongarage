import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, DEFAULT_COMMISSION_PERCENT, FitmentBadge, fitmentLevel, FONTS, getThemeMode, martShop, money, PurchaseCode, ReferralBadge, referralDisclosure, themedStyles, type ShopOffer } from '@ongarage/shared';
import { useMart, type MartPurchase } from '../../context/MartContext';
import { useWorkshops, type OwnerWorkshop } from '../../context/WorkshopContext';
import { useChat } from '../../context/ChatContext';
import { useJobPartStatuses } from '../../utils/jobParts';
import { openMartSegment } from '../../utils/martBridge';
import { CounterSheet } from '../mart/CounterSheet';
import { FlowButton } from '../FlowButton';
import { Sheet } from '../Sheet';
import { partStatusText } from './partStatusText';

const km = (d: number) => (d < 10 ? d.toFixed(1) : String(Math.round(d)));

/**
 * One job part from offers to the garage's yes, over the job card, so the owner never has to find their way round OnMart. It reads the same request,
 * offers and purchase that OnMart shows. Offers read in the order a buyer decides: price, fit and kind, when it comes, warranty, then who sells it.
 */
export const PartBuySheet: React.FC<{ workshop: OwnerWorkshop | null; lineId: string | null; onClose: () => void }> = ({ workshop, lineId, onClose }) => {
  const { enquiries, offersFor, purchases, reserve, cancelReservation, returnPart } = useMart();
  const { handInPart } = useWorkshops();
  const { openBasket } = useChat();
  const statusesOf = useJobPartStatuses();
  const [shown, setShown] = useState<{ w: OwnerWorkshop; lineId: string } | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [how, setHow] = useState<'pickup' | 'delivery' | null>(null);
  const [inspect, setInspect] = useState<MartPurchase | null>(null);

  useEffect(() => {
    if (workshop && lineId) setShown({ w: workshop, lineId });
  }, [workshop, lineId]);
  useEffect(() => {
    setOfferId(null);
    setHow(null);
    setInspect(null);
  }, [lineId]);

  const w = workshop ?? shown?.w;
  const id = lineId ?? shown?.lineId;
  const s = w ? statusesOf(w).find((x) => x.line.id === id) : undefined;
  if (!w || !s) return null;
  const visible = !!workshop && !!lineId;

  const request = enquiries.find((m) => m.enquiry.id === s.enquiryId)?.enquiry;
  const brief = request?.briefs[0];
  const purchase = purchases.find((p) => p.purchase.jobRef?.bookingId === w.id && p.purchase.jobRef.lineId === s.line.id && !['rejected', 'released', 'returned'].includes(p.stage));
  const offers = s.enquiryId && s.state === 'offers' ? offersFor(s.enquiryId).filter((o) => o.available).sort((a, b) => (a.total || Infinity) - (b.total || Infinity)) : [];
  const picked = offers.find((o) => o.id === offerId);
  // At the garage the part can come to the garage; away from it, to the owner's own place (who pays for them is not decided yet).
  const stays = !!w.progress.stays;
  const deliveryName = stays ? `🚚 ${w.garageName} වෙත ගෙන්වා ගන්න` : '🚚 මා වෙත ගෙන්වා ගන්න';
  const way = picked && how === 'delivery' && !picked.delivery ? null : how;
  const total = picked ? picked.total + (way === 'delivery' ? picked.delivery!.fee : 0) : 0;
  const sameKind = (o: ShopOffer) => !s.line.partType || s.line.partType === 'GarageChoice' || o.partType === s.line.partType;

  let footer: React.ReactNode;
  if (s.state === 'toAsk')
    footer = (
      <FlowButton
        label="මිල ඉල්ලන්න"
        icon="🛍️"
        onPress={() => {
          onClose();
          openBasket(w.id);
        }}
      />
    );
  else if (s.state === 'offers')
    footer = (
      <FlowButton
        label={!picked ? 'වෙළඳසැලක් තෝරන්න' : !way ? 'ලබා ගන්නා ක්‍රමය තෝරන්න' : 'වෙන් කරන්න'}
        detail={picked && way && picked.total ? money(total) : undefined}
        disabled={!picked || !way}
        onPress={() => picked && way && reserve(picked.id, way, undefined, way === 'delivery' && stays ? w.garageName : undefined)}
      />
    );
  else if (s.state === 'reserved' && purchase && s.toCheck) footer = <FlowButton label="කොටස පරීක්ෂා කර මිලදී ගන්න" icon="🔍" variant="success" onPress={() => setInspect(purchase)} />;
  else if (s.state === 'toGive') footer = <FlowButton label="ගරාජයට භාර දුන්නා" icon="🤝" variant="success" onPress={() => handInPart(w.id, s.line.id)} />;
  else if (s.state === 'wrong' && purchase?.stage === 'bought')
    footer = <FlowButton label="වෙළඳසැලට ආපසු දෙන්න" icon="↩️" variant="danger" onPress={() => returnPart(purchase.purchase.id, `ගරාජය: වැරදි කොටසක් (${s.wrongReason ?? ''})`)} />;

  return (
    <>
      <Sheet visible={visible && !inspect} title={`${s.line.name} × ${s.line.qty}`} subtitle={`${w.garageName}${brief?.vehicle ? ` · ${brief.vehicle.plate}` : ''}`} onClose={onClose} footer={footer}>
        {s.state === 'toAsk' && <Text style={styles.text}>මෙම කොටසට තවම ඉල්ලීමක් නැත.</Text>}
        {s.state === 'waiting' && (
          <>
            <Text style={styles.head}>⏳ {partStatusText(s)}</Text>
            <Text style={styles.sub}>මෙය වසා දැමිය හැක. පිළිතුරු ලැබුණු විට රැකියා කාඩ්පතේ පෙනේ.</Text>
          </>
        )}

        {offers.map((o) => {
          const on = o.id === offerId;
          const shop = martShop(o.shop.id);
          const recommended = !!request?.jobRef?.recommendedShopIds.includes(o.shop.id);
          return (
            <Pressable key={o.id} style={[styles.offer, on && styles.offerOn]} onPress={() => setOfferId(o.id)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`Offer from ${o.shop.name}`}>
              <Text style={styles.price}>{o.total ? money(o.total) : 'මිල කවුන්ටරයේදී'}</Text>
              {!!o.delivery && <Text style={styles.sub}>ගෙන්වා ගැනීම {o.delivery.fee ? `+ ${money(o.delivery.fee)}` : 'නොමිලේ'}</Text>}
              {!!brief && <FitmentBadge level={fitmentLevel(brief, o.fitmentConfirmed)} />}
              <Text style={[styles.text, !sameKind(o) && styles.warn]}>
                {sameKind(o) ? `✓ ${o.partType}${o.brand ? ` · ${o.brand}` : ''}` : `⚠️ ගරාජය ඉල්ලුවේ ${s.line.partType} · මෙය ${o.partType}`}
              </Text>
              <Text style={styles.sub}>
                🕒 මිනි. {o.readyInMin}කින් සූදානම්{o.delivery ? ` · ගෙන්වීම මිනි. ${o.delivery.etaMin}ක් පමණ` : ''}
              </Text>
              <Text style={styles.sub}>🛡️ {o.warrantyMonths ? `මාස ${o.warrantyMonths} වගකීම` : 'වගකීමක් නැත'} · මිලදී ගත් පසු දින 7ක් ඇතුළත ආපසු දිය හැක</Text>
              <Text style={styles.shop}>
                {o.shop.name} · ★ {o.shop.rating.toFixed(1)} · {km(o.shop.distanceKm)} km
              </Text>
              {recommended && !!request?.jobRef && (
                <>
                  <ReferralBadge garageName={request.jobRef.garage.name} />
                  <Text style={styles.sub}>{referralDisclosure(request.jobRef.garage.name, shop?.referralPercent ?? DEFAULT_COMMISSION_PERCENT)}</Text>
                </>
              )}
            </Pressable>
          );
        })}

        {!!picked && (
          <>
            <Text style={styles.head}>ලබා ගන්නේ කෙසේද?</Text>
            {(
              [
                { id: 'pickup' as const, title: '🏪 මම ගොස් එකතු කරමි', text: 'කොටස බලා කවුන්ටරයේදී ගෙවන්න' },
                ...(picked.delivery ? [{ id: 'delivery' as const, title: deliveryName, text: `${picked.delivery.fee ? money(picked.delivery.fee) : 'නොමිලේ'} · ලැබුණු විට ඔබ පරීක්ෂා කර ගෙවන්න` }] : []),
              ]
            ).map((o) => (
              <Pressable key={o.id} style={[styles.offer, way === o.id && styles.offerOn]} onPress={() => setHow(o.id)} accessibilityRole="radio" accessibilityState={{ selected: way === o.id }} accessibilityLabel={o.id === 'delivery' ? 'Deliver the part' : 'Collect the part'}>
                <Text style={styles.way}>{o.title}</Text>
                <Text style={styles.sub}>{o.text}</Text>
              </Pressable>
            ))}
            {!picked.delivery && <Text style={styles.sub}>මෙම වෙළඳසැල ගෙන්වා නොදෙයි.</Text>}
          </>
        )}

        {s.state === 'reserved' && !!purchase && (
          <>
            <Text style={styles.head}>
              {purchase.offer.shop.name} · {purchase.offer.total ? money(purchase.offer.total + (purchase.delivery?.fee ?? 0)) : 'මිල කවුන්ටරයේදී'}
            </Text>
            {purchase.delivery ? (
              <>
                <Text style={styles.text}>
                  {purchase.stage === 'arrived' ? '🚪 රියදුරු පැමිණ ඇත. පරීක්ෂා කර ගෙවන්න.' : purchase.stage === 'dispatched' ? `🛵 ${purchase.delivery.toGarage ? `${purchase.delivery.toGarage} වෙත` : 'ඔබ වෙත'} එමින්` : '⏳ වෙළඳසැල ඇසුරුම් කරමින්'}
                </Text>
                {purchase.stage !== 'reserved' && (
                  <Pressable style={styles.linkRow} onPress={() => Linking.openURL(`tel:${purchase.delivery!.rider.phone}`)} accessibilityRole="button" accessibilityLabel="Call the rider">
                    <Text style={styles.link}>📞 {purchase.delivery.rider.name} අමතන්න</Text>
                  </Pressable>
                )}
              </>
            ) : (
              <>
                <Text style={styles.text}>{purchase.stage === 'ready' ? '🏪 කවුන්ටරයේ සූදානම්. මෙම කේතය පෙන්වන්න.' : '⏳ වෙළඳසැල ඇසුරුම් කරමින්. එහිදී මෙම කේතය පෙන්වන්න.'}</Text>
                <PurchaseCode code={purchase.purchase.code} size={140} />
                <Pressable style={styles.linkRow} onPress={() => cancelReservation(purchase.purchase.id)} accessibilityRole="button" accessibilityLabel="Cancel reservation">
                  <Text style={styles.link}>වෙන් කිරීම අවලංගු කරන්න</Text>
                </Pressable>
              </>
            )}
          </>
        )}

        {s.state === 'toGive' && (
          <>
            <Text style={styles.head}>{partStatusText(s)}</Text>
            <Text style={styles.text}>දැන් කොටස {w.garageName} වෙත භාර දෙන්න. ඔවුන් එය නිවැරදිදැයි පරීක්ෂා කරයි.</Text>
          </>
        )}
        {s.state === 'checking' && <Text style={styles.head}>⏳ {partStatusText(s)}</Text>}
        {s.state === 'done' && <Text style={styles.head}>{partStatusText(s)}</Text>}
        {s.state === 'wrong' && (
          <>
            <Text style={[styles.head, styles.warn]}>{partStatusText(s)}</Text>
            <Text style={styles.text}>1. කොටස සහ බිල්පත වෙළඳසැලට ගෙන යන්න (දින 7ක් ඇතුළත).{'\n'}2. පහත බොත්තමෙන් ආපසු දීම දැනුම් දෙන්න.{'\n'}3. වෙළඳසැල පරීක්ෂා කර මුදල ආපසු දෙයි. ඉන්පසු නිවැරදි කොටසට නැවත මිල ඉල්ලන්න.</Text>
          </>
        )}

        {!!s.enquiryId && (
          <Pressable
            style={styles.linkRow}
            onPress={() => {
              onClose();
              openMartSegment(s.state === 'waiting' || s.state === 'offers' ? 'mine' : 'orders');
            }}
            accessibilityRole="button"
            accessibilityLabel="Open in OnMart"
          >
            <Text style={styles.link}>OnMart හි බලන්න ›</Text>
          </Pressable>
        )}
      </Sheet>
      <CounterSheet item={inspect} onClose={() => setInspect(null)} />
    </>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    head: { fontSize: 15, lineHeight: 22, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    text: { fontSize: 13.5, lineHeight: 21, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    sub: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    warn: { color: getThemeMode() === 'dark' ? '#fdd663' : '#b45309' },
    offer: { gap: 4, padding: 14, borderRadius: 22, borderWidth: 1.5, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#eef2f8', backgroundColor: Colors.bgCard },
    offerOn: { borderColor: '#facc15', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#eff6ff' },
    price: { fontSize: 22, lineHeight: 28, fontFamily: FONTS.titleBold, color: Colors.success },
    shop: { fontSize: 14, lineHeight: 21, fontFamily: FONTS.bodyBold, color: Colors.textMain, marginTop: 4 },
    way: { fontSize: 14, lineHeight: 21, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    linkRow: { minHeight: 36, justifyContent: 'center', alignSelf: 'flex-start' },
    link: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1e3a8a' },
  })
);
