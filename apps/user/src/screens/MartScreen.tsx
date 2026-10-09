import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Linking, Platform, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
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
  GoogleMap,
  kitOffers,
  liveDeals,
  MART_STOCK,
  martBanners,
  martOffers,
  martShopInfo,
  organicRows,
  PART_GROUPS,
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
import { useMart } from '../context/MartContext';
import { EnquiryCard } from '../components/mart/EnquiryCard';
import { EnquirySheet, type EnquiryPrefill } from '../components/mart/EnquirySheet';
import { ShopSheet } from '../components/mart/ShopSheet';
import { OrdersList } from '../components/mart/OrdersList';
import { WallFeed, WallFilters, type FeedPost } from '../components/mart/WallFeed';
import { JobPartsToBuy, type JobPartItem } from '../components/mart/JobPartsToBuy';
import { KitSheet } from '../components/mart/KitSheet';
import { MartBannerCarousel } from '../components/mart/MartBannerCarousel';
import { DealsSection } from '../components/mart/DealsSection';
import { ShopRow } from '../components/mart/ShopRow';
import { Reveal } from '../components/mart/Reveal';
import { KitCards } from '../components/mart/KitCards';
import { OfferTiles } from '../components/home/OfferTiles';
import { ReserveSheet } from '../components/mart/ReserveSheet';
import { ThreadSheet, type ThreadTarget } from '../components/mart/ThreadSheet';
import type { MartSegment } from '../constants/tabs';

/**
 * OnMart: the spare-parts marketplace. It opens on the shops nearest the owner, which can be sorted by rating,
 * price, reply speed or service, and searched for a part (live-stock shops show whether they have it; the rest
 * are asked). Nothing nearby? Widen the search to 50 km, then to the whole country, or post on the open wall.
 */
const ASK_STOPS = [{ offset: '0', color: '#2a4690' }, { offset: '1', color: '#0f2050' }];
const WALL_STOPS = [{ offset: '0', color: '#8b5cf6' }, { offset: '1', color: '#d946ef' }];
const ACTION_H = 58;
const MAP_ZOOM: Record<SearchRing, number> = { nearby: 12, wider: 10, nationwide: 7 };

const TYPES: { id: PartType; label: string }[] = [
  { id: 'GarageChoice', label: 'ඕනෑම' },
  { id: 'Genuine', label: 'Genuine' },
  { id: 'OEM', label: 'OEM' },
  { id: 'Recon', label: 'Recon' },
];

const MAP_GROUPS: PartGroup[] = [
  ...PART_GROUPS,
  { id: 'hybrid', name: 'හයිබ්‍රිඩ්', emoji: '🔋', serviceCategoryId: '3', query: 'battery' },
];

type MartScreenProps = {
  activeVehicle: string;
  segment: MartSegment;
  onSegmentChange: (segment: MartSegment) => void;
  onHeaderVisibilityChange: (visible: boolean) => void;
};

