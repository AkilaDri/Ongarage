import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { PartLine, PartQuote, PartsOrder, PartsRequest, PartType } from '@ongarage/shared';
import { useGarage } from './GarageContext';
import { COURIER, listPrice, PARTS_SHOPS, TYPE_FACTOR, type ShopSeed } from '../constants/parts';

const SEC = 1000;
const MIN = 60 * SEC;
// Simulated shop behaviour, compressed so the flow can be watched end to end.
const CONFIRM_MS = 3 * SEC;
const DELIVERY_MS = 12 * SEC;
const OWNER_APPROVAL_MS = 5 * SEC;
/** A round lasts at least this long, even when no shop can supply (they take time to say no). */
const MIN_SEARCH_MS = 12 * SEC;

type QuoteType = Exclude<PartType, 'GarageChoice'>;

/** The part types a request may be filled with, given the owner's choice and approvals. */
export const allowedTypes = (r: PartsRequest): QuoteType[] => {
  if (r.partType === 'GarageChoice') return ['Genuine', 'OEM', 'Recon'];
  if (r.partType === 'Genuine') return r.reconApproval === 'approved' ? ['Genuine', 'Recon'] : ['Genuine'];
  return [r.partType];
};

const canSupply = (shop: ShopSeed, type: QuoteType, categoryId?: string) =>
  shop.stocks.includes(type) && (type !== 'Genuine' || !shop.genuineCategories || (!!categoryId && shop.genuineCategories.includes(categoryId)));

const round50 = (n: number) => Math.round(n / 50) * 50;

const makeQuote = (r: PartsRequest, shop: ShopSeed, type: QuoteType, rating: { rating: number; count: number }): PartQuote => {
  const unitPrices = r.lines.map((l) => round50(listPrice(l.name) * TYPE_FACTOR[type] * shop.priceLevel));
  const partsTotal = unitPrices.reduce((s, p, i) => s + p * r.lines[i].qty, 0);
  const courier = shop.delivery === 'courier';
  const deliveryFee = courier ? round50(250 + shop.distanceKm * 45) : shop.distanceKm <= 3 ? 0 : 400;
  return {
    id: `pq-${r.id}-${shop.id}-${type}`,
    requestId: r.id,
    shop: { id: shop.id, name: shop.name, rating: rating.rating, ratingCount: rating.count, distanceKm: shop.distanceKm, phone: shop.phone, address: shop.address },
    partType: type,
    unitPrices,
    partsTotal,
    deliveryFee,
    total: partsTotal + deliveryFee,
    etaMin: Math.round(courier ? 20 + shop.distanceKm * 4 : 35 + shop.distanceKm * 5),
    warrantyMonths: type === 'Genuine' ? 12 : type === 'OEM' ? 6 : 1,
    delivery: shop.delivery,
    courier: courier ? COURIER : undefined,
    at: Date.now(),
  };
};

export type NewPartsRequest = Pick<PartsRequest, 'bookingId' | 'categoryId' | 'vehicle' | 'partType' | 'lines' | 'note' | 'oldPartPhoto' | 'needBy' | 'radiusKm'> & {
  windowMin: number;
};

type PartsState = {
  requests: PartsRequest[];
  quotes: PartQuote[];
  orders: PartsOrder[];
  /** Open requests with a quote to choose and nothing ordered yet. */
  awaitingChoice: PartsRequest[];
  requestParts: (input: NewPartsRequest) => string;
  cancelRequest: (id: string) => void;
  askReconApproval: (id: string) => void;
  acceptQuote: (quoteId: string) => void;
  markReceived: (orderId: string) => void;
  reportProblem: (orderId: string, reason: string) => void;
  rateOrder: (orderId: string, stars: number) => void;
  /** The live request for a booking (not cancelled), if any. */
  requestFor: (bookingId: string) => PartsRequest | undefined;
};

const PartsContext = createContext<PartsState | null>(null);

