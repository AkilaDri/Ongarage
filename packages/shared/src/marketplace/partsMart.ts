import type { CatalogueQuery, MartAudience, PartBrief, PartType, SearchRing, ShopCatalogue, ShopListing, ShopOffer, ShopReplyKind, ShopStats } from '../types';
import { PART_WORDS } from '../ai/vocabulary';
import { partMarketPrice } from './partPrices';
import { BROADCAST_LIMIT, ANSWER_WINDOW_MIN, broadcastTargets, matchScore, queryFromBrief, shopCovers, suggestNeighbours } from './partsCatalogue';

// OnMart's shared rules: how shops are ranked, how far a search reaches, who sees a wall
// post, how sure we are a part fits, and how a price compares with the market. Referral
// money never enters any of this: ranking is the same whether or not a garage is paid.

// ---------- Search reach ----------

export const SEARCH_RINGS: { ring: SearchRing; km: number; label: string }[] = [
  { ring: 'nearby', km: 10, label: 'ළඟම වෙළඳසැල් (කි.මී. 10)' },
  { ring: 'wider', km: 50, label: 'කි.මී. 50 ඇතුළත' },
  { ring: 'nationwide', km: Infinity, label: 'මුළු ලංකාවම' },
];

export const ringKm = (ring: SearchRing) => SEARCH_RINGS.find((r) => r.ring === ring)!.km;

/** The next, wider ring to offer when nothing was found, or null at the end of the ladder. */
export const nextRing = (ring: SearchRing): SearchRing | null => {
  const i = SEARCH_RINGS.findIndex((r) => r.ring === ring);
  return i >= 0 && i < SEARCH_RINGS.length - 1 ? SEARCH_RINGS[i + 1].ring : null;
};

export const shopsInRing = <T extends { distanceKm: number }>(shops: T[], ring: SearchRing) => shops.filter((s) => s.distanceKm <= ringKm(ring));

/** The widest ring that still has shops (the ladder stops once everything is covered). */
export const ringFor = (distanceKm: number): SearchRing => SEARCH_RINGS.find((r) => distanceKm <= r.km)!.ring;

// ---------- Audience ----------

export const reachesShops = (a: MartAudience) => a === 'shops' || a === 'both';
export const onWall = (a: MartAudience) => a === 'wall' || a === 'both';

const typeOk = (shop: Pick<ShopListing, 'types'>, t: PartType) => t === 'GarageChoice' || shop.types.includes(t);

/**
 * Whether a wall post is shown to a shop. The wall reaches every shop in the country, but
 * only those that sell that kind of part, so shops are not flooded.
 */
export const wallVisibleTo = (shop: Pick<ShopListing, 'types' | 'categories'> & { catalogue?: ShopCatalogue }, brief: Pick<PartBrief, 'partType' | 'categoryId'> & Partial<Pick<PartBrief, 'name' | 'vehicle'>>) => {
  // A shop with a catalogue sees the wall posts for what it sells (and for the vehicles it sells it for).
  if (shop.catalogue?.length && brief.name) {
    const q = queryFromBrief({ name: brief.name, partType: brief.partType, categoryId: brief.categoryId, vehicle: brief.vehicle as PartBrief['vehicle'] });
    if (q.partId) return !!shopCovers(shop.catalogue, q);
  }
  return typeOk(shop, brief.partType) && (!brief.categoryId || shop.categories.includes(brief.categoryId));
};

// ---------- Ranking ----------

export type MartSort = 'match' | 'rating' | 'price' | 'response' | 'service' | 'distance';

/** How often a shop's "I have it" proved true: the buyers' confirmations for a catalogue shop, the stock accuracy for one with live stock. */
export const accuracyOf = (s: ShopStats) => s.answerAccuracy ?? s.stockAccuracy;

/** 0–5 from how reliably a shop delivers; few orders pull the score toward a neutral 3.5. */
export const shopServiceScore = (s: ShopStats) => {
  const raw = 5 * (0.4 * s.fulfilmentRate + 0.3 * accuracyOf(s) + 0.2 * (1 - s.wrongPartRate) + 0.1 * (1 - s.cancelRate));
  const weight = Math.min(1, s.ordersDone / 20);
  return Number((raw * weight + 3.5 * (1 - weight)).toFixed(1));
};

export type RankOptions = {
  /** The shop's price for the part being searched (when known); else its general price level. */
  priceOf?: (shop: ShopListing) => number | undefined;
  /** Availability searches show shops with live stock first. */
  liveStockFirst?: boolean;
  /** What is being looked for: the "match" sort puts the shops whose catalogue fits it best first. */
  query?: CatalogueQuery;
};

