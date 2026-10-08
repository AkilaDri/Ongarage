import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  advanceReferral,
  clampCommission,
  closeReferral,
  commissionFor,
  dealLabel,
  dealPrice,
  isLive,
  martDeals,
  martShopInfo,
  validateDeal,
  type ShopDeal,
  distanceKm,
  makeCloseCode,
  MART_SHOPS,
  newReferral,
  partCategory,
  recordOutcome,
  referralPriceOk,
  reachesShops,
  ringKm,
  shopServiceScore,
  tradeDiscount,
  wallVisibleTo,
  type PartEnquiry,
  type PartLine,
  type PartPurchase,
  type PartReferral,
  type ShopListing,
  type ShopStats,
} from '@ongarage/shared';
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
  BUYER_DECIDE_MS,
  CUSTOMER_POOL,
  LATE_CUSTOMER,
  LATE_CUSTOMER_MS,
  REFERRAL_SEED,
  type CustomerSeed,
} from '../constants/mockData';
import type { CustomerRequest, IncomingRequest, MyOffer, MyQuote, Notice, QuoteType, ShopBanner, ShopOrder, ShopProfile, ShopReview, ShopSale, StockItem, StockVariant } from '../types';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

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

/** What the buyer sees of a customer enquiry: the open wall never shows who asked. */
export const buyerLabel = (r: CustomerRequest) => (r.via === 'wall' ? 'විවෘත දුර්ලභ කොටස් පෝස්ට් එක' : r.enquiry.buyer.name);

/** Whether a customer enquiry is shown to this shop: direct ones always, wall posts only for parts it sells. */
export const visibleToShop = (r: CustomerRequest, p: Pick<ShopProfile, 'types' | 'categories'>) => r.via === 'shop' || r.enquiry.briefs.some((b) => wallVisibleTo(p, b));

const makeCustomerRequest = (seed: CustomerSeed, shop: ShopProfile, now: number): CustomerRequest => {
  const createdAt = now - seed.ageMin * MIN;
  const ring = seed.audience === 'wall' ? 'nationwide' : 'wider';
  const km = Number(distanceKm(shop.coords, seed.coords).toFixed(1));
  const enquiry: PartEnquiry = {
    id: `ce-${seed.id}`,
    buyer: seed.buyer,
    briefs: seed.briefs.map((b, i) => ({
      id: `${seed.id}-b${i}`,
      name: b.name,
      qty: b.qty,
      partType: b.partType,
      partNo: b.partNo,
      note: b.note,
      photos: b.photos ? Array.from({ length: b.photos }, (_, k) => `photo-${k}`) : undefined,
      vehicle: seed.vehicle,
      categoryId: partCategory(b.name),
    })),
    audience: seed.audience,
    ring,
    coords: seed.coords,
    jobRef: seed.job ? { bookingId: seed.job.bookingId, lineId: seed.job.lineId, garage: { id: GARAGES[seed.job.garage].id, name: GARAGES[seed.job.garage].name }, recommendedShopIds: seed.job.recommended } : undefined,
    createdAt,
    quoteUntil: createdAt + seed.windowMin * MIN,
    status: 'open',
  };
  // A direct enquiry reaches shops inside its ring; everything else comes through the wall.
  const direct = reachesShops(seed.audience) && km <= ringKm(ring);
  return { id: enquiry.id, enquiry, via: direct ? 'shop' : 'wall', distanceKm: km, receivedAt: createdAt, simFulfilment: seed.fulfilment };
};

/** The referral a garage's recommendation creates, when this shop was one of the shops it named. */
const referralFor = (r: CustomerRequest, shop: Pick<ShopProfile, 'id' | 'name' | 'referralPercent'>): PartReferral | undefined => {
  const j = r.enquiry.jobRef;
  if (!j || !j.recommendedShopIds.includes(shop.id)) return undefined;
  return newReferral({ id: `ref-${j.bookingId}-${j.lineId}`, garage: j.garage, shop: { id: shop.id, name: shop.name }, bookingId: j.bookingId, lineId: j.lineId, partName: r.enquiry.briefs[0].name, commissionPercent: shop.referralPercent, at: r.receivedAt });
};