export const MartScreen: React.FC<MartScreenProps> = ({ activeVehicle, segment, onSegmentChange, onHeaderVisibilityChange }) => {
  const { coords } = useUserLocation();
  const { enquiries, offersFor, widen, postToWall, cancelEnquiry, purchaseFor } = useMart();
  const { progress: edge, scrollProps } = usePinnedEdge();
  const [sort, setSort] = useState<MartSort>('distance');
  const [ring, setRing] = useState<SearchRing>('nearby');
  const [query, setQuery] = useState('');
  const [wallCategory, setWallCategory] = useState('');
  const [partType, setPartType] = useState<PartType>('GarageChoice');
  const [category, setCategory] = useState<PartGroup | null>(null);
  const [shop, setShop] = useState<ShopListing | null>(null);
  const [stockWindowOpen, setStockWindowOpen] = useState(false);
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
  const rootHeight = useRef(0);
  const pinnedHeight = useRef(0);
  const sheetLimits = useRef({ collapsed: 0, expanded: 0 });
  const sheetStart = useRef(0);
  const sheetExpanded = useRef(false);
  const sheetHeight = useRef(new Animated.Value(0)).current;
  const previousScrollY = useRef(0);
  const contentY = useRef(0);
  const [sheetReady, setSheetReady] = useState(false);
  // The nearby-shops summary card only shows while the sheet is pulled down.
  const [sheetUp, setSheetUp] = useState(false);
  const car = useVehicles().findVehicle(activeVehicle);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollProps.onScroll(e);
    const y = e.nativeEvent.contentOffset.y;
    contentY.current = y;
    if (y > previousScrollY.current + 8 && y > 12) onHeaderVisibilityChange(false);
    else if (y < previousScrollY.current - 8) onHeaderVisibilityChange(true);
    previousScrollY.current = y;
  };
  const setSegment = (next: MartSegment) => {
    onSegmentChange(next);
    onHeaderVisibilityChange(true);
  };
  const toggleShopSheet = () => {
    const expand = !sheetExpanded.current;
    snapSheet(expand);
    onHeaderVisibilityChange(!expand);
  };
  const updateSheetBounds = (height: number, pinned: number) => {
    const expanded = Math.max(0, height - pinned);
    const collapsed = Math.min(expanded, Math.max(150, expanded * 0.36));
    sheetLimits.current = { collapsed, expanded };
    sheetHeight.setValue(sheetExpanded.current ? expanded : collapsed);
    setSheetReady(expanded > 0);
  };
  const snapSheet = (expanded: boolean) => {
    sheetExpanded.current = expanded;
    setSheetUp(expanded);
    // A short ease-out glide (no bounce) so the sheet settles smoothly.
    Animated.timing(sheetHeight, {
      toValue: expanded ? sheetLimits.current.expanded : sheetLimits.current.collapsed,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };
  // On the web the mouse wheel / trackpad has no drag gesture: scrolling down lifts the sheet, scrolling up at the top lowers it.
  const sheetNode = useRef<any>(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || segment !== 'shops') return;
    const el = sheetNode.current as HTMLElement | null;
    if (!el?.addEventListener) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 4) return;
      if (!sheetExpanded.current && e.deltaY > 0) {
        snapSheet(true);
        onHeaderVisibilityChange(false);
        e.preventDefault();
      } else if (sheetExpanded.current && e.deltaY < 0 && contentY.current <= 0) {
        snapSheet(false);
        onHeaderVisibilityChange(true);
        e.preventDefault();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment, sheetReady]);
  const sheetPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        // Collapsed: any upward drag lifts the sheet. Expanded: a downward drag lowers it once the list is back at the top.
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Math.abs(gesture.dy) > 6 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx) &&
          (sheetExpanded.current ? gesture.dy > 0 && contentY.current <= 0 : gesture.dy < 0),
        onPanResponderGrant: () => sheetHeight.stopAnimation((value) => (sheetStart.current = value)),
        onPanResponderMove: (_, gesture) => {
          const { collapsed, expanded } = sheetLimits.current;
          sheetHeight.setValue(Math.min(expanded, Math.max(collapsed, sheetStart.current - gesture.dy)));
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy < -55) {
            snapSheet(true);
            onHeaderVisibilityChange(false);
          } else if (gesture.dy > 55) {
            snapSheet(false);
            onHeaderVisibilityChange(true);
          }
          else snapSheet(gesture.vy < -0.35);
        },
        onPanResponderTerminate: () => snapSheet(sheetExpanded.current),
      }),
    [onHeaderVisibilityChange, sheetHeight]
  );

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    previousScrollY.current = 0;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    onHeaderVisibilityChange(true);
    if (segment === 'shops') snapSheet(false);
  }, [onHeaderVisibilityChange, segment]);

  const q = query.trim();
  const searching = q.length > 0;
  const partName = searching ? canonicalPartName(q) : null;
  const inRing = useMemo(() => shopsInRing(all, ring), [all, ring]);
  const categoryShops = useMemo(
    () => (category ? inRing.filter((s) => s.categories.includes(category.serviceCategoryId)) : inRing),
    [category, inRing]
  );
  const shops = useMemo(
    () => rankShops(categoryShops, sort, { priceOf: partName ? (s) => shopPriceFor(s.id, partName, partType) : undefined, liveStockFirst: searching }),
    [categoryShops, sort, partName, partType, searching]
  );
  const publishedStock = useMemo(
    () =>
      shopsInRing(all, 'wider').filter((s) => s.liveStock).flatMap((s) =>
        (MART_STOCK[s.id] ?? [])
          .filter((line) => line.qty > 0 && (!category || s.categories.includes(category.serviceCategoryId)))
          .map((line) => ({ shop: s, line }))
      ),
    [all, category]
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
  const openGroup = (g: PartGroup) => {
    setCategory((current) => (current?.id === g.id ? null : g));
    setQuery((current) => (category?.id === g.id && current === g.query ? '' : g.query));
    snapSheet(true);
  };
  const openDeal = (d: DealView) => open({ name: d.deal.partName, partType: d.deal.partType, onlyShopIds: [d.shop.id], shopName: d.shop.name, audience: 'shops' });
  const openShop = (id: string) => {
    const s = all.find((x) => x.id === id);
    if (s) setShop(s);
  };

  const wallPosts = enquiries.filter((m) => onWall(m.enquiry.audience) && m.enquiry.status !== 'cancelled');

  const card =(m: (typeof enquiries)[number]) => (
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

  // The owner's own wall requests, shown in the feed beside everyone else's posts.
  const myWallPosts: FeedPost[] = wallPosts.map((m) => {
    const brief = m.enquiry.briefs[0];
    return {
      id: `mine-${m.enquiry.id}`,
      author: 'ඔබ',
      place: 'ඔබගේ පෝස්ට්',
      at: m.enquiry.createdAt,
      part: brief.name,
      description: brief.note ?? '',
      vehicle: `${brief.vehicle.name} · ${brief.vehicle.plate}`,
      photos: brief.photos ?? [],
      baseLikes: 0,
      categoryId: brief.categoryId,
      mine: true,
      // A reserved or bought part is a live order, so it cannot be deleted from the wall.
      onDelete: m.enquiry.status === 'reserved' || m.enquiry.status === 'bought' ? undefined : () => cancelEnquiry(m.enquiry.id),
      details: card(m),
    };
  });

  return (
    <View
      style={styles.flex1}
      onLayout={(e) => {
        rootHeight.current = e.nativeEvent.layout.height;
        updateSheetBounds(rootHeight.current, pinnedHeight.current);
      }}
    >
      {segment === 'shops' && (
        <GoogleMap
          center={coords}
          zoom={MAP_ZOOM[ring]}
          style={StyleSheet.absoluteFill}
          renderOverlay={(project) => {
            const ownerPoint = project(coords);
            return (
              <>
                {ownerPoint && (
                  <View
                    pointerEvents="none"
                    style={[styles.ownerMarker, { left: ownerPoint.x - 12, top: ownerPoint.y - 12 }]}
                    accessibilityLabel="My location"
                  >
                    <View style={styles.ownerMarkerDot} />
                  </View>
                )}
                {categoryShops.map((s) => {
                  const point = project(s.coords);
                  return point ? (
                    <Pressable
                      key={s.id}
                      style={[styles.mapShopMarker, { left: point.x - 17, top: point.y - 17 }]}
                      onPress={() => setShop(s)}
                      accessibilityLabel={`Map shop ${s.name}`}
                    >
                      <Text style={styles.mapShopMarkerText}>🏪</Text>
                    </Pressable>
                  ) : null;
                })}
              </>
            );
          }}
        />
      )}
      <View
        style={styles.pinned}
        onLayout={(e) => {
          pinnedHeight.current = e.nativeEvent.layout.height;
          updateSheetBounds(rootHeight.current, pinnedHeight.current);
        }}
      >
        <PinnedEdge progress={edge} />
        {segment === 'wall' && <WallFilters category={wallCategory} onChange={setWallCategory} />}
        {segment === 'shops' && (
          <>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.search}
                value={query}
                onChangeText={(value) => {
                  setQuery(value);
                  if (value.trim()) snapSheet(true);
                }}
                placeholder="🔍 කොටසක් සොයන්න (brake pad, බැටරි, alternator…)"
                placeholderTextColor={Colors.textMuted}
                accessibilityLabel="Search parts"
              />
              {searching && (
                <Pressable style={styles.clear} onPress={() => setQuery('')} accessibilityLabel="Clear search">
                  <Text style={styles.clearText}>✕</Text>
                </Pressable>
              )}
              <Pressable
                style={styles.mapButton}
                onPress={() => {
                  previousScrollY.current = 0;
                  scrollRef.current?.scrollTo({ y: 0, animated: false });
                  snapSheet(false);
                  onHeaderVisibilityChange(true);
                }}
                accessibilityLabel="Show map"
              >
                <Text style={styles.mapButtonText}>📍 මැප්</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTabs}>
              {MAP_GROUPS.map((g) => {
                const active = category?.id === g.id;
                return (
                  <Pressable
                    key={g.id}
                    style={[styles.categoryTab, active && styles.categoryTabActive]}
                    onPress={() => openGroup(g)}
                    accessibilityLabel={`Part group ${g.id}`}
                  >
                    <Text style={styles.categoryEmoji}>{g.emoji}</Text>
                    <Text style={[styles.categoryText, active && styles.categoryTextActive]} numberOfLines={1}>{g.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}
      </View>

      <Animated.View
        ref={sheetNode}
        style={[
          segment === 'shops' ? styles.shopSheet : styles.flex1,
          segment === 'shops' && { height: sheetReady ? sheetHeight : 0 },
        ]}
        {...(segment === 'shops' ? sheetPan.panHandlers : {})}
      >
        {segment === 'shops' && (
          <>
            {!sheetUp && (
              <Pressable style={styles.sheetHandle} onPress={toggleShopSheet} accessibilityRole="button" accessibilityLabel="Toggle shop list">
                <View style={styles.sheetGrip} />
                <Text style={styles.sheetHint}>ඉහළට අදින්න · වෙළඳසැල් සහ මිල ගණන්</Text>
              </Pressable>
            )}
            {!sheetUp && <View style={styles.sheetHeading}>
              <View style={styles.sheetHeadingText}>
                <Text style={styles.sheetTitle}>{searching ? `🔎 ${partName ?? q}` : '📍 ඔබට ළඟම ඇති වෙළඳසැල්'}</Text>
                <Text style={styles.sheetSubtitle}>🚗 {car.name} · {car.plate}  |  {shops.length} වෙළඳසැල්</Text>
              </View>
              <Pressable style={styles.stockButton} onPress={() => setStockWindowOpen(true)} accessibilityLabel="Open shop stock">
                <Text style={styles.stockButtonText}>🧰 තොගය</Text>
              </Pressable>
            </View>}
          </>
        )}
      <ScrollView ref={scrollRef} style={styles.flex1} {...scrollProps} scrollEnabled={segment !== 'shops' || sheetUp} onScroll={onScroll} contentContainerStyle={segment === 'shops' ? styles.sheetBody : styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {(segment === 'shops' || segment === 'orders') && <JobPartsToBuy onBuy={buyForJob} />}

        {segment === 'shops' && !searching && (
          <>
            <View style={styles.actions}>
              <Pressable style={styles.actionCard} onPress={() => open()} accessibilityLabel="Ask for a part">
                <Gradient stops={ASK_STOPS} />
                <View style={styles.actionText}>
                  <Text style={styles.actionTitle}>කොටසක් ඉල්ලන්න</Text>
                  <Text style={styles.actionSub} numberOfLines={1}>ළඟ වෙළඳසැල්වලින් මිල ගන්න</Text>
                </View>
                <Text style={styles.actionEmoji}>📨</Text>
              </Pressable>
              <Pressable style={styles.actionCard} onPress={() => setSegment('wall')} accessibilityLabel="Open wall shortcut">
                <Gradient stops={WALL_STOPS} />
                <View style={styles.actionText}>
                  <Text style={styles.actionTitle}>දුර්ලභ කොටස් වෝල්</Text>
                  <Text style={styles.actionSub} numberOfLines={1}>ලංකාව පුරා වෙළඳසැල්වලට</Text>
                </View>
                <Text style={styles.actionEmoji}>📣</Text>
              </Pressable>
            </View>
            <SortChips value={sort} onChange={setSort} />
            <View style={styles.chips}>
              {SEARCH_RINGS.map((r) => (
                <Pressable key={r.ring} style={[styles.chip, ring === r.ring && styles.chipOn]} onPress={() => setRing(r.ring)} accessibilityLabel={`Range ${r.ring}`}>
                  <Text style={[styles.chipText, ring === r.ring && styles.chipTextOn]}>{r.label}</Text>
                </Pressable>
              ))}
            </View>
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
            <WallFeed myPosts={myWallPosts} category={wallCategory} now={now} onCompose={() => open({ audience: 'wall' })} />
          </>
        )}
        {segment === 'orders' && <OrdersList />}
      </ScrollView>
      </Animated.View>

      <ShopSheet
        shop={shop}
        onClose={() => setShop(null)}
        onAsk={(s) => {
          setShop(null);
          open({ onlyShopIds: [s.id], shopName: s.name, partType, name: partName ?? q, audience: 'shops' });
        }}
      />
      <Modal visible={stockWindowOpen} animationType="slide" onRequestClose={() => setStockWindowOpen(false)}>
        <View style={styles.stockModal}>
          <View style={styles.stockModalHeader}>
            <View style={styles.sheetHeadingText}>
              <Text style={styles.stockModalTitle}>🧰 වෙළඳසැල් තොගයේ කොටස්</Text>
              <Text style={styles.sub}>ළඟම වෙළඳසැල් පළ කර ඇති තොගය සහ මිල ගණන්</Text>
            </View>
            <Pressable style={styles.closeStock} onPress={() => setStockWindowOpen(false)} accessibilityLabel="Close shop stock">
              <Text style={styles.closeStockText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.stockList} showsVerticalScrollIndicator={false}>
            {publishedStock.map(({ shop: stockShop, line }) => {
              const deal = dealFor(stockShop.id, line.name, line.partType);
              const price = deal ? dealPrice(line.price, deal.discountPercent) : line.price;
              return (
                <Pressable
                  key={`${stockShop.id}-${line.name}-${line.partType}`}
                  style={styles.stockItem}
                  onPress={() => {
                    setQuery(line.name);
                    setPartType(line.partType);
                    setRing('wider');
                    setSort('distance');
                    setStockWindowOpen(false);
                  }}
                  accessibilityLabel={`Search ${line.name} at ${stockShop.name}`}
                >
                  <View style={styles.stockItemTop}>
                    <Text style={styles.stockItemName}>{line.name}</Text>
                    <Text style={styles.stockPrice}>රු. {price.toLocaleString()}</Text>
                  </View>
                  <Text style={styles.stockItemSub}>{stockShop.name} · {stockShop.distanceKm} km · {line.partType}{line.brand ? ` · ${line.brand}` : ''}</Text>
                  <Text style={styles.stockItemSub}>තොගයේ {line.qty} ක්{deal ? ` · −${deal.discountPercent}% දීමනාව` : ''}</Text>
                </Pressable>
              );
            })}
            {publishedStock.length === 0 && <EmptyState icon="🧰" title="පළ කළ තොගයක් නැත" text="මෙම පරාසයේ වෙළඳසැල් දැනට පළ කර ඇති කොටස් නැත." />}
          </ScrollView>
        </View>
      </Modal>
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
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
    search: { flex: 1, height: 42, paddingHorizontal: 18, paddingRight: 42, borderRadius: 21, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), color: Colors.textMain, fontSize: 13, fontFamily: FONTS.bodyRegular, ...softShadow() },
    mapButton: { minHeight: 42, paddingHorizontal: 11, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: softFill(), borderWidth: 1, borderColor: softEdge() },
    mapButtonText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    categoryHeading: { paddingHorizontal: 18, marginBottom: -5, fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    categoryTabs: { gap: 8, paddingHorizontal: 16, paddingTop: 2 },
    categoryTab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 18, backgroundColor: softFill(), borderWidth: 1, borderColor: softEdge() },
    categoryTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    categoryEmoji: { fontSize: 13 },
    categoryText: { maxWidth: 112, fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    categoryTextActive: { color: '#ffffff' },
    ownerMarker: { position: 'absolute', width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: '#ffffff', backgroundColor: '#2589f5', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    ownerMarkerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff' },
    mapShopMarker: { position: 'absolute', width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), ...softShadow() },
    mapShopMarkerText: { fontSize: 17 },
    shopSheet: { position: 'absolute', zIndex: 4, left: 0, right: 0, bottom: 0, overflow: 'hidden', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: Colors.bgBody, ...softShadow() },
    sheetHandle: { height: 34, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: Colors.bgBody },
    sheetGrip: { width: 42, height: 4, borderRadius: 3, backgroundColor: Colors.textMuted, opacity: 0.5 },
    sheetHint: { fontSize: 9.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    sheetHeading: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16, paddingBottom: 8, backgroundColor: Colors.bgBody },
    sheetHeadingText: { flex: 1, gap: 2 },
    sheetTitle: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sheetSubtitle: { fontSize: 10, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    stockButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18, backgroundColor: softFill() },
    stockButtonText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    sheetBody: { paddingHorizontal: 16, paddingTop: 6, gap: 12, paddingBottom: 110 },
    actions: { flexDirection: 'row', gap: 10, overflow: 'hidden' },
    actionCard: { flex: 1, height: ACTION_H, borderRadius: 18, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
    actionText: { flex: 1, gap: 1 },
    actionTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: '#fff' },
    actionSub: { fontSize: 9.5, fontFamily: FONTS.bodyMedium, color: 'rgba(255, 255, 255, 0.9)' },
    actionEmoji: { fontSize: 26 },
    clear: { position: 'absolute', right: 86, width: 26, height: 26, borderRadius: 13, backgroundColor: softFill(), alignItems: 'center', justifyContent: 'center' },
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
    stockModal: { flex: 1, paddingTop: 24, paddingHorizontal: 16, backgroundColor: Colors.bgBody },
    stockModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    stockModalTitle: { fontSize: 19, fontFamily: FONTS.titleBold, color: Colors.textMain },
    closeStock: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: softFill() },
    closeStockText: { fontSize: 16, color: Colors.textMain },
    stockList: { gap: 10, paddingTop: 8, paddingBottom: 32 },
    stockItem: { gap: 5, padding: 14, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), ...softShadow() },
    stockItemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    stockItemName: { flex: 1, fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    stockPrice: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary },
    stockItemSub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
  })
);
