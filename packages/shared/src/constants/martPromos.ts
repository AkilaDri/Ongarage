import type { LatLng, MartBanner, MartOffer, PartGroup, PartType, ShopDeal, ShopListing } from '../types';
import { dealPrice, dealSaving, isLive } from '../marketplace/deals';
import { MART_SHOPS, MART_STOCK, shopsNear, type ShopStockLine } from './martShops';

// What OnMart's landing page shows (a backend would serve the ads, offers and deals): sponsored placements, offer tiles,
// shop deals, the round part strip and each shop's join date and delivery terms. Shops are shared by id with the
// directory (ps1 = Galle Auto Parts).

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** When each shop joined OnMart (for "newly joined") and its delivery terms, relative to `now`. */
export const martShopInfo = (now: number = Date.now()): Record<string, { joinedAt: number; freeDeliveryOver?: number; tagline?: string }> => ({
  ps1: { joinedAt: now - 520 * DAY, freeDeliveryOver: 10000, tagline: 'පැය භාගයකින් ගෙනැත් දෙයි' },
  ps2: { joinedAt: now - 410 * DAY },
  ps3: { joinedAt: now - 300 * DAY, tagline: 'Recon කොටස් විශේෂඥයෝ' },
  ps4: { joinedAt: now - 700 * DAY, freeDeliveryOver: 15000, tagline: 'සැබෑ Genuine කොටස් පමණි' },
  ps5: { joinedAt: now - 150 * DAY },
  ps6: { joinedAt: now - 40 * DAY, tagline: 'අලුතින් එක් වූ' },
  ps7: { joinedAt: now - 260 * DAY, freeDeliveryOver: 12000 },
  ps8: { joinedAt: now - 900 * DAY, freeDeliveryOver: 8000, tagline: 'ලංකාව පුරා ඉක්මන් බෙදාහැරීම' },
  ps9: { joinedAt: now - 20 * DAY, tagline: 'අලුතින් එක් වූ' },
  ps10: { joinedAt: now - 200 * DAY },
});

/** Shops that bought a Featured placement. Only the banners and the Featured row; never the organic rows or the ranking. */
export const SPONSORED_SHOP_IDS = ['ps4', 'ps8', 'ps1'];

const stops = (a: string, b: string) => [
  { offset: '0', color: a },
  { offset: '1', color: b },
];

export const martBanners = (now: number = Date.now()): MartBanner[] => [
  { id: 'mb1', shopId: 'ps4', title: 'Genuine කොටස් · වගකීම මාස 12', subtitle: 'Lanka Genuine Parts · සැබෑ ටොයෝටා, හොන්ඩා කොටස්', cta: 'බලන්න', emoji: '🏅', stops: stops('#162b63', '#2a4690'), target: { kind: 'shop', shopId: 'ps4' }, endsAt: now + 12 * DAY },
  { id: 'mb2', shopId: 'ps1', title: 'බ්‍රේක් සතිය', subtitle: 'Galle Auto Parts · පෑඩ්, ඩිස්ක්, ද්‍රවය · −15% දක්වා', cta: 'දීමනා බලන්න', emoji: '🛑', stops: stops('#dc2626', '#f97316'), target: { kind: 'deals' }, endsAt: now + 5 * DAY },
  { id: 'mb3', shopId: 'ps8', title: 'ලංකාව පුරා ඉක්මන් බෙදාහැරීම', subtitle: 'Colombo Genuine Hub · රු. 8,000 ඉක්මවූ ඇණවුම් නොමිලේ', cta: 'බලන්න', emoji: '🚚', stops: stops('#0ea5e9', '#22d3ee'), target: { kind: 'shop', shopId: 'ps8' }, endsAt: now + 9 * DAY },
];

export const martOffers = (now: number = Date.now()): MartOffer[] => [
  { id: 'mo1', title: 'දුර්ලභ කොටසක්ද?', subtitle: 'ලංකාවේ සියලු වෙළඳසැල්වලට පෙන්වන්න', emoji: '📣', stops: stops('#8b5cf6', '#d946ef'), target: { kind: 'wall' } },
  { id: 'mo2', title: 'සාමාන්‍ය සේවා කට්ටලය', subtitle: 'ඔයිල්, ෆිල්ටර් — එකවර ඉල්ලන්න', emoji: '🛢️', stops: stops('#0ea5e9', '#22d3ee'), target: { kind: 'kit', kitId: 'minor' } },
  { id: 'mo3', title: 'බ්‍රේක් කට්ටලය', subtitle: 'පෑඩ්, ඩිස්ක්, ද්‍රවය', emoji: '🛑', stops: stops('#f97316', '#f59e0b'), target: { kind: 'kit', kitId: 'brake' } },
  { id: 'mo4', title: 'බැටරි දීමනා', subtitle: 'ළඟම වෙළඳසැල්වල මිල බලන්න', emoji: '🔋', stops: stops('#10b981', '#84cc16'), target: { kind: 'search', query: 'battery' } },
  { id: 'mo5', title: 'සියලු දීමනා', subtitle: 'ඔබට ළඟම වට්ටම් සහිත කොටස්', emoji: '🏷️', stops: stops('#ef4444', '#f43f5e'), target: { kind: 'deals' }, endsAt: now + 6 * DAY },
];

