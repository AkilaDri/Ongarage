import { elevation1, outline, pageBg } from '../utils/material';
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
  queryFromBrief,
  shopCovers,
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
import { useMart, type MartEnquiry } from '../context/MartContext';
import { EnquiryCard } from '../components/mart/EnquiryCard';
import { RequestCard } from '../components/mart/RequestCard';
import { EditPostSheet } from '../components/mart/EditPostSheet';
import { groupByBatch, splitRequests } from '@ongarage/shared';
import { OnMartAsk } from '@ongarage/shared';
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
import { chatDockOffset } from '../utils/chatDock';

/**
 * OnMart: the spare-parts marketplace. It opens on the shops nearest the owner, which can be sorted by rating,
 * price, reply speed or service, and searched for a part (live-stock shops show whether they have it; the rest
 * are asked). Nothing nearby? Widen the search to 50 km, then to the whole country, or post on the open wall.
 */
// The same look as the SOS and repair-job banners on Home: a deep wash, a soft sheen, a badge, a title, a line, and a white round button.
const ASK_STOPS = [{ offset: '0', color: '#2f5bd6' }, { offset: '0.5', color: '#1b3a96' }, { offset: '1', color: '#0b1c52' }];
const WALL_STOPS = [{ offset: '0', color: '#a78bfa' }, { offset: '0.5', color: '#7c3aed' }, { offset: '1', color: '#4c1d95' }];
const ACTION_H = 108;
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
  /** A part to search for as soon as OnMart opens (set when an SOS job sends the owner to buy a part). */
  searchSeed?: string;
  /** A shop whose page should open as soon as OnMart shows (from an order record in an SOS job). */
  openShopRequest?: { id: string; at: number; ask?: boolean } | null;
};

