import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Linking, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, ago, LkPlate, martShop, basketProgress, Colors, FONTS, getAi, getThemeMode, money, shopCoverage, SUGGEST_MIN_CONFIDENCE, cartLeftMin, directionsUrl, GoogleMap, PartTypeChip, partTypesOf, PurchaseCode, ringKm, shopsNear, themedStyles, type LatLng, type ShopOffer } from '@ongarage/shared';
import { useMart, type MartEnquiry } from '../../context/MartContext';
import { openShopFor } from '../../utils/martBridge';
import { elevation1, outline } from '../../utils/material';
import { Sheet } from '../Sheet';
import { BatchCompare } from './BatchCompare';
import { CartPanel } from './CartSheet';

/** The lowest-price line breathes gently (a soft pulse and glow) and a light streak sweeps across it now and then, so the eye finds the best price first. */
const BestPriceGlow: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pulse = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    );
    const b = Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(sweep, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    );
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [pulse, sweep]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.4] });
  const x = sweep.interpolate({ inputRange: [0, 1], outputRange: [-60, w + 60] });
  return (
    <Animated.View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ transform: [{ scale }], borderRadius: 16, overflow: 'hidden', shadowColor: '#188038', shadowOffset: { width: 0, height: 0 }, shadowOpacity: glow as unknown as number, shadowRadius: 10 }}
    >
      {children}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, width: 40, left: 0, backgroundColor: 'rgba(255, 255, 255, 0.45)', transform: [{ translateX: x }, { skewX: '-20deg' }] }} />
    </Animated.View>
  );
};

/** "Waiting for the shops' answers": the hourglass turns over, the line fades softly and three dots keep counting, so it reads as alive. */
const WaitingAnswers: React.FC<{ style: React.ComponentProps<typeof Text>['style'] }> = ({ style }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const turn = useRef(new Animated.Value(0)).current;
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(fade, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(fade, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    );
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(turn, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
        Animated.timing(turn, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    );
    a.start();
    b.start();
    const id = setInterval(() => setDots((d) => (d % 3) + 1), 450);
    return () => {
      a.stop();
      b.stop();
      clearInterval(id);
    };
  }, [fade, turn]);
  const opacity = fade.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  return (
    <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity }}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Text style={style}>⏳</Text>
      </Animated.View>
      <Text style={style} numberOfLines={2}>වෙළඳසැල්වල පිළිතුරු බලාපොරොත්තුවෙන්{'.'.repeat(dots)}</Text>
    </Animated.View>
  );
};

/** A magnifying glass that sweeps back and forth while a shop looks through its stock for the part. */
const SearchingLens: React.FC = () => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(t, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [-3, 3] });
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['-20deg', '20deg'] });
  return <Animated.Text style={{ fontSize: 12, transform: [{ translateX }, { rotate }] }}>🔎</Animated.Text>;
};

const REACH_STEP = 5;
/** The range goes up in 5 km steps to 50 km, then in 25 km steps to 200 km, then the whole country. */
const REACH_MAX = 200;
/** Zoom that keeps a circle of this radius about 40% of the map's height. */
const reachZoom = (km: number | 'all', height: number) => (km === 'all' ? 6 : Math.max(6, Math.min(13, Math.floor(Math.log2((155 * height * 0.4) / km)))));
const MARK: Record<'good' | 'bad' | 'look' | 'wait', string> = { good: '#188038', bad: '#d93025', look: '#f9ab00', wait: '#9aa0a6' };

/** The map with the circle and the shops (no controls). */
const ReachCanvas: React.FC<{ coords: LatLng; status: Record<string, 'good' | 'bad' | 'look' | 'wait'>; km: number | 'all'; height: number }> = ({ coords, status, km, height }) => {
  const shops = useMemo(() => shopsNear(coords), [coords]);
  const reach = km === 'all' ? Infinity : km;
  const zoom = reachZoom(km, height);
  const radiusPx = km === 'all' ? 0 : (km * 1000) / ((156543.03392 * Math.cos((coords.latitude * Math.PI) / 180)) / 2 ** zoom);
  return (
    <GoogleMap
      center={coords}
      zoom={zoom}
      style={{ height, borderRadius: 10 }}
      renderOverlay={(project) => {
          const me = project(coords);
          return (
            <>
              {!!me && km !== 'all' && <View pointerEvents="none" style={[styles.reachCircle, { left: me.x - radiusPx, top: me.y - radiusPx, width: radiusPx * 2, height: radiusPx * 2, borderRadius: radiusPx }]} />}
              {!!me && <View pointerEvents="none" style={[styles.reachMe, { left: me.x - 7, top: me.y - 7 }]} />}
              {shops.map((x) => {
                const p = project(x.coords);
                if (!p) return null;
                const known = status[x.id];
                const color = known ? MARK[known] : x.distanceKm <= reach ? '#1a73e8' : '#bdc1c6';
                return <View key={x.id} pointerEvents="none" style={[styles.reachShop, { left: p.x - 6, top: p.y - 6, backgroundColor: color }]} />;
              })}
            </>
          );
        }}
    />
  );
};

/**
 * The search range on a map, under the shops the request reached: a circle around the owner that the owner sizes to what they need (− / + 5 km, or the whole country), the shops
 * in it (green has the part, red has none, amber is looking, grey has not answered, blue are new ones the wider range would ask), and one button that searches that far for the
 * parts nobody has. Past 50 km the message goes to every shop in Sri Lanka.
 */
const ReachPanel: React.FC<{ coords: LatLng; status: Record<string, 'good' | 'bad' | 'look' | 'wait'>; current: number | 'all'; searchCount: number; onApply: (km: number | 'all') => void }> = ({ coords, status, current, searchCount, onApply }) => {
  const [km, setKm] = useState<number | 'all'>(current);
  useEffect(() => setKm(current), [current]);
  const shops = useMemo(() => shopsNear(coords), [coords]);
  const reach = km === 'all' ? Infinity : km;
  const inRange = shops.filter((x) => x.distanceKm <= reach);
  const fresh = inRange.filter((x) => !(x.id in status));
  const wider = km === 'all' ? current !== 'all' : current === 'all' ? false : km > current;
  const less = () => setKm((k) => (k === 'all' ? REACH_MAX : k > 50 ? Math.max(50, k - 25) : Math.max(REACH_STEP, k - REACH_STEP)));
  const more = () => setKm((k) => (k === 'all' ? 'all' : k >= REACH_MAX ? 'all' : k >= 50 ? k + 25 : k + REACH_STEP));
  const label = km === 'all' ? 'මුළු ලංකාව' : `කි.මී. ${km}`;
  const can = searchCount > 0 && wider;
  return (
    <View style={styles.reach} accessibilityLabel="Search range map">
      <Text style={styles.answeredHead}>🗺️ සෙවුම් පරාසය</Text>
      <ReachCanvas coords={coords} status={status} km={km} height={240} />
      <View style={styles.reachRow}>
        <Pressable style={styles.reachStep} onPress={less} accessibilityLabel="Smaller range"><Text style={styles.reachStepText}>−</Text></Pressable>
        <Text style={styles.reachKm}>{label}</Text>
        <Pressable style={styles.reachStep} onPress={more} accessibilityLabel="Bigger range"><Text style={styles.reachStepText}>+</Text></Pressable>
      </View>
      <Text style={styles.small}>
        මෙම පරාසයේ වෙළඳසැල් {inRange.length}ක් · ඉල්ලීම නොලැබුණු අලුත් {fresh.length}ක්{km === 'all' ? ' · කි.මී. 200ට වඩා වැඩි නිසා මුළු ලංකාවේම වෙළඳසැල් වලට පණිවිඩය යයි' : ''}
      </Text>
      <Text style={styles.small}>● කොළ: ඇත · ● රතු: නැත · ● කහ: සොයමින් · ● අළු: පිළිතුරු බලා සිටී · ● නිල්: අලුතින් අසන</Text>
      <Pressable style={[styles.reachChip, !can && { opacity: 0.45 }]} disabled={!can} onPress={() => onApply(km)} accessibilityLabel="Search this range">
        <Text style={styles.reachText}>{searchCount === 0 ? 'සොයාගන්න අමාරු කොටස් නැත' : wider ? `🔭 ${label} දක්වා සොයන්න (නැති කොටස් ${searchCount})` : 'පරාසය දැනට ඇති එකට වඩා වැඩි කරන්න'}</Text>
      </Pressable>
    </View>
  );
};

