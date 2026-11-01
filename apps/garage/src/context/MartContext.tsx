import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  availabilityAt,
  BROADCAST_LIMIT,
  broadcastTargets,
  martShop,
  MART_SHOPS,
  matchingShops,
  planReply,
  replyMessage,
  offerReply,
  queryFromBrief,
  suggestNeighbours,
  type ReplyPlan,
  dealFor,
  dealPrice,
  getAi,
  makeCloseCode,
  nextRing,
  demoCoverage,
  cartExpired,
  groupCartByShop,
  partMarketPrice,
  onWall,
  reachesShops,
  shopsInRing,
  shopsNear,
  SUGGEST_MIN_CONFIDENCE,
  wallVisibleTo,
  warrantyEnd,
  type JobPartsRef,
  type MartAudience,
  type PartBrief,
  type PartEnquiry,
  type PartPurchase,
  type PartsMessage,
  MAX_BASKET_PARTS,
  type VoiceNote,
  type PartsQuickAsk,
  type PartsThread,
  type SearchRing,
  type ShopListing,
  type ShopStockLine,
  type ShopOffer,
  countAttention,
  keysOf,
  martAttentionItems,
  type AttentionCounts,
  type AttentionKind,
} from '@ongarage/shared';
import { useNotice } from './NoticeContext';
import { useProfile } from './ProfileContext';
import { useUserLocation } from './LocationContext';
import { useWorkshops } from './WorkshopContext';

// OnMart for the vehicle owner: ask nearby shops for a part, widen the search (10 km, 50 km, the whole
// country) or post it on the open wall, then reserve an offer and collect it (showing a purchase code,
// inspecting the part and paying at the counter) or have it delivered. The shops are simulated here from
// the shared directory and stock; the parts app simulates the same enquiries and sales the other way.

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const COURIER = 'PickMe Flash';
/** Compressed shop behaviour so the flow can be watched end to end. */
const READY_MS = 7 * SEC;
const DISPATCH_MS = 5 * SEC;
const ARRIVE_MS = 12 * SEC;
const REPLY_MS = 2500;
/** A shop that says it will check answers this long after. */
const CHECK_MS = 9000;
/** A bought part can be brought back this long (the shop checks the fit and condition). */
const RETURN_DAYS = 7;

/** A part picked for the cart: the shop's answer chosen for it. It has to be confirmed within the hour (CART_HOLD_MIN). */
/** `cheapest`: it came from the "cheapest for every part" quotation (the cart shows those apart, in light green). */
export type CartLine = { enquiryId: string; offerId: string; shopId: string; addedAt: number; cheapest?: boolean };

export type MartEnquiry = {
  enquiry: PartEnquiry;
  /** A direct enquiry to specific shops only (from a shop's page); empty = every shop in reach. */
  onlyShopIds?: string[];
  /** Shops already asked (so a wider search only asks new ones). */
  askedShopIds: string[];
  /** Shops are still answering the current round. */
  searching: boolean;
  /** When each shop opened the request (shop id → time): the second tick, like a message read. Before that it is only sent. */
  seenBy?: Record<string, number>;
};

export type NewEnquiry = {
  brief: Omit<PartBrief, 'id'>;
  audience: MartAudience;
  ring: SearchRing;
  onlyShopIds?: string[];
  validDays: number;
  /** The job a garage told the owner to buy this part for, and the shops it recommended. */
  jobRef?: JobPartsRef;
  /** Asked together with other parts (see createBatch): they share a batch and read as one group. */
  batchId?: string;
  batchTitle?: string;
  batchIndex?: number;
  batchSize?: number;
  /** No toast for this request (a batch tells once). */
  silent?: boolean;
};

/**
 * Collected: reserved → ready (held at the counter) → bought (the owner inspects the part and pays at the counter).
 * Delivered: reserved → dispatched → arrived (inspect and pay at the door) → bought.
 * Either can end rejected (at inspection), released (the owner cancelled or the hold ran out) or returned (within 7 days).
 */
export type PurchaseStage = 'reserved' | 'ready' | 'dispatched' | 'arrived' | 'bought' | 'rejected' | 'released' | 'returned';

export type MartPurchase = {
  purchase: PartPurchase;
  offer: ShopOffer;
  brief: PartBrief;
  stage: PurchaseStage;
  createdAt: number;
  delivery?: { courier?: string; fee: number; rider: { name: string; phone: string }; etaAt: number };
  /** Set when bought: the shop's warranty on the part. */
  warrantyUntil?: number;
  rating?: { stars: number; text?: string; at: number };
  returnReason?: string;
};

/** Parts reserved together at one shop: they share one purchase code. */
export type ReserveGroup = { id: string; code: string; seq: number };

export const ACTIVE_STAGES: PurchaseStage[] = ['reserved', 'ready', 'dispatched', 'arrived'];