/** The round strip: each opens a search for the part most people mean by it. */
export const PART_GROUPS: PartGroup[] = [
  { id: 'brakes', name: 'බ්‍රේක්', emoji: '🛑', serviceCategoryId: '7', query: 'brake pad' },
  { id: 'battery', name: 'බැටරි', emoji: '🔋', serviceCategoryId: '11', query: 'battery' },
  { id: 'oil', name: 'ඔයිල් / ෆිල්ටර්', emoji: '🛢️', serviceCategoryId: '1', query: 'engine oil' },
  { id: 'electrical', name: 'විදුලි', emoji: '⚡', serviceCategoryId: '2', query: 'alternator' },
  { id: 'ac', name: 'A/C', emoji: '❄️', serviceCategoryId: '4', query: 'ac gas' },
  { id: 'engine', name: 'එන්ජින්', emoji: '🔧', serviceCategoryId: '1', query: 'timing belt' },
  { id: 'suspension', name: 'සස්පෙන්ෂන්', emoji: '🚙', serviceCategoryId: '7', query: 'shock absorber' },
  { id: 'lights', name: 'ලයිට්', emoji: '💡', serviceCategoryId: '2', query: 'headlight' },
];

/** Limited-time discounts shops put on parts they have in stock (relative to `now`). */
export const martDeals = (now: number = Date.now()): ShopDeal[] => [
  { id: 'md1', shopId: 'ps1', partName: 'Brake pads (front)', partType: 'OEM', discountPercent: 15, endsAt: now + 5 * DAY },
  { id: 'md2', shopId: 'ps1', partName: 'Engine oil 4L', partType: 'OEM', discountPercent: 10, endsAt: now + 2 * DAY },
  { id: 'md3', shopId: 'ps3', partName: 'Alternator', partType: 'Recon', discountPercent: 20, endsAt: now + 3 * DAY },
  { id: 'md4', shopId: 'ps4', partName: 'Brake fluid', partType: 'Genuine', discountPercent: 12, endsAt: now + 6 * HOUR },
  { id: 'md5', shopId: 'ps6', partName: 'Battery 12V 45Ah', partType: 'OEM', discountPercent: 10, endsAt: now + 4 * DAY },
  { id: 'md6', shopId: 'ps7', partName: 'Brake pads (front)', partType: 'OEM', discountPercent: 8, endsAt: now + 7 * DAY },
  { id: 'md7', shopId: 'ps3', partName: 'Radiator', partType: 'Recon', discountPercent: 18, endsAt: now + 36 * HOUR },
  { id: 'md8', shopId: 'ps4', partName: 'Timing belt', partType: 'Genuine', discountPercent: 8, endsAt: now + 10 * DAY },
];

/** A live deal as the landing page shows it: the shop, the stock line, the price before and after. */
export type DealView = { deal: ShopDeal; shop: ShopListing; line: ShopStockLine; was: number; now: number; saving: number; left: number; endsAt: number };

/** Deals that are still running on a part the shop still has, best discount first (nearer shop on a tie). */
export const liveDeals = (now: number, coords: LatLng, deals: ShopDeal[] = martDeals(now), shops: ShopListing[] = shopsNear(coords, MART_SHOPS)): DealView[] =>
  deals
    .filter((d) => isLive(d.endsAt, now))
    .flatMap((d): DealView[] => {
      const shop = shops.find((s) => s.id === d.shopId);
      const line = (MART_STOCK[d.shopId] ?? []).find((l) => l.name === d.partName && l.partType === d.partType && l.qty > 0);
      if (!shop || !line) return [];
      return [{ deal: d, shop, line, was: line.price, now: dealPrice(line.price, d.discountPercent), saving: dealSaving(line.price, d.discountPercent), left: line.qty, endsAt: d.endsAt }];
    })
    .sort((a, b) => b.deal.discountPercent - a.deal.discountPercent || a.shop.distanceKm - b.shop.distanceKm);

/** The running deal on a part at a shop, if any (so an offer can carry the deal price). */
export const dealFor = (shopId: string, partName: string, partType: PartType, now: number = Date.now()): ShopDeal | undefined =>
  martDeals(now).find((d) => d.shopId === shopId && d.partName === partName && (partType === 'GarageChoice' || d.partType === partType) && isLive(d.endsAt, now));