export const MartScreen: React.FC<MartScreenProps> = ({ activeVehicle, segment, onSegmentChange, onHeaderVisibilityChange, searchSeed, openShopRequest }) => {
  const { coords } = useUserLocation();
  const [reqTab, setReqTab] = useState<'current' | 'successful' | 'closed'>('current');
  // Adding to one's own wall post (description, photos).
  const [editingPost, setEditingPost] = useState<MartEnquiry | null>(null);
  const { enquiries, offersFor, widen, askMore, askShops, postToWall, cancelEnquiry, purchaseFor } = useMart();
  const { progress: edge, scrollProps } = usePinnedEdge();
  const [sort, setSort] = useState<MartSort>('distance');
  const [ring, setRing] = useState<SearchRing>('nearby');
  const [query, setQuery] = useState(searchSeed ?? '');
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
  // The chat icon sits under the pinned bar only while this screen is shown.
  useEffect(() => {
    chatDockOffset.setValue(Math.round(pinnedHeight.current));
    return () => chatDockOffset.setValue(0);
  }, []);
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
    else if (y < previousScrollY.current - 3) onHeaderVisibilityChange(true);
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
    // The top header bar folds away whenever the shop sheet is up, however it got there (drag, flick, search, category).
    onHeaderVisibilityChange(!expanded);
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

  useEffect(() => {
    if (searchSeed) setQuery(searchSeed);
  }, [searchSeed]);

  useEffect(() => {
    if (!openShopRequest) return;
    const target = all.find((x) => x.id === openShopRequest.id);
    // From a chat with the shop: its request form (this shop chosen); otherwise its profile.
    if (target && openShopRequest.ask) open({ onlyShopIds: [target.id], shopName: target.name, partType, name: '', audience: 'shops' });
    else if (target) setShop(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openShopRequest]);

  const q = query.trim();
  const searching = q.length > 0;
  const partName = searching ? canonicalPartName(q) : null;
  const inRing = useMemo(() => shopsInRing(all, ring), [all, ring]);
  const categoryShops = useMemo(
    () => (category ? inRing.filter((s) => s.categories.includes(category.serviceCategoryId)) : inRing),
    [category, inRing]
  );
  // What the search asks the shops' catalogues: the part and the active vehicle (make, model, chassis code).
  const catQuery = useMemo(
    () => (partName ? queryFromBrief({ name: partName, partType, vehicle: { name: car.name, plate: car.plate, type: car.type, make: car.make, model: car.model, chassisNo: car.chassisNo } }) : undefined),
    [partName, partType, car.name, car.plate, car.type, car.make, car.model, car.chassisNo]
  );
  // Shops with a catalogue are listed only when it covers the search; shops without one stay (they answer when asked).
  const sellers = useMemo(() => (catQuery?.partId ? categoryShops.filter((s) => !s.catalogue?.length || !!shopCovers(s.catalogue, catQuery)) : categoryShops), [categoryShops, catQuery]);
  const matchSort = searching && !!catQuery?.partId;
  const shops = useMemo(
    () => rankShops(sellers, matchSort && sort === 'distance' ? 'match' : sort, { priceOf: partName ? (s) => shopPriceFor(s.id, partName, partType) : undefined, liveStockFirst: searching && sort !== 'match', query: catQuery }),
    [sellers, sort, partName, partType, searching, matchSort, catQuery]
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
    // A shop that publishes stock shows what it has; otherwise a shop whose catalogue covers the search says it sells it.
    const stocked = !!partName && s.liveStock ? availabilityAt(s.id, partName, partType) : undefined;
    if (!stocked && catQuery?.partId && s.catalogue?.length) {
      const m = shopCovers(s.catalogue, catQuery);
      if (m) return { state: 'sells', tier: m.tier };
    }
    if (!partName || !s.liveStock) return { state: 'ask' };
    const a = stocked;
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
      onAskMore={() => askMore(m.enquiry.id)}
      onAskShops={(ids) => askShops(m.enquiry.id, ids)}
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
      // The description and photos can be added to while the request is still open.
      onEdit: m.enquiry.status === 'open' ? () => setEditingPost(m) : undefined,
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
          chatDockOffset.setValue(Math.round(e.nativeEvent.layout.height));
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
      <ScrollView ref={scrollRef} style={[styles.flex1, (segment === 'wall' || segment === 'mine') && styles.wallBackdrop]} {...scrollProps} scrollEnabled={segment !== 'shops' || sheetUp} onScroll={onScroll} contentContainerStyle={segment === 'shops' ? styles.sheetBody : styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {(segment === 'shops' || segment === 'orders') && <JobPartsToBuy onBuy={buyForJob} />}

        {segment === 'shops' && !searching && (
          <>
            <View style={styles.actions}>
              <Pressable style={styles.actionCard} onPress={() => open()} accessibilityLabel="Ask for a part">
                <Gradient stops={ASK_STOPS} />
                <View style={styles.actionSheen} pointerEvents="none" />
                <View style={styles.actionText}>
                  <View style={styles.actionBadge}><Text style={styles.actionBadgeText}>OnMart</Text></View>
                  <Text style={styles.actionTitle} numberOfLines={1}>කොටසක් ඉල්ලන්න</Text>
                  <Text style={styles.actionSub} numberOfLines={2}>ළඟ වෙළඳසැල්වලින් මිල ගන්න</Text>
                </View>
                <View style={styles.actionCircle}><Text style={styles.actionEmoji}>📨</Text></View>
              </Pressable>
              <Pressable style={styles.actionCard} onPress={() => setSegment('wall')} accessibilityLabel="Open wall shortcut">
                <Gradient stops={WALL_STOPS} />
                <View style={styles.actionSheen} pointerEvents="none" />
                <View style={styles.actionText}>
                  <View style={styles.actionBadge}><Text style={styles.actionBadgeText}>ලංකාව පුරා</Text></View>
                  <Text style={styles.actionTitle} numberOfLines={1}>දුර්ලභ කොටස් වෝල්</Text>
                  <Text style={styles.actionSub} numberOfLines={2}>සියලු වෙළඳසැල්වලට එකවර</Text>
                </View>
                <View style={styles.actionCircle}><Text style={styles.actionEmoji}>📣</Text></View>
              </Pressable>
            </View>
            <SortChips value={matchSort && sort === 'distance' ? 'match' : sort} onChange={setSort} options={matchSort ? ['match', 'distance', 'rating', 'price', 'response', 'service'] : undefined} />
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
              <View style={styles.partFocus} accessibilityLabel="Selected part">
                <View style={styles.partFocusHead}>
                  <Text style={styles.partFocusLabel}>🔧 ඔබ සොයන කොටස</Text>
                  <Pressable style={styles.partFocusClear} onPress={() => setQuery('')} accessibilityLabel="Clear search" hitSlop={8}>
                    <Text style={styles.partFocusClearText}>✕</Text>
                  </Pressable>
                </View>
                <Text style={styles.partFocusTitle}>{partName ?? q}</Text>
                <View style={styles.chips}>
                  {TYPES.map((t) => (
                    <Pressable key={t.id} style={[styles.focusChip, partType === t.id && styles.focusChipOn]} onPress={() => setPartType(t.id)}>
                      <Text style={[styles.focusChipText, partType === t.id && styles.focusChipTextOn]}>{t.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable style={styles.focusAsk} onPress={() => askAbout('shops')} accessibilityLabel="Ask all shops">
                  <OnMartAsk label="සියලු වෙළඳසැල්වලින් අසන්න" textStyle={styles.focusAskText} />
                </Pressable>
                <Pressable style={styles.partFocusLink} onPress={() => askAbout('wall')} accessibilityLabel="Post on the wall">
                  <Text style={styles.partFocusLinkText}>📣 දුර්ලභ කොටසක්ද? වෝල් එකට දමන්න ›</Text>
                </Pressable>
                {partName && !anyHave && widerRing && (
                  <Pressable style={styles.suggest} onPress={() => setRing(widerRing)} accessibilityLabel="Widen range">
                    <Text style={styles.focusSuggestText}>ළඟ සජීවී තොගයක් නැත — {SEARCH_RINGS.find((r) => r.ring === widerRing)!.label} බලන්න ›</Text>
                  </Pressable>
                )}
              </View>
            )}

            {searching && <Text style={styles.resultsHeading}>තොගය තිබෙන වෙළඳසැල්</Text>}
            <Text style={styles.count}>
              {shops.length} වෙළඳසැල් · {SEARCH_RINGS.find((r) => r.ring === ring)!.label}
            </Text>
            <Text style={styles.sub}>වෙළඳසැල් අනුපිළිවෙල ගරාජවල කොමිස් මත රඳා නොපවතී — ඔබ තෝරන ක්‍රමයට පමණි.</Text>
            {shops.length === 0 ? (
              <EmptyState icon="🔩" title="ළඟ වෙළඳසැල් නැත" text={widerRing ? 'පරාසය විශාල කර බලන්න.' : 'වෙළඳසැල් හමු නොවීය.'} />
            ) : (
              shops.map((s) => <ShopCard material key={s.id} shop={s} availability={availability(s)} onPress={() => setShop(s)} onCall={() => Linking.openURL(`tel:${s.phone.replace(/\s/g, '')}`)} />)
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
            (() => {
              const sec = splitRequests(groupByBatch(enquiries));
              const render = (gs: typeof sec.current) => gs.map((g) => <RequestCard key={g.batchId ?? g.items[0].enquiry.id} items={g.items} renderFull={card} />);
              const count = (gs: typeof sec.current) => gs.reduce((t, g) => t + g.items.length, 0);
              const tabs: { id: 'current' | 'successful' | 'closed'; label: string }[] = [
                { id: 'current', label: '📨 පවතින' },
                { id: 'successful', label: '✅ සාර්ථක' },
                { id: 'closed', label: '🚫 අවලංගු' },
              ];
              const empty = { current: 'දැනට පවතින ඉල්ලීම් නැත.', successful: 'මිලදී ගත් ඉල්ලීම් නැත.', closed: 'අවලංගු කළ ඉල්ලීම් නැත.' };
              return (
                <>
                  <View style={styles.reqTabs}>
                    {tabs.map((t) => (
                      <Pressable key={t.id} style={[styles.reqTab, reqTab === t.id && styles.chipOn]} onPress={() => setReqTab(t.id)} accessibilityLabel={`Requests ${t.id}`} accessibilityState={{ selected: reqTab === t.id }}>
                        <Text style={[styles.chipText, reqTab === t.id && styles.chipTextOn]} numberOfLines={1}>{reqTab === t.id ? '✓ ' : ''}{t.label}</Text>
                        <View style={[styles.reqCount, reqTab === t.id && styles.reqCountOn]}>
                          <Text style={[styles.reqCountText, reqTab === t.id && styles.chipTextOn]}>{count(sec[t.id])}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                  {sec[reqTab].length === 0 ? <Text style={styles.pastEmpty}>{empty[reqTab]}</Text> : render(sec[reqTab])}
                </>
              );
            })()
          ))}

        {segment === 'wall' && (
          <>
            <WallFeed myPosts={myWallPosts} category={wallCategory} now={now} onCompose={() => open({ audience: 'wall' })} />
          </>
        )}
        {segment === 'orders' && <OrdersList />}
      </ScrollView>
      </Animated.View>

      <EditPostSheet item={editingPost} onClose={() => setEditingPost(null)} />
      <ShopSheet
        shop={shop}
        onClose={() => setShop(null)}
        onAsk={(s, askName) => {
          setShop(null);
          open({ onlyShopIds: [s.id], shopName: s.name, partType, name: askName || (partName ?? q), audience: 'shops' });
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
    // Day theme: the wall sits on a light grey so each white post stands apart from the page (dark theme keeps its own surfaces).
    wallBackdrop: getThemeMode() === 'dark' ? {} : { backgroundColor: pageBg() },
    pinned: { zIndex: 5, paddingTop: 12, paddingBottom: 10, gap: 10, backgroundColor: pageBg() },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6 },
    search: { flex: 1, height: 46, paddingHorizontal: 18, paddingRight: 42, borderRadius: 23, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), color: Colors.textMain, fontSize: 14, fontFamily: FONTS.bodyRegular, ...elevation1() },
    mapButton: { minHeight: 46, paddingHorizontal: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline() },
    mapButtonText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    categoryHeading: { paddingHorizontal: 18, marginBottom: -5, fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    categoryTabs: { gap: 8, paddingHorizontal: 6, paddingTop: 2 },
    categoryTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 8, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline() },
    categoryTabActive: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    categoryEmoji: { fontSize: 13 },
    categoryText: { maxWidth: 112, fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
    categoryTextActive: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
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
    stockButton: { paddingHorizontal: 12, height: 34, justifyContent: 'center', borderRadius: 8, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline() },
    stockButtonText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    sheetBody: { paddingHorizontal: 6, paddingTop: 6, gap: 12, paddingBottom: 110 },
    actions: { gap: 10 },
    actionCard: { height: ACTION_H, borderRadius: 22, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, gap: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', shadowColor: '#0b1c52', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 5 },
    actionSheen: { position: 'absolute', top: -70, right: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255, 255, 255, 0.07)' },
    actionText: { flex: 1, gap: 3 },
    actionBadge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 11, backgroundColor: 'rgba(255, 255, 255, 0.16)', marginBottom: 2 },
    actionBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.4 },
    actionTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: '#fff', letterSpacing: 0.2 },
    actionSub: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: 'rgba(255, 255, 255, 0.82)' },
    actionCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ffffff', borderWidth: 4, borderColor: 'rgba(255, 255, 255, 0.35)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    actionEmoji: { fontSize: 26 },
    clear: { position: 'absolute', right: 86, width: 26, height: 26, borderRadius: 13, backgroundColor: softFill(), alignItems: 'center', justifyContent: 'center' },
    clearText: { fontSize: 11, color: Colors.textMuted },
    body: { paddingHorizontal: 6, paddingTop: 8, gap: 12, paddingBottom: 110 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, height: 32, justifyContent: 'center', borderRadius: 8, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline() },
    chipOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    chipText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
    chipTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    reqTabs: { flexDirection: 'row', gap: 8 },
    // Google Material filter chips: 8dp corners, outlined, the selected one tonal blue with a check.
    reqTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, paddingHorizontal: 8, borderRadius: 8, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline() },
    reqCount: { minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f1f3f4' },
    reqCountOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.28)' : '#d2e3fc' },
    reqCountText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    pastHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
    pastToggle: { fontSize: 12, color: Colors.textMuted },
    pastEmpty: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    sectionTitle: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary, letterSpacing: 0.2, marginTop: 4 },
    count: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    title: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    // The picked part: a tinted card, so it reads as "what you chose", not as one more shop card.
    partFocus: { gap: 12, padding: 16, borderRadius: 12, backgroundColor: '#5a85ee', shadowColor: '#2457e6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 3 },
    partFocusHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    partFocusLabel: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.4 },
    partFocusClear: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' },
    partFocusClearText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    partFocusTitle: { fontSize: 22, fontFamily: FONTS.titleBold, color: '#ffffff' },
    focusChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
    focusChipOn: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
    focusChipText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: '#ffffff' },
    focusChipTextOn: { color: '#3a68e0' },
    focusAsk: { height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
    focusAskText: { fontSize: 14, fontFamily: FONTS.titleBold, color: '#3a68e0' },
    focusSuggestText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: '#ffffff', textDecorationLine: 'underline' },
    partFocusLink: { alignSelf: 'center', paddingVertical: 2 },
    partFocusLinkText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: 'rgba(255,255,255,0.92)' },
    resultsHeading: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMuted, marginTop: 4 },
    search2: { gap: 10, padding: 14, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    suggest: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, backgroundColor: 'rgba(2, 132, 199, 0.12)' },
    suggestText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    stockModal: { flex: 1, paddingTop: 24, paddingHorizontal: 16, backgroundColor: Colors.bgBody },
    stockModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    stockModalTitle: { fontSize: 19, fontFamily: FONTS.titleBold, color: Colors.textMain },
    closeStock: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: softFill() },
    closeStockText: { fontSize: 16, color: Colors.textMain },
    stockList: { gap: 10, paddingTop: 8, paddingBottom: 32 },
    stockItem: { gap: 5, padding: 14, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    stockItemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    stockItemName: { flex: 1, fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    stockPrice: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary },
    stockItemSub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
  })
);