type MartState = {
  enquiries: MartEnquiry[];
  offers: ShopOffer[];
  purchases: MartPurchase[];
  threads: PartsThread[];
  offersFor: (enquiryId: string) => ShopOffer[];
  /** The latest reservation / purchase made from this enquiry. */
  purchaseFor: (enquiryId: string) => MartPurchase | undefined;
  threadFor: (enquiryId: string, shopId: string) => PartsThread | undefined;
  createEnquiry: (input: NewEnquiry) => string;
  /** Several parts asked together (a job's parts, a service kit): one request per part, grouped by a batch; the buyer is told once. */
  createBatch: (inputs: NewEnquiry[], title?: string) => string;
  /** Nothing found: ask the next, wider ring of shops. */
  widen: (enquiryId: string) => void;
  /** Search these parts again within a radius the owner chose on the map (km), or the whole country: only the shops not asked yet are asked (past 200 km, every shop in Sri Lanka). */
  searchWithin: (enquiryIds: string[], km: number | 'all') => void;
  /** Ask the next few shops whose catalogue covers it in the same ring (the first round asks the closest fits only). */
  askMore: (enquiryId: string) => void;
  /** Ask these shops directly (the ones a shop that has none pointed to). */
  askShops: (enquiryId: string, shopIds: string[]) => void;
  /** Nothing found: also post it on the open wall that every shop in the country sees. */
  postToWall: (enquiryId: string, description?: string) => void;
  cancelEnquiry: (enquiryId: string) => void;
  /** Add to or change the description, photos and voice notes of one's own request while it is open (the shops see the change). */
  editEnquiry: (enquiryId: string, change: { note?: string; photos?: string[]; voiceNotes?: VoiceNote[] }) => void;
  /** Reserve an offer: the shop holds the part for the owner, who gets a purchase code. */
  reserve: (offerId: string, fulfilment: 'pickup' | 'delivery', group?: ReserveGroup) => void;
  /** Reserve several parts of a basket at one shop in one go: one purchase code for all of them, each part still inspected and paid on its own. */
  reserveMany: (offerIds: string[], fulfilment: 'pickup' | 'delivery') => void;
  /** The cart: the shop picked for each part (one shop per part), to be confirmed within the hour. */
  cart: CartLine[];
  addToCart: (offerIds: string[], opts?: { cheapest?: boolean }) => void;
  removeFromCart: (enquiryId: string) => void;
  /** Confirm the parts in the cart for one shop: they are reserved there and the buyer's order goes into the shop's chat (where the part details and availability are checked). Returns the request whose chat holds it. */
  confirmCart: (shopId: string, cheapest?: boolean) => string | undefined;
  /** The part checked at the counter (or the door) and paid for. */
  buy: (purchaseId: string) => void;
  /** The part is not as agreed: the reservation ends and the enquiry reopens. */
  reject: (purchaseId: string, reason: string) => void;
  cancelReservation: (purchaseId: string) => void;
  returnPart: (purchaseId: string, reason: string) => void;
  /** Only a bought part (a purchase the shop verified) can be rated. */
  rate: (purchaseId: string, stars: number, text?: string) => void;
  /** Ask a shop something; false when the message was held back (it moved the deal off the app). */
  sendMessage: (enquiryId: string, shopId: string, msg: { quick?: PartsQuickAsk; text?: string; photos?: string[]; voiceNotes?: VoiceNote[] }) => Promise<boolean>;
  /** Change the text of a message the buyer sent / take it back (the same as in OnChat). */
  editMessage: (enquiryId: string, shopId: string, messageId: string, text: string) => void;
  removeMessage: (enquiryId: string, shopId: string, messageId: string) => void;
  /** What in OnMart needs the buyer's attention and has not been seen yet (a shop has the part, a reply on the wall, a shop writing back, an order that moved): the OnMart tab shows it while the buyer is elsewhere. */
  attention: AttentionCounts;
  /** The buyer has the page open (My requests / Open wall / Orders): what is on it counts as seen. */
  markSeen: (kind: AttentionKind) => void;
};

const MartContext = createContext<MartState | null>(null);

const round50 = (n: number) => Math.round(n / 50) * 50;

const makeOffer = (e: PartEnquiry, brief: PartBrief, shop: ShopListing, listed?: ShopStockLine, plan: ReplyPlan = { kind: 'have', priced: true }, suggestedShopIds?: string[]): ShopOffer => {
  const stocked = listed ?? availabilityAt(shop.id, brief.name, brief.partType);
  const type = brief.partType === 'GarageChoice' ? shop.types[0] ?? 'OEM' : brief.partType;
  // A catalogue shop keeps no stock list: a "have it" is priced from the market at its price level, or left for the counter.
  const line = plan.kind !== 'have' ? undefined : stocked ?? { name: brief.name, partType: type, price: plan.priced ? round50(partMarketPrice(brief.name, type) * shop.stats.priceLevel) : 0, qty: brief.qty };
  const v = brief.vehicle;
  const base = {
    reply: plan.kind,
    suggestedShopIds: suggestedShopIds?.length ? suggestedShopIds : undefined,
    id: `of-${e.id}-${shop.id}`,
    enquiryId: e.id,
    briefId: brief.id,
    shop: { id: shop.id, name: shop.name, rating: shop.rating, ratingCount: shop.ratingCount, distanceKm: shop.distanceKm, phone: shop.phone, address: shop.address },
    at: Date.now(),
  };
  if (!line) {
    return { ...base, available: false, partType: brief.partType === 'GarageChoice' ? 'OEM' : brief.partType, unitPrice: 0, qty: 0, total: 0, fitmentConfirmed: false, warrantyMonths: 0, readyInMin: 0, holdHours: 0 };
  }
  // A running deal at this shop takes its percentage off the unit price.
  const deal = line.price ? dealFor(shop.id, brief.name, line.partType) : undefined;
  const unitPrice = deal ? dealPrice(line.price, deal.discountPercent) : line.price;
  const qty = Math.min(brief.qty, line.qty);
  const km = shop.distanceKm;
  const delivery =
    shop.courier || shop.ownDelivery
      ? { courier: shop.courier ? COURIER : undefined, fee: shop.courier ? Math.round((250 + km * 45) / 50) * 50 : km <= 3 ? 0 : 300, etaMin: Math.round(shop.courier ? 20 + km * 4 : 35 + km * 5) }
      : undefined;
  return {
    ...base,
    available: true,
    partType: line.partType,
    brand: line.brand,
    unitPrice,
    qty,
    total: unitPrice * qty,
    dealPercent: deal?.discountPercent,
    wasUnitPrice: deal ? line.price : undefined,
    // A shop confirms the fit when it has the vehicle's chassis or engine number and rarely sends the wrong part.
    fitmentConfirmed: !!(v.chassisNo || v.engineNo) && shop.stats.wrongPartRate <= 0.05,
    warrantyMonths: line.partType === 'Genuine' ? 12 : line.partType === 'OEM' ? 6 : 1,
    readyInMin: 10 + Math.round(km),
    holdHours: 4,
    delivery,
  };
};