/** In the card: a small preview of the search range. Touching it opens the window where the range is changed and searched. */
const ReachMap: React.FC<React.ComponentProps<typeof ReachPanel>> = (props) => {
  const [open, setOpen] = useState(false);
  const label = props.current === 'all' ? 'මුළු ලංකාව' : `කි.මී. ${props.current}`;
  return (
    <>
      <Pressable style={styles.reach} onPress={() => setOpen(true)} accessibilityLabel="Open the search range">
        <View style={styles.reachHead}>
          <Text style={[styles.answeredHead, styles.flex1]} numberOfLines={1}>🗺️ සෙවුම් පරාසය</Text>
          <View style={styles.seeAllPill}>
            <Text style={styles.seeAllText}>වෙනස් කරන්න ›</Text>
          </View>
        </View>
        <View style={styles.reachMapBox} pointerEvents="none">
          <ReachCanvas coords={props.coords} status={props.status} km={props.current} height={72} />
          <View style={styles.mapKmChip}>
            <Text style={styles.mapKmText}>📍 {label}</Text>
          </View>
        </View>
      </Pressable>
      <Sheet visible={open} title="සෙවුම් පරාසය" subtitle="රවුම ඔබට ඕන තරමට වෙනස් කර සොයන්න" onClose={() => setOpen(false)}>
        <ReachPanel {...props} onApply={(km) => { props.onApply(km); setOpen(false); }} />
      </Sheet>
    </>
  );
};

/** Swipe a part to the right and it drops onto the open rare-parts wall by itself (a hint of where it goes shows behind it). */
const SwipeToWall: React.FC<{ enabled: boolean; onDrop: () => void; children: React.ReactNode }> = ({ enabled, onDrop, children }) => {
  const x = useRef(new Animated.Value(0)).current;
  const live = useRef({ enabled, onDrop });
  live.current = { enabled, onDrop };
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => live.current.enabled && g.dx > 12 && g.dx > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => x.setValue(Math.max(0, g.dx)),
      onPanResponderRelease: (_, g) => {
        if (g.dx > 90) {
          Animated.timing(x, { toValue: 420, duration: 180, useNativeDriver: false }).start(() => {
            live.current.onDrop();
            x.setValue(0);
          });
        } else {
          Animated.spring(x, { toValue: 0, useNativeDriver: false }).start();
        }
      },
      onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: false }).start(),
    })
  ).current;
  if (!enabled) return <>{children}</>;
  const hint = x.interpolate({ inputRange: [0, 90], outputRange: [0, 1], extrapolate: 'clamp' });
  return (
    <View>
      <Animated.View style={[styles.swipeHint, { opacity: hint }]} pointerEvents="none">
        <Text style={styles.swipeHintText}>📣 දුර්ලභ කොටස් පෝස්ට් එකට</Text>
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX: x }] }} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
};

