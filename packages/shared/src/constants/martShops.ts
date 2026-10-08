import type { LatLng, PartType, ShopListing, ShopStats } from '../types';
import { partMarketPrice } from '../marketplace/partPrices';
import { PART_CATEGORY } from '../marketplace/partsMart';
import { distanceKm } from '../utils/geo';

// The OnMart shop directory every app agrees on (a backend will serve it). Shops are shared by
// id and name: ps1 is the parts app's own shop ("Galle Auto Parts"); ps1–ps5 are the shops the
// garage app already simulates. Distances depend on who is looking, so a listing's distanceKm is
// only a default (from the middle of Galle): use shopsNear(coords) for a real viewer.

type Kind = Exclude<PartType, 'GarageChoice'>;

const stats = (avgResponseMin: number, fulfilmentRate: number, stockAccuracy: number, wrongPartRate: number, cancelRate: number, ordersDone: number, priceLevel: number): ShopStats => ({
  avgResponseMin,
  fulfilmentRate,
  stockAccuracy,
  wrongPartRate,
  cancelRate,
  ordersDone,
  priceLevel,
});

const GALLE: LatLng = { latitude: 6.0329, longitude: 80.2168 };

type ShopInput = Omit<ShopListing, 'distanceKm'>;

const shops: ShopInput[] = [
  {
    id: 'ps1', name: 'Galle Auto Parts', rating: 4.7, ratingCount: 212, phone: '091 223 4501', address: 'පැරණි මාතර පාර, ගාල්ල', coords: { latitude: 6.0335, longitude: 80.2168 }, district: 'ගාල්ල',
    openHours: 'පෙ.ව. 8:00 – ප.ව. 7:00', isOpen: true, types: ['Genuine', 'OEM'], categories: ['1', '2', '4', '5', '7', '11'], liveStock: true, courier: true, ownDelivery: true, counterPickup: true,
    stats: stats(8, 0.96, 0.94, 0.02, 0.02, 212, 1.04), referralPercent: 3,
  },
  {
    id: 'ps2', name: 'Southern Spares', rating: 4.4, ratingCount: 138, phone: '091 223 4502', address: 'කරාපිටිය', coords: { latitude: 6.0602, longitude: 80.2321 }, district: 'ගාල්ල',
    openHours: 'පෙ.ව. 8:30 – ප.ව. 6:30', isOpen: true, types: ['OEM', 'Recon'], categories: ['1', '2', '5', '7'], liveStock: false, courier: false, ownDelivery: true, counterPickup: true,
    stats: stats(18, 0.93, 0.9, 0.04, 0.03, 138, 0.97), referralPercent: 2,
  },
  {
    id: 'ps3', name: 'Karapitiya Recon Centre', rating: 4.2, ratingCount: 96, phone: '091 223 4503', address: 'කරාපිටිය පාර', coords: { latitude: 6.0549, longitude: 80.2263 }, district: 'ගාල්ල',
    openHours: 'පෙ.ව. 9:00 – ප.ව. 6:00', isOpen: true, types: ['Recon', 'OEM'], categories: ['1', '2', '5', '7', '11'], liveStock: true, courier: true, ownDelivery: false, counterPickup: true,
    stats: stats(25, 0.9, 0.88, 0.06, 0.04, 96, 0.93), referralPercent: 3,
  },
  {
    id: 'ps4', name: 'Lanka Genuine Parts', rating: 4.8, ratingCount: 301, phone: '091 223 4504', address: 'මාතර පාර, ගාල්ල', coords: { latitude: 5.988, longitude: 80.258 }, district: 'ගාල්ල',
    openHours: 'පෙ.ව. 8:00 – ප.ව. 6:00', isOpen: true, types: ['Genuine'], categories: ['1', '4', '7'], liveStock: true, courier: true, ownDelivery: false, counterPickup: true,
    stats: stats(6, 0.98, 0.97, 0.01, 0.01, 301, 1.0), referralPercent: 4,
  },
  {
    id: 'ps5', name: 'Hikkaduwa Motor Stores', rating: 4.0, ratingCount: 54, phone: '091 223 4505', address: 'හික්කඩුව', coords: { latitude: 6.1395, longitude: 80.1034 }, district: 'හික්කඩුව',
    openHours: 'පෙ.ව. 9:00 – ප.ව. 5:30', isOpen: false, types: ['OEM', 'Recon'], categories: ['1', '2', '5'], liveStock: false, courier: false, ownDelivery: true, counterPickup: true,
    stats: stats(40, 0.85, 0.78, 0.08, 0.08, 54, 0.84),
  },
  {
    id: 'ps6', name: 'Unawatuna Auto Spares', rating: 4.3, ratingCount: 72, phone: '091 223 4506', address: 'උනවටුන', coords: { latitude: 6.0128, longitude: 80.2489 }, district: 'ගාල්ල',
    openHours: 'පෙ.ව. 8:30 – ප.ව. 6:00', isOpen: true, types: ['OEM'], categories: ['1', '5', '7', '11'], liveStock: false, courier: false, ownDelivery: false, counterPickup: true,
    stats: stats(14, 0.94, 0.9, 0.03, 0.03, 72, 0.95),
  },
  {
    id: 'ps7', name: 'Matara Motor Mart', rating: 4.6, ratingCount: 180, phone: '041 222 7701', address: 'නගර මධ්‍යය, මාතර', coords: { latitude: 5.9485, longitude: 80.5353 }, district: 'මාතර',
    openHours: 'පෙ.ව. 8:00 – ප.ව. 7:00', isOpen: true, types: ['Genuine', 'OEM'], categories: ['1', '2', '4', '5', '7', '11'], liveStock: true, courier: true, ownDelivery: true, counterPickup: true,
    stats: stats(12, 0.95, 0.93, 0.02, 0.02, 180, 1.02), referralPercent: 3,
  },
  {
    id: 'ps8', name: 'Colombo Genuine Hub', rating: 4.9, ratingCount: 640, phone: '011 258 0099', address: 'පිටකොටුව, කොළඹ 11', coords: { latitude: 6.9271, longitude: 79.8612 }, district: 'කොළඹ',
    openHours: 'පෙ.ව. 8:00 – ප.ව. 8:00', isOpen: true, types: ['Genuine', 'OEM'], categories: ['1', '2', '3', '4', '5', '7', '10', '11'], liveStock: true, courier: true, ownDelivery: true, counterPickup: true,
    stats: stats(5, 0.98, 0.97, 0.01, 0.01, 640, 1.1), referralPercent: 4,
  },
  {
    id: 'ps9', name: 'Kandy Parts Centre', rating: 4.5, ratingCount: 260, phone: '081 222 4410', address: 'පේරාදෙණිය පාර, මහනුවර', coords: { latitude: 7.2906, longitude: 80.6337 }, district: 'මහනුවර',
    openHours: 'පෙ.ව. 8:30 – ප.ව. 6:30', isOpen: true, types: ['Genuine', 'OEM', 'Recon'], categories: ['1', '2', '4', '5', '7', '11'], liveStock: false, courier: true, ownDelivery: false, counterPickup: true,
    stats: stats(22, 0.94, 0.92, 0.03, 0.03, 260, 0.98),
  },
  {
    id: 'ps10', name: 'Kurunegala Recon Yard', rating: 4.1, ratingCount: 88, phone: '037 222 3318', address: 'කුලියාපිටිය පාර, කුරුණෑගල', coords: { latitude: 7.4863, longitude: 80.3623 }, district: 'කුරුණෑගල',
    openHours: 'පෙ.ව. 9:00 – ප.ව. 5:00', isOpen: true, types: ['Recon'], categories: ['1', '2', '5', '7'], liveStock: false, courier: true, ownDelivery: false, counterPickup: true,
    stats: stats(35, 0.88, 0.85, 0.05, 0.05, 88, 0.8),
  },
];

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Every shop, with distances from the middle of Galle. */
export const MART_SHOPS: ShopListing[] = shops.map((s) => ({ ...s, distanceKm: round1(distanceKm(GALLE, s.coords)) }));