/** What the shop's staff answer to a quick question (simulated). */
const shopReply = (offer: ShopOffer | undefined, quick?: PartsQuickAsk): string => {
  if (!offer) return 'ස්තූතියි — කවුන්ටරයට පැමිණි විට හමුවෙමු. කතා කරමු, නමුත් ගෙවීම් මෙම යෙදුමෙන් පිටත කරන්න එපා.';
  switch (quick) {
    case 'available':
      return offerReply(offer) === 'check' ? 'තවම පරීක්ෂා කරමින් — ටිකකින් දන්වමි.' : offer.available ? `ඔව්, ඇත — ${offer.qty} ක්.` : 'සමාවෙන්න, දැනට නැහැ.';
    case 'price':
      return !offer.available ? 'කොටස නැති නිසා මිලක් නැහැ.' : offer.unitPrice > 0 ? `ඒකකයක් රු. ${offer.unitPrice.toLocaleString()} (මුළු රු. ${offer.total.toLocaleString()}).` : 'මිල කවුන්ටරයේදී කියමි — කොටස දැක ගෙන තීරණය කරන්න.';
    case 'fits':
      return offer.fitmentConfirmed ? 'ඔබගේ චැසි අංකයට ගැළපෙන බව මම තහවුරු කළා.' : 'චැසි / එන්ජින් අංකය එවන්න — ගැළපෙන්නේදැයි තහවුරු කර කියමි.';
    case 'holdIt':
      return `පැය ${offer.holdHours} ක් ඔබට තබා ගන්නම් — OnMart හි “වෙන් කර ගන්න” ඔබන්න.`;
    case 'photo':
      return 'දැන් කොටසේ ඡායාරූපයක් එවමි.';
    case 'delivery':
      return offer.delivery ? `${offer.delivery.courier ?? 'අපගේ රියදුරා'} මගින් රු. ${offer.delivery.fee.toLocaleString()} · මිනිත්තු ${offer.delivery.etaMin}ක්.` : 'දැනට කවුන්ටරයෙන් පමණක් ලබා ගත හැක.';
    default:
      return 'හරි, ස්තූතියි. විස්තර OnMart තුළම එවන්න.';
  }
};

