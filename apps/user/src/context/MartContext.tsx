import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  availabilityAt,
  dealFor,
  dealPrice,
  getAi,
  makeCloseCode,
  nextRing,
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
  type PartsQuickAsk,
  type PartsThread,
  type SearchRing,
  type ShopListing,
  type ShopStockLine,
  type ShopOffer,
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
/** A bought part can be brought back this long (the shop checks the fit and condition). */
const RETURN_DAYS = 7;

export type MartEnquiry = {
  enquiry: PartEnquiry;
  /** A direct enquiry to specific shops only (from a shop's page); empty = every shop in reach. */
  onlyShopIds?: string[];
  /** Shops already asked (so a wider search only asks new ones). */
  askedShopIds: string[];
  /** Shops are still answering the current round. */
  searching: boolean;
};

export type NewEnquiry = {
  brief: Omit<PartBrief, 'id'>;
  audience: MartAudience;
  ring: SearchRing;
  onlyShopIds?: string[];
  validDays: number;
  /** The job a garage told the owner to buy this part for, and the shops it recommended. */
  jobRef?: JobPartsRef;
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
  /** Nothing found: ask the next, wider ring of shops. */
  widen: (enquiryId: string) => void;
  /** Nothing found: also post it on the open wall that every shop in the country sees. */
  postToWall: (enquiryId: string) => void;
  cancelEnquiry: (enquiryId: string) => void;
  /** Reserve an offer: the shop holds the part for the owner, who gets a purchase code. */
  reserve: (offerId: string, fulfilment: 'pickup' | 'delivery') => void;
  /** The part checked at the counter (or the door) and paid for. */
  buy: (purchaseId: string) => void;
  /** The part is not as agreed: the reservation ends and the enquiry reopens. */
  reject: (purchaseId: string, reason: string) => void;
  cancelReservation: (purchaseId: string) => void;
  returnPart: (purchaseId: string, reason: string) => void;
  /** Only a bought part (a purchase the shop verified) can be rated. */
  rate: (purchaseId: string, stars: number, text?: string) => void;
  /** Ask a shop something; false when the message was held back (it moved the deal off the app). */
  sendMessage: (enquiryId: string, shopId: string, msg: { quick?: PartsQuickAsk; text?: string; photos?: string[] }) => Promise<boolean>;
};

const MartContext = createContext<MartState | null>(null);