/** Shops in the order a buyer asked for; never reads referral fees. Ties go to the nearer shop. */
export const rankShops = (shops: ShopListing[], sort: MartSort, opts: RankOptions = {}): ShopListing[] => {
  const key = (s: ShopListing): number => {
    switch (sort) {
      case 'match': {
        // The closer the catalogue fits the vehicle the better; a shop that does not match at all comes last. Ties: the quicker answerer.
        const m = opts.query ? shopCovers(s.catalogue, opts.query) : null;
        return (m ? -matchScore(m) : 1e3) * 1e3 + s.stats.avgResponseMin;
      }
      case 'rating':
        return -(s.rating + Math.min(s.ratingCount, 500) / 5000);
      case 'price':
        return opts.priceOf?.(s) ?? s.stats.priceLevel * 1e6;
      case 'response':
        return s.stats.avgResponseMin;
      case 'service':
        return -shopServiceScore(s.stats);
      default:
        return s.distanceKm;
    }
  };
  const sorted = [...shops].sort((a, b) => key(a) - key(b) || a.distanceKm - b.distanceKm);
  return opts.liveStockFirst ? [...sorted.filter((s) => s.liveStock), ...sorted.filter((s) => !s.liveStock)] : sorted;
};

export const SORT_LABELS: Record<MartSort, string> = {
  match: 'වඩාත් ගැළපෙන',
  rating: 'හොඳම ශ්‍රේණිගත',
  price: 'අඩුම මිල',
  response: 'ඉක්මන් පිළිතුර',
  service: 'හොඳම සේවාව',
  distance: 'ළඟම',
};

/** Badges a shop earns from its numbers (shown on its card). */
export const shopBadges = (s: ShopListing): string[] => {
  const out: string[] = [];
  if (s.stats.avgResponseMin <= 10 && s.stats.ordersDone >= 10) out.push('ඉක්මන් පිළිතුරු');
  if (s.liveStock) out.push('සජීවී තොගය');
  if (s.stats.ordersDone >= 20 && s.stats.stockAccuracy >= 0.95) out.push('නිවැරදි තොග');
  if ((s.stats.answersDone ?? 0) >= 20 && (s.stats.answerAccuracy ?? 0) >= 0.9) out.push('නිවැරදි පිළිතුරු');
  if (s.stats.ordersDone >= 20 && s.stats.wrongPartRate <= 0.02) out.push('නිවැරදි කොටස්');
  return out;
};

export type OrderOutcome = 'fulfilled' | 'noStock' | 'wrongPart' | 'cancelled';

/** A shop's numbers after one more order (claiming a part it doesn't have costs stock accuracy). */
export const recordOutcome = (s: ShopStats, outcome: OrderOutcome): ShopStats => {
  const n = s.ordersDone;
  const avg = (old: number, hit: boolean) => Number(((old * n + (hit ? 1 : 0)) / (n + 1)).toFixed(4));
  return {
    ...s,
    ordersDone: n + 1,
    fulfilmentRate: avg(s.fulfilmentRate, outcome === 'fulfilled'),
    stockAccuracy: avg(s.stockAccuracy, outcome !== 'noStock'),
    // A "have it" that turned out not to be there costs the answer accuracy too.
    answerAccuracy: s.answerAccuracy === undefined ? undefined : Number(((s.answerAccuracy * (s.answersDone ?? n) + (outcome === 'noStock' ? 0 : 1)) / ((s.answersDone ?? n) + 1)).toFixed(4)),
    answersDone: s.answerAccuracy === undefined ? s.answersDone : (s.answersDone ?? n) + 1,
    wrongPartRate: avg(s.wrongPartRate, outcome === 'wrongPart'),
    cancelRate: avg(s.cancelRate, outcome === 'cancelled'),
  };
};

// ---------- Requests and replies (the catalogue way) ----------

/** What a shop answered: older offers carry only `available`. */
export const offerReply = (o: Pick<ShopOffer, 'reply' | 'available'>): ShopReplyKind => o.reply ?? (o.available ? 'have' : 'none');

/** Only a "have it" can be reserved, and the price is optional: a "have it" with no price is reserved at the shop's counter price. */
export const offerCanReserve = (o: Pick<ShopOffer, 'reply' | 'available'>) => offerReply(o) === 'have';

/** Whether the shop gave a price (a reply may leave it out: the buyer then asks at the counter or in the chat). */
export const offerHasPrice = (o: Pick<ShopOffer, 'unitPrice'>) => o.unitPrice > 0;