export const PartsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notify, addPartsCost, profile, rating } = useGarage();
  const [requests, setRequests] = useState<PartsRequest[]>([]);
  const [quotes, setQuotes] = useState<PartQuote[]>([]);
  const [orders, setOrders] = useState<PartsOrder[]>([]);
  // Shop ratings move with how they perform (e.g. accepting then having no stock).
  const [ratings, setRatings] = useState<Record<string, { rating: number; count: number }>>(() =>
    Object.fromEntries(PARTS_SHOPS.map((s) => [s.id, { rating: s.rating, count: s.ratingCount }]))
  );

  const live = useRef({ requests, quotes, orders, ratings });
  live.current = { requests, quotes, orders, ratings };

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const patchRequest = useCallback((id: string, change: Partial<PartsRequest>) => setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...change } : r))), []);
  const patchOrder = useCallback((id: string, change: Partial<PartsOrder>) => setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...change } : o))), []);

  /** One round of shops answering: each shop in range quotes every allowed type it can supply. */
  const runSearch = useCallback(
    (request: PartsRequest, types: QuoteType[]) => {
      const shops = PARTS_SHOPS.filter((s) => s.distanceKm <= request.radiusKm);
      let last = 0;
      shops.forEach((shop) => {
        const supply = types.filter((t) => canSupply(shop, t, request.categoryId));
        if (!supply.length) return;
        const at = shop.replyAfterSec * SEC;
        last = Math.max(last, at);
        later(() => {
          const r = live.current.requests.find((x) => x.id === request.id);
          if (!r || r.status === 'cancelled' || Date.now() > r.quoteUntil) return;
          const fresh = supply.map((t) => makeQuote(r, shop, t, live.current.ratings[shop.id]));
          setQuotes((prev) => [...prev.filter((q) => !fresh.some((f) => f.id === q.id)), ...fresh]);
        }, at);
      });
      later(() => {
        const r = live.current.requests.find((x) => x.id === request.id);
        if (!r || r.status === 'cancelled') return;
        patchRequest(request.id, { searching: false });
        const usable = live.current.quotes.filter((q) => q.requestId === request.id && !q.withdrawn).length;
        if (usable) {
          notify({ icon: '🔩', title: `කොටස් සඳහා මිල ගණන් ${usable} ක්`, body: 'අඩුම මුළු මිල සහ කාලයට ළඟා වන එක තෝරන්න.', tone: 'primary' });
        } else if (r.partType === 'Genuine' && r.reconApproval !== 'approved') {
          notify({ icon: '⚠️', title: 'Genuine කොටස් ලබා ගත නොහැක', body: 'Recon සඳහා වාහන හිමිකරුගෙන් අවසර ඉල්ලන්න.', tone: 'danger' });
        } else {
          notify({ icon: '⚠️', title: 'මිල ගණන් ලැබුණේ නැත', body: 'කලාපය විශාල කර නැවත ඉල්ලන්න.', tone: 'danger' });
        }
      }, Math.max(last, MIN_SEARCH_MS) + 1.5 * SEC);
    },
    [later, notify, patchRequest]
  );

  const requestParts = useCallback(
    ({ windowMin, ...input }: NewPartsRequest) => {
      const now = Date.now();
      // Shops see who is asking (name, rating, where to deliver).
      const garage = { id: profile.id, name: profile.name, phone: profile.phone, address: profile.address, coords: profile.coords, rating: rating.average };
      const r: PartsRequest = { ...input, garage, id: `pr-${now}`, createdAt: now, quoteUntil: now + windowMin * MIN, status: 'open', searching: true };
      setRequests((prev) => [r, ...prev]);
      notify({ icon: '📨', title: 'කොටස් ඉල්ලීම යැව්වා', body: `කි.මී. ${r.radiusKm} ඇතුළත කොටස් වෙළඳසැල් වෙත.`, tone: 'primary' });
      runSearch(r, allowedTypes(r));
      return r.id;
    },
    [notify, profile, rating, runSearch]
  );

  const cancelRequest = useCallback((id: string) => patchRequest(id, { status: 'cancelled', searching: false }), [patchRequest]);

  const askReconApproval = useCallback(
    (id: string) => {
      patchRequest(id, { reconApproval: 'pending' });
      notify({ icon: '📲', title: 'අයිතිකරුගෙන් අවසර ඉල්ලුවා', body: 'Genuine නොමැති බැවින් Recon භාවිතයට.', tone: 'primary' });
      // Simulated owner reply (the owner app will ask them for real).
      later(() => {
        const r = live.current.requests.find((x) => x.id === id);
        if (!r || r.status === 'cancelled' || r.reconApproval !== 'pending') return;
        const approved: PartsRequest = { ...r, reconApproval: 'approved', searching: true, quoteUntil: Math.max(r.quoteUntil, Date.now() + 30 * MIN) };
        setRequests((prev) => prev.map((x) => (x.id === id ? approved : x)));
        notify({ icon: '✅', title: 'අයිතිකරු Recon අනුමත කළා', body: 'Recon කොටස් සඳහා මිල ගණන් ඉල්ලමින්…', tone: 'success' });
        runSearch(approved, ['Recon']);
      }, OWNER_APPROVAL_MS);
    },
    [later, notify, patchRequest, runSearch]
  );

  const acceptQuote = useCallback(
    (quoteId: string) => {
      const q = live.current.quotes.find((x) => x.id === quoteId);
      if (!q) return;
      const order: PartsOrder = { id: `po-${Date.now()}`, requestId: q.requestId, quoteId, status: 'confirming', placedAt: Date.now() };
      setOrders((prev) => [order, ...prev]);
      patchRequest(q.requestId, { status: 'ordered' });
      const shop = PARTS_SHOPS.find((s) => s.id === q.shop.id)!;

      later(() => {
        if (shop.unreliable) {
          // Accepted, then no stock: the quote is gone, the shop loses rating, the garage picks again.
          patchOrder(order.id, { status: 'unavailable' });
          setQuotes((prev) => prev.map((x) => (x.id === quoteId ? { ...x, withdrawn: true } : x)));
          patchRequest(q.requestId, { status: 'open' });
          setRatings((prev) => {
            const cur = prev[shop.id];
            return { ...prev, [shop.id]: { count: cur.count + 1, rating: Number(((cur.rating * cur.count + 1) / (cur.count + 1)).toFixed(1)) } };
          });
          notify({ icon: '⛔', title: `${q.shop.name} ළඟ තොග නැත`, body: 'ඇණවුම අවලංගු විය — වෙනත් මිල ගණනක් තෝරන්න.', tone: 'danger' });
          return;
        }
        const courier = q.delivery === 'courier';
        patchOrder(order.id, {
          status: 'dispatched',
          etaAt: Date.now() + q.etaMin * MIN,
          rider: courier ? { name: 'සමන් කුමාර', phone: '0771230099' } : { name: q.shop.name, phone: q.shop.phone },
          trackingUrl: courier ? 'https://www.pickme.lk' : undefined,
        });
        notify({ icon: '🛵', title: 'කොටස් පිටත් කළා', body: `${q.shop.name} · ${courier ? q.courier : 'වෙළඳසැලේ බෙදාහැරීම'} · මිනි. ~${q.etaMin}`, tone: 'success' });
        later(() => {
          const o = live.current.orders.find((x) => x.id === order.id);
          if (!o || o.status !== 'dispatched') return;
          patchOrder(order.id, { status: 'arrived', etaAt: Date.now() });
          notify({ icon: '📦', title: 'කොටස් ගරාජයට පැමිණියා', body: 'පරීක්ෂා කර “ලැබුණා” ලෙස සලකුණු කරන්න.', tone: 'primary' });
        }, DELIVERY_MS);
      }, CONFIRM_MS);
    },
    [later, notify, patchOrder, patchRequest]
  );

  const markReceived = useCallback(
    (orderId: string) => {
      const o = live.current.orders.find((x) => x.id === orderId);
      const q = o && live.current.quotes.find((x) => x.id === o.quoteId);
      const r = o && live.current.requests.find((x) => x.id === o.requestId);
      if (!o || !q || !r) return;
      patchOrder(orderId, { status: 'received', receivedAt: Date.now() });
      patchRequest(r.id, { status: 'received' });
      addPartsCost(r.bookingId, q.total);
      notify({ icon: '✅', title: 'කොටස් ලැබුණා', body: `රු. ${q.total.toLocaleString()} — වාහන හිමිකරුගේ කොටස් බිල්පතට එක් විය.`, tone: 'success' });
    },
    [addPartsCost, notify, patchOrder, patchRequest]
  );

  const reportProblem = useCallback(
    (orderId: string, reason: string) => {
      const o = live.current.orders.find((x) => x.id === orderId);
      if (!o) return;
      patchOrder(orderId, { status: 'problem', problem: reason });
      setQuotes((prev) => prev.map((x) => (x.id === o.quoteId ? { ...x, withdrawn: true } : x)));
      patchRequest(o.requestId, { status: 'open' });
      notify({ icon: '↩️', title: 'ආපසු යැවීම ඉල්ලුවා', body: `${reason} — වෙළඳසැල කොටස ආපසු ගනී. වෙනත් මිල ගණනක් තෝරන්න.`, tone: 'primary' });
    },
    [notify, patchOrder, patchRequest]
  );

  const rateOrder = useCallback((orderId: string, stars: number) => patchOrder(orderId, { rating: stars }), [patchOrder]);

  const awaitingChoice = useMemo(
    () =>
      requests.filter(
        (r) => r.status === 'open' && quotes.some((q) => q.requestId === r.id && !q.withdrawn && allowedTypes(r).includes(q.partType))
      ),
    [requests, quotes]
  );

  const requestFor = useCallback((bookingId: string) => requests.find((r) => r.bookingId === bookingId && r.status !== 'cancelled'), [requests]);

  const value: PartsState = {
    requests,
    quotes,
    orders,
    awaitingChoice,
    requestParts,
    cancelRequest,
    askReconApproval,
    acceptQuote,
    markReceived,
    reportProblem,
    rateOrder,
    requestFor,
  };
  return <PartsContext.Provider value={value}>{children}</PartsContext.Provider>;
};

export const useParts = () => {
  const ctx = useContext(PartsContext);
  if (!ctx) throw new Error('useParts must be used inside PartsProvider');
  return ctx;
};

/** Lines as one short string, e.g. "Brake pads (front) ×1, Brake fluid ×1". */
export const linesSummary = (lines: PartLine[]) => lines.map((l) => `${l.name} ×${l.qty}`).join(', ');