/** The shops as seen from `coords` (nearest first). */
export const shopsNear = (coords: LatLng, list: ShopListing[] = MART_SHOPS): ShopListing[] =>
  list.map((s) => ({ ...s, distanceKm: round1(distanceKm(coords, s.coords)) })).sort((a, b) => a.distanceKm - b.distanceKm);

export const martShop = (id: string) => MART_SHOPS.find((s) => s.id === id);

// ---------- Published stock ----------
// What each shop shows buyers as in stock. A shop with liveStock keeps this current from its
// own app; the rest answer "do you have it?" when asked.

export type ShopStockLine = { name: string; partType: Kind; price: number; qty: number; brand?: string };

const round50 = (n: number) => Math.round(n / 50) * 50;

/** Lines priced from the market reference at the shop's own price level: [name, type, qty, brand?]. */
const priced = (shopId: string, entries: [string, Kind, number, string?][]): ShopStockLine[] => {
  const level = shops.find((s) => s.id === shopId)!.stats.priceLevel;
  return entries.map(([name, partType, qty, brand]) => ({ name, partType, qty, brand, price: round50(partMarketPrice(name, partType) * level) }));
};

const line = (name: string, partType: Kind, price: number, qty: number, brand?: string): ShopStockLine => ({ name, partType, price, qty, brand });