/** The shops a request goes to: those whose catalogue covers it, closest fit first, at most `limit`, skipping the ones already asked. */
export type RequestReach = { ring: SearchRing; targets: { shop: ShopListing; tier: ReturnType<typeof shopCovers> }[]; /** How many shops cover it in that ring (more than were asked when the limit cut it short). */ covering: number; /** No shop with a catalogue covers it: the shops that sell its category are asked instead (older shops). */ fallback: boolean };

/**
 * Where a request for a part goes: the shops within the ring whose catalogue covers it (the closest fits, at most BROADCAST_LIMIT).
 * When the nearby ring has none, the search widens ring by ring (nearby, wider, nationwide). A shop that has no catalogue yet is
 * asked by the categories it sells (the older way), only when no shop with a catalogue covers the request.
 */
export const requestReach = (shops: ShopListing[], brief: Parameters<typeof queryFromBrief>[0], start: SearchRing = 'nearby', skip: Set<ShopListing> = new Set()): RequestReach => {
  const q = queryFromBrief(brief);
  let ring: SearchRing | null = start;
  let last: SearchRing = start;
  while (ring) {
    last = ring;
    const inRing = shopsInRing(shops, ring);
    const covering = inRing
      .map((shop) => ({ shop, match: shopCovers(shop.catalogue, q) }))
      .filter((x): x is { shop: ShopListing; match: NonNullable<ReturnType<typeof shopCovers>> } => !!x.match)
      .sort((a, b) => matchScore(b.match) - matchScore(a.match) || a.shop.distanceKm - b.shop.distanceKm);
    if (covering.length) {
      const picked = broadcastTargets(covering.map((c) => ({ shop: c.shop, match: c.match })), skip);
      return { ring, targets: picked.map((p) => ({ shop: p.shop, tier: p.match })), covering: covering.length, fallback: false };
    }
    ring = nextRing(ring);
  }
  // Nobody with a catalogue sells it: ask the shops (without a catalogue) that sell this kind of part, nearest first.
  const older = shopsInRing(shops, start === 'nationwide' ? 'nationwide' : 'wider')
    .filter((s) => !s.catalogue?.length && wallVisibleTo(s, brief) && !skip.has(s))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, BROADCAST_LIMIT);
  return { ring: last, targets: older.map((shop) => ({ shop, tier: null })), covering: older.length, fallback: true };
};

/** When a request must be answered by (a shop that has not answered by then counts as having no answer). */
export const answerDeadline = (sentAt: number) => sentAt + ANSWER_WINDOW_MIN * 60 * 1000;
export const answerOverdue = (sentAt: number, now: number) => now > answerDeadline(sentAt);

/**
 * The neighbour shops a reply may point to: shops that cover the same request, never the replying shop and not those already
 * asked; at most three. A shop's own picks are checked against this so a suggestion is always worth trying.
 */
export const validSuggestions = (shops: ShopListing[], brief: Parameters<typeof queryFromBrief>[0], picked: string[], excludeIds: string[]): string[] => {
  const q = queryFromBrief(brief);
  const ok = new Set(suggestNeighbours(shops, q, excludeIds, shops.length).map((s) => s.id));
  return picked.filter((id) => ok.has(id)).slice(0, 3);
};

/**
 * The buyer's word on a "have it" answer: the part was there, or not. Counts towards the shop's answer accuracy (and the stock
 * accuracy too, as before, when it was not there).
 */
export const recordAnswerFeedback = (s: ShopStats, found: boolean): ShopStats => {
  const n = s.answersDone ?? s.ordersDone;
  const acc = ((s.answerAccuracy ?? s.stockAccuracy) * n + (found ? 1 : 0)) / (n + 1);
  return { ...s, answerAccuracy: Number(acc.toFixed(4)), answersDone: n + 1 };
};

// ---------- How a catalogue shop answers (simulation, shared by the owner and garage apps) ----------

export type ReplyPlan = { kind: ShopReplyKind; /** The reply carries a price. */ priced: boolean; /** A "will check" settles to this a little later. */ settles?: 'have' | 'none' };

const hashOf = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * What a shop whose catalogue covers a request answers when it keeps no live stock. Always the same for the same shop and part, so a
 * demo can be repeated: about half say they have it (one in five of those without a price), some check first, the rest do not have it.
 */
export const planReply = (shopId: string, partName: string, hasStock: boolean): ReplyPlan => {
  if (hasStock) return { kind: 'have', priced: true };
  const h = hashOf(`${shopId}:${partName.toLowerCase()}`) % 10;
  if (h < 5) return { kind: 'have', priced: h !== 0 };
  if (h === 5) return { kind: 'check', priced: true, settles: 'have' };
  if (h === 6) return { kind: 'check', priced: false, settles: 'none' };
  return { kind: 'none', priced: false };
};

