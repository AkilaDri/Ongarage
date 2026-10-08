import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Linking, type NativeScrollEvent, type NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ActionButton,
  availabilityAt,
  canonicalPartName,
  Colors,
  EmptyState,
  FONTS,
  getThemeMode,
  Gradient,
  dealFor,
  dealPrice,
  featuredShops,
  kitOffers,
  liveDeals,
  martBanners,
  martOffers,
  martShopInfo,
  organicRows,
  PART_GROUPS,
  NAVY,
  nextRing,
  onWall,
  PinnedEdge,
  rankShops,
  SEARCH_RINGS,
  SERVICE_KITS,
  SPONSORED_SHOP_IDS,
  ShopCard,
  shopPriceFor,
  shopsInRing,
  shopsNear,
  SortChips,
  themedStyles,
  usePinnedEdge,
  softEdge,
  softFill,
  softShadow,
  type MartSort,
  type PartType,
  type SearchRing,
  type ShopAvailability,
  type DealView,
  type JobPartsRef,
  type MartTarget,
  type PartBrief,
  type PartGroup,
  type ServiceKit,
  type ShopListing,
  type ShopOffer,
} from '@ongarage/shared';
import { useUserLocation } from '../context/LocationContext';
import { useVehicles } from '../context/VehiclesContext';
import { ACTIVE_STAGES, useMart } from '../context/MartContext';
import { EnquiryCard } from '../components/mart/EnquiryCard';
import { EnquirySheet, type EnquiryPrefill } from '../components/mart/EnquirySheet';
import { ShopSheet } from '../components/mart/ShopSheet';
import { OrdersList } from '../components/mart/OrdersList';
import { JobPartsToBuy, type JobPartItem } from '../components/mart/JobPartsToBuy';
import { KitSheet } from '../components/mart/KitSheet';
import { PartStrip } from '../components/mart/PartStrip';
import { MartBannerCarousel } from '../components/mart/MartBannerCarousel';
import { DealsSection } from '../components/mart/DealsSection';
import { ShopRow } from '../components/mart/ShopRow';
import { Reveal } from '../components/mart/Reveal';
import { KitCards } from '../components/mart/KitCards';
import { OfferTiles } from '../components/home/OfferTiles';
import { ReserveSheet } from '../components/mart/ReserveSheet';
import { ThreadSheet, type ThreadTarget } from '../components/mart/ThreadSheet';

/**
 * OnMart: the spare-parts marketplace. It opens on the shops nearest the owner, which can be sorted by rating,
 * price, reply speed or service, and searched for a part (live-stock shops show whether they have it; the rest
 * are asked). Nothing nearby? Widen the search to 50 km, then to the whole country, or post on the open wall.
 */
const ACTION_H = 58;
const ASK_STOPS = [{ offset: '0', color: '#2a4690' }, { offset: '1', color: '#0f2050' }];
const WALL_STOPS = [{ offset: '0', color: '#8b5cf6' }, { offset: '1', color: '#d946ef' }];

type Segment = 'shops' | 'mine' | 'wall' | 'orders';

const TYPES: { id: PartType; label: string }[] = [
  { id: 'GarageChoice', label: 'ඕනෑම' },
  { id: 'Genuine', label: 'Genuine' },
  { id: 'OEM', label: 'OEM' },
  { id: 'Recon', label: 'Recon' },
];

