import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChatIconButton, cheapestMix, checkWindowText, PartTypeChip, Colors, FONTS, getThemeMode, mixSavings, money, shopCoverage, themedStyles } from '@ongarage/shared';
import { useMart, type MartEnquiry } from '../../context/MartContext';
import { openShopFor } from '../../utils/martBridge';
import { ThreadSheet, type ThreadTarget } from './ThreadSheet';
import { elevation1, outline } from '../../utils/material';

/** A part in a quotation: touching it picks it (the row tints, its tick springs in); touching again lets it go. */
const PickRow: React.FC<{ on: boolean; onPress: () => void; label: string; fly?: boolean; children: React.ReactNode }> = ({ on, onPress, label, fly, children }) => {
  const a = useRef(new Animated.Value(on ? 1 : 0)).current;
  // Added to the cart: the row lifts off up and to the right, towards the cart tab, shrinking as it goes.
  const f = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (fly) Animated.timing(f, { toValue: 1, duration: 450, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start();
    else f.setValue(0);
  }, [fly, f]);
  useEffect(() => {
    Animated.spring(a, { toValue: on ? 1 : 0, friction: 5, tension: 140, useNativeDriver: false }).start();
  }, [on, a]);
  const bg = a.interpolate({ inputRange: [0, 1], outputRange: ['rgba(26, 115, 232, 0)', 'rgba(26, 115, 232, 0.13)'] });
  const scale = a.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });
  const nudge = a.interpolate({ inputRange: [0, 1], outputRange: [0, 3] });
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} accessibilityState={{ checked: on }}>
      <Animated.View style={[styles.quoteRow, { backgroundColor: bg, opacity: f.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ translateX: Animated.add(nudge, f.interpolate({ inputRange: [0, 1], outputRange: [0, 90] })) }, { translateY: f.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }) }, { scale: f.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) }] }]}>
        <Animated.View style={[styles.pickBox, on && styles.pickBoxOn, { transform: [{ scale }] }]}>{on && <Text style={styles.pickTick}>✓</Text>}</Animated.View>
        {children}
      </Animated.View>
    </Pressable>
  );
};

/**
 * The answers of a basket read shop by shop: which shops have every part (and what they cost together), which have most and what is missing (with one tap to ask them for the
 * rest), and the cheapest way part by part from different shops, with how much that saves against the best single shop.
 */