/**
 * The line a shop's answer becomes in the chat between the buyer and the shop (the same words on both sides): a "have it" with or
 * without a price, "will check", or "don't have it" with the neighbour shops it points to.
 */
export const replyMessage = (o: Pick<ShopOffer, 'reply' | 'available' | 'unitPrice' | 'total'>, neighbourNames: string[] = []): string => {
  switch (offerReply(o)) {
    case 'have':
      return o.unitPrice > 0 ? `✅ තියෙනවා — ඒකකයක් රු. ${o.unitPrice.toLocaleString('en-US')} (මුළු රු. ${o.total.toLocaleString('en-US')}). වෙන් කර ගන්න, නැත්නම් මෙතැනින් අසන්න.` : '✅ තියෙනවා — මිල කවුන්ටරයේදී කියමි (අවශ්‍ය නම් මෙතැනින් අසන්න). වෙන් කර ගන්න.';
    case 'check':
      return '⏳ පරීක්ෂා කර ටිකකින් දන්වමි.';
    default:
      return neighbourNames.length ? `✖ දැනට නැහැ. ${neighbourNames.join(', ')} තුළ තිබිය හැක — ඒ වෙළඳසැල්වලටත් ඉල්ලන්න.` : '✖ සමාවෙන්න, දැනට නැහැ.';
  }
};

// ---------- Fitting and price ----------

export type Fitment = 'confirmed' | 'likely' | 'unknown';

/**
 * How sure we are the part fits: confirmed when the shop checked it against the chassis number,
 * likely when the brief carries the chassis or engine number and a part number, else unknown.
 */
export const fitmentLevel = (brief: Pick<PartBrief, 'vehicle' | 'partNo'>, shopConfirmed: boolean): Fitment => {
  const v = brief.vehicle;
  if (shopConfirmed && (v.chassisNo || v.engineNo)) return 'confirmed';
  if ((v.chassisNo || v.engineNo) && brief.partNo) return 'likely';
  return 'unknown';
};

export type PriceTag = 'low' | 'fair' | 'high';

/** A unit price against the market reference (rounded list prices, see partPrices). */
export const priceTag = (name: string, type: PartType, unitPrice: number): PriceTag => {
  const ref = partMarketPrice(name, type);
  const ratio = unitPrice / ref;
  return ratio <= 0.9 ? 'low' : ratio >= 1.15 ? 'high' : 'fair';
};

export const PRICE_TAG_LABEL: Record<PriceTag, string> = { low: 'වෙළඳපොළ මිලට වඩා අඩුයි', fair: 'සාධාරණ මිලක්', high: 'වෙළඳපොළ මිලට වඩා ඉහළයි' };

// ---------- Part names ----------

/** Which service category each canonical part belongs to (matches shops' categories). */
export const PART_CATEGORY: Record<string, string> = {
  'Brake pads (front)': '7',
  'Brake pads (rear)': '7',
  'Brake disc': '7',
  'Brake fluid': '7',
  'Shock absorbers (pair)': '7',
  'Wheel bearing': '7',
  'Tie rod end': '7',
  'Ball joint': '7',
  'Battery 12V 45Ah': '11',
  'Battery terminals': '11',
  'Timing belt': '1',
  'Fan belt': '1',
  'Engine oil 4L': '1',
  'Oil filter': '1',
  'Air filter': '1',
  'Clutch plate': '1',
  Radiator: '1',
  'Fuel pump': '1',
  Alternator: '2',
  'Starter motor': '2',
  Headlight: '2',
  'Wiper blades': '2',
  'AC gas': '4',
  'AC compressor': '4',
  'Cabin filter': '4',
  'O2 sensor': '5',
  'Spark plugs (set)': '5',
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** What a buyer typed (English, Singlish or Sinhala) → the canonical part name, or null. */
export const canonicalPartName = (query: string): string | null => {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const exact = Object.keys(PART_WORDS).find((n) => n.toLowerCase() === q);
  if (exact) return exact;
  for (const [name, words] of Object.entries(PART_WORDS)) {
    for (const w of words) {
      const word = w.toLowerCase();
      if (/^[a-z0-9 ]+$/.test(word) ? new RegExp(`(^|[^a-z0-9])${escapeRe(word)}([^a-z0-9]|$)`).test(q) : q.includes(word)) return name;
    }
  }
  return null;
};

export const partCategory = (name: string): string | undefined => PART_CATEGORY[name];