/** One part of an enquiry, answered. */
export type OfferInput = {
  briefId: string;
  available: boolean;
  partType: QuoteType;
  brand?: string;
  unitPrice: number;
  qty: number;
  fitmentConfirmed: boolean;
  warrantyMonths: number;
  readyInMin: number;
  holdHours: number;
  delivery?: { fee: number; etaMin: number; courier?: string };
  note?: string;
};

export type VerifyResult = { ok: true; saleId: string } | { ok: false; error: 'code' | 'price'; listed?: number };

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

  // OnMart: customers
  customerRequests: CustomerRequest[];
  /** Direct enquiries from owners nearby, waiting for an answer. */
  newCustomer: CustomerRequest[];
  /** Open-wall posts for parts this shop sells, waiting for an answer. */
  newWall: CustomerRequest[];
  offers: MyOffer[];
  sales: ShopSale[];
  /** Sales waiting for the shop (pack, send, or check the code of a buyer at the counter). */
  salesNeedingAction: ShopSale[];
  referrals: PartReferral[];
  stats: ShopStats;
  serviceScore: number;
  /** How buyers see this shop in OnMart lists. */
  listing: ShopListing;
  /** Parts customers asked for that the shop has none of, most asked first. */
  demand: { name: string; count: number }[];
  passCustomer: (id: string) => void;
  respondToCustomer: (requestId: string, inputs: OfferInput[]) => void;
  withdrawOffer: (id: string) => void;
  markSaleReady: (saleId: string) => void;
  dispatchSale: (saleId: string, method: 'courier' | 'shop') => void;
  /** The part is not there after all (counts against the shop's stock accuracy). */
  saleUnavailable: (saleId: string) => void;
  /** The shop enters the buyer's purchase code and what was paid. */
  verifyPurchase: (code: string, amount: number, invoiceNo?: string) => VerifyResult;
  setReferralPercent: (percent: number) => void;
  setLiveStock: (on: boolean) => void;
  /** Commission already paid to a garage for a month ("month:garageId" → when). Paying out happens outside the app. */
  settled: Record<string, number>;
  settleReferrals: (month: string, garageId: string) => void;

  // OnMart promotions
  /** This shop's limited-time discounts (each on one stock item). */
  deals: ShopDeal[];
  promo: { freeDeliveryOver?: number; banner?: ShopBanner };
  /** The running deal on a stock item, if any. */
  liveDeal: (partName: string, partType: QuoteType) => ShopDeal | undefined;
  /** A price with the running deal taken off. */
  priceWithDeal: (partName: string, partType: QuoteType, base: number) => number;
  /** Returns what is wrong with the deal (percent, end time), or null when it was set. */
  setDeal: (partName: string, partType: QuoteType, percent: number, days: number) => string | null;
  endDeal: (partName: string, partType: QuoteType) => void;
  setFreeDelivery: (over?: number) => void;
  /** Ask for a banner on the landing page; it is reviewed first, then shown as an ad. */
  requestBanner: (title: string, subtitle: string, days: number) => void;
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
  const [customerRequests, setCustomerRequests] = useState<CustomerRequest[]>(() => CUSTOMER_POOL.map((c) => makeCustomerRequest(c, SHOP, Date.now())));
  const [offers, setOffers] = useState<MyOffer[]>([]);
  const [settled, setSettled] = useState<Record<string, number>>({});
  const [deals, setDeals] = useState<ShopDeal[]>(() => martDeals(Date.now()).filter((d) => d.shopId === SHOP.id));
  const [promo, setPromo] = useState<{ freeDeliveryOver?: number; banner?: ShopBanner }>(() => ({ freeDeliveryOver: martShopInfo(Date.now())[SHOP.id]?.freeDeliveryOver }));
  const [sales, setSales] = useState<ShopSale[]>([]);
  const [stats, setStats] = useState<ShopStats>(() => MART_SHOPS.find((x) => x.id === 'ps1')!.stats);
  const [referrals, setReferrals] = useState<PartReferral[]>(() => {
    const t = Date.now();
    return [...CUSTOMER_POOL.flatMap((c) => referralFor(makeCustomerRequest(c, SHOP, t), SHOP) ?? []), ...REFERRAL_SEED(t)];
  });

  const live = useRef({ profile, isOpen, stock, requests, quotes, orders, customerRequests, offers, sales, referrals, stats });
  live.current = { profile, isOpen, stock, requests, quotes, orders, customerRequests, offers, sales, referrals, stats };

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
    lapsed.forEach(() => setStats((st) => recordOutcome(st, 'cancelled')));
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
        tradeDiscountPercent: tradeDiscount(r.garage.id, p.id) || undefined,
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
        notify({ icon: '⚠️', title: 'තොගය ප්‍රමාණවත් නැත', body: '“Stock” ටැබයේ ප්‍රමාණය යාවත්කාලීන කරන්න, නැත්නම් “තොග නැත” ඔබන්න.', tone: 'danger' });
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
      setStats((st) => recordOutcome(st, 'noStock'));
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
            setStats((st) => recordOutcome(st, 'wrongPart'));
            notify({ icon: '↩️', title: 'ගරාජය ගැටලුවක් වාර්තා කළා', body: `${r.garage.name}: ${r.simProblem} — ආපසු ගැනීම සලකා බලන්න.`, tone: 'danger' });
            return;
          }
          // A courier's fee goes to the courier; the shop keeps its own delivery fee.
          const payout = cur.quote.partsTotal + (cur.quote.delivery === 'shop' ? cur.quote.deliveryFee : 0);
          patchOrder(orderId, { status: 'received', receivedAt: Date.now(), payout });
          setStats((st) => recordOutcome(st, 'fulfilled'));
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
          setStats((st) => recordOutcome(st, 'fulfilled'));
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

  // ---------- Customers (OnMart) ----------
  const markOffer = useCallback((id: string, status: MyOffer['status']) => setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o))), []);
  const patchSale = useCallback((id: string, change: Partial<ShopSale>) => setSales((prev) => prev.map((x) => (x.id === id ? { ...x, ...change } : x))), []);
  const moveReferral = useCallback((jobRef: { bookingId: string; lineId: string } | undefined, status: PartReferral['status'], amount?: number, close?: boolean) => {
    if (!jobRef) return;
    const id = `ref-${jobRef.bookingId}-${jobRef.lineId}`;
    setReferrals((prev) => prev.map((r) => (r.id !== id ? r : close ? closeReferral(r, Date.now()) : advanceReferral(r, status, Date.now(), amount))));
  }, []);

  // A customer arrives a little later while the shop is open.
  useEffect(() => {
    const t = setTimeout(() => {
      const { isOpen: open, profile: pr } = live.current;
      if (!open) return;
      const r = makeCustomerRequest(LATE_CUSTOMER, pr, Date.now());
      setCustomerRequests((prev) => [r, ...prev]);
      notify({ icon: '🛍️', title: 'ගනුදෙනුකරුගෙන් නව ඉල්ලීමක්', body: `${r.enquiry.buyer.name} · ${r.enquiry.briefs.map((b) => b.name).join(', ')}`, tone: 'primary' });
    }, LATE_CUSTOMER_MS);
    return () => clearTimeout(t);
  }, [notify]);

  const passCustomer = useCallback((id: string) => setCustomerRequests((prev) => prev.map((r) => (r.id === id ? { ...r, passed: true } : r))), []);

  // The buyer reserves an offer (simulated): the shop holds the part and gets the buyer's purchase code.
  const reserve = useCallback(
    (o: MyOffer) => {
      const r = o.request;
      const delivery = r.simFulfilment === 'delivery' && !!o.delivery;
      const purchase: PartPurchase = {
        id: `pp-${o.id}`,
        enquiryId: o.enquiryId,
        offerId: o.id,
        briefId: o.briefId,
        shop: o.shop,
        code: makeCloseCode(),
        status: 'reserved',
        fulfilment: delivery ? 'delivery' : 'pickup',
        reservedUntil: Date.now() + o.holdHours * HOUR,
        jobRef: r.enquiry.jobRef,
      };
      const sale: ShopSale = { id: `sale-${o.id}`, offer: { ...o, status: 'reserved' }, purchase, stage: 'reserved', reservedAt: Date.now() };
      setSales((prev) => [sale, ...prev.filter((x) => x.id !== sale.id)]);
      markOffer(o.id, 'reserved');
      restock([{ id: o.brief.id, name: o.brief.name, qty: o.qty }], o.partType, -1);
      moveReferral(r.enquiry.jobRef, 'reserved');
      notify({ icon: '🛍️', title: 'ගනුදෙනුකරු කොටස වෙන් කළා', body: `${buyerLabel(r)} · ${o.brief.name} ×${o.qty} · ${delivery ? 'බෙදාහැරීම' : 'කවුන්ටරයෙන් එකතු කරයි'}`, tone: 'success' });
    },
    [markOffer, moveReferral, notify, restock]
  );

  const respondToCustomer = useCallback(
    (requestId: string, inputs: OfferInput[]) => {
      const { customerRequests: crs, profile: pr } = live.current;
      const r = crs.find((x) => x.id === requestId);
      if (!r || !inputs.length) return;
      const at = Date.now();
      const fresh: MyOffer[] = inputs.map((inp) => {
        const brief = r.enquiry.briefs.find((b) => b.id === inp.briefId)!;
        return {
          id: `mo-${r.id}-${inp.briefId}`,
          enquiryId: r.enquiry.id,
          briefId: inp.briefId,
          shop: { id: pr.id, name: pr.name, rating: pr.rating, ratingCount: pr.ratingCount, distanceKm: r.distanceKm, phone: pr.phone, address: pr.address },
          available: inp.available,
          partType: inp.partType,
          brand: inp.brand,
          unitPrice: inp.unitPrice,
          qty: inp.qty,
          total: inp.unitPrice * inp.qty,
          fitmentConfirmed: inp.fitmentConfirmed,
          warrantyMonths: inp.warrantyMonths,
          readyInMin: inp.readyInMin,
          holdHours: inp.holdHours,
          delivery: inp.delivery,
          note: inp.note,
          at,
          status: 'pending',
          request: r,
          brief,
        };
      });
      setOffers((prev) => [...fresh, ...prev.filter((o) => !fresh.some((f) => f.id === o.id))]);
      // How fast the shop answers feeds its ranking.
      const mins = Math.max(1, Math.round((at - r.receivedAt) / MIN));
      setStats((st) => ({ ...st, avgResponseMin: Math.max(1, Math.round((st.avgResponseMin * 9 + mins) / 10)) }));
      moveReferral(r.enquiry.jobRef, 'viewed');
      notify({ icon: '📨', title: 'පිළිතුර යැව්වා', body: `${buyerLabel(r)} · ${fresh.filter((o) => o.available).length} / ${fresh.length} කොටස් තිබේ`, tone: 'primary' });

      // The buyer chooses (simulated): a fair price from a shop that has it is reserved; a garage-recommended shop always.
      later(() => {
        const mine = live.current.offers.filter((o) => o.request.id === requestId && o.status === 'pending' && o.at === at);
        if (!mine.length) return;
        let taken = 0;
        mine.forEach((o) => {
          const fair = o.available && (!!o.request.enquiry.jobRef || o.unitPrice <= listPrice(o.brief.name, o.partType) * 1.12);
          if (fair) {
            taken++;
            reserve(o);
          } else markOffer(o.id, 'lost');
        });
        if (!taken) notify({ icon: '📉', title: 'ගනුදෙනුකරු වෙනත් වෙළඳසැලක් තෝරා ගත්තා', body: 'ඔබගේ මිල වෙළඳපොළ මිලට වඩා ඉහළයි, හෝ කොටස නොතිබුණා.', tone: 'danger' });
      }, BUYER_DECIDE_MS);
    },
    [later, markOffer, moveReferral, notify, reserve]
  );

  const withdrawOffer = useCallback((id: string) => setOffers((prev) => prev.map((o) => (o.id === id && o.status === 'pending' ? { ...o, status: 'withdrawn' } : o))), []);

  // The shop checked the code and was paid: the sale is done, and a garage's referral moves on.
  const completeSale = useCallback(
    (sale: ShopSale, amount: number, invoiceNo?: string) => {
      const t = Date.now();
      const fee = sale.delivery?.method === 'shop' ? sale.offer.delivery?.fee ?? 0 : 0;
      patchSale(sale.id, { stage: 'bought', payout: amount + fee, purchase: { ...sale.purchase, status: 'bought', amount, invoiceNo, boughtAt: t, returnBy: t + 7 * DAY } });
      setStats((st) => recordOutcome(st, 'fulfilled'));
      markOffer(sale.offer.id, 'bought');
      const label = buyerLabel(sale.offer.request);
      notify({ icon: '💰', title: 'විකුණුම තහවුරුයි', body: `${label} · රු. ${(amount + fee).toLocaleString()} ලැබුණා`, tone: 'success' });
      later(() => setReviews((prev) => [{ id: `sr-${sale.id}`, garage: label, rating: 5, text: 'කොටස නිවැරදියි, ඉක්මනින් ලබා දුන්නා.', at: Date.now() }, ...prev]), 4000);
      const jr = sale.purchase.jobRef;
      if (jr) {
        moveReferral(jr, 'purchased', amount);
        // The garage fits the part and the job closes with the owner's code (simulated).
        later(() => moveReferral(jr, 'fitted'), 8000);
        later(() => {
          moveReferral(jr, 'fitted', undefined, true);
          const ref = live.current.referrals.find((r) => r.id === `ref-${jr.bookingId}-${jr.lineId}`);
          if (ref) notify({ icon: '🤝', title: `${ref.garage.name} වෙත කොමිස් ලැබිය යුතුයි`, body: `රු. ${commissionFor(amount, ref.commissionPercent).toLocaleString()} (${ref.commissionPercent}%) ලෙජරයට එක් විය — රැකියාව අවසන් විය.`, tone: 'primary' });
        }, 14000);
      }
    },
    [later, markOffer, moveReferral, notify, patchSale]
  );

  const markSaleReady = useCallback(
    (saleId: string) => {
      const x = live.current.sales.find((y) => y.id === saleId);
      if (!x || x.stage !== 'reserved' || x.purchase.fulfilment !== 'pickup') return;
      patchSale(saleId, { stage: 'ready' });
      notify({ icon: '🏪', title: 'කවුන්ටරයේ සූදානම්', body: 'ගනුදෙනුකරුට දැනුම් දුන්නා — ඔහුගේ කේතය පෙන්වූ විට භාර දෙන්න.', tone: 'success' });
      later(() => {
        const cur = live.current.sales.find((y) => y.id === saleId);
        if (!cur || cur.stage !== 'ready') return;
        patchSale(saleId, { arrivedAt: Date.now() });
        notify({ icon: '🧑', title: 'ගනුදෙනුකරු කවුන්ටරයට පැමිණියා', body: 'ඔහුගේ කේතය පරීක්ෂා කර, කොටස පරීක්ෂා කිරීමට ඉඩ දී මුදල් ලබා ගන්න.', tone: 'primary' });
      }, PICKUP_ARRIVE_MS);
    },
    [later, notify, patchSale]
  );

  const dispatchSale = useCallback(
    (saleId: string, method: 'courier' | 'shop') => {
      const x = live.current.sales.find((y) => y.id === saleId);
      if (!x || x.stage !== 'reserved' || x.purchase.fulfilment !== 'delivery') return;
      const pr = live.current.profile;
      const driver = pr.staff[0];
      const rider = method === 'courier' ? { name: 'සමන් කුමාර', phone: '0771230099' } : { name: driver?.name ?? 'වෙළඳසැල', phone: driver?.phone ?? pr.phone };
      patchSale(saleId, { stage: 'dispatched', delivery: { method, rider, etaAt: Date.now() + (x.offer.delivery?.etaMin ?? 40) * MIN } });
      notify({ icon: '🛵', title: 'කොටස් පිටත් කළා', body: `${buyerLabel(x.offer.request)} · ${method === 'courier' ? COURIER : rider.name}`, tone: 'success' });
      // Delivered and paid on delivery (simulated).
      later(() => {
        const cur = live.current.sales.find((y) => y.id === saleId);
        if (!cur || cur.stage !== 'dispatched') return;
        completeSale(cur, cur.offer.total);
      }, DELIVERY_MS);
    },
    [completeSale, later, notify, patchSale]
  );

  const saleUnavailable = useCallback(
    (saleId: string) => {
      const x = live.current.sales.find((y) => y.id === saleId);
      if (!x || (x.stage !== 'reserved' && x.stage !== 'ready')) return;
      patchSale(saleId, { stage: 'released', purchase: { ...x.purchase, status: 'released' } });
      markOffer(x.offer.id, 'withdrawn');
      setStats((st) => recordOutcome(st, 'noStock'));
      moveReferral(x.purchase.jobRef, 'lapsed');
      notify({ icon: '⛔', title: 'වෙන් කිරීම අහෝසි විය', body: 'කොටස නොතිබුණු බැවින් ඔබගේ තොග නිරවද්‍යතාව පහත වැටේ — තොගය නිවැරදිව තබා ගන්න.', tone: 'danger' });
    },
    [markOffer, moveReferral, notify, patchSale]
  );

  const verifyPurchase = useCallback(
    (code: string, amount: number, invoiceNo?: string): VerifyResult => {
      const digits = code.replace(/\D/g, '');
      const x = live.current.sales.find((y) => y.purchase.code === digits && y.purchase.fulfilment === 'pickup' && (y.stage === 'reserved' || y.stage === 'ready'));
      if (!x) return { ok: false, error: 'code' };
      // A customer a garage sent here never pays more than the shop's listed price.
      const listed = x.offer.total;
      if (x.purchase.jobRef && !referralPriceOk(amount, listed)) return { ok: false, error: 'price', listed };
      completeSale(x, amount, invoiceNo);
      return { ok: true, saleId: x.id };
    },
    [completeSale]
  );

  const setReferralPercent = useCallback((percent: number) => setProfile((pr) => ({ ...pr, referralPercent: clampCommission(Math.round(percent)) })), []);
  // ---------- OnMart promotions ----------
  const liveDeal = useCallback((partName: string, partType: QuoteType) => deals.find((d) => d.partName === partName && d.partType === partType && isLive(d.endsAt, Date.now())), [deals]);
  const priceWithDeal = useCallback(
    (partName: string, partType: QuoteType, base: number) => {
      const d = liveDeal(partName, partType);
      return d ? dealPrice(base, d.discountPercent) : base;
    },
    [liveDeal]
  );
  const setDeal = useCallback(
    (partName: string, partType: QuoteType, percent: number, days: number) => {
      const endsAt = Date.now() + days * DAY;
      const error = validateDeal({ discountPercent: percent, endsAt }, Date.now());
      if (error) return error;
      setDeals((prev) => [...prev.filter((d) => !(d.partName === partName && d.partType === partType)), { id: `sd-${Date.now()}`, shopId: live.current.profile.id, partName, partType, discountPercent: percent, endsAt }]);
      notify({ icon: '🏷️', title: 'දීමනාව සක්‍රීයයි', body: `${partName} · ${dealLabel(percent)} · දින ${days} — OnMart මුල් පිටුවේ පෙනේ`, tone: 'success' });
      return null;
    },
    [notify]
  );
  const endDeal = useCallback((partName: string, partType: QuoteType) => setDeals((prev) => prev.filter((d) => !(d.partName === partName && d.partType === partType))), []);
  const setFreeDelivery = useCallback((over?: number) => setPromo((p) => ({ ...p, freeDeliveryOver: over })), []);
  const requestBanner = useCallback(
    (title: string, subtitle: string, days: number) => {
      setPromo((p) => ({ ...p, banner: { title, subtitle, endsAt: Date.now() + days * DAY, status: 'reviewing' } }));
      notify({ icon: '📣', title: 'දැන්වීම සමාලෝචනයට යැව්වා', body: 'OnGarage පරීක්ෂා කළ පසු “දැන්වීම” ලෙස පෙන්වයි.', tone: 'primary' });
      // Reviewed, then live (simulated).
      later(() => {
        setPromo((p) => (p.banner?.status === 'reviewing' ? { ...p, banner: { ...p.banner, status: 'live' } } : p));
        notify({ icon: '✅', title: 'ඔබගේ දැන්වීම සක්‍රීයයි', body: 'OnMart මුල් පිටුවේ “දැන්වීම” ලෙස පෙනේ.', tone: 'success' });
      }, 7000);
    },
    [later, notify]
  );

  const settleReferrals = useCallback(
    (month: string, garageId: string) =>
      setSettled((prev) => {
        const key = `${month}:${garageId}`;
        const next = { ...prev };
        if (next[key]) delete next[key];
        else next[key] = Date.now();
        return next;
      }),
    []
  );
  const setLiveStock = useCallback((on: boolean) => setProfile((pr) => ({ ...pr, liveStock: on })), []);

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

  const visibleCustomers = useMemo(
    () =>
      customerRequests
        .filter((r) => !r.passed && r.enquiry.quoteUntil > now && visibleToShop(r, profile) && !offers.some((o) => o.request.id === r.id && o.status !== 'withdrawn'))
        .sort((a, b) => a.enquiry.quoteUntil - b.enquiry.quoteUntil),
    [customerRequests, offers, now, profile]
  );
  const newCustomer = useMemo(() => visibleCustomers.filter((r) => r.via === 'shop'), [visibleCustomers]);
  const newWall = useMemo(() => visibleCustomers.filter((r) => r.via === 'wall'), [visibleCustomers]);
  const salesNeedingAction = useMemo(() => sales.filter((x) => x.stage === 'reserved' || (x.stage === 'ready' && !!x.arrivedAt)), [sales]);
  const demand = useMemo(() => {
    const counts = new Map<string, number>();
    customerRequests
      .filter((r) => visibleToShop(r, profile))
      .forEach((r) =>
        r.enquiry.briefs.forEach((b) => {
          const have = stock.some((i) => i.name === b.name && i.variants.some((v) => v.qty > 0));
          if (!have) counts.set(b.name, (counts.get(b.name) ?? 0) + 1);
        })
      );
    return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [customerRequests, stock, profile]);
  const listing: ShopListing = useMemo(
    () => ({
      id: profile.id,
      name: profile.name,
      rating: rating.average,
      ratingCount: rating.count,
      distanceKm: 0,
      phone: profile.phone,
      address: profile.address,
      coords: profile.coords,
      district: 'ගාල්ල',
      openHours: profile.openHours,
      isOpen,
      types: profile.types,
      categories: profile.categories,
      liveStock: profile.liveStock,
      courier: profile.courierEnabled,
      ownDelivery: profile.ownDelivery,
      counterPickup: true,
      stats,
      referralPercent: profile.referralPercent,
    }),
    [profile, rating, isOpen, stats]
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
    customerRequests,
    newCustomer: isOpen ? newCustomer : [],
    newWall: isOpen ? newWall : [],
    offers,
    sales,
    salesNeedingAction,
    referrals,
    stats,
    serviceScore: shopServiceScore(stats),
    listing,
    demand,
    passCustomer,
    respondToCustomer,
    withdrawOffer,
    markSaleReady,
    dispatchSale,
    saleUnavailable,
    verifyPurchase,
    setReferralPercent,
    setLiveStock,
    settled,
    settleReferrals,
    deals,
    promo,
    liveDeal,
    priceWithDeal,
    setDeal,
    endDeal,
    setFreeDelivery,
    requestBanner,
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