export const MartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notify } = useNotice();
  const { fullName, profile } = useProfile();
  const { coords } = useUserLocation();
  const { markPartBought } = useWorkshops();
  const [enquiries, setEnquiries] = useState<MartEnquiry[]>([]);
  const enquirySeq = useRef(0);
  const [offers, setOffers] = useState<ShopOffer[]>([]);
  const [purchases, setPurchases] = useState<MartPurchase[]>([]);
  const [threads, setThreads] = useState<PartsThread[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);

  const live = useRef({ enquiries, offers, purchases, threads, cart });
  live.current = { enquiries, offers, purchases, threads, cart };
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /** A line from the shop in its conversation with the buyer. */
  const shopSays = useCallback((enquiryId: string, shopId: string, text: string) => {
    const key = `${enquiryId}:${shopId}`;
    const line: PartsMessage = { id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, from: 'shop', text, at: Date.now() };
    setThreads((prev) => (prev.some((t) => t.id === key) ? prev.map((t) => (t.id === key ? { ...t, messages: [...t.messages, line] } : t)) : [...prev, { id: key, enquiryId, shopId, messages: [line] }]));
  }, []);

  const patch = useCallback((id: string, change: (m: MartEnquiry) => MartEnquiry) => setEnquiries((prev) => prev.map((m) => (m.enquiry.id === id ? change(m) : m))), []);
  const patchPurchase = useCallback((id: string, change: (p: MartPurchase) => MartPurchase) => setPurchases((prev) => prev.map((p) => (p.purchase.id === id ? change(p) : p))), []);
  const setStatus = useCallback((enquiryId: string | undefined, status: PartEnquiry['status']) => (enquiryId ? patch(enquiryId, (m) => ({ ...m, searching: false, enquiry: { ...m.enquiry, status } })) : undefined), [patch]);

  /** One round of shops answering. Returns the ids of the shops asked. */
  const runRound = useCallback(
    (me: MartEnquiry, mode: 'shops' | 'wall', already: string[]): string[] => {
      const e = me.enquiry;
      const brief = e.briefs[0];
      const all = shopsNear(e.coords);
      const asked = new Set(already);
      const q = queryFromBrief(brief);
      // A request goes to the closest few shops whose catalogue covers it (and to shops without a catalogue that sell this kind of part);
      // a part the catalogues do not know is asked of every shop in the ring, as before.
      // The owner can set the exact radius on the map; otherwise the ring (10 km, 50 km, the whole country) decides.
      const inRing = (e.radiusKm ? all.filter((s) => s.distanceKm <= e.radiusKm!) : shopsInRing(all, e.ring)).filter((s) => !asked.has(s.id));
      const reach = () => {
        if (!q.partId) return inRing;
        const covered = broadcastTargets(matchingShops(inRing, q)).map((m) => m.shop);
        const older = inRing.filter((s) => !s.catalogue?.length && wallVisibleTo(s, brief)).slice(0, Math.max(0, BROADCAST_LIMIT - covered.length));
        return [...covered, ...older];
      };
      const targets =
        mode === 'shops'
          ? me.onlyShopIds
            ? all.filter((s) => me.onlyShopIds!.includes(s.id) && !asked.has(s.id))
            : reach()
          : all.filter((s) => !asked.has(s.id) && wallVisibleTo(s, brief));
      const ids = targets.map((s) => s.id);
      patch(e.id, (m) => ({ ...m, askedShopIds: [...new Set([...m.askedShopIds, ...ids])], searching: true }));

      let last = 0;
      targets.forEach((shop, rank) => {
        const has = !!availabilityAt(shop.id, brief.name, brief.partType);
        const catalogue = !!shop.catalogue?.length && !!q.partId;
        // A catalogue shop answers have / don't have / will check; an older shop answers only when it has the part or publishes its stock.
        const basePlan: ReplyPlan | null = catalogue ? planReply(shop.id, brief.name, has) : has ? { kind: 'have', priced: true } : mode === 'wall' || !shop.liveStock ? null : { kind: 'none', priced: false };
        // The simulation: of the shops asked (nearest first) several have the parts, some all of a basket, some only a few, so the comparison has something to compare.
        const demo = mode === 'shops' && !me.onlyShopIds ? demoCoverage(rank, e.batchIndex ?? 0, e.batchSize ?? 1) : undefined;
        const plan: ReplyPlan | null = demo === undefined ? basePlan : demo ? { kind: 'have', priced: true } : { kind: 'none', priced: false };
        // The shop sees the request (the second tick) before it answers; a shop that would stay silent sees it only when it is online (it publishes live stock).
        const seenAfter = plan ? Math.max(1500, Math.min(6000, shop.stats.avgResponseMin * 350 * 0.45)) : shop.liveStock ? 6000 : null;
        if (seenAfter != null) later(() => patch(e.id, (m) => ({ ...m, seenBy: { ...m.seenBy, [shop.id]: Date.now() } })), seenAfter);
        // On the wall only shops that have the part answer.
        if (!plan || (mode === 'wall' && plan.kind === 'none')) return;
        const neighbours = () => suggestNeighbours(MART_SHOPS, q, [shop.id, ...live.current.enquiries.flatMap((m) => (m.enquiry.id === e.id ? m.askedShopIds : []))], 3).map((s) => s.id);
        // A shop opens the request within a few seconds and then looks for the part: for now the simulated search takes about 40 seconds (32-40 s by how fast the shop usually is).
        const delay = 32000 + Math.min(8000, shop.stats.avgResponseMin * 350 + (mode === 'wall' ? shop.distanceKm * 25 : 0));
        last = Math.max(last, plan.kind === 'check' ? delay + CHECK_MS : delay);
        const put = (p: ReplyPlan, announce: boolean) => {
          const cur = live.current.enquiries.find((x) => x.enquiry.id === e.id);
          if (!cur || cur.enquiry.status !== 'open') return;
          const base = makeOffer(cur.enquiry, brief, shop, undefined, p, p.kind === 'none' ? neighbours() : undefined);
          const offer = p.kind === 'check' ? { ...base, checkUntil: Date.now() + 60 * 60000 } : base;
          setOffers((prev) => [...prev.filter((o) => o.id !== offer.id), offer]);
          // The answer is also the shop's first line in the chat with the buyer.
          const names = (offer.suggestedShopIds ?? []).map((id) => martShop(id)?.name).filter((n): n is string => !!n);
          const key = `${e.id}:${shop.id}`;
          const line: PartsMessage = { id: `m-${Date.now()}-${shop.id}`, from: 'shop', text: replyMessage(offer, names), at: Date.now() };
          setThreads((prev) => (prev.some((t) => t.id === key) ? prev.map((t) => (t.id === key ? { ...t, messages: [...t.messages, line] } : t)) : [...prev, { id: key, enquiryId: e.id, shopId: shop.id, messages: [line] }]));
          if (!announce) return;
          const where = `${shop.distanceKm < 10 ? shop.distanceKm.toFixed(1) : Math.round(shop.distanceKm)} කි.මී.`;
          if (p.kind === 'have') notify({ icon: '📨', title: `${shop.name} සතුව ${brief.name} ඇත`, body: `${offer.unitPrice ? `රු. ${offer.unitPrice.toLocaleString()}` : 'මිල කවුන්ටරයේදී'} · ${where}`, tone: 'success' });
          else if (p.kind === 'check') notify({ icon: '⏳', title: `${shop.name} පරීක්ෂා කර දන්වයි`, body: `${brief.name} · ${where}`, tone: 'primary' });
        };
        later(() => {
          put(plan, true);
          // "Will check" settles a little later into a yes or a no.
          if (plan.kind === 'check' && plan.settles) later(() => put({ kind: plan.settles!, priced: plan.priced }, true), CHECK_MS);
        }, delay);
      });

      later(() => {
        const cur = live.current.enquiries.find((x) => x.enquiry.id === e.id);
        if (!cur) return;
        patch(e.id, (m) => ({ ...m, searching: false }));
        const got = live.current.offers.some((o) => o.enquiryId === e.id && (o.available || o.reply === 'check'));
        if (!got && cur.enquiry.status === 'open') {
          notify({ icon: '🔎', title: `${brief.name} තවම හමු වී නැත`, body: nextRing(cur.enquiry.ring) ? 'සෙවුම් පරාසය විශාල කරන්න, නැත්නම් විවෘත පෝස්ට් එකට දමන්න.' : 'විවෘත පෝස්ට් එකට දමා සිටින්න — වෙළඳසැලක් සතුව ඇත්නම් දැනුම් දෙයි.', tone: 'danger' });
        }
      }, last + 1500);
      // The open wall keeps working: a shop lists the part a little later and the owner is told (simulated).
      if (mode === 'wall') {
        const candidate = targets[0];
        if (candidate && !targets.some((s) => !!availabilityAt(s.id, brief.name, brief.partType))) {
          later(() => {
            const cur = live.current.enquiries.find((x) => x.enquiry.id === e.id);
            if (!cur || cur.enquiry.status !== 'open' || live.current.offers.some((o) => o.enquiryId === e.id && o.available)) return;
            const type = brief.partType === 'GarageChoice' ? candidate.types[0] : brief.partType;
            const line: ShopStockLine = { name: brief.name, partType: type, price: Math.round((partMarketPrice(brief.name, type) * candidate.stats.priceLevel) / 50) * 50, qty: brief.qty };
            const offer = makeOffer(cur.enquiry, brief, candidate, line);
            setOffers((prev) => [...prev.filter((o) => o.id !== offer.id), offer]);
            notify({ icon: '🔔', title: `${candidate.name} දැන් ${brief.name} ලැයිස්තුගත කළා`, body: `ඔබගේ විවෘත පෝස්ට් එකට පිළිතුරක් · රු. ${offer.unitPrice.toLocaleString()}`, tone: 'success' });
          }, last + 24000);
        }
      }
      return ids;
    },
    [later, notify, patch]
  );

  const createEnquiry = useCallback(
    (input: NewEnquiry) => {
      const now = Date.now();
      // Two requests can be created in the same millisecond (a double tap), so the clock alone is not a unique id.
      const seq = ++enquirySeq.current;
      const id = `pe-${now}-${seq}`;
      const enquiry: PartEnquiry = {
        id,
        buyer: { name: fullName, phone: profile.phone },
        briefs: [{ ...input.brief, id: `pb-${now}-${seq}` }],
        audience: input.audience,
        ring: input.ring,
        jobRef: input.jobRef,
        batchId: input.batchId,
        batchTitle: input.batchTitle,
        batchIndex: input.batchIndex,
        batchSize: input.batchSize,
        coords,
        createdAt: now,
        quoteUntil: now + input.validDays * DAY,
        status: 'open',
      };
      const me: MartEnquiry = { enquiry, onlyShopIds: input.onlyShopIds, askedShopIds: [], searching: true };
      setEnquiries((prev) => [me, ...prev]);
      const asked = reachesShops(input.audience) ? runRound(me, 'shops', []) : [];
      if (onWall(input.audience)) runRound(me, 'wall', asked);
      if (!input.silent) notify({ icon: '📨', title: 'ඉල්ලීම යැව්වා', body: onWall(input.audience) ? 'වෙළඳසැල් සහ විවෘත පෝස්ට් එක වෙත.' : 'ළඟ වෙළඳසැල් වෙත — පිළිතුරු ලැබෙන විට දැනුම් දෙමු.', tone: 'primary' });
      return id;
    },
    [coords, fullName, notify, profile.phone, runRound]
  );

  const createBatch = useCallback(
    (inputs: NewEnquiry[], title?: string) => {
      const batchId = `pbatch-${Date.now()}-${++enquirySeq.current}`;
      const list = inputs.slice(0, MAX_BASKET_PARTS);
      list.forEach((i, n) => createEnquiry({ ...i, batchId, batchTitle: title, batchIndex: n, batchSize: list.length, silent: true }));
      notify({ icon: '📨', title: `කොටස් ${list.length} ක ඉල්ලීම යැව්වා`, body: 'ළඟ වෙළඳසැල් වෙත — හැම කොටසකටම වෙන වෙනම පිළිතුරු එයි.', tone: 'primary' });
      return batchId;
    },
    [createEnquiry, notify]
  );

  const widen = useCallback(
    (enquiryId: string) => {
      const me = live.current.enquiries.find((m) => m.enquiry.id === enquiryId);
      const next = me && nextRing(me.enquiry.ring);
      if (!me || !next) return;
      const updated: MartEnquiry = { ...me, enquiry: { ...me.enquiry, ring: next } };
      patch(enquiryId, () => updated);
      runRound(updated, 'shops', me.askedShopIds);
    },
    [patch, runRound]
  );

  const searchWithin = useCallback(
    (enquiryIds: string[], km: number | 'all') => {
      const nation = km === 'all' || km > 200;
      const ring: PartEnquiry['ring'] = nation ? 'nationwide' : km > 10 ? 'wider' : 'nearby';
      enquiryIds.forEach((id) => {
        const me = live.current.enquiries.find((m) => m.enquiry.id === id);
        if (!me) return;
        const updated: MartEnquiry = { ...me, enquiry: { ...me.enquiry, ring, radiusKm: nation ? undefined : (km as number) } };
        patch(id, () => updated);
        runRound(updated, 'shops', me.askedShopIds);
      });
      notify({
        icon: '🔭',
        title: nation ? 'මුළු ලංකාවේම වෙළඳසැල් වලට පණිවිඩය යැව්වා' : `කි.මී. ${km} ඇතුළත වෙළඳසැල් වලට පණිවිඩය යැව්වා`,
        body: `කොටස් ${enquiryIds.length} ක් සඳහා — අලුතින් ලැබෙන වෙළඳසැල් වල පිළිතුරු මෙහි පෙනේ.`,
        tone: 'primary',
      });
    },
    [notify, patch, runRound]
  );

  const askMore = useCallback(
    (enquiryId: string) => {
      const me = live.current.enquiries.find((m) => m.enquiry.id === enquiryId);
      if (!me) return;
      const ids = runRound({ ...me, onlyShopIds: undefined }, 'shops', me.askedShopIds);
      if (!ids.length) notify({ icon: '🔎', title: 'මෙම පරාසයේ තවත් වෙළඳසැල් නැත', body: 'පරාසය විශාල කරන්න, නැත්නම් විවෘත පෝස්ට් එකට දමන්න.', tone: 'danger' });
    },
    [notify, runRound]
  );

  const askShops = useCallback(
    (enquiryId: string, shopIds: string[]) => {
      const me = live.current.enquiries.find((m) => m.enquiry.id === enquiryId);
      if (!me) return;
      const ids = runRound({ ...me, onlyShopIds: shopIds }, 'shops', me.askedShopIds);
      if (ids.length) notify({ icon: '📨', title: `වෙළඳසැල් ${ids.length} කට ඉල්ලීම යැව්වා`, body: ids.map((id) => martShop(id)?.name).filter(Boolean).join(', '), tone: 'primary' });
    },
    [notify, runRound]
  );

  const postToWall = useCallback(
    (enquiryId: string, description?: string) => {
      const me = live.current.enquiries.find((m) => m.enquiry.id === enquiryId);
      if (!me || onWall(me.enquiry.audience)) return;
      // A part of a basket posted on the wall on its own carries a description of its own.
      const extra = description?.trim();
      const briefs = extra ? me.enquiry.briefs.map((b, i) => (i === 0 ? { ...b, note: [b.note, extra].filter(Boolean).join(' · ') } : b)) : me.enquiry.briefs;
      const updated: MartEnquiry = { ...me, enquiry: { ...me.enquiry, briefs, audience: 'both' } };
      patch(enquiryId, () => updated);
      runRound(updated, 'wall', me.askedShopIds);
      notify({ icon: '📣', title: 'විවෘත පෝස්ට් එකට දැම්මා', body: 'කොටස අලෙවි කරන ලංකාවේ සියලු වෙළඳසැල්වලට පෙනේ.', tone: 'primary' });
    },
    [notify, patch, runRound]
  );

  const cancelEnquiry = useCallback((enquiryId: string) => setStatus(enquiryId, 'cancelled'), [setStatus]);

  const editEnquiry = useCallback(
    (enquiryId: string, change: { note?: string; photos?: string[]; voiceNotes?: VoiceNote[] }) => {
      patch(enquiryId, (m) => (m.enquiry.status === 'open' ? { ...m, enquiry: { ...m.enquiry, briefs: m.enquiry.briefs.map((b, i) => (i === 0 ? { ...b, ...change } : b)) } } : m));
      notify({ icon: '✎', title: 'පෝස්ට් එක යාවත්කාලීන කළා', body: 'අමතර විස්තර සහ ඡායාරූප වෙළඳසැල්වලට පෙනේ.', tone: 'success' });
    },
    [notify, patch]
  );

  // ---------- Reserve, collect or receive, inspect and pay ----------
  const moveStage = useCallback(
    (id: string, from: PurchaseStage[], to: PurchaseStage, extra?: (p: MartPurchase) => Partial<MartPurchase>) => {
      const cur = live.current.purchases.find((p) => p.purchase.id === id);
      if (!cur || !from.includes(cur.stage)) return false;
      patchPurchase(id, (p) => ({ ...p, ...(extra ? extra(p) : {}), stage: to }));
      return true;
    },
    [patchPurchase]
  );

  const reserve = useCallback(
    (offerId: string, fulfilment: 'pickup' | 'delivery', group?: ReserveGroup) => {
      const { offers: os, enquiries: es, purchases: ps } = live.current;
      const offer = os.find((o) => o.id === offerId);
      const me = offer && es.find((m) => m.enquiry.id === offer.enquiryId);
      if (!offer || !offer.available || !me || me.enquiry.status !== 'open') return;
      if (ps.some((p) => p.purchase.enquiryId === offer.enquiryId && ACTIVE_STAGES.includes(p.stage))) return;
      const brief = me.enquiry.briefs.find((b) => b.id === offer.briefId) ?? me.enquiry.briefs[0];
      const now = Date.now();
      const del = fulfilment === 'delivery' ? offer.delivery : undefined;
      const mp: MartPurchase = {
        purchase: {
          id: group ? `pp-${now}-${group.seq}` : `pp-${now}`,
          enquiryId: offer.enquiryId,
          offerId,
          briefId: offer.briefId,
          shop: offer.shop,
          code: group?.code ?? makeCloseCode(),
          groupId: group?.id,
          status: 'reserved',
          fulfilment: del ? 'delivery' : 'pickup',
          reservedUntil: now + offer.holdHours * HOUR,
          jobRef: me.enquiry.jobRef,
        },
        offer,
        brief,
        stage: 'reserved',
        createdAt: now,
        delivery: del
          ? { courier: del.courier, fee: del.fee, rider: del.courier ? { name: 'සමන් කුමාර', phone: '0771230099' } : { name: `${offer.shop.name} රියදුරා`, phone: offer.shop.phone }, etaAt: 0 }
          : undefined,
      };
      const id = mp.purchase.id;
      setPurchases((prev) => [mp, ...prev]);
      setStatus(offer.enquiryId, 'reserved');
      shopSays(offer.enquiryId, offer.shop.id, del ? '🔒 කොටස වෙන් කළා — ගෙදරටම එවමි.' : `🔒 කොටස වෙන් කළා — පැය ${offer.holdHours} ක් කවුන්ටරයේ තබා ගන්නමි. සූදානම් වූ විට දන්වමි; ඔබගේ කේතය පෙන්වන්න.`);
      if (!group) notify({ icon: '🔒', title: `${offer.shop.name} ඔබට කොටස වෙන් කළා`, body: del ? 'කොටස ගෙදරටම එවයි.' : `පැය ${offer.holdHours} ක් කවුන්ටරයේ තබා ගනී — කේතය පෙන්වන්න.`, tone: 'success' });

      if (del) {
        later(() => {
          if (!moveStage(id, ['reserved'], 'dispatched', (p) => ({ delivery: p.delivery && { ...p.delivery, etaAt: Date.now() + del.etaMin * MIN } }))) return;
          shopSays(offer.enquiryId, offer.shop.id, '🛵 කොටස පිටත් කළා.');
          notify({ icon: '🛵', title: 'කොටස පිටත් කළා', body: `${del.courier ?? 'වෙළඳසැලේ රියදුරා'} · මිනිත්තු ${del.etaMin}කින්`, tone: 'primary' });
        }, DISPATCH_MS);
        later(() => {
          if (!moveStage(id, ['dispatched'], 'arrived')) return;
          notify({ icon: '🚪', title: 'රියදුරු ළඟයි', body: 'කොටස පරීක්ෂා කර ගෙවන්න — ගැළපෙන්නේ නැත්නම් ප්‍රතික්ෂේප කරන්න.', tone: 'primary' });
        }, DISPATCH_MS + ARRIVE_MS);
      } else {
        later(() => {
          if (!moveStage(id, ['reserved'], 'ready')) return;
          shopSays(offer.enquiryId, offer.shop.id, '🏪 කොටස කවුන්ටරයේ සූදානම් — පැමිණ ඔබගේ කේතය පෙන්වන්න. කොටස පරීක්ෂා කර ගෙවන්න.');
          notify({ icon: '🏪', title: `${offer.shop.name}: කොටස සූදානම්`, body: 'කවුන්ටරයට ගොස් ඔබගේ කේතය පෙන්වන්න.', tone: 'success' });
        }, READY_MS);
      }
    },
    [later, moveStage, notify, setStatus, shopSays]
  );

  const reserveMany = useCallback(
    (offerIds: string[], fulfilment: 'pickup' | 'delivery') => {
      const { offers: os, enquiries: es, purchases: ps } = live.current;
      // Only parts still open and not already reserved, and all from one shop.
      const ok = offerIds
        .map((id) => os.find((o) => o.id === id))
        .filter((o): o is (typeof os)[number] => !!o && o.available && es.some((m) => m.enquiry.id === o.enquiryId && m.enquiry.status === 'open') && !ps.some((p) => p.purchase.enquiryId === o.enquiryId && ACTIVE_STAGES.includes(p.stage)));
      if (!ok.length || new Set(ok.map((o) => o.shop.id)).size > 1) return;
      if (ok.length === 1) {
        reserve(ok[0].id, fulfilment);
        return;
      }
      const now = Date.now();
      const group = { id: `pg-${now}`, code: makeCloseCode() };
      ok.forEach((o, i) => reserve(o.id, fulfilment, { ...group, seq: i }));
      notify({ icon: '🔒', title: `${ok[0].shop.name} කොටස් ${ok.length} ක් වෙන් කළා`, body: 'කොටස් ඔක්කොටම එකම කේතයක් — කවුන්ටරයේදී එකින් එක පරීක්ෂා කර ගෙවන්න.', tone: 'success' });
    },
    [notify, reserve]
  );

  // ---------- The cart ----------
  const addToCart = useCallback(
    (offerIds: string[], opts?: { cheapest?: boolean }) => {
      const { offers: os, enquiries: es } = live.current;
      const fresh: CartLine[] = [];
      offerIds.forEach((id) => {
        const o = os.find((x) => x.id === id);
        const me = o && es.find((m) => m.enquiry.id === o.enquiryId);
        if (o && o.available && me && me.enquiry.status === 'open') fresh.push({ enquiryId: o.enquiryId, offerId: o.id, shopId: o.shop.id, addedAt: Date.now(), cheapest: opts?.cheapest });
      });
      if (!fresh.length) return;
      // One shop per part: picking another shop for a part replaces the earlier pick.
      setCart((prev) => [...prev.filter((l) => !fresh.some((f) => f.enquiryId === l.enquiryId)), ...fresh]);
      notify({ icon: '🛒', title: `Cart එකට කොටස් ${fresh.length} ක් එක් කළා`, body: 'පැයක් ඇතුළත shop එකෙන් තහවුරු කරන්න.', tone: 'primary' });
    },
    [notify]
  );

  const removeFromCart = useCallback((enquiryId: string) => setCart((prev) => prev.filter((l) => l.enquiryId !== enquiryId)), []);

  const confirmCart = useCallback(
    (shopId: string, cheapest?: boolean): string | undefined => {
      const { cart: lines, offers: os, enquiries: es } = live.current;
      const mine = lines.filter((l) => l.shopId === shopId && (cheapest === undefined || !!l.cheapest === cheapest) && !cartExpired(l.addedAt, Date.now()) && es.find((m) => m.enquiry.id === l.enquiryId)?.enquiry.status === 'open');
      if (!mine.length) return undefined;
      const offersOf = mine.map((l) => os.find((o) => o.id === l.offerId)).filter((o): o is (typeof os)[number] => !!o);
      if (!offersOf.length) return undefined;
      reserveMany(offersOf.map((o) => o.id), 'pickup');
      setCart((prev) => prev.filter((l) => !mine.some((m) => m.enquiryId === l.enquiryId)));
      // The order goes into the shop's chat, where the shop and the buyer check the part details and that it is there.
      const first = offersOf[0];
      const rows = offersOf.map((o) => {
        const b = es.find((m) => m.enquiry.id === o.enquiryId)?.enquiry.briefs.find((x) => x.id === o.briefId);
        return `• ${b?.name ?? 'කොටස'}${o.qty > 1 ? ` ×${o.qty}` : ''} — ${o.total ? `රු. ${o.total.toLocaleString()}` : 'මිල කවුන්ටරයේදී'}`;
      });
      const sum = offersOf.reduce((t, o) => t + o.total, 0);
      const line: PartsMessage = {
        id: `m-${Date.now()}-cart`,
        from: 'buyer',
        text: `🛒 ඇණවුම තහවුරු කළා:\n${rows.join('\n')}${sum ? `\nඑකතුව රු. ${sum.toLocaleString()}` : ''}\nකරුණාකර කොටස් වල විස්තර (වර්ගය, අංකය) සහ තොගය තහවුරු කරන්න.`,
        at: Date.now(),
      };
      const key = `${first.enquiryId}:${shopId}`;
      setThreads((prev) => (prev.some((t) => t.id === key) ? prev.map((t) => (t.id === key ? { ...t, messages: [...t.messages, line] } : t)) : [...prev, { id: key, enquiryId: first.enquiryId, shopId, messages: [line] }]));
      later(() => shopSays(first.enquiryId, shopId, `✓ ඇණවුම ලැබුණා — කොටස් ${offersOf.length} ම තොගයේ ඇති බව තහවුරු කරමි. ඕන විස්තරයක් මෙහි අසන්න.`), 2500);
      return first.enquiryId;
    },
    [later, reserveMany, shopSays]
  );

  // A part left in the cart past the hour (or whose request is no longer open) drops out.
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      const cur = live.current.cart;
      const keep = cur.filter((l) => !cartExpired(l.addedAt, now) && live.current.enquiries.find((m) => m.enquiry.id === l.enquiryId)?.enquiry.status === 'open');
      if (keep.length !== cur.length) {
        setCart(keep);
        notify({ icon: '⌛', title: 'Cart එකේ කොටසක් කල් ඉකුත් විය', body: 'පැයක් ඇතුළත තහවුරු නොකළ නිසා ඉවත් විය — නැවත තෝරන්න.', tone: 'danger' });
      }
    }, 20000);
    return () => clearInterval(t);
  }, [notify]);

  const buy = useCallback(
    (purchaseId: string) => {
      const cur = live.current.purchases.find((p) => p.purchase.id === purchaseId);
      if (!cur) return;
      const now = Date.now();
      const ok = moveStage(purchaseId, ['ready', 'arrived'], 'bought', (p) => ({
        purchase: { ...p.purchase, status: 'bought', amount: p.offer.total, invoiceNo: `INV-${String(now).slice(-5)}`, boughtAt: now, returnBy: now + RETURN_DAYS * DAY },
        warrantyUntil: p.offer.warrantyMonths ? warrantyEnd(now, p.offer.warrantyMonths) : undefined,
      }));
      if (!ok) return;
      setStatus(cur.purchase.enquiryId, 'bought');
      // A part a garage asked the owner to buy: the garage is told the shop verified the purchase.
      if (cur.purchase.jobRef) markPartBought(cur.purchase.jobRef.bookingId, cur.purchase.jobRef.lineId, { shopName: cur.offer.shop.name, amount: cur.offer.total });
      notify({ icon: '✅', title: 'කොටස මිලදී ගත්තා', body: `${cur.offer.shop.name} · ${cur.brief.name} · රු. ${cur.offer.total.toLocaleString()}`, tone: 'success' });
    },
    [markPartBought, moveStage, notify, setStatus]
  );

  const reject = useCallback(
    (purchaseId: string, reason: string) => {
      const cur = live.current.purchases.find((p) => p.purchase.id === purchaseId);
      if (!cur) return;
      const ok = moveStage(purchaseId, ['ready', 'arrived'], 'rejected', (p) => ({ purchase: { ...p.purchase, status: 'rejected', rejectedReason: reason } }));
      if (!ok) return;
      // The enquiry opens again so another shop's offer can be chosen.
      setStatus(cur.purchase.enquiryId, 'open');
      notify({ icon: '↩️', title: 'කොටස ප්‍රතික්ෂේප කළා', body: 'ඔබ ගෙවූයේ නැත. වෙනත් වෙළඳසැලක පිළිතුරක් තෝරන්න.', tone: 'danger' });
    },
    [moveStage, notify, setStatus]
  );

  const cancelReservation = useCallback(
    (purchaseId: string) => {
      const cur = live.current.purchases.find((p) => p.purchase.id === purchaseId);
      if (!cur) return;
      if (!moveStage(purchaseId, ['reserved', 'ready'], 'released', (p) => ({ purchase: { ...p.purchase, status: 'released' } }))) return;
      setStatus(cur.purchase.enquiryId, 'open');
      notify({ icon: '🔓', title: 'වෙන් කිරීම අවලංගු කළා', body: 'වෙළඳසැලට දැනුම් දුන්නා.', tone: 'primary' });
    },
    [moveStage, notify, setStatus]
  );

  const returnPart = useCallback(
    (purchaseId: string, reason: string) => {
      const cur = live.current.purchases.find((p) => p.purchase.id === purchaseId);
      if (!cur || cur.stage !== 'bought' || (cur.purchase.returnBy ?? 0) < Date.now()) return;
      moveStage(purchaseId, ['bought'], 'returned', (p) => ({ purchase: { ...p.purchase, status: 'returned' }, returnReason: reason }));
      notify({ icon: '↩️', title: 'ආපසු දීම වෙළඳසැලට දැනුම් දුන්නා', body: `${cur.offer.shop.name} කොටස පරීක්ෂා කර මුදල ආපසු දෙයි.`, tone: 'primary' });
    },
    [moveStage, notify]
  );

  const rate = useCallback(
    (purchaseId: string, stars: number, text?: string) => patchPurchase(purchaseId, (p) => (p.stage === 'bought' && p.purchase.boughtAt && !p.rating ? { ...p, rating: { stars: Math.max(1, Math.min(5, Math.round(stars))), text: text?.trim() || undefined, at: Date.now() } } : p)),
    [patchPurchase]
  );

  // ---------- Talking to a shop ----------
  const sendMessage = useCallback(
    async (enquiryId: string, shopId: string, msg: { quick?: PartsQuickAsk; text?: string; photos?: string[]; voiceNotes?: VoiceNote[] }) => {
      const text = msg.text?.trim();
      if (text) {
        const check = await getAi().checkOffPlatform(text);
        if (check.confidence >= SUGGEST_MIN_CONFIDENCE && check.value.flagged) return false;
      }
      const key = `${enquiryId}:${shopId}`;
      const stamp = Date.now();
      const mine: PartsMessage = { id: `m-${stamp}`, from: 'buyer', quick: msg.quick, text, photos: msg.photos, voiceNotes: msg.voiceNotes, at: stamp };
      const add = (m: PartsMessage) =>
        setThreads((prev) => (prev.some((t) => t.id === key) ? prev.map((t) => (t.id === key ? { ...t, messages: [...t.messages, m] } : t)) : [...prev, { id: key, enquiryId, shopId, messages: [m] }]));
      add(mine);
      later(() => {
        const offer = live.current.offers.find((o) => o.enquiryId === enquiryId && o.shop.id === shopId);
        add({ id: `m-${Date.now()}`, from: 'shop', text: shopReply(offer, msg.quick), at: Date.now() });
      }, REPLY_MS);
      return true;
    },
    [later]
  );

  const editMessage = useCallback((enquiryId: string, shopId: string, messageId: string, text: string) => {
    const next = text.trim();
    if (!next) return;
    const key = `${enquiryId}:${shopId}`;
    setThreads((prev) => prev.map((t) => (t.id === key ? { ...t, messages: t.messages.map((m) => (m.id === messageId && m.from === 'buyer' && !m.deleted ? { ...m, text: next, edited: true } : m)) } : t)));
  }, []);

  const removeMessage = useCallback((enquiryId: string, shopId: string, messageId: string) => {
    const key = `${enquiryId}:${shopId}`;
    setThreads((prev) => prev.map((t) => (t.id === key ? { ...t, messages: t.messages.map((m) => (m.id === messageId && m.from === 'buyer' ? { ...m, text: undefined, quick: undefined, photos: undefined, voiceNotes: undefined, deleted: true } : m)) } : t)));
  }, []);

  // Attention: every event that is news for the buyer has a key; a page being open marks its keys as seen.
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());
  const attentionItems = useMemo(() => martAttentionItems({ enquiries, offers, purchases, threads }), [enquiries, offers, purchases, threads]);
  const attention = useMemo(() => countAttention(attentionItems, seen), [attentionItems, seen]);
  const markSeen = useCallback(
    (kind: AttentionKind) => {
      const keys = keysOf(attentionItems, kind);
      setSeen((prev) => (keys.every((k) => prev.has(k)) ? prev : new Set([...prev, ...keys])));
    },
    [attentionItems]
  );

  const offersFor = useCallback((enquiryId: string) => offers.filter((o) => o.enquiryId === enquiryId), [offers]);
  const purchaseFor = useCallback((enquiryId: string) => purchases.find((p) => p.purchase.enquiryId === enquiryId), [purchases]);
  const threadFor = useCallback((enquiryId: string, shopId: string) => threads.find((t) => t.id === `${enquiryId}:${shopId}`), [threads]);

  return (
    <MartContext.Provider
      value={{ enquiries, offers, purchases, threads, offersFor, purchaseFor, threadFor, createEnquiry, createBatch, widen, askMore, askShops, postToWall, searchWithin, cancelEnquiry, editEnquiry, reserve, reserveMany, cart, addToCart, removeFromCart, confirmCart, buy, reject, cancelReservation, returnPart, rate, sendMessage, editMessage, removeMessage, attention, markSeen }}
    >
      {children}
    </MartContext.Provider>
  );
};

export const useMart = () => {
  const ctx = useContext(MartContext);
  if (!ctx) throw new Error('useMart must be used inside MartProvider');
  return ctx;
};