export const MART_STOCK: Record<string, ShopStockLine[]> = {
  // The same lines and prices as the parts app's own stock (apps/parts constants/mockData.ts).
  ps1: [
    line('Brake pads (front)', 'Genuine', 9800, 4, 'Toyota'), line('Brake pads (front)', 'OEM', 6900, 10, 'Bendix'),
    line('Brake pads (rear)', 'Genuine', 8400, 2, 'Toyota'), line('Brake pads (rear)', 'OEM', 5900, 6, 'Bendix'),
    line('Brake disc', 'OEM', 9200, 4, 'Brembo'),
    line('Brake fluid', 'Genuine', 1950, 12, 'Toyota'), line('Brake fluid', 'OEM', 1300, 20, 'Bosch'),
    line('Battery 12V 45Ah', 'Genuine', 28500, 0, 'Panasonic'), line('Battery 12V 45Ah', 'OEM', 19800, 5, 'Exide'),
    line('Timing belt', 'Genuine', 10200, 2, 'Toyota'), line('Timing belt', 'OEM', 7100, 3, 'Gates'),
    line('Engine oil 4L', 'Genuine', 8400, 15, 'Toyota'), line('Engine oil 4L', 'OEM', 6200, 24, 'Mobil'),
    line('Oil filter', 'Genuine', 1700, 18, 'Toyota'), line('Oil filter', 'OEM', 1150, 30, 'Sakura'),
    line('O2 sensor', 'Genuine', 17200, 1, 'Denso'), line('O2 sensor', 'OEM', 11800, 2, 'NTK'),
    line('Alternator', 'Genuine', 39500, 1, 'Denso'), line('Alternator', 'OEM', 27800, 2, 'Bosch'),
    line('Spark plugs (set)', 'Genuine', 7900, 6, 'Denso'), line('Spark plugs (set)', 'OEM', 5400, 9, 'NGK'),
    line('Cabin filter', 'OEM', 1750, 1, 'Sakura'),
  ],
  ps2: priced('ps2', [
    ['Brake pads (front)', 'OEM', 8], ['Brake pads (rear)', 'OEM', 5], ['Brake disc', 'OEM', 3], ['Brake disc', 'Recon', 2], ['Alternator', 'Recon', 2], ['Starter motor', 'Recon', 1],
    ['Timing belt', 'OEM', 4], ['Oil filter', 'OEM', 25], ['Spark plugs (set)', 'OEM', 7], ['Radiator', 'Recon', 1],
  ]),
  ps3: priced('ps3', [
    ['Brake disc', 'Recon', 2], ['Brake disc', 'OEM', 3], ['Brake pads (front)', 'Recon', 3], ['Alternator', 'Recon', 3], ['Starter motor', 'Recon', 2], ['Battery 12V 45Ah', 'Recon', 4],
    ['Radiator', 'Recon', 2], ['Headlight', 'Recon', 3], ['Shock absorbers (pair)', 'Recon', 2], ['Wheel bearing', 'Recon', 4],
  ]),
  ps4: priced('ps4', [
    ['Brake pads (front)', 'Genuine', 6], ['Brake disc', 'Genuine', 2], ['Brake fluid', 'Genuine', 14], ['Timing belt', 'Genuine', 3], ['Engine oil 4L', 'Genuine', 20],
    ['Oil filter', 'Genuine', 25], ['AC compressor', 'Genuine', 1], ['AC gas', 'Genuine', 9], ['Cabin filter', 'Genuine', 6],
  ]),
  ps5: priced('ps5', [
    ['Brake pads (front)', 'OEM', 4], ['Alternator', 'Recon', 1], ['Spark plugs (set)', 'OEM', 5], ['Fan belt', 'OEM', 6], ['Timing belt', 'OEM', 0],
  ]),
  ps6: priced('ps6', [
    ['Brake pads (front)', 'OEM', 6], ['Brake pads (rear)', 'OEM', 3], ['Battery 12V 45Ah', 'OEM', 4], ['Engine oil 4L', 'OEM', 18], ['Oil filter', 'OEM', 20], ['Wiper blades', 'OEM', 10],
  ]),
  ps7: priced('ps7', [
    ['Brake pads (front)', 'Genuine', 5], ['Brake pads (front)', 'OEM', 9], ['Brake disc', 'OEM', 4], ['Alternator', 'OEM', 2], ['Battery 12V 45Ah', 'OEM', 6], ['Timing belt', 'Genuine', 2],
    ['AC compressor', 'OEM', 2], ['O2 sensor', 'OEM', 3], ['Headlight', 'OEM', 2],
  ]),
  ps8: priced('ps8', [
    ['Brake pads (front)', 'Genuine', 20], ['Brake disc', 'Genuine', 10], ['Alternator', 'Genuine', 6], ['Starter motor', 'Genuine', 4], ['AC compressor', 'Genuine', 5], ['O2 sensor', 'Genuine', 8],
    ['MAF sensor', 'Genuine', 4], ['Timing belt', 'Genuine', 12], ['Fuel pump', 'Genuine', 5], ['Headlight', 'Genuine', 6], ['Radiator', 'OEM', 5], ['Wheel bearing', 'Genuine', 10],
  ]),
  ps9: priced('ps9', [
    ['Brake pads (front)', 'OEM', 10], ['Brake disc', 'Recon', 4], ['Alternator', 'OEM', 3], ['Battery 12V 45Ah', 'Genuine', 3], ['Shock absorbers (pair)', 'OEM', 4], ['Radiator', 'Recon', 2],
  ]),
  ps10: priced('ps10', [
    ['Alternator', 'Recon', 5], ['Starter motor', 'Recon', 4], ['Brake disc', 'Recon', 6], ['Radiator', 'Recon', 3], ['Headlight', 'Recon', 5], ['Fuel pump', 'Recon', 2],
  ]),
};