/** The owner, the shop and the straight way between them on a small map (the shop's own page of directions opens from the button under it). */
const RouteMap: React.FC<{ from: LatLng; to: LatLng; km: number }> = ({ from, to, km }) => {
  const mid = { latitude: (from.latitude + to.latitude) / 2, longitude: (from.longitude + to.longitude) / 2 };
  const zoom = reachZoom(Math.max(1, km) * 1.4, 150);
  return (
    <GoogleMap
      center={mid}
      zoom={zoom}
      style={{ height: 150, borderRadius: 10 }}
      renderOverlay={(project) => {
        const a = project(from);
        const b = project(to);
        const line = a && b ? { len: Math.hypot(b.x - a.x, b.y - a.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 } : null;
        return (
          <>
            {!!line && <View pointerEvents="none" style={[styles.routeLine, { left: line.mx - line.len / 2, top: line.my - 1.5, width: line.len, transform: [{ rotate: `${line.ang}rad` }] }]} />}
            {!!a && <View pointerEvents="none" style={[styles.reachMe, { left: a.x - 7, top: a.y - 7 }]} />}
            {!!b && (
              <View pointerEvents="none" style={[styles.resPin, { left: b.x - 14, top: b.y - 14 }]}>
                <Text style={styles.resPinText}>🏪</Text>
              </View>
            )}
          </>
        );
      }}
    />
  );
};

/** Once parts are reserved the map under the shops shows where: the owner and a pin for each shop the parts are reserved at. Touching it opens the shops (and the way to each). */
const ReservedMap: React.FC<{ coords: LatLng; shops: { id: string; name: string; coords: LatLng; km: number; parts: number }[]; onOpen: () => void; onQr?: () => void; onRange?: () => void }> = ({ coords, shops, onOpen, onQr, onRange }) => {
  const far = Math.max(2, ...shops.map((x) => x.km));
  const zoom = reachZoom(far * 1.5, 105);
  return (
    <View style={styles.reach} accessibilityLabel="Reserved shops map">
      <View style={styles.reachHead}>
        <Text style={styles.answeredHead}>📍 වෙන් කළ වෙළඳසැල්</Text>
        {!!onRange && (
          <Pressable onPress={onRange} hitSlop={6} accessibilityLabel="Search range for the rest">
            <Text style={styles.link}>ඉතිරි කොටස් සඳහා පරාසය ›</Text>
          </Pressable>
        )}
      </View>
      <Pressable onPress={onOpen} accessibilityLabel="Open the reserved shops">
        <View pointerEvents="none">
          <GoogleMap
            center={coords}
            zoom={zoom}
            style={{ height: 105, borderRadius: 10 }}
            renderOverlay={(project) => {
              const me = project(coords);
              return (
                <>
                  {!!me && <View style={[styles.reachMe, { left: me.x - 7, top: me.y - 7 }]} />}
                  {shops.map((x) => {
                    const p = project(x.coords);
                    if (!p) return null;
                    return (
                      <React.Fragment key={x.id}>
                        <View style={[styles.resPin, { left: p.x - 14, top: p.y - 14 }]}>
                          <Text style={styles.resPinText}>🏪</Text>
                        </View>
                        <Text numberOfLines={1} style={[styles.resLabel, { left: p.x - 45, top: p.y + 15 }]}>{x.name}</Text>
                      </React.Fragment>
                    );
                  })}
                </>
              );
            }}
          />
        </View>
      </Pressable>
      <View style={styles.reachHead}>
        <Pressable onPress={onOpen} hitSlop={6} accessibilityLabel="Shops and directions">
          <Text style={styles.link}>වෙළඳසැල් සහ මාර්ගය බලන්න ›</Text>
        </Pressable>
        {!!onQr && (
          <Pressable style={styles.qrChip} onPress={onQr} accessibilityLabel="Open the QR codes">
            <Text style={styles.qrChipText}>📱 QR කේතය</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const hasIt = (o: ShopOffer) => o.available && o.reply !== 'check' && o.reply !== 'none';

/**
 * One request in "My requests", kept simple: however many parts were asked together it is ONE card with the parts as a list. Each part has a mark in front of it — ✓ when a shop has
 * it, ✗ when none does, ⏳ while the shops are still answering. Touching a part opens ONE popup with everything about it: its details, a part nobody has can be posted on the
 * open rare-parts wall from there (with a description of its own), then the full request with the shops that answered (they have it / have none, the price), reserve, ask more, chat.
 */
export const RequestCard: React.FC<{ items: MartEnquiry[]; renderFull: (m: MartEnquiry) => React.ReactNode }> = ({ items, renderFull }) => {
  const { offers, purchases, postToWall, searchWithin, cart } = useMart();
  const [openId, setOpenId] = useState<string | null>(null);
  // In a request of several parts the part popup opens on the shops that have that part; its details are one tab over.
  const [partTab, setPartTab] = useState<'shops' | 'info'>('shops');
  const [compare, setCompare] = useState(false);
  // The comparison popup has two tabs: the shops' quotations (first) and the cart.
  // Once parts are reserved the map shows the shops they are reserved at; this brings the search range map back for the rest.
  const [showRange, setShowRange] = useState(false);
  // Parts already reserved (or bought) are folded away in one line; touching it opens them.
  const [doneOpen, setDoneOpen] = useState(false);
  // The shops box shows three rows and half of the fourth (so it is plain that it scrolls); each row's real height is measured.
  const [rowH, setRowH] = useState<Record<string, number>>({});
  // The shops box is folded into a summary; "See all" opens the whole list to scroll through.
  const [shopsOpen, setShopsOpen] = useState(false);
  // The QR codes to scan at the shops' counters: a window of its own, a shop's QR opens when the shop is touched.
  const [qrOpen, setQrOpen] = useState(false);
  // The reserved shops window: a shop opens the way to it.
  const [routeOpen, setRouteOpen] = useState(false);
  const [routeShop, setRouteShop] = useState<string | null>(null);
  const [qrShop, setQrShop] = useState<string | null>(null);
  const [popTab, setPopTab] = useState<'compare' | 'cart'>('compare');
  const [desc, setDesc] = useState<Record<string, string>>({});
  const [wallError, setWallError] = useState<string | null>(null);

  const many = items.length > 1;
  const first = items[0];
  const { total, answered } = basketProgress(items, offers);
  const title = many ? first.enquiry.batchTitle || `📦 කොටස් ${items.length} ක ඉල්ලීම` : first.enquiry.briefs[0]?.name ?? 'කොටස';
  // Shops that answered the basket: those that have some of its parts (green count) and those that answered but have none (red count).
  // Once some parts are reserved, only the parts still open are looked for (the owner goes shop to shop: what one shop has is taken there, the rest is looked for elsewhere).
  const started = items.some((m) => m.enquiry.status === 'reserved' || m.enquiry.status === 'bought');
  const remaining = items.filter((m) => m.enquiry.status === 'open');
  const doneItems = items.filter((m) => m.enquiry.status === 'reserved' || m.enquiry.status === 'bought');
  // The vehicle the parts are for (every part of a basket is for the same one).
  const veh = first.enquiry.briefs[0]?.vehicle;
  const vehLine = veh ? [[veh.make, veh.model].filter(Boolean).join(' ') || veh.name, veh.plate].filter(Boolean).join(' · ') : '';
  // Every shop the request reached, the ones still to answer first: with the answer (has parts / none / is looking for the part) or that it is still waiting for one.
  const replied = shopCoverage(items.map((m) => m.enquiry.id), offers).map((c) => ({ ...c, shop: offers.find((o) => o.shop.id === c.shopId)?.shop as { rating: number; ratingCount: number } | undefined, waiting: false, seen: true }));
  const askedIds = [...new Set(items.flatMap((m) => m.askedShopIds))].filter((id) => !replied.some((c) => c.shopId === id));
  const rank = (c: { waiting: boolean; have: string[]; checking: string[] }) => (c.have.length > 0 ? 0 : c.waiting ? 1 : c.checking.length > 0 ? 2 : 3);
  // A shop that has parts comes first of all; then the shops still to answer, the ones looking for the part, and last the ones that have none.
  const receivedShops = [
    ...askedIds.map((id) => ({ seen: items.some((m) => !!m.seenBy?.[id]), shopId: id, shopName: martShop(id)?.name ?? id, have: [] as string[], checking: [] as string[], missing: [] as string[], total: 0, unpriced: 0, complete: false, shop: martShop(id) as { rating: number; ratingCount: number } | undefined, waiting: true })),
    ...replied,
  ].sort((x, y) => rank(x) - rank(y));
  // Where the reserved parts are to be collected: one line per shop, with the code to show there.
  const ids = items.map((m) => m.enquiry.id);
  const toVisit = [...new Map(purchases.filter((p) => ids.includes(p.purchase.enquiryId ?? '') && ['reserved', 'ready'].includes(p.stage) && p.purchase.fulfilment === 'pickup').map((p) => [p.purchase.groupId ?? p.purchase.id, p])).values()].map((first) => ({
    key: first.purchase.groupId ?? first.purchase.id,
    shop: first.offer.shop.name,
    code: first.purchase.code,
    names: purchases.filter((p) => (first.purchase.groupId ? p.purchase.groupId === first.purchase.groupId : p.purchase.id === first.purchase.id) && ['reserved', 'ready'].includes(p.stage)).map((p) => p.brief.name),
    parts: purchases.filter((p) => (first.purchase.groupId ? p.purchase.groupId === first.purchase.groupId : p.purchase.id === first.purchase.id) && ['reserved', 'ready'].includes(p.stage)).length,
  }));
  // The parts are numbered 1, 2, 3 … so the shops' rows can say which of them a shop has.
  const num = (enquiryId: string) => items.findIndex((m) => m.enquiry.id === enquiryId) + 1;
  // The cart: the shop picked for each part of this request, to be confirmed within the hour.
  const myCart = cart.filter((l) => items.some((m) => m.enquiry.id === l.enquiryId));
  const cartTotal = myCart.reduce((t, l) => t + (offers.find((o) => o.id === l.offerId)?.total ?? 0), 0);
  const cartLeft = myCart.length ? Math.min(...myCart.map((l) => cartLeftMin(l.addedAt, Date.now()))) : 0;
  // Parts arriving in the cart: its tab bounces and a "+N" floats up from it.
  const pulse = useRef(new Animated.Value(0)).current;
  const plus = useRef(new Animated.Value(0)).current;
  const lastCount = useRef(myCart.length);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (myCart.length > lastCount.current) {
      setBump(myCart.length - lastCount.current);
      pulse.setValue(0);
      plus.setValue(0);
      Animated.parallel([
        Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 160, useNativeDriver: false }), Animated.spring(pulse, { toValue: 0, friction: 4, tension: 160, useNativeDriver: false })]),
        Animated.timing(plus, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start();
    }
    lastCount.current = myCart.length;
  }, [myCart.length, pulse, plus]);
  // Where each shop is (its town and how far from the owner), for the shops the request reached.
  const placeOf = useMemo(() => {
    const at = items[0]?.enquiry.coords;
    const byId = new Map((at ? shopsNear(at) : []).map((x) => [x.id, x]));
    return (id: string) => byId.get(id);
  }, [items]);
  // The shops the parts are reserved (or bought) at, with how many parts there.
  const reservedShops = [...new Map(purchases.filter((p) => ids.includes(p.purchase.enquiryId ?? '') && ['reserved', 'ready', 'dispatched', 'arrived', 'bought'].includes(p.stage)).map((p) => [p.offer.shop.id, p])).values()]
    .map((p) => ({ id: p.offer.shop.id, name: p.offer.shop.name, coords: martShop(p.offer.shop.id)?.coords, km: placeOf(p.offer.shop.id)?.distanceKm ?? 0, parts: purchases.filter((x) => x.offer.shop.id === p.offer.shop.id && ids.includes(x.purchase.enquiryId ?? '') && ['reserved', 'ready', 'dispatched', 'arrived', 'bought'].includes(x.stage)).length }))
    .filter((x): x is typeof x & { coords: LatLng } => !!x.coords);
  const rowSizes = receivedShops.map((x) => (rowH[x.shopId] ?? 78) + 4);
  const shopViewport = receivedShops.length > 3 ? Math.round(rowSizes[0] + rowSizes[1] + rowSizes[2] + rowSizes[3] * 0.5) : 0;
  const created = Math.min(...items.map((m) => m.enquiry.createdAt));

  const mark = (m: MartEnquiry) => {
    const mine = offers.filter((o) => o.enquiryId === m.enquiry.id);
    const have = mine.filter(hasIt);
    const status = m.enquiry.status;
    if (status === 'bought') return { icon: '🛍️', text: 'මිලදී ගත්තා', tone: 'good' as const, have, mine };
    if (status === 'reserved') return { icon: '🔒', text: 'වෙන් කළා', tone: 'good' as const, have, mine };
    if (status === 'cancelled' || status === 'expired') return { icon: '✗', text: status === 'cancelled' ? 'අවලංගු' : 'කල් ඉකුත්', tone: 'bad' as const, have, mine };
    if (have.length) return { icon: '✓', text: `වෙළඳසැල් ${have.length}ක ළඟ ඇත`, tone: 'good' as const, have, mine };
    const looking = mine.filter((o) => !o.available && o.reply === 'check');
    if (looking.length) return { icon: '⏳', text: `වෙළඳසැල් ${looking.length}ක් කොටස සොයමින් — පිළිතුර බලා සිටින්න`, tone: 'wait' as const, have, mine };
    if (m.searching || mine.length === 0) return { icon: '⏳', text: 'පිළිතුරු බලාපොරොත්තුවෙන්', tone: 'wait' as const, have, mine };
    return { icon: '✗', text: 'කිසිදු වෙළඳසැලක නැත', tone: 'bad' as const, have, mine };
  };

  // The parts that are hard to find: open, shops have answered and none has it (and none is still looking). Only these are pushed further, not the whole basket: their range
  // widens (10 km, then 50 km, then the whole country: past 50 km the message goes to every shop in Sri Lanka) and they can go to the open rare-parts wall.
  const unfound = items.filter((m) => m.enquiry.status === 'open' && mark(m).tone === 'bad');
  const searchable = unfound.filter((m) => m.enquiry.audience !== 'wall');
  // How far the request reaches now (km, or the whole country), from the first open part.
  const live0 = items.find((m) => m.enquiry.status === 'open')?.enquiry;
  const currentKm: number | 'all' = !live0 ? 10 : live0.radiusKm ?? (ringKm(live0.ring) === Infinity ? 'all' : ringKm(live0.ring));
  const shopStatus: Record<string, 'good' | 'bad' | 'look' | 'wait'> = {};
  receivedShops.forEach((c) => { shopStatus[c.shopId] = c.waiting ? 'wait' : c.have.length > 0 ? 'good' : c.checking.length > 0 ? 'look' : 'bad'; });
  // The open rare-parts wall is for parts the search could not find: it opens only once the range has reached 100 km (or the whole country) and the part is still nobody's.
  const reachedLimit = currentKm === 'all' || currentKm >= 100;
  const wallableAll = unfound.filter((m) => m.enquiry.audience === 'shops');
  const wallable = reachedLimit ? wallableAll : [];
  const wallLocked = !reachedLimit && wallableAll.length > 0;

  const post = async (m: MartEnquiry) => {
    const text = desc[m.enquiry.id] ?? '';
    if (text.trim()) {
      const off = await getAi().checkOffPlatform(text);
      if (off.confidence >= SUGGEST_MIN_CONFIDENCE && off.value.flagged) {
        setWallError('දුරකථන අංක, ගෙවීම් හෝ වෙනත් යෙදුම් පණිවිඩ එක් නොකරන්න.');
        return;
      }
    }
    setWallError(null);
    postToWall(m.enquiry.id, text);
  };

  const detail = (m: MartEnquiry) => {
    const k = mark(m);
    const b = m.enquiry.briefs[0];
    const onWall = m.enquiry.audience !== 'shops';
    const canPost = k.tone === 'bad' && m.enquiry.status === 'open' && !onWall && reachedLimit;
    const lockedWall = k.tone === 'bad' && m.enquiry.status === 'open' && !onWall && !reachedLimit;
    return (
      <View style={styles.detail}>
        <Text style={styles.small}>
          {b?.partType === 'GarageChoice' ? 'ගරාජයේ තේරීම' : b?.partType}
          {b?.partNo ? ` · කොටස් අංකය ${b.partNo}` : ''}
          {b?.note ? ` · ${b.note}` : ''}
          {onWall ? ' · 📣 විවෘත පෝස්ට් එකේ' : ''}
        </Text>
        {!!b?.photos?.length && (
          <View style={styles.photos}>
            {b.photos.slice(0, 4).map((p) => (
              <Image key={p} source={{ uri: p }} style={styles.photo} />
            ))}
          </View>
        )}
        {lockedWall && <Text style={styles.small}>📣 කි.මී. 100 දක්වා සෙවුවොත් මේ කොටස දුර්ලභ කොටස් පෝස්ට් එකට දාන්න පුළුවන් — සෙවුම් පරාසය විශාල කරන්න.</Text>}
        {canPost && (
          <View style={styles.wall}>
            <Text style={styles.label}>📣 දුර්ලභ කොටස් පෝස්ට් එකට දමන්න</Text>
            <TextInput style={styles.input} multiline placeholder="මෙම කොටස ගැන විස්තරය (මාදිලිය, වර්ෂය, කොටස් අංකය…)" placeholderTextColor={Colors.textMuted} value={desc[m.enquiry.id] ?? ''} onChangeText={(t) => setDesc((d) => ({ ...d, [m.enquiry.id]: t }))} maxLength={200} accessibilityLabel={`Wall description ${b?.name}`} />
            {!!wallError && <Text style={styles.warn}>{wallError}</Text>}
            <ActionButton label="පෝස්ට් එකක් ලෙස දමන්න" icon="📣" variant="primary" compact onPress={() => post(m)} />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.card} accessibilityLabel="Request">
      <View style={styles.head}>
        {/* The vehicle model, then (at the end of the same row) how many shops answered and the cart. */}
        {/* The vehicle number as a yellow number plate. */}
        {!!veh?.plate && <LkPlate plate={veh.plate} small fontSize={13} />}
        {!!vehLine && (
          <View style={[styles.vehicle, styles.vehicleShrink]} accessibilityLabel="Vehicle">
            <Text style={styles.vehicleText} numberOfLines={1}>🚗 {veh?.plate ? ([veh.make, veh.model].filter(Boolean).join(' ') || veh.name) : vehLine}</Text>
          </View>
        )}
        <View style={styles.flex1} />
        {/* The cart of this request: its parts with the shops picked, to be confirmed within the hour. */}
        <Pressable style={styles.headCart} onPress={() => { setPopTab('cart'); setCompare(true); }} accessibilityLabel="Open the cart">
          <Text style={styles.headCartGlyph}>🛒</Text>
          {myCart.length > 0 && <View style={styles.sep} />}
      {myCart.length > 0 && (
            <View style={styles.headCartBadge}>
              <Text style={styles.headCartBadgeText}>{myCart.length}</Text>
            </View>
          )}
        </Pressable>
      </View>
      <Text style={styles.small}>{ago(Date.now() - created)}</Text>
      <View style={styles.sep} />

      {/* One blue box holds the shops and, under them, the parts. */}
      <View style={receivedShops.length > 0 ? styles.answered : undefined}>
      {receivedShops.length > 0 && (
        <View style={styles.answeredInner} accessibilityLabel="Shops the request reached">
          <View style={styles.answeredTop}>
            <Text style={[styles.answeredHead, styles.flex1]} numberOfLines={1}>🏪 වෙළඳසැල්</Text>
            <Pressable style={styles.seeAllPill} onPress={() => setShopsOpen((o) => !o)} hitSlop={8} accessibilityLabel={shopsOpen ? 'Fold the shops' : 'See all shops'} accessibilityState={{ expanded: shopsOpen }}>
              <Text style={styles.seeAllText}>{shopsOpen ? 'Fold ▲' : 'See all ›'}</Text>
            </Pressable>
          </View>
          {/* How many shops the request reached, and how many of them have answered (5 / 2). */}
          <View style={styles.statRow} accessibilityLabel={`Reached ${receivedShops.length}, answered ${replied.length}`}>
            <View style={styles.statCell}>
              <Text style={styles.statNum}>{receivedShops.length}</Text>
              <Text style={styles.statCap}>ඉල්ලීම ලැබුණු</Text>
            </View>
            <Text style={styles.statSlash}>/</Text>
            <View style={styles.statCell}>
              <Text style={[styles.statNum, styles.statNumGood]}>{replied.length}</Text>
              <Text style={styles.statCap}>පිළිතුරු දුන්</Text>
            </View>
          </View>
          {!shopsOpen && (() => {
            // The shop with the lowest total so far.
            const best = receivedShops.filter((c) => !c.waiting && c.have.length > 0 && c.total).sort((x, y) => x.total - y.total)[0];
            return (
              <Pressable onPress={() => setShopsOpen(true)} accessibilityLabel="Shops summary">
                {best ? (
                  <BestPriceGlow>
                    <View style={styles.shopSummary}>
                      <Text style={styles.summaryName} numberOfLines={1}>💰 අඩුම මිල · {best.shopName}</Text>
                      <Text style={styles.summaryPrice}>{money(best.total)}</Text>
                    </View>
                  </BestPriceGlow>
                ) : (
                  <View style={styles.shopSummary}>
                    {replied.length > 0 ? <Text style={styles.small} numberOfLines={2}>පිළිතුරු ලැබී ඇත — See all ඔබා බලන්න</Text> : <WaitingAnswers style={styles.small} />}
                  </View>
                )}
              </Pressable>
            );
          })()}
          {shopsOpen && (
          <ScrollView style={[styles.answeredScroll, shopViewport ? { maxHeight: shopViewport } : null]} nestedScrollEnabled showsVerticalScrollIndicator>
            {receivedShops.map((c) => {
              // One tag per shop says where it stands: has parts, is looking for the part, has none, or has not answered yet.
              const looking = c.checking.length > 0;
              return (
                <Pressable key={c.shopId} onLayout={(e) => { const h = Math.round(e.nativeEvent.layout.height); setRowH((m) => (m[c.shopId] === h ? m : { ...m, [c.shopId]: h })); }} style={[styles.answeredRow, !c.waiting && c.have.length > 0 && styles.answeredRowHave]} onPress={() => (!c.waiting && c.have.length > 0 ? (setPopTab('compare'), setCompare(true)) : openShopFor(c.shopId))} accessibilityLabel={`Open ${c.shopName}`}>
                  <View style={styles.flex1}>
                    <View style={styles.nameLine}>
                      <Text style={[styles.shopName, styles.nameFlex]} numberOfLines={1}>{c.shopName}</Text>
                      {/* Like Messenger: a small check circle = sent to the shop; the word "Seen" in blue = the shop has seen it. */}
                      {c.seen ? (
                        <Text numberOfLines={1} style={[styles.seenText, { fontSize: 9, lineHeight: 11, paddingHorizontal: 5, paddingVertical: 0, borderRadius: 6, flexShrink: 0 }]} accessibilityLabel="Seen by the shop">Seen</Text>
                      ) : (
                        <View style={[styles.sentDot, { width: 12, height: 12, borderRadius: 6 }]} accessibilityLabel="Sent to the shop">
                          <Text style={[styles.sentCheck, { fontSize: 7, lineHeight: 9 }]}>✓</Text>
                        </View>
                      )}
                    </View>
                    {!!c.shop && !!c.shop.rating && <Text style={styles.rating}>★ {c.shop.rating.toFixed(1)}{c.shop.ratingCount ? ` (${c.shop.ratingCount})` : ''}</Text>}
                    {!!placeOf(c.shopId) && <Text style={styles.small} numberOfLines={1}>📍 {placeOf(c.shopId)!.district || placeOf(c.shopId)!.address} · {placeOf(c.shopId)!.distanceKm} km</Text>}
                    {/* What kind of part the shop has: new (Genuine, OEM) or reconditioned. */}
                    {!c.waiting && c.have.length > 0 && (
                      <View style={styles.typeRow}>
                        {partTypesOf(offers.filter((o) => o.shop.id === c.shopId && hasIt(o)).map((o) => o.partType)).map((t) => (
                          <PartTypeChip key={t} type={t} compact />
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={styles.tags}>
                    {c.waiting && !c.seen && <View style={[styles.tag, styles.tagWait]}><Text style={styles.tagWaitText}>යැව්වා</Text></View>}
                    {c.waiting && c.seen && <View style={[styles.tag, styles.tagLook, styles.lookRow]}><SearchingLens /><Text style={styles.tagLookText}>සොයමින්</Text></View>}
                    {!c.waiting && c.have.length > 0 && <View style={[styles.tag, styles.tagGood]}><Text style={styles.tagGoodText}>✓ ඇත {c.have.length}/{items.length}</Text></View>}
                    {!c.waiting && looking && <View style={[styles.tag, styles.tagLook, styles.lookRow]}><SearchingLens /><Text style={styles.tagLookText}>කොටස සොයමින්{c.checking.length > 1 ? ` ${c.checking.length}` : ''}</Text></View>}
                    {!c.waiting && c.have.length === 0 && !looking && <View style={[styles.tag, styles.tagBad]}><Text style={styles.tagBadText}>✖ නැත</Text></View>}
                    {!c.waiting && c.have.length > 0 && (
                      <View style={styles.totalWrap}>
                        <View style={styles.totalBox} accessibilityLabel={`Total ${c.shopName}`}>
                          <Text style={styles.totalIcon}>💰</Text>
                          <Text style={styles.totalValue}>{c.total ? money(c.total) : 'කවුන්ටරයේදී'}{c.unpriced && c.total ? ' +' : ''}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          )}
        </View>
      )}
      {receivedShops.length > 0 && <View style={styles.sep} />}

      {doneItems.length > 0 && (
        <Pressable style={styles.doneFold} onPress={() => setDoneOpen((o) => !o)} accessibilityLabel="Reserved parts: open or fold" accessibilityState={{ expanded: doneOpen }}>
          <View style={styles.flex1}>
            <Text style={styles.doneFoldText}>🔒 වෙන් කළ / මිලදී ගත් කොටස් {doneItems.length} {doneOpen ? '▲' : '▼'}</Text>
            {!doneOpen && <Text style={styles.small} numberOfLines={1}>{doneItems.map((m) => m.enquiry.briefs[0]?.name).filter(Boolean).join(' · ')}</Text>}
          </View>
        </Pressable>
      )}

      {items.map((m) => {
        if (!doneOpen && (m.enquiry.status === 'reserved' || m.enquiry.status === 'bought')) return null;
        const k = mark(m);
        const b = m.enquiry.briefs[0];
        return (
          <View key={m.enquiry.id}>
            <SwipeToWall enabled={m.enquiry.status === 'open' && m.enquiry.audience === 'shops'} onDrop={() => postToWall(m.enquiry.id)}>
              <Pressable style={styles.part} onPress={() => { setPartTab('shops'); setOpenId(m.enquiry.id); }} accessibilityLabel={`Part ${b?.name}`}>
                <View style={[styles.mark, k.tone === 'good' && styles.markGood, k.tone === 'bad' && styles.markBad]}>
                  <Text style={[styles.markText, k.tone === 'good' && { color: '#188038' }, k.tone === 'bad' && { color: '#d93025' }]}>{k.icon}</Text>
                </View>
                <View style={styles.flex1}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, styles.nameText]} numberOfLines={1}>{many ? `${num(m.enquiry.id)}. ` : ''}{b?.name}{(b?.qty ?? 1) > 1 ? ` ×${b?.qty}` : ''}</Text>
                    {/* A part posted on the open rare-parts wall carries a tag. */}
                    {m.enquiry.audience !== 'shops' && (
                      <View style={styles.wallTag} accessibilityLabel="Posted on the wall">
                        <Text style={styles.wallTagText}>📣</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.small, k.tone === 'bad' && styles.warn]}>{k.text}</Text>
                </View>
                <Text style={styles.chev}>›</Text>
              </Pressable>
            </SwipeToWall>
          </View>
        );
      })}


      </View>
      {(reservedShops.length > 0 || !!live0) && <View style={styles.sep} />}
      {reservedShops.length > 0 && !(showRange && !!live0) && <ReservedMap coords={items[0].enquiry.coords} shops={reservedShops} onOpen={() => { setRouteShop(reservedShops.length === 1 ? reservedShops[0].id : null); setRouteOpen(true); }} onQr={toVisit.length > 0 ? () => { setQrShop(toVisit.length === 1 ? toVisit[0].key : null); setQrOpen(true); } : undefined} onRange={remaining.length > 0 && !!live0 ? () => setShowRange(true) : undefined} />}
      {reservedShops.length > 0 && showRange && !!live0 && (
        <Pressable onPress={() => setShowRange(false)} hitSlop={6} accessibilityLabel="Back to the reserved shops map">
          <Text style={styles.link}>‹ වෙන් කළ වෙළඳසැල් map එකට</Text>
        </Pressable>
      )}
      {!!live0 && (reservedShops.length === 0 || showRange) && <ReachMap coords={live0.coords} status={shopStatus} current={currentKm} searchCount={searchable.length} onApply={(km) => searchWithin(searchable.map((m) => m.enquiry.id), km)} />}

      {myCart.length > 0 && (
        <Pressable style={styles.cartBar} onPress={() => { setPopTab('cart'); setCompare(true); }} accessibilityLabel="Open the cart">
          <View style={styles.cartIconWrap}>
            <Text style={styles.cartBarGlyph}>🛒</Text>
            <View style={styles.cartCount}>
              <Text style={styles.cartCountText}>{myCart.length}</Text>
            </View>
          </View>
          <View style={styles.flex1}>
            <View style={styles.cartLine}>
              <Text style={styles.cartTitle}>Cart එක</Text>
              <Text style={styles.cartSum}>රු. {cartTotal.toLocaleString()}</Text>
            </View>
            <Text style={[styles.cartTime, cartLeft <= 15 && styles.cartTimeLow]}>⏳ මිනිත්තු {cartLeft} ක් ඇතුළත shop එකෙන් තහවුරු කරන්න</Text>
            <View style={styles.cartTrack}>
              <View style={[styles.cartFill, cartLeft <= 15 && styles.cartFillLow, { width: `${Math.max(4, Math.min(100, (cartLeft / 60) * 100))}%` }]} />
            </View>
          </View>
          <View style={styles.cartGo}>
            <Text style={styles.cartGoText}>බලන්න ›</Text>
          </View>
        </Pressable>
      )}

      <Sheet visible={routeOpen} title="වෙන් කළ වෙළඳසැල්" subtitle="shop එකක් ඔබලා එහි මාර්ගය බලන්න" onClose={() => setRouteOpen(false)}>
        {reservedShops.map((x) => {
          const on = routeShop === x.id;
          return (
            <View key={x.id} style={styles.qrCard}>
              <Pressable style={styles.qrHead} onPress={() => setRouteShop(on ? null : x.id)} accessibilityLabel={`Directions ${x.name}`} accessibilityState={{ expanded: on }}>
                <View style={styles.flex1}>
                  <Text style={styles.shopName} numberOfLines={1}>🏪 {x.name}</Text>
                  <Text style={styles.small}>📍 {x.km} km · කොටස් {x.parts}</Text>
                </View>
                <Text style={styles.chev}>{on ? '▲' : '▼'}</Text>
              </Pressable>
              {on && (
                <View style={styles.routeBody}>
                  <RouteMap from={items[0].enquiry.coords} to={x.coords} km={x.km} />
                  <Pressable style={styles.routeBtn} onPress={() => Linking.openURL(directionsUrl(x.coords, items[0].enquiry.coords))} accessibilityLabel={`Open the way to ${x.name}`}>
                    <Text style={styles.routeBtnText}>🧭 මාර්ගය බලන්න (Google Maps)</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </Sheet>
      <Sheet visible={qrOpen} title="QR කේත" subtitle="shop එකක් ඔබලා එහි QR කේතය පෙන්වන්න — කවුන්ටරයේදී scan කරන්න" onClose={() => setQrOpen(false)}>
        {toVisit.length === 0 && <Text style={styles.small}>වෙන් කළ shop නැත.</Text>}
        {toVisit.map((v) => {
          const on = qrShop === v.key;
          return (
            <View key={v.key} style={styles.qrCard}>
              <Pressable style={styles.qrHead} onPress={() => setQrShop(on ? null : v.key)} accessibilityLabel={`QR ${v.shop}`} accessibilityState={{ expanded: on }}>
                <View style={styles.flex1}>
                  <Text style={styles.shopName} numberOfLines={1}>🏪 {v.shop}</Text>
                  <Text style={styles.small}>කොටස් {v.parts} · {on ? 'QR කේතය පහත' : 'QR කේතය බලන්න'}</Text>
                </View>
                <Text style={styles.chev}>{on ? '▲' : '▼'}</Text>
              </Pressable>
              {on && (
                <View style={styles.qrBody}>
                  <PurchaseCode code={v.code} size={190} />
                  <Text style={styles.small}>කේතය {v.code.slice(0, 3)} {v.code.slice(3)}</Text>
                  {v.names.map((n) => (
                    <Text key={n} style={styles.small} numberOfLines={1}>🔩 {n}</Text>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </Sheet>

      {many && wallLocked && <Text style={styles.small}>📣 නැති කොටස් {wallableAll.length} ක් — කි.මී. 100 දක්වා සෙවුවාම දුර්ලභ කොටස් පෝස්ට් එකට දාන chip එක විවෘත වෙයි.</Text>}

      {many && wallable.length > 0 && (
        <View style={styles.reachBox} accessibilityLabel="Reach and the open wall">
          {wallable.length > 0 && (
            <View style={styles.wallChips}>
              <Pressable style={styles.wallChip2} onPress={() => wallable.forEach((m) => postToWall(m.enquiry.id))} accessibilityLabel="Post the parts nobody has on the wall">
                <Text style={styles.wallChipText2}>📣 නැති කොටස් {wallable.length} ක් wall එකට</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* The shop-by-shop compare opens as a popup too. */}
      <Sheet visible={compare} title={started ? 'ඉතිරි කොටස් සඳහා shop එකක් තෝරන්න' : 'වෙළඳසැල් අනුව සංසන්දනය'} subtitle={vehLine || undefined} onClose={() => setCompare(false)}>
        <View style={styles.popTabs}>
          {([['compare', 'වෙළඳසැල් අනුව සංසන්දනය'], ['cart', `🛒 Cart${myCart.length ? ` · ${myCart.length}` : ''}`]] as const).map(([id, label]) => (
            <Animated.View key={id} style={[styles.popTabWrap, id === 'cart' && { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }]}>
              <Pressable style={[styles.popTab, popTab === id && styles.popTabOn, id === 'cart' && bump > 0 && styles.popTabHot]} onPress={() => setPopTab(id)} accessibilityLabel={`Tab ${id}`} accessibilityState={{ selected: popTab === id }}>
                <Text style={[styles.popTabText, popTab === id && styles.popTabTextOn]} numberOfLines={1}>{label}</Text>
              </Pressable>
              {id === 'cart' && bump > 0 && (
                <Animated.Text pointerEvents="none" style={[styles.plusFloat, { opacity: plus.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }), transform: [{ translateY: plus.interpolate({ inputRange: [0, 1], outputRange: [6, -22] }) }] }]}>+{bump}</Animated.Text>
              )}
            </Animated.View>
          ))}
        </View>
        {popTab === 'compare' ? <BatchCompare items={started ? remaining : items} /> : <CartPanel items={items} />}
      </Sheet>
      {/* Touching a part opens its record in a small popup: details, the shops that answered about it, and (for a part nobody has) the wall post. */}
      <Sheet visible={!!openId} title={items.find((m) => m.enquiry.id === openId)?.enquiry.briefs[0]?.name ?? 'කොටස'} subtitle={vehLine || undefined} onClose={() => setOpenId(null)}>
        {(() => {
          const m = items.find((x) => x.enquiry.id === openId);
          // Everything about the part in this one popup: its details (and the wall post when no shop has it), then the full request with the shops' answers, reserve, ask more, chat.
          if (!m) return null;
          if (!many) return (
            <>
              {detail(m)}
              {renderFull(m)}
            </>
          );
          const haveCount = offers.filter((o) => o.enquiryId === m.enquiry.id && hasIt(o)).length;
          return (
            <>
              <View style={styles.popTabs}>
                {([['shops', `🏪 මේ කොටස ඇති වෙළඳසැල් · ${haveCount}`], ['info', 'ℹ️ විස්තර']] as const).map(([id, label]) => (
                  <View key={id} style={id === 'shops' ? styles.popTabWide : styles.popTabWrap}>
                    <Pressable style={[styles.popTab, partTab === id && styles.popTabOn]} onPress={() => setPartTab(id)} accessibilityLabel={`Part tab ${id}`} accessibilityState={{ selected: partTab === id }}>
                      <Text style={[styles.popTabText, partTab === id && styles.popTabTextOn]} numberOfLines={1}>{label}</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
              {partTab === 'shops' ? renderFull(m) : detail(m)}
            </>
          );
        })()}
      </Sheet>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    sep: { height: 1, backgroundColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0' },
    // A modern card: roomy, big round corners, no hard outline, a soft wide shadow.
    card: { gap: 10, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 24, backgroundColor: Colors.bgCard, borderWidth: getThemeMode() === 'dark' ? 1 : 0, borderColor: Colors.borderColor, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 3 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    badge: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: Colors.primary },
    vehicle: { alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: 10, height: 22, justifyContent: 'center', borderRadius: 11, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.14)' : '#e8f0fe' },
    vehicleShrink: { flexShrink: 1 },
    vehicleText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    small: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    warn: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#f28b82' : '#d93025' },
    label: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.textMain, marginTop: 2 },
    part: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#f6f7f9', borderWidth: 1, borderColor: 'transparent' },
    partOpen: { borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.1)' : '#f1f6fe' },
    mark: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f1f3f4' },
    markGood: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.16)' : '#e6f4ea' },
    markBad: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(242, 139, 130, 0.16)' : '#fce8e6' },
    markText: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.textMuted },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    nameText: { flexShrink: 1 },
    wallTag: { width: 24, height: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? 'rgba(253, 214, 99, 0.16)' : '#fef7e0', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(253, 214, 99, 0.3)' : '#fde293' },
    wallTagText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#fdd663' : '#b06000' },
    name: { fontSize: 13.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    chev: { fontSize: 20, color: Colors.textMuted },
    detail: { gap: 6, paddingHorizontal: 0, paddingVertical: 8 },
    photos: { flexDirection: 'row', gap: 6 },
    photo: { width: 48, height: 48, borderRadius: 8 },
    shopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    shopName: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    wall: { gap: 6, paddingVertical: 10, paddingHorizontal: 3, borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? 'rgba(253, 214, 99, 0.08)' : '#fef7e0', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#fde293' },
    input: { minHeight: 44, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard, color: Colors.textMain, fontSize: 12.5, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top' },
    visit: { gap: 3, paddingVertical: 10, paddingHorizontal: 3, borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.1)' : '#f1f6fe', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    reach: { gap: 6, paddingVertical: 7, paddingHorizontal: 6, borderRadius: 16, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.1)' : '#e8f0fe', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.25)' : '#d2e3fc' },
    reachMapBox: { borderRadius: 16, overflow: 'hidden' },
    mapKmChip: { position: 'absolute', left: 8, bottom: 8, height: 26, paddingHorizontal: 10, borderRadius: 13, justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(20, 24, 33, 0.85)' : 'rgba(255, 255, 255, 0.92)' },
    mapKmText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    resPin: { position: 'absolute', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#188038', borderWidth: 2, borderColor: '#ffffff' },
    resPinText: { fontSize: 13 },
    resLabel: { position: 'absolute', width: 90, textAlign: 'center', fontSize: 10, fontFamily: FONTS.bodySemiBold, color: '#202124', backgroundColor: 'rgba(255, 255, 255, 0.88)', borderRadius: 4, overflow: 'hidden', paddingHorizontal: 2 },
    reachHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    reachCircle: { position: 'absolute', borderWidth: 2, borderColor: '#1a73e8', backgroundColor: 'rgba(26, 115, 232, 0.14)' },
    reachMe: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: '#1a73e8', borderWidth: 2, borderColor: '#ffffff' },
    reachShop: { position: 'absolute', width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: '#ffffff' },
    reachRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
    reachStep: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard },
    reachStepText: { fontSize: 20, fontFamily: FONTS.bodyBold, color: Colors.textMain, lineHeight: 24 },
    reachKm: { minWidth: 110, textAlign: 'center', fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    doneFold: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.4)' : '#b7e1c1', backgroundColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.1)' : '#e6f4ea' },
    doneFoldText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#81c995' : '#188038' },
    qrChip: { alignSelf: 'flex-start', paddingHorizontal: 12, minHeight: 34, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', marginTop: 4 },
    qrChipText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    qrCard: { borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    qrHead: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
    qrBody: { alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 14 },
    routeLine: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: '#1a73e8' },
    routeBody: { gap: 10, paddingHorizontal: 12, paddingBottom: 14 },
    routeBtn: { minHeight: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8' },
    routeBtnText: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: '#ffffff' },
    reachBox: { gap: 8 },
    reachChip: { alignSelf: 'flex-start', paddingHorizontal: 12, minHeight: 36, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    reachText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    wallChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    wallChip2: { paddingHorizontal: 12, minHeight: 36, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(253, 214, 99, 0.3)' : '#fde293', backgroundColor: getThemeMode() === 'dark' ? 'rgba(253, 214, 99, 0.12)' : '#fef7e0' },
    wallChipText2: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#fdd663' : '#b06000' },
    wallRow2: { gap: 6, padding: 10, borderRadius: 10, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    wallRow2On: { borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    answeredInner: { gap: 5 },
    answered: { gap: 5, paddingVertical: 7, paddingHorizontal: 6, borderRadius: 16, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.1)' : '#e8f0fe', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.25)' : '#d2e3fc' },
    seeAllPill: { height: 30, paddingHorizontal: 14, borderRadius: 15, justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    seeAllText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    statRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, backgroundColor: Colors.bgCard },
    statCell: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexShrink: 1 },
    statNum: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    statNumGood: { color: getThemeMode() === 'dark' ? '#81c995' : '#188038' },
    statCap: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, flexShrink: 1 },
    statSlash: { fontSize: 16, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    shopSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, backgroundColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.12)' : '#e6f4ea' },
    summaryName: { flex: 1, fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    summaryPrice: { fontSize: 14, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#81c995' : '#188038' },
    answeredTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    answeredBadge: { minWidth: 24, height: 24, paddingHorizontal: 7, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d93025' },
    answeredBadgeText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    answeredHead: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    nameFlex: { flexShrink: 1 },
    sentDot: { flexShrink: 0, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.textMuted },
    sentCheck: { fontSize: 8, fontFamily: FONTS.bodyBold, color: Colors.textMuted, lineHeight: 10 },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
    seenText: { fontSize: 9.5, fontFamily: FONTS.bodySemiBold, color: '#0084ff', borderWidth: 1, borderColor: '#0084ff', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end', maxWidth: '58%' },
    tag: { paddingHorizontal: 7, height: 22, justifyContent: 'center', borderRadius: 8 },
    tagGood: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.16)' : '#e6f4ea' },
    tagGoodText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#81c995' : '#188038' },
    tagLook: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(253, 214, 99, 0.16)' : '#fef7e0' },
    lookRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tagLookText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#fdd663' : '#b06000' },
    tagBad: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(242, 139, 130, 0.16)' : '#fce8e6' },
    tagBadText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#f28b82' : '#d93025' },
    tagWait: { backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#f1f3f4' },
    tagWaitText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    answeredScroll: {},
    answeredRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 3, marginBottom: 4, borderRadius: 8, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    // A shop that has parts is a light green row from end to end.
    answeredRowHave: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.12)' : '#e6f4ea', borderColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.35)' : '#b7e1c1' },
    totalWrap: { flexBasis: '100%', alignItems: 'flex-end' },
    totalBox: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.4)' : '#188038', backgroundColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.1)' : '#e6f4ea', flexDirection: 'row', alignItems: 'center', gap: 5 },
    totalIcon: { fontSize: 13 },
    totalValue: { fontSize: 13, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#81c995' : '#188038' },
    rating: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: '#b06000' },
    swipeHint: { position: 'absolute', left: 0, top: 0, bottom: 0, right: 0, justifyContent: 'center', paddingLeft: 12, borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? 'rgba(253, 214, 99, 0.16)' : '#fef7e0' },
    swipeHintText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#fdd663' : '#b06000' },
    cartBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 14, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.35)' : '#d2e3fc', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.1)' : '#f1f6fe', ...elevation1() },
    cartIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8', borderWidth: 3, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.45)' : '#a8c7fa' },
    cartBarGlyph: { fontSize: 21 },
    cartCount: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#1a73e8' },
    cartCountText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: '#1a73e8' },
    cartLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
    cartTitle: { fontSize: 14.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    cartSum: { fontSize: 17, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#81c995' : '#188038' },
    cartTime: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    cartTimeLow: { color: getThemeMode() === 'dark' ? '#fdd663' : '#b06000', fontFamily: FONTS.bodySemiBold },
    cartTrack: { height: 4, borderRadius: 2, marginTop: 6, backgroundColor: getThemeMode() === 'dark' ? 'rgba(255, 255, 255, 0.12)' : '#dadce0', overflow: 'hidden' },
    cartFill: { height: 4, borderRadius: 2, backgroundColor: '#1a73e8' },
    cartFillLow: { backgroundColor: '#f9ab00' },
    cartGo: { paddingHorizontal: 12, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8' },
    cartGoText: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    popTabs: { flexDirection: 'row', gap: 8 },
    popTabWrap: { flex: 1 },
    popTabWide: { flex: 2 },
    popTabHot: { borderColor: '#1a73e8' },
    plusFloat: { position: 'absolute', right: 10, top: -6, fontSize: 14, fontFamily: FONTS.bodyBold, color: '#1a73e8' },
    popTab: { minHeight: 38, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard },
    popTabOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    popTabText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
    popTabTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    headCart: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    headCartGlyph: { fontSize: 16 },
    headCartBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8' },
    headCartBadgeText: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    partShops: { gap: 8, paddingVertical: 4 },
    psCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    psCardOn: { borderColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.5)' : '#81c995', backgroundColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.1)' : '#e6f4ea' },
    psPrice: { fontSize: 13.5, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#81c995' : '#188038' },
    cheapTag: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#81c995' : '#188038', alignSelf: 'center' },
    cartIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    cartIconOn: { backgroundColor: '#188038', borderColor: '#188038' },
    cartIconGlyph: { fontSize: 18, color: '#ffffff' },
    link: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  })
);
