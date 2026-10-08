import type { ShopListing } from '../types';
import { rankShops } from './partsMart';

// OnMart's promotion rules: how a deal prices a part, when it ends, what a shop may set, which shops appear in the
// organic rows, and which in the paid Featured row. Ads never change the organic rows or the ranking (tested).

export const MAX_DEAL_PERCENT = 50;
export const MAX_DEAL_DAYS = 14;
const MIN_PRICE = 50;

export const clampDealPercent = (percent: number) => Math.max(0, Math.min(MAX_DEAL_PERCENT, Math.round(percent)));

/** A discounted unit price, rounded to 50 like every price in the apps; never above the original, never free. */
export const dealPrice = (price: number, percent: number) => Math.min(price, Math.max(MIN_PRICE, Math.round((price * (1 - clampDealPercent(percent) / 100)) / 50) * 50));

/** What a buyer saves on one unit. */
export const dealSaving = (price: number, percent: number) => price - dealPrice(price, percent);

export const dealLabel = (percent: number) => `−${clampDealPercent(percent)}%`;

/** No end time means it runs until withdrawn. */
export const isLive = (endsAt: number | undefined, now: number) => endsAt === undefined || endsAt > now;

export const timeLeft = (endsAt: number, now: number) => Math.max(0, endsAt - now);

/** What a shop may set: 1–50% off, ending in the future and within 14 days. Returns the problem, or null when fine. */
export const validateDeal = (deal: { discountPercent: number; endsAt: number }, now: number): string | null => {
  if (!(deal.discountPercent >= 1 && deal.discountPercent <= MAX_DEAL_PERCENT)) return `වට්ටම 1% සිට ${MAX_DEAL_PERCENT}% දක්වා විය යුතුයි`;
  if (deal.endsAt <= now) return 'අවසන් වීමේ වේලාව අනාගතයේ විය යුතුයි';
  if (deal.endsAt - now > MAX_DEAL_DAYS * 24 * 60 * 60 * 1000) return `දීමනාවක් උපරිම දින ${MAX_DEAL_DAYS}ක් පවතී`;
  return null;
};

/** A shop that offers free delivery above a basket value charges nothing once the parts reach it. */
export const deliveryFeeFor = (fee: number, partsTotal: number, freeOver?: number) => (freeOver !== undefined && partsTotal >= freeOver ? 0 : fee);

// ---------- Landing-page shop rows ----------

/** "Newly joined" covers shops that joined within this many days. */
export const NEW_SHOP_DAYS = 60;
const ROW_MAX = 6;
/** A reply speed only counts for the "fast" row once a shop has this many orders behind it. */
const MIN_ORDERS = 20;

export type ShopRows = { nearest: ShopListing[]; topRated: ShopListing[]; fast: ShopListing[]; newlyJoined: ShopListing[]; liveStock: ShopListing[] };

/**
 * The organic rows: nearest, best rated, fastest to reply, newly joined, and shops that publish live stock. They use
 * the shops' own numbers only; paid placement is not an input, so ads cannot change them.
 */
export const organicRows = (shops: ShopListing[], info: Record<string, { joinedAt: number }>, now: number): ShopRows => ({
  nearest: rankShops(shops, 'distance').slice(0, ROW_MAX),
  topRated: rankShops(shops, 'rating').slice(0, ROW_MAX),
  fast: rankShops(shops.filter((s) => s.stats.ordersDone >= MIN_ORDERS), 'response').slice(0, ROW_MAX),
  newlyJoined: shops
    .filter((s) => now - (info[s.id]?.joinedAt ?? 0) <= NEW_SHOP_DAYS * 24 * 60 * 60 * 1000)
    .sort((a, b) => (info[b.id]?.joinedAt ?? 0) - (info[a.id]?.joinedAt ?? 0))
    .slice(0, ROW_MAX),
  liveStock: rankShops(shops.filter((s) => s.liveStock), 'distance').slice(0, ROW_MAX),
});

/** The paid Featured row: sponsored shops that are open, in the order the placements were bought. Always shown as ads. */
export const featuredShops = (shops: ShopListing[], sponsoredIds: string[]): ShopListing[] =>
  sponsoredIds.map((id) => shops.find((s) => s.id === id)).filter((s): s is ShopListing => !!s && s.isOpen);
