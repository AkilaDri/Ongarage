import { PART_TYPE_FACTOR, partListPrice, type PartType, type PartsShop } from '@ongarage/shared';

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

export const PARTS_SHOPS: ShopSeed[] = [
  {
    id: 'ps1', name: 'Galle Auto Parts', rating: 4.7, ratingCount: 212, distanceKm: 1.8, phone: '0912234501', address: 'ගාල්ල නගරය',
    stocks: ['Genuine', 'OEM'], genuineCategories: ['1', '2', '5', '7'], delivery: 'courier', priceLevel: 1.04, replyAfterSec: 4,
  },
  {
    id: 'ps2', name: 'Southern Spares', rating: 4.4, ratingCount: 138, distanceKm: 3.2, phone: '0912234502', address: 'කරාපිටිය',
    stocks: ['OEM', 'Recon'], delivery: 'shop', priceLevel: 0.97, replyAfterSec: 7,
  },
  {
    id: 'ps3', name: 'Karapitiya Recon Centre', rating: 4.2, ratingCount: 96, distanceKm: 2.5, phone: '0912234503', address: 'කරාපිටිය පාර',
    stocks: ['Recon', 'OEM'], delivery: 'courier', priceLevel: 0.93, replyAfterSec: 10,
  },
  {
    id: 'ps4', name: 'Lanka Genuine Parts', rating: 4.8, ratingCount: 301, distanceKm: 6.5, phone: '0912234504', address: 'මාතර පාර',
    stocks: ['Genuine'], genuineCategories: ['1', '4', '7'], delivery: 'courier', priceLevel: 1.0, replyAfterSec: 13,
  },
  {
    id: 'ps5', name: 'Hikkaduwa Motor Stores', rating: 4.0, ratingCount: 54, distanceKm: 9.0, phone: '0912234505', address: 'හික්කඩුව',
    stocks: ['OEM', 'Recon'], delivery: 'shop', priceLevel: 0.84, unreliable: true, replyAfterSec: 16,
  },
];

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
