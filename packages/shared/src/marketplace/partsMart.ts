import type { MartAudience, PartBrief, PartType, SearchRing, ShopListing, ShopStats } from '../types';
import { PART_WORDS } from '../ai/vocabulary';
import { partMarketPrice } from './partPrices';

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
export const wallVisibleTo = (shop: Pick<ShopListing, 'types' | 'categories'>, brief: Pick<PartBrief, 'partType' | 'categoryId'>) =>
  typeOk(shop, brief.partType) && (!brief.categoryId || shop.categories.includes(brief.categoryId));

// ---------- Ranking ----------

export type MartSort = 'rating' | 'price' | 'response' | 'service' | 'distance';

/** 0–5 from how reliably a shop delivers; few orders pull the score toward a neutral 3.5. */
export const shopServiceScore = (s: ShopStats) => {
  const raw = 5 * (0.4 * s.fulfilmentRate + 0.3 * s.stockAccuracy + 0.2 * (1 - s.wrongPartRate) + 0.1 * (1 - s.cancelRate));
  const weight = Math.min(1, s.ordersDone / 20);
  return Number((raw * weight + 3.5 * (1 - weight)).toFixed(1));
};

export type RankOptions = {
  /** The shop's price for the part being searched (when known); else its general price level. */
  priceOf?: (shop: ShopListing) => number | undefined;
  /** Availability searches show shops with live stock first. */
  liveStockFirst?: boolean;
};

/** Shops in the order a buyer asked for; never reads referral fees. Ties go to the nearer shop. */
export const rankShops = (shops: ShopListing[], sort: MartSort, opts: RankOptions = {}): ShopListing[] => {
  const key = (s: ShopListing): number => {
    switch (sort) {
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
    wrongPartRate: avg(s.wrongPartRate, outcome === 'wrongPart'),
    cancelRate: avg(s.cancelRate, outcome === 'cancelled'),
  };
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
