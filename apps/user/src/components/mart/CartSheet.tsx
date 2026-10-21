import { EmptyState } from '@ongarage/shared';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cartLeftMin, Colors, PartTypeChip, FONTS, getThemeMode, groupCartByShop, money, themedStyles } from '@ongarage/shared';
import { useMart, type MartEnquiry } from '../../context/MartContext';
import { elevation1, outline } from '../../utils/material';
import { ThreadSheet, type ThreadTarget } from './ThreadSheet';

/**
 * The cart of a request: for each part the shop the owner picked (the cheapest or whichever they like), grouped by shop with what each shop's part is (type, brand, warranty) and
 * its price. The parts that came from the "cheapest for every part" quotation are shown apart, in a light green box of their own. Every shop's parts are confirmed on their own
 * within the hour; confirming reserves them there and opens the chat with that shop, where the part details and that it is really there are checked.
 */
export const CartPanel: React.FC<{ items: MartEnquiry[] }> = ({ items }) => {
  const { cart, offers, removeFromCart, confirmCart } = useMart();
  const [thread, setThread] = useState<ThreadTarget | null>(null);
  const ids = items.map((m) => m.enquiry.id);
  const mine = cart.filter((l) => ids.includes(l.enquiryId));
  const groups = groupCartByShop(mine.filter((l) => !l.cheapest));
  const cheapGroups = groupCartByShop(mine.filter((l) => l.cheapest));
  const now = Date.now();
  const nameOf = (enquiryId: string) => items.find((m) => m.enquiry.id === enquiryId)?.enquiry.briefs[0]?.name ?? '';
  const total = mine.reduce((t, l) => t + (offers.find((o) => o.id === l.offerId)?.total ?? 0), 0);

  const renderGroup = (g: (typeof groups)[number], cheapest: boolean) => {
    const shop = offers.find((o) => o.shop.id === g.shopId)?.shop;
    const sum = g.lines.reduce((t, l) => t + (offers.find((o) => o.id === l.offerId)?.total ?? 0), 0);
    const left = Math.min(...g.lines.map((l) => cartLeftMin(l.addedAt, now)));
    return (
      <View key={`${cheapest}-${g.shopId}`} style={[styles.card, cheapest && styles.cardMix]} accessibilityLabel={`Cart ${shop?.name ?? g.shopId}`}>
        <Text style={styles.shop} numberOfLines={1}>{shop?.name ?? g.shopId}</Text>
        <Text style={styles.warn}>⏳ මිනිත්තු {left} ක් ඇතුළත තහවුරු කරන්න</Text>
        {g.lines.map((l) => {
          const o = offers.find((x) => x.id === l.offerId);
          return (
            <View key={l.enquiryId} style={styles.line}>
              <View style={styles.flex1}>
                <Text style={styles.part} numberOfLines={1}>{nameOf(l.enquiryId)}{o && o.qty > 1 ? ` ×${o.qty}` : ''}</Text>
                {!!o && <PartTypeChip type={o.partType} brand={o.brand} />}
                {!!o && (
                  <Text style={styles.sub} numberOfLines={2}>
                    {o.warrantyMonths ? `වගකීම මාස ${o.warrantyMonths}` : 'වගකීමක් නැත'}{o.fitmentConfirmed ? ' · ✓ ගැළපීම තහවුරුයි' : ''}
                  </Text>
                )}
              </View>
              <Text style={styles.price}>{o?.total ? money(o.total) : 'කවුන්ටරයේදී'}</Text>
              <Pressable onPress={() => removeFromCart(l.enquiryId)} hitSlop={8} accessibilityLabel={`Remove ${nameOf(l.enquiryId)} from the cart`}>
                <Text style={styles.remove}>✕</Text>
              </Pressable>
            </View>
          );
        })}
        <Pressable
          style={styles.confirm}
          onPress={() => {
            const eid = confirmCart(g.shopId, cheapest);
            if (eid && shop) setThread({ enquiryId: eid, shop });
          }}
          accessibilityLabel={`Confirm the order at ${shop?.name ?? g.shopId}`}
        >
          <Text style={styles.confirmText}>✓ තහවුරු කරන්න{sum ? ` · ${money(sum)}` : ''}</Text>
        </Pressable>
        <Text style={styles.sub}>තහවුරු කළාම ඒ shop එකේ chat එක ඇරෙනවා — එහිදී කොටස් වල විස්තරත්, තොගය තියෙනවාද කියලත් තහවුරු කරගන්න.</Text>
      </View>
    );
  };

  return (
    <>
      <View style={styles.panel}>
        {mine.length > 0 && <Text style={styles.sub}>කොටස් {mine.length} ක් · රු. {total.toLocaleString()}</Text>}
        {mine.length === 0 && <EmptyState icon="🛒" title="Cart එක හිස්" text="“වෙළඳසැල් අනුව සංසන්දනය” tab එකෙන් shop එකක quotation එක Add to cart කරන්න." />}
        {cheapGroups.length > 0 && (
          <View style={styles.mixWrap} accessibilityLabel="Cheapest for every part">
            <Text style={styles.mixHead}>💰 හැම කොටසකටම අඩුම මිල</Text>
            {cheapGroups.map((g) => renderGroup(g, true))}
          </View>
        )}
        {groups.map((g) => renderGroup(g, false))}
      </View>
      <ThreadSheet target={thread} onClose={() => setThread(null)} />
    </>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    panel: { gap: 10 },
    card: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    mixWrap: { gap: 10, padding: 10, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.12)' : '#e6f4ea', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.4)' : '#81c995' },
    mixHead: { fontSize: 13.5, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#81c995' : '#188038' },
    cardMix: { borderColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.4)' : '#81c995' },
    shop: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    warn: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#fdd663' : '#b06000' },
    sub: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    line: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e8eaed' },
    part: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    price: { fontSize: 13, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#81c995' : '#188038' },
    remove: { fontSize: 15, color: Colors.textMuted },
    confirm: { minHeight: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8' },
    confirmText: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: '#ffffff' },
  })
);
