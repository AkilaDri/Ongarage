import type { PartType, ShopListing } from '../types';
import { availabilityAt } from './martShops';

// Service kits: the parts a common service needs, so an owner can see at a glance which shops have the whole
// kit and what it costs, then ask for every part at once.

export type ServiceKit = { id: string; name: string; icon: string; note: string; lines: { name: string; qty: number }[] };

export const SERVICE_KITS: ServiceKit[] = [
  { id: 'minor', name: 'සාමාන්‍ය සේවාව', icon: '🛢️', note: 'ඔයිල් මාරු කිරීම සමඟ', lines: [{ name: 'Engine oil 4L', qty: 1 }, { name: 'Oil filter', qty: 1 }, { name: 'Cabin filter', qty: 1 }] },
  { id: 'brake', name: 'බ්‍රේක් සේවාව', icon: '🛑', note: 'ඉදිරිපස පෑඩ්, ඩිස්ක් දෙකම, ද්‍රවය', lines: [{ name: 'Brake pads (front)', qty: 1 }, { name: 'Brake disc', qty: 2 }, { name: 'Brake fluid', qty: 1 }] },
  { id: 'tuneup', name: 'Tune-up', icon: '⚙️', note: 'ප්ලග්, ඔයිල්, ෆිල්ටරය', lines: [{ name: 'Spark plugs (set)', qty: 1 }, { name: 'Oil filter', qty: 1 }, { name: 'Engine oil 4L', qty: 1 }] },
];

export type KitOffer = {
  shop: ShopListing;
  /** What the lines this shop has in stock cost (the cheapest suitable type of each). */
  total: number;
  have: number;
  need: number;
  missing: string[];
  complete: boolean;
};

/** Shops ranked for a kit: those with every part first (cheapest total first), then those missing the fewest. */
export const kitOffers = (kit: ServiceKit, shops: ShopListing[], partType: PartType = 'GarageChoice'): KitOffer[] =>
  shops
    .map((shop) => {
      let total = 0;
      let have = 0;
      const missing: string[] = [];
      for (const l of kit.lines) {
        const a = availabilityAt(shop.id, l.name, partType, l.qty);
        if (a) {
          total += a.price * l.qty;
          have += 1;
        } else missing.push(l.name);
      }
      return { shop, total, have, need: kit.lines.length, missing, complete: missing.length === 0 };
    })
    .sort((a, b) => Number(b.complete) - Number(a.complete) || b.have - a.have || a.total - b.total || a.shop.distanceKm - b.shop.distanceKm);