/**
 * The cheapest in-stock line a shop shows for a part (any type when GarageChoice), or undefined
 * when it shows none in stock. `lowStock` is true for the last couple of units.
 */
export const availabilityAt = (shopId: string, name: string, partType: PartType = 'GarageChoice', minQty = 1) => {
  const found = (MART_STOCK[shopId] ?? [])
    .filter((l) => l.name === name && l.qty > 0 && l.qty >= minQty && (partType === 'GarageChoice' || l.partType === partType))
    .sort((a, b) => a.price - b.price)[0];
  return found ? { ...found, lowStock: found.qty <= 2 } : undefined;
};

/** The shop's price for a part (cheapest suitable line), for ranking by price. */
export const shopPriceFor = (shopId: string, name: string, partType: PartType = 'GarageChoice') => availabilityAt(shopId, name, partType)?.price;

/**
 * Shops a garage could point an owner to for a part: those that sell this kind of part (and category) within 50 km,
 * nearest first, with the ones that show it in stock ahead of the rest.
 */
export const suggestShops = (name: string, partType: PartType, coords: LatLng = GALLE, max = 2): string[] => {
  const cat = PART_CATEGORY[name];
  const near = shopsNear(coords).filter((s) => s.distanceKm <= 50 && (partType === 'GarageChoice' || s.types.includes(partType)) && (!cat || s.categories.includes(cat)));
  const have = near.filter((s) => !!availabilityAt(s.id, name, partType));
  return [...have, ...near.filter((s) => !have.includes(s))].slice(0, max).map((s) => s.id);
};

// ---------- Trade agreements ----------
// A shop can agree a discount with a garage it deals with regularly. The garage sees the agreed price in the quotes
// that shop sends it (and in OnMart), and the shop's quote form starts from the discounted price.

export type TradeAgreement = { garageId: string; shopId: string; discountPercent: number; note?: string };

export const TRADE_AGREEMENTS: TradeAgreement[] = [
  { garageId: 'g-topcode', shopId: 'ps1', discountPercent: 5, note: 'නිතිපතා ගනුදෙනුකරු' },
  { garageId: 'g-topcode', shopId: 'ps4', discountPercent: 3 },
];

/** The percentage a shop takes off for a garage (0 when there is no agreement). */
export const tradeDiscount = (garageId: string | undefined, shopId: string) => (garageId ? TRADE_AGREEMENTS.find((a) => a.garageId === garageId && a.shopId === shopId)?.discountPercent ?? 0 : 0);
