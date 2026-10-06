import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { distanceKm, makeCloseCode, type PartLine } from '@ongarage/shared';
import {
  COURIER,
  CONFIRM_MIN,
  DECISION_MS,
  DELIVERY_MS,
  GARAGE_CHECK_MS,
  GARAGES,
  HOLD_MS,
  PICKUP_ARRIVE_MS,
  LATE_REQUEST,
  LATE_REQUEST_MS,
  listPrice,
  RATING_HISTORY,
  REQUEST_POOL,
  REVIEWS,
  SHOP,
  STOCK,
  type RequestSeed,
} from '../constants/mockData';
import type { IncomingRequest, MyQuote, Notice, QuoteType, ShopOrder, ShopProfile, ShopReview, StockItem, StockVariant } from '../types';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

/**
 * The part types this shop may quote for a request: what the garage allows (the
 * owner's choice; Recon for a Genuine request only once the owner approved it),
 * limited to what the shop sells.
 */
export const allowedTypes = (r: IncomingRequest, shopTypes: QuoteType[]): QuoteType[] => {
  const asked: QuoteType[] =
    r.partType === 'GarageChoice' ? ['Genuine', 'OEM', 'Recon'] : r.partType === 'Genuine' ? (r.reconApproval === 'approved' ? ['Genuine', 'Recon'] : ['Genuine']) : [r.partType];
  return asked.filter((t) => shopTypes.includes(t));
};

export const variantFor = (stock: StockItem[], name: string, type: QuoteType): StockVariant | undefined =>
  stock.find((i) => i.name === name)?.variants.find((v) => v.type === type);

/** Can every line be supplied from stock in this type? */
export const inStockFor = (stock: StockItem[], lines: PartLine[], type: QuoteType) => lines.every((l) => (variantFor(stock, l.name, type)?.qty ?? 0) >= l.qty);

export const defaultEtaMin = (method: 'courier' | 'shop', km: number) => Math.round(method === 'courier' ? 20 + km * 4 : 35 + km * 5);
export const courierFee = (km: number) => Math.round((250 + km * 45) / 50) * 50;

const makeRequest = (seed: RequestSeed, i: number, shop: ShopProfile, stock: StockItem[], now: number): IncomingRequest => {
  const g = GARAGES[seed.garage];
  const createdAt = now - seed.ageMin * MIN;
  const draft: IncomingRequest = {
    id: `in-${i}-${now}`,
    bookingId: `bk-${i}`,
    garage: g,
    categoryId: seed.categoryId,
    vehicle: seed.vehicle,
    partType: seed.partType,
    reconApproval: seed.reconApproval,
    lines: seed.lines,
    note: seed.note,
    oldPartPhoto: seed.oldPartPhoto,
    createdAt,
    quoteUntil: createdAt + seed.windowMin * MIN,
    needBy: now + seed.needInHours * HOUR,
    radiusKm: 10,
    status: 'open',
    searching: true,
    distanceKm: Number(distanceKm(shop.coords, g.coords).toFixed(1)),
    receivedAt: createdAt,
    otherQuotes: seed.otherQuotes,
    rivalBest: 0,
    simProblem: seed.simProblem,
    simPickup: seed.simPickup,
  };
  // The best rival: a share of what this request costs at this shop's cheapest suitable stock price
  // (rivalFactor above 1 means quoting at stock price wins).
  const sold = allowedTypes(draft, shop.types);
  const types = sold.length ? sold : allowedTypes(draft, ['Genuine', 'OEM', 'Recon']);
  const cost = draft.lines.reduce((s, l) => s + Math.min(...types.map((t) => variantFor(stock, l.name, t)?.price ?? listPrice(l.name, t))) * l.qty, 0);
  return { ...draft, rivalBest: Math.round((cost + 350) * seed.rivalFactor) };
};