const makeOffer = (e: PartEnquiry, brief: PartBrief, shop: ShopListing, listed?: ShopStockLine): ShopOffer => {
  const line = listed ?? availabilityAt(shop.id, brief.name, brief.partType);
  const v = brief.vehicle;
  const base = {
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
  const deal = dealFor(shop.id, brief.name, line.partType);
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
      return offer.available ? `ඔව්, තොගයේ ඇත — ${offer.qty} ක්.` : 'සමාවෙන්න, දැනට තොගයේ නැත.';
    case 'price':
      return offer.available ? `ඒකකයක් රු. ${offer.unitPrice.toLocaleString()} (මුළු රු. ${offer.total.toLocaleString()}).` : 'තොගයේ නැත.';
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

  const live = useRef({ enquiries, offers, purchases, threads });
  live.current = { enquiries, offers, purchases, threads };
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

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
      const targets =
        mode === 'shops'
          ? (me.onlyShopIds ? all.filter((s) => me.onlyShopIds!.includes(s.id)) : shopsInRing(all, e.ring)).filter((s) => !asked.has(s.id))
          : all.filter((s) => !asked.has(s.id) && wallVisibleTo(s, brief));
      const ids = targets.map((s) => s.id);
      patch(e.id, (m) => ({ ...m, askedShopIds: [...new Set([...m.askedShopIds, ...ids])], searching: true }));

      let last = 0;
      targets.forEach((shop) => {
        const has = !!availabilityAt(shop.id, brief.name, brief.partType);
        // On the wall only shops that have the part answer; a shop asked directly also says "no" when it publishes its stock.
        if (!has && (mode === 'wall' || !shop.liveStock)) return;
        const delay = Math.max(2500, Math.min(22000, shop.stats.avgResponseMin * 350 + (mode === 'wall' ? shop.distanceKm * 25 : 0)));
        last = Math.max(last, delay);
        later(() => {
          const cur = live.current.enquiries.find((x) => x.enquiry.id === e.id);
          if (!cur || cur.enquiry.status !== 'open') return;
          const offer = makeOffer(cur.enquiry, brief, shop);
          setOffers((prev) => [...prev.filter((o) => o.id !== offer.id), offer]);
          if (offer.available) {
            notify({ icon: '📨', title: `${shop.name} සතුව ${brief.name} ඇත`, body: `රු. ${offer.unitPrice.toLocaleString()} · ${shop.distanceKm < 10 ? shop.distanceKm.toFixed(1) : Math.round(shop.distanceKm)} කි.මී.`, tone: 'success' });
          }
        }, delay);
      });

      later(() => {
        const cur = live.current.enquiries.find((x) => x.enquiry.id === e.id);
        if (!cur) return;
        patch(e.id, (m) => ({ ...m, searching: false }));
        const got = live.current.offers.some((o) => o.enquiryId === e.id && o.available);
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
        coords,
        createdAt: now,
        quoteUntil: now + input.validDays * DAY,
        status: 'open',
      };
      const me: MartEnquiry = { enquiry, onlyShopIds: input.onlyShopIds, askedShopIds: [], searching: true };
      setEnquiries((prev) => [me, ...prev]);
      const asked = reachesShops(input.audience) ? runRound(me, 'shops', []) : [];
      if (onWall(input.audience)) runRound(me, 'wall', asked);
      notify({ icon: '📨', title: 'ඉල්ලීම යැව්වා', body: onWall(input.audience) ? 'වෙළඳසැල් සහ විවෘත පෝස්ට් එක වෙත.' : 'ළඟ වෙළඳසැල් වෙත — පිළිතුරු ලැබෙන විට දැනුම් දෙමු.', tone: 'primary' });
      return id;
    },
    [coords, fullName, notify, profile.phone, runRound]
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

  const postToWall = useCallback(
    (enquiryId: string) => {
      const me = live.current.enquiries.find((m) => m.enquiry.id === enquiryId);
      if (!me || onWall(me.enquiry.audience)) return;
      const updated: MartEnquiry = { ...me, enquiry: { ...me.enquiry, audience: 'both' } };
      patch(enquiryId, () => updated);
      runRound(updated, 'wall', me.askedShopIds);
      notify({ icon: '📣', title: 'විවෘත පෝස්ට් එකට දැම්මා', body: 'කොටස අලෙවි කරන ලංකාවේ සියලු වෙළඳසැල්වලට පෙනේ.', tone: 'primary' });
    },
    [notify, patch, runRound]
  );

  const cancelEnquiry = useCallback((enquiryId: string) => setStatus(enquiryId, 'cancelled'), [setStatus]);

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
    (offerId: string, fulfilment: 'pickup' | 'delivery') => {
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
          id: `pp-${now}`,
          enquiryId: offer.enquiryId,
          offerId,
          briefId: offer.briefId,
          shop: offer.shop,
          code: makeCloseCode(),
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
      notify({ icon: '🔒', title: `${offer.shop.name} ඔබට කොටස වෙන් කළා`, body: del ? 'කොටස ගෙදරටම එවයි.' : `පැය ${offer.holdHours} ක් කවුන්ටරයේ තබා ගනී — කේතය පෙන්වන්න.`, tone: 'success' });

      if (del) {
        later(() => {
          if (!moveStage(id, ['reserved'], 'dispatched', (p) => ({ delivery: p.delivery && { ...p.delivery, etaAt: Date.now() + del.etaMin * MIN } }))) return;
          notify({ icon: '🛵', title: 'කොටස පිටත් කළා', body: `${del.courier ?? 'වෙළඳසැලේ රියදුරා'} · මිනිත්තු ${del.etaMin}කින්`, tone: 'primary' });
        }, DISPATCH_MS);
        later(() => {
          if (!moveStage(id, ['dispatched'], 'arrived')) return;
          notify({ icon: '🚪', title: 'රියදුරු ළඟයි', body: 'කොටස පරීක්ෂා කර ගෙවන්න — ගැළපෙන්නේ නැත්නම් ප්‍රතික්ෂේප කරන්න.', tone: 'primary' });
        }, DISPATCH_MS + ARRIVE_MS);
      } else {
        later(() => {
          if (!moveStage(id, ['reserved'], 'ready')) return;
          notify({ icon: '🏪', title: `${offer.shop.name}: කොටස සූදානම්`, body: 'කවුන්ටරයට ගොස් ඔබගේ කේතය පෙන්වන්න.', tone: 'success' });
        }, READY_MS);
      }
    },
    [later, moveStage, notify, setStatus]
  );

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
    async (enquiryId: string, shopId: string, msg: { quick?: PartsQuickAsk; text?: string; photos?: string[] }) => {
      const text = msg.text?.trim();
      if (text) {
        const check = await getAi().checkOffPlatform(text);
        if (check.confidence >= SUGGEST_MIN_CONFIDENCE && check.value.flagged) return false;
      }
      const key = `${enquiryId}:${shopId}`;
      const stamp = Date.now();
      const mine: PartsMessage = { id: `m-${stamp}`, from: 'buyer', quick: msg.quick, text, photos: msg.photos, at: stamp };
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

  const offersFor = useCallback((enquiryId: string) => offers.filter((o) => o.enquiryId === enquiryId), [offers]);
  const purchaseFor = useCallback((enquiryId: string) => purchases.find((p) => p.purchase.enquiryId === enquiryId), [purchases]);
  const threadFor = useCallback((enquiryId: string, shopId: string) => threads.find((t) => t.id === `${enquiryId}:${shopId}`), [threads]);

  return (
    <MartContext.Provider
      value={{ enquiries, offers, purchases, threads, offersFor, purchaseFor, threadFor, createEnquiry, widen, postToWall, cancelEnquiry, reserve, buy, reject, cancelReservation, returnPart, rate, sendMessage }}
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