export const MartScreen: React.FC<{ activeVehicle: string }> = ({ activeVehicle }) => {
  const { coords } = useUserLocation();
  const { enquiries, offersFor, widen, postToWall, cancelEnquiry, purchases, purchaseFor } = useMart();
  const { progress: edge, scrollProps } = usePinnedEdge();
  const [segment, setSegment] = useState<Segment>('shops');
  const [sort, setSort] = useState<MartSort>('distance');
  const [ring, setRing] = useState<SearchRing>('nearby');
  const [query, setQuery] = useState('');
  const [partType, setPartType] = useState<PartType>('GarageChoice');
  const [shop, setShop] = useState<ShopListing | null>(null);
  const [composer, setComposer] = useState<{ open: boolean; prefill?: EnquiryPrefill }>({ open: false });
  const [reserving, setReserving] = useState<{ offer: ShopOffer; brief: PartBrief; jobRef?: JobPartsRef } | null>(null);
  const [thread, setThread] = useState<ThreadTarget | null>(null);
  const [kit, setKit] = useState<ServiceKit | null>(null);
  const [now, setNow] = useState(Date.now());
  const all = useMemo(() => shopsNear(coords), [coords]);
  // The landing page's banners, offers and deals (a backend would serve them).
  const banners = useMemo(() => martBanners(Date.now()), []);
  const offers = useMemo(() => martOffers(Date.now()), []);
  const deals = useMemo(() => liveDeals(Date.now(), coords), [coords]);
  // The shop rows: paid Featured shops (ads), then rows computed only from each shop's own numbers.
  const info = useMemo(() => martShopInfo(Date.now()), []);
  const featured = useMemo(() => featuredShops(all, SPONSORED_SHOP_IDS), [all]);
  const rows = useMemo(() => organicRows(shopsInRing(all, 'wider'), info, Date.now()), [all, info]);
  const kitBest = useMemo(() => Object.fromEntries(SERVICE_KITS.map((k) => [k.id, kitOffers(k, shopsInRing(all, 'wider'))[0]])), [all]);
  const allY = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const dealsY = useRef(0);
  // The two action cards under the search bar fold away as the page scrolls (like the banners on Home).
  const collapse = useRef(new Animated.Value(0)).current;
  const car = useVehicles().findVehicle(activeVehicle);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollProps.onScroll(e);
    collapse.setValue(Math.min(1, Math.max(0, e.nativeEvent.contentOffset.y / 60)));
  };

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const q = query.trim();
  const searching = q.length > 0;
  const partName = searching ? canonicalPartName(q) : null;
  const inRing = useMemo(() => shopsInRing(all, ring), [all, ring]);
  const shops = useMemo(
    () => rankShops(inRing, sort, { priceOf: partName ? (s) => shopPriceFor(s.id, partName, partType) : undefined, liveStockFirst: searching }),
    [inRing, sort, partName, partType, searching]
  );

  const availability = (s: ShopListing): ShopAvailability | undefined => {
    if (!searching) return undefined;
    if (!partName || !s.liveStock) return { state: 'ask' };
    const a = availabilityAt(s.id, partName, partType);
    const deal = a && dealFor(s.id, partName, a.partType);
    return a ? { state: a.lowStock ? 'low' : 'inStock', price: deal ? dealPrice(a.price, deal.discountPercent) : a.price, qty: a.qty, partType: a.partType, brand: a.brand } : { state: 'out' };
  };
  const anyHave = !!partName && shops.some((s) => s.liveStock && !!availabilityAt(s.id, partName, partType));
  const widerRing = nextRing(ring);

  const open = (prefill?: EnquiryPrefill) => setComposer({ open: true, prefill });
  const buyForJob = (i: JobPartItem) =>
    open({
      name: i.line.name,
      partType: i.line.partType ?? 'GarageChoice',
      qty: i.line.qty,
      partNo: i.line.partNo,
      vehicleId: i.vehicleId,
      audience: 'shops',
      jobRef: { bookingId: i.workshopId, lineId: i.line.id, garage: { id: i.garageName, name: i.garageName }, recommendedShopIds: i.line.recommendedShopIds ?? [] },
    });
  const askAbout = (audience: 'shops' | 'wall') => open({ name: partName ?? q, partType, audience });
  const openTarget = (t: MartTarget) => {
    if (t.kind === 'shop') {
      const s = all.find((x) => x.id === t.shopId);
      if (s) setShop(s);
    } else if (t.kind === 'search') setQuery(t.query);
    else if (t.kind === 'kit') setKit(SERVICE_KITS.find((k) => k.id === t.kitId) ?? null);
    else if (t.kind === 'wall') setSegment('wall');
    else scrollRef.current?.scrollTo({ y: dealsY.current, animated: true });
  };
  const seeAll = (by?: MartSort) => {
    if (by) setSort(by);
    scrollRef.current?.scrollTo({ y: allY.current, animated: true });
  };
  const openGroup = (g: PartGroup) => setQuery(g.query);
  const openDeal = (d: DealView) => open({ name: d.deal.partName, partType: d.deal.partType, onlyShopIds: [d.shop.id], shopName: d.shop.name, audience: 'shops' });
  const openShop = (id: string) => {
    const s = all.find((x) => x.id === id);
    if (s) setShop(s);
  };

  const live = enquiries.filter((m) => m.enquiry.status === 'open' && m.enquiry.quoteUntil > now);
  const wallPosts = enquiries.filter((m) => onWall(m.enquiry.audience));
  const segments: { id: Segment; label: string; count: number }[] = [
    { id: 'shops', label: 'වෙළඳසැල්', count: 0 },
    { id: 'mine', label: 'මගේ ඉල්ලීම්', count: live.length },
    { id: 'wall', label: 'විවෘත', count: wallPosts.filter((m) => live.includes(m)).length },
    { id: 'orders', label: 'ඇණවුම්', count: purchases.filter((p) => ACTIVE_STAGES.includes(p.stage)).length },
  ];

  const card = (m: (typeof enquiries)[number]) => (
    <EnquiryCard
      key={m.enquiry.id}
      me={m}
      offers={offersFor(m.enquiry.id)}
      now={now}
      onOpenShop={openShop}
      onWiden={() => widen(m.enquiry.id)}
      onWall={() => postToWall(m.enquiry.id)}
      onCancel={() => cancelEnquiry(m.enquiry.id)}
      purchase={purchaseFor(m.enquiry.id)}
      onReserve={(offer) => setReserving({ offer, brief: m.enquiry.briefs.find((b) => b.id === offer.briefId) ?? m.enquiry.briefs[0], jobRef: m.enquiry.jobRef })}
      onChat={(offer) => setThread({ enquiryId: m.enquiry.id, shop: offer.shop })}
      onOpenOrders={() => setSegment('orders')}
    />
  );

  return (
    <View style={styles.flex1}>
      <View style={styles.pinned}>
        <PinnedEdge progress={edge} />
        <View style={styles.tabBar}>
          {segments.map((t) => {
            const active = segment === t.id;
            return (
              <Pressable key={t.id} style={[styles.tab, active && styles.tabActive]} onPress={() => setSegment(t.id)} accessibilityLabel={`OnMart ${t.id}`}>
                <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
                  {t.label}
                </Text>
                {t.count > 0 && (
                  <View style={[styles.tabCount, active && styles.tabCountActive]}>
                    <Text style={[styles.tabCountText, active && { color: '#fff' }]}>{t.count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
        {segment === 'shops' && (
          <>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.search}
                value={query}
                onChangeText={setQuery}
                placeholder="🔍 කොටසක් සොයන්න (brake pad, බැටරි, alternator…)"
                placeholderTextColor={Colors.textMuted}
                accessibilityLabel="Search parts"
              />
              {searching && (
                <Pressable style={styles.clear} onPress={() => setQuery('')} accessibilityLabel="Clear search">
                  <Text style={styles.clearText}>✕</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.fitLine} numberOfLines={1}>
              🚗 {car.name} · {car.plate} සඳහා ගැළපෙන කොටස් පෙන්වයි
            </Text>
            {!searching && (
              <Animated.View style={[styles.actions, { height: collapse.interpolate({ inputRange: [0, 1], outputRange: [ACTION_H, 0] }), opacity: collapse.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>
                <Pressable style={styles.actionCard} onPress={() => open()} accessibilityLabel="Ask for a part">
                  <Gradient stops={ASK_STOPS} />
                  <View style={styles.actionText}>
                    <Text style={styles.actionTitle}>කොටසක් ඉල්ලන්න</Text>
                    <Text style={styles.actionSub} numberOfLines={1}>
                      ළඟ වෙළඳසැල්වලින් මිල ගන්න
                    </Text>
                  </View>
                  <Text style={styles.actionEmoji}>📨</Text>
                </Pressable>
                <Pressable style={styles.actionCard} onPress={() => setSegment('wall')} accessibilityLabel="Open wall shortcut">
                  <Gradient stops={WALL_STOPS} />
                  <View style={styles.actionText}>
                    <Text style={styles.actionTitle}>දුර්ලභ කොටස් වෝල්</Text>
                    <Text style={styles.actionSub} numberOfLines={1}>
                      ලංකාව පුරා වෙළඳසැල්වලට
                    </Text>
                  </View>
                  <Text style={styles.actionEmoji}>📣</Text>
                </Pressable>
              </Animated.View>
            )}
            <SortChips value={sort} onChange={setSort} />
          </>
        )}
      </View>

      <ScrollView ref={scrollRef} style={styles.flex1} {...scrollProps} onScroll={onScroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {(segment === 'shops' || segment === 'orders') && <JobPartsToBuy onBuy={buyForJob} />}

        {segment === 'shops' && !searching && (
          <>
            <Reveal delay={0}>
              <Text style={styles.sectionTitle}>කොටස් වර්ග</Text>
              <PartStrip onSelect={openGroup} />
            </Reveal>
            <Reveal delay={70}>
              <MartBannerCarousel banners={banners} onOpen={(b) => openTarget(b.target)} />
            </Reveal>
            <Reveal delay={140}>
              <Text style={styles.sectionTitle}>ගනුදෙනු සහ දීමනා</Text>
              <OfferTiles offers={offers} onOpen={(o) => openTarget(o.target)} />
            </Reveal>
            <Reveal delay={210}>
              <Text style={styles.sectionTitle}>සේවා කට්ටල</Text>
              <KitCards kits={SERVICE_KITS} best={kitBest} onOpen={setKit} />
            </Reveal>
            {deals.length > 0 && (
              <Reveal delay={280} onLayout={(e) => (dealsY.current = e.nativeEvent.layout.y)}>
                <Text style={styles.sectionTitle}>🏷️ ඔබට ළඟම දීමනා</Text>
                <DealsSection deals={deals} now={now} onOpen={openDeal} />
              </Reveal>
            )}
            <ShopRow title="විශේෂාංග · දැන්වීම්" ad shops={featured} info={info} onOpen={setShop} />
            <ShopRow title="ඉක්මනින් පිළිතුරු දෙන" shops={rows.fast} info={info} onOpen={setShop} onSeeAll={() => seeAll('response')} />
            <ShopRow title="ඉහළම ශ්‍රේණිගත" shops={rows.topRated} info={info} onOpen={setShop} onSeeAll={() => seeAll('rating')} />
            <ShopRow title="ඔබට ළඟම" shops={rows.nearest} info={info} onOpen={setShop} onSeeAll={() => seeAll('distance')} />
            <ShopRow title="අලුතින් එක් වූ" shops={rows.newlyJoined} info={info} onOpen={setShop} onSeeAll={() => seeAll()} />
            <ShopRow title="සජීවී තොගය පෙන්වන" shops={rows.liveStock} info={info} onOpen={setShop} onSeeAll={() => seeAll()} />
            <View onLayout={(e) => (allY.current = e.nativeEvent.layout.y)}>
              <Text style={styles.sectionTitle}>සියලු වෙළඳසැල්</Text>
              <Text style={styles.sub}>දැන්වීම් පෙළ අනුපිළිවෙලට කිසිදු බලපෑමක් නොකරයි.</Text>
            </View>
          </>
        )}

        {segment === 'shops' && (
          <>
            <View style={styles.chips}>
              {SEARCH_RINGS.map((r) => (
                <Pressable key={r.ring} style={[styles.chip, ring === r.ring && styles.chipOn]} onPress={() => setRing(r.ring)} accessibilityLabel={`Range ${r.ring}`}>
                  <Text style={[styles.chipText, ring === r.ring && styles.chipTextOn]}>{r.label}</Text>
                </Pressable>
              ))}
            </View>


            {searching && (
              <View style={styles.search2}>
                <Text style={styles.title}>🔍 {partName ?? q}</Text>
                <Text style={styles.sub}>{partName ? 'සජීවී තොගය පෙන්වන වෙළඳසැල්වල තිබේදැයි පහත පෙනේ; අනෙක් වෙළඳසැල්වලින් අසන්න.' : 'මෙම නම හඳුනා ගත නොහැකි නිසා සෑම වෙළඳසැලකින්ම අසන්න.'}</Text>
                <View style={styles.chips}>
                  {TYPES.map((t) => (
                    <Pressable key={t.id} style={[styles.chip, partType === t.id && styles.chipOn]} onPress={() => setPartType(t.id)}>
                      <Text style={[styles.chipText, partType === t.id && styles.chipTextOn]}>{t.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <ActionButton label="සියලු වෙළඳසැල්වලින් අසන්න" icon="📨" variant="primary" compact onPress={() => askAbout('shops')} />
                <ActionButton label="විවෘත දුර්ලභ කොටස් පෝස්ට් එකට දමන්න" icon="📣" variant="success" compact onPress={() => askAbout('wall')} />
                {partName && !anyHave && widerRing && (
                  <Pressable style={styles.suggest} onPress={() => setRing(widerRing)} accessibilityLabel="Widen range">
                    <Text style={styles.suggestText}>ළඟ සජීවී තොගයක් නැත — {SEARCH_RINGS.find((r) => r.ring === widerRing)!.label} බලන්න ›</Text>
                  </Pressable>
                )}
              </View>
            )}

            <Text style={styles.count}>
              {shops.length} වෙළඳසැල් · {SEARCH_RINGS.find((r) => r.ring === ring)!.label}
            </Text>
            <Text style={styles.sub}>වෙළඳසැල් අනුපිළිවෙල ගරාජවල කොමිස් මත රඳා නොපවතී — ඔබ තෝරන ක්‍රමයට පමණි.</Text>
            {shops.length === 0 ? (
              <EmptyState icon="🔩" title="ළඟ වෙළඳසැල් නැත" text={widerRing ? 'පරාසය විශාල කර බලන්න.' : 'වෙළඳසැල් හමු නොවීය.'} />
            ) : (
              shops.map((s) => <ShopCard key={s.id} shop={s} availability={availability(s)} onPress={() => setShop(s)} onCall={() => Linking.openURL(`tel:${s.phone.replace(/\s/g, '')}`)} />)
            )}
            {shops.length > 0 && widerRing && (
              <Pressable style={styles.suggest} onPress={() => setRing(widerRing)} accessibilityLabel="Show more shops">
                <Text style={styles.suggestText}>තවත් වෙළඳසැල් බලන්න · {SEARCH_RINGS.find((r) => r.ring === widerRing)!.label} ›</Text>
              </Pressable>
            )}
          </>
        )}

        {segment === 'mine' &&
          (enquiries.length === 0 ? (
            <>
              <EmptyState icon="📨" title="ඉල්ලීම් නැත" text="කොටසක් සොයා “අසන්න” ඔබන්න. වෙළඳසැල් පිළිතුරු දෙන විට ඒවා මිල අනුව මෙහි පෙන්වයි." />
              <ActionButton label="කොටසක් ඉල්ලන්න" icon="＋" variant="primary" onPress={() => open()} />
            </>
          ) : (
            enquiries.map(card)
          ))}

        {segment === 'wall' && (
          <>
            <View style={styles.wallBox}>
              <Text style={styles.title}>📣 විවෘත දුර්ලභ කොටස් සෙවීමේ වෝල්</Text>
              <Text style={styles.sub}>ළඟ වෙළඳසැල්වල නැති දුර්ලභ කොටසක්ද? එය ලංකාවේ සියලු වෙළඳසැල්වලට පෙන්වන්න. කොටස අලෙවි කරන වර්ගයේ වෙළඳසැල්වලට පමණක් පෙනේ; ඔබගේ දුරකථන අංකය පෙන්වන්නේ නැත. කොටස ඇති වෙළඳසැලක් පිළිතුරු දෙයි.</Text>
              <ActionButton label="නව පෝස්ට් එකක්" icon="📣" variant="success" compact onPress={() => open({ audience: 'wall' })} />
            </View>
            {wallPosts.length === 0 ? <EmptyState icon="📭" title="පෝස්ට් නැත" text="ඔබ විවෘත වෝල් එකට දමන කොටස් මෙහි පෙන්වයි." /> : wallPosts.map(card)}
          </>
        )}
        {segment === 'orders' && <OrdersList />}
      </ScrollView>

      <ShopSheet
        shop={shop}
        onClose={() => setShop(null)}
        onAsk={(s) => {
          setShop(null);
          open({ onlyShopIds: [s.id], shopName: s.name, partType, name: partName ?? q, audience: 'shops' });
        }}
      />
      <ReserveSheet offer={reserving?.offer ?? null} brief={reserving?.brief ?? null} jobRef={reserving?.jobRef} onClose={() => setReserving(null)} onReserved={() => setSegment('orders')} />
      <ThreadSheet target={thread} onClose={() => setThread(null)} />
      <KitSheet kit={kit} vehicleId={activeVehicle} onClose={() => setKit(null)} onSent={() => setSegment('mine')} />
      <EnquirySheet
        visible={composer.open}
        vehicleId={activeVehicle}
        prefill={composer.prefill}
        onClose={() => setComposer((c) => ({ ...c, open: false }))}
        onSent={(_id, audience) => setSegment(audience === 'wall' ? 'wall' : 'mine')}
      />
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    pinned: { zIndex: 5, paddingTop: 12, paddingBottom: 10, gap: 10, backgroundColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff' },
    tabBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 20, backgroundColor: softFill() },
    tabActive: { backgroundColor: NAVY, shadowColor: NAVY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 8, elevation: 4 },
    tabText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    tabTextActive: { color: '#ffffff' },
    tabCount: { position: 'absolute', top: -7, right: -4, minWidth: 19, height: 19, paddingHorizontal: 5, borderRadius: 10, borderWidth: 2, borderColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff', backgroundColor: Colors.bgCardHover, alignItems: 'center', justifyContent: 'center' },
    tabCountActive: { backgroundColor: '#4ca1d1' },
    tabCountText: { fontSize: 9.5, fontWeight: '800', color: Colors.textMuted },
    searchRow: { paddingHorizontal: 16, justifyContent: 'center' },
    search: { height: 50, paddingHorizontal: 18, paddingRight: 46, borderRadius: 25, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), color: Colors.textMain, fontSize: 13, fontFamily: FONTS.bodyRegular, ...softShadow() },
    fitLine: { paddingHorizontal: 20, fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, marginTop: -4 },
    actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, overflow: 'hidden' },
    actionCard: { flex: 1, height: ACTION_H, borderRadius: 18, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
    actionText: { flex: 1, gap: 1 },
    actionTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: '#fff' },
    actionSub: { fontSize: 9.5, fontFamily: FONTS.bodyMedium, color: 'rgba(255, 255, 255, 0.9)' },
    actionEmoji: { fontSize: 26 },
    clear: { position: 'absolute', right: 28, width: 26, height: 26, borderRadius: 13, backgroundColor: softFill(), alignItems: 'center', justifyContent: 'center' },
    clearText: { fontSize: 11, color: Colors.textMuted },
    body: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 110 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: softFill(), borderWidth: 1, borderColor: softEdge() },
    chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    chipTextOn: { color: '#ffffff' },
    sectionTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    count: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    title: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    search2: { gap: 10, padding: 14, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), ...softShadow() },
    suggest: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, backgroundColor: 'rgba(2, 132, 199, 0.12)' },
    suggestText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    wallBox: { gap: 10, padding: 14, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), ...softShadow() },
  })
);