export type QuoteInput = {
  requestId: string;
  partType: QuoteType;
  unitPrices: number[];
  delivery: 'courier' | 'shop';
  deliveryFee: number;
  etaMin: number;
  warrantyMonths: number;
  note?: string;
  /** Offer collection from the counter, ready this many minutes after confirming (parts price only). */
  pickupReadyMin?: number;
};

type ShopState = {
  profile: ShopProfile;
  isOpen: boolean;
  requests: IncomingRequest[];
  quotes: MyQuote[];
  orders: ShopOrder[];
  stock: StockItem[];
  reviews: ShopReview[];
  rating: { average: number; count: number };
  notice: Notice | null;

  /** Requests to answer: in range, window open, not quoted or passed. */
  newRequests: IncomingRequest[];
  /** Orders waiting for the shop (confirm stock, send, take a return back). */
  ordersNeedingAction: ShopOrder[];

  setOpen: (open: boolean) => void;
  setRadius: (km: number) => void;
  setDelivery: (change: Partial<Pick<ShopProfile, 'courierEnabled' | 'ownDelivery'>>) => void;
  saveCatalogue: (types: QuoteType[], categories: string[]) => void;

  passRequest: (id: string) => void;
  sendQuote: (input: QuoteInput) => void;
  withdrawQuote: (id: string) => void;

  confirmStock: (orderId: string) => boolean;
  declineStock: (orderId: string) => void;
  dispatchOrder: (orderId: string, method: 'courier' | 'shop', staffId?: string) => void;
  /** Pickup orders: packed and waiting at the counter. */
  markReady: (orderId: string) => void;
  /** Pickup code checked at the counter: hand the parts over and get paid. */
  handOverPickup: (orderId: string) => void;
  acceptReturn: (orderId: string) => void;

  adjustQty: (itemId: string, type: QuoteType, delta: number) => void;
  saveVariant: (itemId: string, variant: StockVariant) => void;
  addItem: (item: Omit<StockItem, 'id'>) => void;

  replyReview: (id: string, text: string) => void;
  dismissNotice: () => void;
};