export const BatchCompare: React.FC<{ items: MartEnquiry[] }> = ({ items }) => {
  const { offers, askShops, addToCart } = useMart();
  // The parts the owner has ticked to take at each shop (all the open ones it has until they change it).
  const [sel, setSel] = useState<Record<string, string[]>>({});
  // The order the shops are listed in (best match, nearest, lowest price, best rated).
  const [sortBy, setSortBy] = useState<'best' | 'near' | 'price' | 'rating'>('best');
  // The parts the owner has picked (by touching them) in the cheapest-for-every-part quotation.
  const [mixOn, setMixOn] = useState<string[]>([]);
  // The rows that are flying to the cart right now.
  const [flying, setFlying] = useState<string[]>([]);
  const [mixOpen, setMixOpen] = useState(false);
  // OnChat with a shop, from its quotation card.
  const [thread, setThread] = useState<ThreadTarget | null>(null);
  const ids = items.map((m) => m.enquiry.id);
  const name = (id: string) => items.find((m) => m.enquiry.id === id)?.enquiry.briefs[0]?.name ?? '';
  const mine = offers.filter((o) => ids.includes(o.enquiryId));
  const hasIt = (o: (typeof mine)[number]) => o.available && o.reply !== 'check' && o.reply !== 'none';
  const open = (id: string) => items.find((m) => m.enquiry.id === id)?.enquiry.status === 'open';
  if (!mine.some((o) => o.available)) return <Text style={styles.wait}>⏳ වෙළඳසැල් පිළිතුරු දෙන තෙක් — පිළිතුරු ආ විට මෙහි වෙළඳසැල් අනුව සංසන්දනය පෙනේ.</Text>;
  const cov = shopCoverage(ids, mine);
  const mix = cheapestMix(ids, mine);
  const saving = mixSavings(cov, mix);
  // Nothing picked: the whole cheapest quotation (what the folded card prices and adds); some picked: only those parts.
  const mixAll = mix.picks.filter((p) => open(p.enquiryId));
  const mixPicks = mixOn.length ? mixAll.filter((p) => mixOn.includes(p.enquiryId)) : mixAll;
  const mixSum = mixPicks.reduce((t, p) => t + p.offer.total, 0);
  const mixIds = mixPicks.map((p) => mine.find((o) => o.enquiryId === p.enquiryId && o.shop.id === p.offer.shop.id && hasIt(o))?.id).filter((id): id is string => !!id);
  /** The open parts of the basket this shop has, as offer ids. */
  const offerIdsAt = (shopId: string, only?: string[]) => mine.filter((o) => o.shop.id === shopId && hasIt(o) && open(o.enquiryId) && (!only || only.includes(o.enquiryId))).map((o) => o.id);
  /** Lets the picked rows fly to the cart, then adds them and clears the picks. */
  const flyAdd = (keys: string[], add: () => void, clear: () => void) => {
    setFlying(keys);
    setTimeout(() => {
      add();
      clear();
      setFlying([]);
    }, 460);
  };
  const chosen = (shopId: string) => (sel[shopId] ?? []).filter((id) => offerIdsAt(shopId).includes(id));
  const toggle = (shopId: string, offerId: string) => setSel((x) => ({ ...x, [shopId]: chosen(shopId).includes(offerId) ? chosen(shopId).filter((i) => i !== offerId) : [...chosen(shopId), offerId] }));
  const shopOf = (shopId: string) => mine.find((o) => o.shop.id === shopId)?.shop;
  // Only shops that have some of the parts are listed here; the ones with none are not shown.
  const listed = cov
    .filter((c) => c.have.length > 0)
    .sort((x, y) => (sortBy === 'near' ? (shopOf(x.shopId)?.distanceKm ?? 0) - (shopOf(y.shopId)?.distanceKm ?? 0) : sortBy === 'rating' ? (shopOf(y.shopId)?.rating ?? 0) - (shopOf(x.shopId)?.rating ?? 0) : sortBy === 'price' ? x.total - y.total : 0));
  const asked = (shopId: string, enquiryId: string) => items.find((m) => m.enquiry.id === enquiryId)?.askedShopIds.includes(shopId) ?? false;

  return (
    <View style={styles.box} accessibilityLabel="Basket compare">
      <Text style={styles.heading}>🏪 වෙළඳසැල් අනුව — මිල ගණන්</Text>
      <View style={styles.filterRow}>
        {([['best', '⭐ හොඳම'], ['near', '📍 ළඟම'], ['price', '💰 අඩුම මිල']] as const).map(([id, label]) => (
          <Pressable key={id} style={[styles.fchip, sortBy === id && styles.fchipOn]} onPress={() => setSortBy(id)} accessibilityLabel={`Sort ${id}`} accessibilityState={{ selected: sortBy === id }}>
            <Text style={[styles.fchipText, sortBy === id && styles.fchipTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {listed.length === 0 && <Text style={styles.sub}>කොටස් තියෙන වෙළඳසැල් තවම නැත.</Text>}
      {mix.picks.some((p) => open(p.enquiryId)) && (
        <View style={styles.mixCard} accessibilityLabel="Cheapest for every part">
          {/* Folded to start with: the whole price and the cart chip; touching the card opens the quotation. */}
          <Pressable style={styles.shopHead} onPress={() => setMixOpen((o) => !o)} accessibilityLabel="Cheapest for every part: open or fold" accessibilityState={{ expanded: mixOpen }}>
            <View style={styles.flex1}>
              <Text style={styles.shop}>💰 හැම කොටසකටම අඩුම මිල</Text>
              <Text style={styles.sub}>වෙළඳසැල් {mix.shops}ක්{saving ? ` · එකම තැනකින් ගැනීමට වඩා ${money(saving)} අඩුයි` : ''}</Text>
              <Text style={styles.mixFull}>{mixSum ? money(mixSum) + (mixPicks.some((p) => !p.offer.total) ? ' +' : '') : 'කවුන්ටරයේදී'} · කොටස් {mixPicks.length} {mixOpen ? '▲' : '▼'}</Text>
            </View>
            <Pressable style={[styles.addCart, !mixIds.length && { opacity: 0.45 }]} disabled={!mixIds.length} onPress={() => flyAdd(mixOpen ? mixOn.map((id) => `mix:${id}`) : [], () => addToCart(mixIds, { cheapest: true }), () => setMixOn([]))} accessibilityLabel="Add the cheapest for every part to the cart">
              <Text style={styles.addCartText}>🛒 Add to cart</Text>
            </Pressable>
          </Pressable>
          {mixOpen && (
            <>
            <View style={styles.quote}>
              <View style={styles.quoteHeadRow}>
                <Text style={styles.quoteHead}>📋 Quotation · කොටස් ඔබලා තෝරන්න</Text>
                <Pressable onPress={() => setMixOn(mixOn.length === mix.picks.filter((p) => open(p.enquiryId)).length ? [] : mix.picks.filter((p) => open(p.enquiryId)).map((p) => p.enquiryId))} hitSlop={6} accessibilityLabel="Pick all">
                  <Text style={styles.pickAll}>{mixOn.length === mix.picks.filter((p) => open(p.enquiryId)).length ? 'ඉවත් කරන්න' : 'සියල්ල තෝරන්න'}</Text>
                </Pressable>
              </View>
              {mix.picks.filter((p) => open(p.enquiryId)).map((p) => {
                const on = mixOn.includes(p.enquiryId);
                return (
                  <PickRow key={p.enquiryId} on={on} fly={flying.includes(`mix:${p.enquiryId}`)} onPress={() => setMixOn((x) => (x.includes(p.enquiryId) ? x.filter((i) => i !== p.enquiryId) : [...x, p.enquiryId]))} label={`${on ? 'Unpick' : 'Pick'} ${name(p.enquiryId)}`}>
                    <View style={styles.flex1}>
                      <Text style={[styles.quoteName, on && styles.quoteNameOn]} numberOfLines={1}>{name(p.enquiryId)}</Text>
                      <Text style={styles.sub} numberOfLines={1}>{p.offer.shop.name}</Text>
                    {(() => {
                      const real = mine.find((o) => o.enquiryId === p.enquiryId && o.shop.id === p.offer.shop.id && hasIt(o));
                      return <PartTypeChip type={real?.partType} brand={real?.brand} compact />;
                    })()}
                    </View>
                    <Text style={styles.quotePrice}>{p.offer.total ? money(p.offer.total) : 'කවුන්ටරයේදී'}</Text>
                  </PickRow>
                );
              })}
              {mix.missing.length > 0 && <Text style={styles.miss}>තවම පිළිතුරක් නැත: {mix.missing.map(name).join(', ')}</Text>}
            </View>
            <View style={styles.quoteFoot}>
              <Text style={styles.sub}>{mixOn.length ? `තෝරපු කොටස් ${mixOn.length}/${mixAll.length}` : `කොටස් ඔක්කොම (${mixAll.length})`}</Text>
              <View style={styles.quoteTotal} accessibilityLabel="Cheapest total">
                <Text style={styles.quoteTotalText}>💰 {mixSum ? money(mixSum) + (mixPicks.some((p) => !p.offer.total) ? ' +' : '') : 'කවුන්ටරයේදී'}</Text>
              </View>
            </View>
            </>
          )}
        </View>
      )}

      <ThreadSheet target={thread} onClose={() => setThread(null)} />
      {listed.map((c) => {
        const toAsk = c.missing.filter((id) => !asked(c.shopId, id));
        return (
          <View key={c.shopId} style={[styles.row, c.complete && styles.rowBest]} accessibilityLabel={`Quotation ${c.shopName}`}>
            {toAsk.length > 0 && <View style={styles.btns}>
              {toAsk.length > 0 && (
                <Pressable style={styles.ask} onPress={() => toAsk.forEach((id) => askShops(id, [c.shopId]))} accessibilityLabel={`Ask ${c.shopName} for the rest`}>
                  <Text style={styles.askText}>ඉතිරි {toAsk.length} අසන්න</Text>
                </Pressable>
              )}
            </View>}
            <View style={styles.shopHead}>
              <Pressable style={styles.flex1} onPress={() => openShopFor(c.shopId)} accessibilityLabel={`Open ${c.shopName}`}>
                <Text style={styles.shop} numberOfLines={1}>{c.shopName}</Text>
                {!!shopOf(c.shopId) && <Text style={styles.sub}>📍 {shopOf(c.shopId)!.distanceKm} km{shopOf(c.shopId)!.rating ? ` · ★ ${shopOf(c.shopId)!.rating.toFixed(1)}` : ''}</Text>}
              </Pressable>
              <ChatIconButton
                size={36}
                label={`Chat with ${c.shopName}`}
                onPress={() => {
                  const sh = shopOf(c.shopId);
                  const eid = mine.find((o) => o.shop.id === c.shopId)?.enquiryId;
                  if (sh && eid) setThread({ enquiryId: eid, shop: sh });
                }}
              />
              {offerIdsAt(c.shopId).length > 0 && (
                <Pressable style={[styles.addCart, !chosen(c.shopId).length && { opacity: 0.45 }]} disabled={!chosen(c.shopId).length} onPress={() => flyAdd(chosen(c.shopId).map((id) => `${c.shopId}:${id}`), () => addToCart(chosen(c.shopId)), () => setSel((x) => ({ ...x, [c.shopId]: [] })))} accessibilityLabel={`Add ${c.shopName} parts to the cart`}>
                  <Text style={styles.addCartText}>🛒 Add to cart</Text>
                </Pressable>
              )}
            </View>
            {/* The shop's quotation: the parts it has with their prices. Touching a part picks it (it counts in the total and goes to the cart); touching it again lets it go. */}
            <View style={styles.quote}>
              <View style={styles.quoteHeadRow}>
                <Text style={styles.quoteHead}>📋 Quotation · කොටස් ඔබලා තෝරන්න</Text>
                <Pressable onPress={() => setSel((x) => ({ ...x, [c.shopId]: chosen(c.shopId).length === offerIdsAt(c.shopId).length ? [] : offerIdsAt(c.shopId) }))} hitSlop={6} accessibilityLabel="Pick all">
                  <Text style={styles.pickAll}>{chosen(c.shopId).length === offerIdsAt(c.shopId).length ? 'ඉවත් කරන්න' : 'සියල්ල තෝරන්න'}</Text>
                </Pressable>
              </View>
              {ids.map((id) => {
                const o = mine.find((x) => x.shop.id === c.shopId && x.enquiryId === id);
                if (!o || !hasIt(o) || !open(id)) return null;
                const on = chosen(c.shopId).includes(o.id);
                return (
                  <PickRow key={id} on={on} fly={flying.includes(`${c.shopId}:${o.id}`)} onPress={() => toggle(c.shopId, o.id)} label={`${on ? 'Unpick' : 'Pick'} ${name(id)}`}>
                    <View style={styles.flex1}>
                      <Text style={[styles.quoteName, on && styles.quoteNameOn]} numberOfLines={1}>{name(id)}{o.qty > 1 ? ` ×${o.qty}` : ''}</Text>
                      <PartTypeChip type={o.partType} brand={o.brand} compact />
                    </View>
                    <Text style={styles.quotePrice}>{o.total ? money(o.total) : 'කවුන්ටරයේදී'}</Text>
                  </PickRow>
                );
              })}
              {ids.some((id) => !mine.some((x) => x.shop.id === c.shopId && x.enquiryId === id && hasIt(x))) && (
                <Text style={styles.miss} numberOfLines={2}>නැත: {ids.filter((id) => !mine.some((x) => x.shop.id === c.shopId && x.enquiryId === id && hasIt(x))).map(name).join(', ')}</Text>
              )}
            </View>
            <View style={styles.quoteFoot}>
              <Text style={styles.sub}>තෝරපු කොටස් {chosen(c.shopId).length}/{offerIdsAt(c.shopId).length}</Text>
              <View style={styles.quoteTotal} accessibilityLabel={`Quotation total ${c.shopName}`}>
                <Text style={styles.quoteTotalText}>💰 {(() => {
                  const sel = mine.filter((o) => chosen(c.shopId).includes(o.id));
                  const sum = sel.reduce((t, o) => t + o.total, 0);
                  return sum ? money(sum) + (sel.some((o) => !o.total) ? ' +' : '') : 'කවුන්ටරයේදී';
                })()}</Text>
              </View>
            </View>
          </View>
        );
      })}

    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    box: { gap: 10 },
    wallChip: { alignSelf: 'flex-start', paddingHorizontal: 12, minHeight: 36, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#fde293', backgroundColor: getThemeMode() === 'dark' ? 'rgba(253, 214, 99, 0.12)' : '#fef7e0' },
    wallChipText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#fdd663' : '#b06000' },
    wallRowOn: { borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    pickRow: { paddingVertical: 2 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    fchip: { paddingHorizontal: 12, minHeight: 32, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard },
    fchipOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    fchipText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
    fchipTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    mixFull: { fontSize: 15, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#81c995' : '#188038', marginTop: 2 },
    mixCard: { gap: 10, padding: 12, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.12)' : '#e6f4ea', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.4)' : '#81c995', ...elevation1() },
    quoteHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    pickAll: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8', marginTop: 4 },
    pickBox: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#bdc1c6', alignItems: 'center', justifyContent: 'center' },
    pickBoxOn: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
    pickTick: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#ffffff', lineHeight: 14 },
    quoteNameOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    quote: { gap: 2, paddingVertical: 4, borderTopWidth: 1, borderTopColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e8eaed' },
    quoteHead: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.textMuted, marginTop: 6, marginBottom: 2 },
    quoteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 8, paddingHorizontal: 6, minHeight: 38, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: getThemeMode() === 'dark' ? Colors.borderColor : '#f1f3f4' },
    quoteName: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    quotePrice: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    quoteFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 },
    quoteTotal: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.4)' : '#81c995', backgroundColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.1)' : '#e6f4ea' },
    quoteTotalText: { fontSize: 14, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#81c995' : '#188038' },
    wallBox: { gap: 8, padding: 10, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? 'rgba(253, 214, 99, 0.08)' : '#fef7e0', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#fde293' },
    wallRow: { gap: 6, padding: 8, borderRadius: 10, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    descInput: { minHeight: 44, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.borderColor, color: Colors.textMain, fontSize: 12.5, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top' },
    heading: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    wait: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#fdd663' : '#b06000', lineHeight: 18 },
    row: { gap: 10, padding: 12, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    rowBest: { borderColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.5)' : '#81c995' },
    shop: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    sub: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    off: { textDecorationLine: 'line-through' },
    miss: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: getThemeMode() === 'dark' ? '#fdd663' : '#b06000', lineHeight: 16 },
    ask: { paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: 18, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    shopHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    addCart: { paddingHorizontal: 10, minHeight: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8' },
    addCartText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: '#ffffff' },
    btns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
    reserve: { backgroundColor: '#1a73e8' },
    reserveText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: '#ffffff' },
    mixBtn: { alignSelf: 'flex-start' },
    askText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    pick: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    total: { fontSize: 13, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#81c995' : '#188038', marginTop: 2 },
  })
);
