import { MART_SHOPS, PART_TYPE_FACTOR, partListPrice, type PartType, type PartsShop } from '@ongarage/shared';

// Stand-ins for the parts shops around the garage until they have their own app.
export type ShopSeed = PartsShop & {
  /** Part types the shop sells. */
  stocks: Exclude<PartType, 'GarageChoice'>[];
  /** Genuine is only in stock for these service categories. */
  genuineCategories?: string[];
  delivery: 'courier' | 'shop';
  /** Price level against the catalogue (1 = list price). */
  priceLevel: number;
  /** Confirms the order, then turns out not to have it (exercises the fallback). */
  unreliable?: boolean;
  /** Seconds after a request before this shop quotes. */
  replyAfterSec: number;
};

/**
 * What differs per garage: how far each shop is from this garage and how it behaves in the
 * simulation. Who the shops are (name, rating, phone, address, part types) comes from the
 * shared OnMart directory, so the owner, garage and parts apps agree.
 */
const AROUND_GARAGE: Record<string, Pick<ShopSeed, 'distanceKm' | 'delivery' | 'priceLevel' | 'replyAfterSec' | 'genuineCategories' | 'unreliable'>> = {
  ps1: { distanceKm: 1.8, genuineCategories: ['1', '2', '5', '7'], delivery: 'courier', priceLevel: 1.04, replyAfterSec: 4 },
  ps2: { distanceKm: 3.2, delivery: 'shop', priceLevel: 0.97, replyAfterSec: 7 },
  ps3: { distanceKm: 2.5, delivery: 'courier', priceLevel: 0.93, replyAfterSec: 10 },
  ps4: { distanceKm: 6.5, genuineCategories: ['1', '4', '7'], delivery: 'courier', priceLevel: 1.0, replyAfterSec: 13 },
  ps5: { distanceKm: 9.0, delivery: 'shop', priceLevel: 0.84, unreliable: true, replyAfterSec: 16 },
};

export const PARTS_SHOPS: ShopSeed[] = Object.entries(AROUND_GARAGE).map(([id, around]) => {
  const s = MART_SHOPS.find((x) => x.id === id)!;
  return { id, name: s.name, rating: s.rating, ratingCount: s.ratingCount, phone: s.phone, address: s.address, stocks: s.types, ...around };
});

/** What a garage usually orders for each service category (shown as quick picks). */
export const PART_SUGGESTIONS: Record<string, string[]> = {
  '1': ['Engine mount', 'Timing belt', 'Clutch plate', 'Engine oil 4L', 'Oil filter'],
  '2': ['Alternator', 'Starter motor', 'Fuse set', 'Wiring connector'],
  '4': ['AC gas', 'AC compressor', 'Cabin filter'],
  '5': ['O2 sensor', 'MAF sensor', 'Spark plugs (set)'],
  '7': ['Brake pads (front)', 'Brake pads (rear)', 'Brake disc', 'Brake fluid'],
  '10': ['Air filter (performance)', 'Spark plugs (set)'],
  '11': ['Battery 12V 45Ah', 'Battery terminals'],
};
export const DEFAULT_SUGGESTIONS = ['Engine oil 4L', 'Oil filter', 'Air filter'];

/** Prices come from the shared market reference. */
export const TYPE_FACTOR = PART_TYPE_FACTOR;
export const listPrice = partListPrice;

export const PART_TYPE_LABEL: Record<PartType, string> = {
  Genuine: 'Genuine',
  OEM: 'OEM',
  Recon: 'Recon',
  GarageChoice: 'ගරාජයේ තේරීම',
};

export const COURIER = 'PickMe Flash';