const ShopContext = createContext<ShopState | null>(null);

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<ShopProfile>(SHOP);
  const [isOpen, setIsOpen] = useState(true);
  const [stock, setStock] = useState<StockItem[]>(STOCK);
  const [requests, setRequests] = useState<IncomingRequest[]>(() => REQUEST_POOL.map((s, i) => makeRequest(s, i, SHOP, STOCK, Date.now())));
  const [quotes, setQuotes] = useState<MyQuote[]>([]);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [reviews, setReviews] = useState<ShopReview[]>(REVIEWS);
  // Orders the shop failed (no stock, missed confirmation) count as 1★ against its rating.
  const [penalties, setPenalties] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [now, setNow] = useState(Date.now());

  const live = useRef({ profile, isOpen, stock, requests, quotes, orders });
  live.current = { profile, isOpen, stock, requests, quotes, orders };

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const noticeId = useRef(0);
  const notify = useCallback((n: Omit<Notice, 'id'>) => setNotice({ ...n, id: ++noticeId.current }), []);
  const dismissNotice = useCallback(() => setNotice(null), []);

  const patchOrder = useCallback((id: string, change: Partial<ShopOrder>) => setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...change } : o))), []);
  const restock = useCallback(
    (lines: PartLine[], type: QuoteType, sign: 1 | -1) =>
      setStock((prev) =>
        prev.map((item) => {
          const l = lines.find((x) => x.name === item.name);
          if (!l) return item;
          return { ...item, variants: item.variants.map((v) => (v.type === type ? { ...v, qty: Math.max(0, v.qty + sign * l.qty) } : v)) };
        })
      ),
    []
  );

  // Clock for windows and confirmation deadlines.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  // A confirmation that runs out counts as no stock.
  useEffect(() => {
    const lapsed = orders.filter((o) => o.status === 'confirming' && o.confirmBy <= now);
    if (!lapsed.length) return;
    lapsed.forEach((o) => patchOrder(o.id, { status: 'unavailable' }));
    setPenalties((p) => p + lapsed.length);
    notify({ icon: '⌛', title: 'තොග තහවුරු කිරීම කල් ඉකුත් විය', body: 'ගරාජය වෙනත් වෙළඳසැලක් තෝරා ගනී — ඔබගේ ශ්‍රේණියට බලපායි.', tone: 'danger' });
  }, [now, orders, patchOrder, notify]);

  // Another garage asks a little later while the shop is open.
  useEffect(() => {
    const t = setTimeout(() => {
      const { isOpen: open, profile: p, stock: s } = live.current;
      if (!open) return;
      const r = makeRequest(LATE_REQUEST, REQUEST_POOL.length, p, s, Date.now());
      if (r.distanceKm > p.deliveryRadiusKm) return;
      setRequests((prev) => [r, ...prev]);
      notify({ icon: '🔩', title: 'නව කොටස් ඉල්ලීමක්', body: `${r.garage.name} · ${r.lines.map((l) => l.name).join(', ')}`, tone: 'primary' });
    }, LATE_REQUEST_MS);
    return () => clearTimeout(t);
  }, [notify]);

  // ---------- Profile ----------
  const setOpen = useCallback((open: boolean) => setIsOpen(open), []);
  const setRadius = useCallback((km: number) => setProfile((p) => ({ ...p, deliveryRadiusKm: Math.max(1, Math.min(25, km)) })), []);
  const setDelivery = useCallback((change: Partial<Pick<ShopProfile, 'courierEnabled' | 'ownDelivery'>>) => setProfile((p) => ({ ...p, ...change })), []);
  const saveCatalogue = useCallback((types: QuoteType[], categories: string[]) => setProfile((p) => ({ ...p, types, categories })), []);

  // ---------- Requests & quotes ----------
  const passRequest = useCallback((id: string) => setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, passed: true } : r))), []);

  const sendQuote = useCallback(
    (input: QuoteInput) => {
      const { requests: rs, profile: p } = live.current;
      const r = rs.find((x) => x.id === input.requestId);
      if (!r) return;
      const partsTotal = input.unitPrices.reduce((s, u, i) => s + u * r.lines[i].qty, 0);
      const quote: MyQuote = {
        id: `mq-${r.id}`,
        requestId: r.id,
        shop: { id: p.id, name: p.name, rating: p.rating, ratingCount: p.ratingCount, distanceKm: r.distanceKm, phone: p.phone, address: p.address },
        partType: input.partType,
        unitPrices: input.unitPrices,
        partsTotal,
        deliveryFee: input.deliveryFee,
        total: partsTotal + input.deliveryFee,
        etaMin: input.etaMin,
        warrantyMonths: input.warrantyMonths,
        delivery: input.delivery,
        courier: input.delivery === 'courier' ? COURIER : undefined,
        pickup: input.pickupReadyMin ? { readyInMin: input.pickupReadyMin, total: partsTotal } : undefined,
        at: Date.now(),
        status: 'pending',
        note: input.note,
        request: r,
      };
      setQuotes((prev) => [quote, ...prev.filter((q) => q.id !== quote.id)]);
      notify({ icon: '📨', title: 'මිල ගණන යැව්වා', body: `${r.garage.name} · රු. ${quote.total.toLocaleString()}`, tone: 'primary' });

      // The garage compares quotes (simulated): cheapest total that arrives in time wins.
      later(() => {
        const q = live.current.quotes.find((x) => x.id === quote.id);
        if (!q || q.status !== 'pending' || q.at !== quote.at) return;
        const onTime = Date.now() + q.etaMin * MIN <= r.needBy;
        if (q.total > r.rivalBest || !onTime) {
          setQuotes((prev) => prev.map((x) => (x.id === q.id ? { ...x, status: 'lost' } : x)));
          notify({ icon: '📉', title: 'ගරාජය වෙනත් මිල ගණනක් තෝරා ගත්තා', body: onTime ? `${r.garage.name} අඩු මුළු මිලක් තෝරා ගත්තා.` : 'ඔබගේ බෙදාහැරීම වැඩට ප්‍රමාද විය හැකි විය.', tone: 'danger' });
          return;
        }
        setQuotes((prev) => prev.map((x) => (x.id === q.id ? { ...x, status: 'won' } : x)));
        // The garage chose to collect (when this quote offers it): its pickup code comes with the order.
        const pickup = r.simPickup && q.pickup ? { code: makeCloseCode(), collector: r.simPickup } : undefined;
        const order: ShopOrder = { id: `so-${Date.now()}`, quote: { ...q, status: 'won' }, status: 'confirming', placedAt: Date.now(), confirmBy: Date.now() + CONFIRM_MIN * MIN, pickup };
        setOrders((prev) => [order, ...prev]);
        notify({
          icon: '🏆',
          title: 'ඔබගේ මිල ගණන තෝරා ගත්තා!',
          body: `${r.garage.name}${pickup ? ' · කවුන්ටරයෙන් එකතු කරයි' : ''} — මිනි. ${CONFIRM_MIN}ක් ඇතුළත තොගය තහවුරු කරන්න.`,
          tone: 'success',
        });
      }, DECISION_MS);
    },
    [later, notify]
  );

  const withdrawQuote = useCallback((id: string) => setQuotes((prev) => prev.map((q) => (q.id === id && q.status === 'pending' ? { ...q, status: 'withdrawn' } : q))), []);

  // ---------- Orders ----------
  const confirmStock = useCallback(
    (orderId: string) => {
      const o = live.current.orders.find((x) => x.id === orderId);
      if (!o || o.status !== 'confirming') return false;
      const { lines } = o.quote.request;
      if (!inStockFor(live.current.stock, lines, o.quote.partType)) {
        notify({ icon: '⚠️', title: 'තොගය ප්‍රමාණවත් නැත', body: '“තොගය” ටැබයේ ප්‍රමාණය යාවත්කාලීන කරන්න, නැත්නම් “තොග නැත” ඔබන්න.', tone: 'danger' });
        return false;
      }
      restock(lines, o.quote.partType, -1);
      patchOrder(orderId, { status: 'packing' });
      notify({ icon: '✅', title: 'තොගය තහවුරු කළා', body: o.pickup ? 'ඇසුරුම් කර කවුන්ටරයේ තබන්න — ගරාජය එකතු කරයි.' : 'ඇසුරුම් කර බෙදාහැරීමට යවන්න.', tone: 'success' });
      return true;
    },
    [notify, patchOrder, restock]
  );

  const declineStock = useCallback(
    (orderId: string) => {
      patchOrder(orderId, { status: 'unavailable' });
      setPenalties((p) => p + 1);
      notify({ icon: '⛔', title: 'ඇණවුම අවලංගු විය', body: 'ගරාජය වෙනත් මිල ගණනක් තෝරා ගනී. තොගය නිවැරදිව තබා ගැනීමෙන් ශ්‍රේණිය ආරක්ෂා කරගන්න.', tone: 'danger' });
    },
    [notify, patchOrder]
  );

  const dispatchOrder = useCallback(
    (orderId: string, method: 'courier' | 'shop', staffId?: string) => {
      const o = live.current.orders.find((x) => x.id === orderId);
      if (!o || o.status !== 'packing') return;
      const staff = live.current.profile.staff.find((s) => s.id === staffId);
      const rider = method === 'courier' ? { name: 'සමන් කුමාර', phone: '0771230099' } : { name: staff?.name ?? 'වෙළඳසැල', phone: staff?.phone ?? live.current.profile.phone };
      patchOrder(orderId, {
        status: 'dispatched',
        delivery: {
          method,
          courier: method === 'courier' ? COURIER : undefined,
          rider,
          etaAt: Date.now() + o.quote.etaMin * MIN,
          trackingUrl: method === 'courier' ? 'https://www.pickme.lk' : undefined,
        },
      });
      notify({ icon: '🛵', title: 'කොටස් පිටත් කළා', body: `${o.quote.request.garage.name} වෙත · ${method === 'courier' ? COURIER : rider.name}`, tone: 'success' });

      // Simulated: the parts reach the garage, which checks them and pays on delivery.
      later(() => {
        patchOrder(orderId, { status: 'arrived' });
        later(() => {
          const cur = live.current.orders.find((x) => x.id === orderId);
          if (!cur || cur.status !== 'arrived') return;
          const r = cur.quote.request;
          if (r.simProblem) {
            patchOrder(orderId, { status: 'problem', problem: r.simProblem });
            notify({ icon: '↩️', title: 'ගරාජය ගැටලුවක් වාර්තා කළා', body: `${r.garage.name}: ${r.simProblem} — ආපසු ගැනීම සලකා බලන්න.`, tone: 'danger' });
            return;
          }
          // A courier's fee goes to the courier; the shop keeps its own delivery fee.
          const payout = cur.quote.partsTotal + (cur.quote.delivery === 'shop' ? cur.quote.deliveryFee : 0);
          patchOrder(orderId, { status: 'received', receivedAt: Date.now(), payout });
          notify({ icon: '💰', title: 'ගරාජය ලැබුණු බව තහවුරු කළා', body: `රු. ${payout.toLocaleString()} ලැබුණා (භාරදීමේදී ගෙවීම).`, tone: 'success' });
          later(() => {
            const stars = cur.quote.etaMin <= 40 ? 5 : 4;
            patchOrder(orderId, { rating: stars });
            setReviews((prev) => [{ id: `sr-${orderId}`, garage: r.garage.name, rating: stars, text: stars === 5 ? 'ඉක්මනින් නිවැරදි කොටස ලැබුණා. ස්තූතියි!' : 'හොඳ කොටසක්, බෙදාහැරීම ටිකක් වෙලා ගියා.', at: Date.now() }, ...prev]);
          }, 3000);
        }, GARAGE_CHECK_MS);
      }, DELIVERY_MS);
    },
    [later, notify, patchOrder]
  );

  const markReady = useCallback(
    (orderId: string) => {
      const o = live.current.orders.find((x) => x.id === orderId);
      if (!o?.pickup || o.status !== 'packing') return;
      patchOrder(orderId, { status: 'ready', pickup: { ...o.pickup, holdUntil: Date.now() + HOLD_MS } });
      notify({ icon: '🏪', title: 'කවුන්ටරයේ සූදානම්', body: `${o.quote.request.garage.name} වෙත දැනුම් දුන්නා · ${o.pickup.collector} එකතු කරයි.`, tone: 'success' });
      // Simulated: the collector reaches the counter.
      later(() => {
        const cur = live.current.orders.find((x) => x.id === orderId);
        if (!cur?.pickup || cur.status !== 'ready') return;
        patchOrder(orderId, { pickup: { ...cur.pickup, arrivedAt: Date.now() } });
        notify({ icon: '🧑‍🔧', title: `${cur.pickup.collector} කවුන්ටරයට පැමිණියා`, body: 'පිකප් කේතය පරීක්ෂා කර කොටස් භාර දෙන්න.', tone: 'primary' });
      }, PICKUP_ARRIVE_MS);
    },
    [later, notify, patchOrder]
  );

  const handOverPickup = useCallback(
    (orderId: string) => {
      const o = live.current.orders.find((x) => x.id === orderId);
      if (!o?.pickup || o.status !== 'ready') return;
      // Collected: no delivery fee, the shop is paid the parts price at the counter.
      const payout = o.quote.partsTotal;
      patchOrder(orderId, { status: 'received', receivedAt: Date.now(), payout });
      notify({ icon: '💰', title: 'කොටස් භාර දුන්නා', body: `රු. ${payout.toLocaleString()} ලැබුණා · ${o.pickup.collector}`, tone: 'success' });
      later(() => {
        patchOrder(orderId, { rating: 5 });
        setReviews((prev) => [{ id: `sr-${orderId}`, garage: o.quote.request.garage.name, rating: 5, text: 'කවුන්ටරයේ සූදානම් කරලා තිබ්බා, විනාඩියෙන් ගෙනිච්චා.', at: Date.now() }, ...prev]);
      }, 3000);
    },
    [later, notify, patchOrder]
  );

  const acceptReturn = useCallback(
    (orderId: string) => {
      const o = live.current.orders.find((x) => x.id === orderId);
      if (!o || o.status !== 'problem') return;
      restock(o.quote.request.lines, o.quote.partType, 1);
      patchOrder(orderId, { status: 'returned', payout: 0 });
      notify({ icon: '📦', title: 'ආපසු ගැනීම පිළිගත්තා', body: 'කොටස තොගයට නැවත එක් කළා.', tone: 'primary' });
    },
    [notify, patchOrder, restock]
  );

  // ---------- Stock ----------
  const adjustQty = useCallback(
    (itemId: string, type: QuoteType, delta: number) =>
      setStock((prev) => prev.map((i) => (i.id === itemId ? { ...i, variants: i.variants.map((v) => (v.type === type ? { ...v, qty: Math.max(0, v.qty + delta) } : v)) } : i))),
    []
  );
  const saveVariant = useCallback(
    (itemId: string, variant: StockVariant) =>
      setStock((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, variants: i.variants.some((v) => v.type === variant.type) ? i.variants.map((v) => (v.type === variant.type ? variant : v)) : [...i.variants, variant] } : i
        )
      ),
    []
  );
  const addItem = useCallback((item: Omit<StockItem, 'id'>) => setStock((prev) => [{ ...item, id: `i-${Date.now()}` }, ...prev]), []);

  // ---------- Reviews ----------
  const replyReview = useCallback((id: string, text: string) => {
    const t = text.trim();
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, reply: t ? { text: t, at: Date.now() } : undefined } : r)));
  }, []);

  // ---------- Derived ----------
  const rating = useMemo(() => {
    const count = RATING_HISTORY.count + reviews.length + penalties;
    const sum = RATING_HISTORY.sum + reviews.reduce((s, r) => s + r.rating, 0) + penalties;
    return { average: Number((sum / count).toFixed(1)), count };
  }, [reviews, penalties]);

  const newRequests = useMemo(
    () =>
      requests
        .filter((r) => !r.passed && r.quoteUntil > now && r.distanceKm <= profile.deliveryRadiusKm && !quotes.some((q) => q.requestId === r.id && q.status !== 'withdrawn'))
        .sort((a, b) => a.quoteUntil - b.quoteUntil),
    [requests, quotes, now, profile.deliveryRadiusKm]
  );
  const ordersNeedingAction = useMemo(
    () => orders.filter((o) => o.status === 'confirming' || o.status === 'packing' || o.status === 'problem' || (o.status === 'ready' && !!o.pickup?.arrivedAt)),
    [orders]
  );

  const value: ShopState = {
    profile: { ...profile, rating: rating.average, ratingCount: rating.count },
    isOpen,
    requests,
    quotes,
    orders,
    stock,
    reviews,
    rating,
    notice,
    newRequests: isOpen ? newRequests : [],
    ordersNeedingAction,
    setOpen,
    setRadius,
    setDelivery,
    saveCatalogue,
    passRequest,
    sendQuote,
    withdrawQuote,
    confirmStock,
    declineStock,
    dispatchOrder,
    markReady,
    handOverPickup,
    acceptReturn,
    adjustQty,
    saveVariant,
    addItem,
    replyReview,
    dismissNotice,
  };
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
};

export const useShop = () => {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used inside ShopProvider');
  return ctx;
};
