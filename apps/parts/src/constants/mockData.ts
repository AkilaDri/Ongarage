import { advanceReferral, closeReferral, MART_SHOPS, newReferral, PART_TYPE_FACTOR, partMarketPrice, type LatLng, type MartAudience, type PartLine, type PartReferral, type PartType, type PartVehicle } from '@ongarage/shared';
import type { QuoteType, ShopProfile, ShopReview, StockItem } from '../types';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// The shop's identity comes from the shared OnMart directory (ps1), so every app agrees on it.
const ps1 = MART_SHOPS.find((s) => s.id === 'ps1')!;
export const SHOP: ShopProfile = {
  id: ps1.id,
  name: ps1.name,
  rating: ps1.rating,
  ratingCount: ps1.ratingCount,
  distanceKm: 0,
  phone: ps1.phone,
  address: ps1.address,
  coords: ps1.coords,
  openHours: ps1.openHours,
  deliveryRadiusKm: 10,
  types: ['Genuine', 'OEM'],
  categories: ['1', '2', '4', '5', '7', '11'],
  courierEnabled: true,
  ownDelivery: true,
  referralPercent: ps1.referralPercent ?? 3,
  liveStock: ps1.liveStock,
  staff: [
    { id: 's1', name: 'රුවන් ද සිල්වා', phone: '0771230011' },
    { id: 's2', name: 'ඉසුරු මධුෂාන්', phone: '0771230012' },
  ],
};

// Garages around the shop that send parts requests (TOPCODE is the garage app's own garage).
export type GarageSeed = { id: string; name: string; phone: string; address: string; coords: LatLng; rating: number };
export const GARAGES: GarageSeed[] = [
  { id: 'g-topcode', name: 'TOPCODE Tuning & Service', phone: '077 123 4567', address: 'කොටුවේගොඩ පාර, ගාල්ල', coords: { latitude: 6.0412, longitude: 80.2129 }, rating: 4.9 },
  { id: 'g2', name: 'Southern Auto Care', phone: '077 555 1201', address: 'කරාපිටිය, ගාල්ල', coords: { latitude: 6.0602, longitude: 80.2321 }, rating: 4.5 },
  { id: 'g3', name: 'Matara Road Motors', phone: '077 555 1202', address: 'මාතර පාර, දඩැල්ල', coords: { latitude: 6.0221, longitude: 80.2398 }, rating: 4.3 },
  { id: 'g4', name: 'Unawatuna Car Clinic', phone: '077 555 1203', address: 'උනවටුන', coords: { latitude: 6.0128, longitude: 80.2489 }, rating: 4.6 },
];

const line = (id: string, name: string, qty = 1): PartLine => ({ id, name, qty });

export type RequestSeed = {
  garage: number;
  categoryId: string;
  vehicle: { name: string; plate: string; type: string; chassis?: string };
  partType: PartType;
  reconApproval?: 'approved';
  lines: PartLine[];
  note?: string;
  oldPartPhoto?: boolean;
  /** Minutes since the garage sent it. */
  ageMin: number;
  windowMin: number;
  needInHours: number;
  otherQuotes: number;
  /** Rival best total as a share of this shop's stock price (above 1: easy to win). */
  rivalFactor: number;
  simProblem?: string;
  /** The garage collects from the counter (who comes), if this shop's quote offers pickup. */
  simPickup?: string;
};

export const REQUEST_POOL: RequestSeed[] = [
  {
    garage: 0, categoryId: '7', vehicle: { name: 'Corolla', plate: 'CAD-9087', type: 'Sedan', chassis: 'NZE141-6012345' }, partType: 'OEM',
    lines: [line('a1', 'Brake pads (front)'), line('a2', 'Brake fluid')], note: 'ඉදිරිපස පෑඩ් සෙට් එක.', oldPartPhoto: true,
    ageMin: 6, windowMin: 60, needInHours: 5, otherQuotes: 1, rivalFactor: 1.08, simPickup: 'කසුන් ජයසිංහ (TOPCODE)',
  },
  {
    garage: 1, categoryId: '11', vehicle: { name: 'Axio', plate: 'CAA-3398', type: 'Sedan' }, partType: 'Genuine',
    lines: [line('b1', 'Battery 12V 45Ah')], ageMin: 14, windowMin: 60, needInHours: 3, otherQuotes: 0, rivalFactor: 1.0,
  },
  {
    garage: 2, categoryId: '1', vehicle: { name: 'Vitz', plate: 'CAE-1122', type: 'Hatchback', chassis: 'KSP130-2034567' }, partType: 'GarageChoice',
    lines: [line('c1', 'Timing belt'), line('c2', 'Engine oil 4L'), line('c3', 'Oil filter')], ageMin: 3, windowMin: 120, needInHours: 20, otherQuotes: 2, rivalFactor: 1.04,
    simProblem: 'වැරදි කොටසක්',
  },
  {
    garage: 3, categoryId: '5', vehicle: { name: 'Fit GP5', plate: 'CAK-6610', type: 'Hatchback' }, partType: 'Genuine', reconApproval: 'approved',
    lines: [line('d1', 'O2 sensor')], note: 'Genuine නැත්නම් Recon — අයිතිකරු අනුමතයි.', ageMin: 20, windowMin: 60, needInHours: 6, otherQuotes: 3, rivalFactor: 0.9,
  },
];

/** Arrives a little later, so the inbox is visibly live. */
export const LATE_REQUEST: RequestSeed = {
  garage: 0, categoryId: '2', vehicle: { name: 'March K11', plate: 'WP-1029', type: 'Hatchback' }, partType: 'Genuine',
  lines: [line('e1', 'Alternator')], oldPartPhoto: true, ageMin: 0, windowMin: 30, needInHours: 4, otherQuotes: 0, rivalFactor: 1.06,
};

const v = (type: QuoteType, price: number, qty: number, brand?: string) => ({ type, price, qty, brand });

// The shop's stock: what it can quote immediately, at its own prices.
export const STOCK: StockItem[] = [
  { id: 'i1', name: 'Brake pads (front)', categoryId: '7', variants: [v('Genuine', 9800, 4, 'Toyota'), v('OEM', 6900, 10, 'Bendix')] },
  { id: 'i2', name: 'Brake pads (rear)', categoryId: '7', variants: [v('Genuine', 8400, 2, 'Toyota'), v('OEM', 5900, 6, 'Bendix')] },
  { id: 'i3', name: 'Brake fluid', categoryId: '7', variants: [v('Genuine', 1950, 12, 'Toyota'), v('OEM', 1300, 20, 'Bosch')] },
  { id: 'i4', name: 'Battery 12V 45Ah', categoryId: '11', variants: [v('Genuine', 28500, 0, 'Panasonic'), v('OEM', 19800, 5, 'Exide')] },
  { id: 'i5', name: 'Timing belt', categoryId: '1', variants: [v('Genuine', 10200, 2, 'Toyota'), v('OEM', 7100, 3, 'Gates')] },
  { id: 'i6', name: 'Engine oil 4L', categoryId: '1', variants: [v('Genuine', 8400, 15, 'Toyota'), v('OEM', 6200, 24, 'Mobil')] },
  { id: 'i7', name: 'Oil filter', categoryId: '1', variants: [v('Genuine', 1700, 18, 'Toyota'), v('OEM', 1150, 30, 'Sakura')] },
  { id: 'i8', name: 'O2 sensor', categoryId: '5', variants: [v('Genuine', 17200, 1, 'Denso'), v('OEM', 11800, 2, 'NTK')] },
  { id: 'i9', name: 'Alternator', categoryId: '2', variants: [v('Genuine', 39500, 1, 'Denso'), v('OEM', 27800, 2, 'Bosch')] },
  { id: 'i10', name: 'Spark plugs (set)', categoryId: '5', variants: [v('Genuine', 7900, 6, 'Denso'), v('OEM', 5400, 9, 'NGK')] },
  { id: 'i12', name: 'Brake disc', categoryId: '7', variants: [v('OEM', 9200, 4, 'Brembo')] },
  { id: 'i11', name: 'Cabin filter', categoryId: '4', variants: [v('OEM', 1750, 1, 'Sakura')] },
];

export const REVIEWS: ShopReview[] = [
  { id: 'sr1', garage: 'TOPCODE Tuning & Service', rating: 5, text: 'පැය භාගයකින් බ්‍රේක් පෑඩ් ගෙනත් දුන්නා. ජෙනුයින්ම තමයි.', at: Date.now() - 1 * DAY },
  { id: 'sr2', garage: 'Southern Auto Care', rating: 4, text: 'මිල හොඳයි, බෙදාහැරීම ටිකක් පරක්කු වුණා.', at: Date.now() - 4 * DAY },
  {
    id: 'sr3', garage: 'Matara Road Motors', rating: 3, text: 'එක පාරක් වැරදි filter එකක් ආවා, ඉක්මනට මාරු කරලා දුන්නා.', at: Date.now() - 9 * DAY,
    reply: { text: 'සමාවෙන්න, දැන් චැසි අංකයෙන් පරීක්ෂා කරලා තමයි යවන්නේ.', at: Date.now() - 8 * DAY },
  },
];

/** Totals of all ratings before the seeded reviews. */
export const RATING_HISTORY = { count: 209, sum: 209 * 4.72 };

/** Someone from the garage reaches the counter this long after the parts are ready (compressed). */
export const PICKUP_ARRIVE_MS = 8000;
/** Ready pickup orders are held at the counter this long. */
export const HOLD_MS = 3 * 60 * 60 * 1000;

/** A request reaches the shop this long after it is sent; a decision comes this long after quoting (compressed). */
export const LATE_REQUEST_MS = 45000;
export const DECISION_MS = 15000;
/** How long the shop has to confirm stock once chosen. */
export const CONFIRM_MIN = 10;
export const DELIVERY_MS = 12000;
export const GARAGE_CHECK_MS = 5000;

export const COURIER = 'PickMe Flash';

/** Market reference for items the shop doesn't stock (shared with the garage app). */
export const TYPE_FACTOR: Record<QuoteType, number> = PART_TYPE_FACTOR;
export const listPrice = (name: string, type: QuoteType) => partMarketPrice(name, type);

export const PART_TYPE_LABEL: Record<PartType, string> = { Genuine: 'Genuine', OEM: 'OEM', Recon: 'Recon', GarageChoice: 'ගරාජයේ තේරීම' };
export const ALL_TYPES: QuoteType[] = ['Genuine', 'OEM', 'Recon'];

// ---------- OnMart: customers ----------

export type CustomerSeed = {
  id: string;
  buyer: { name: string; phone?: string };
  vehicle: PartVehicle;
  briefs: { name: string; qty: number; partType: PartType; partNo?: string; note?: string; photos?: number }[];
  audience: MartAudience;
  /** Where the buyer is (decides whether a direct enquiry reaches this shop, and shows distance). */
  coords: LatLng;
  ageMin: number;
  windowMin: number;
  /** A garage told the owner to buy this part and recommended these shops (ids). */
  job?: { garage: number; bookingId: string; lineId: string; recommended: string[] };
  /** Simulation: how the buyer takes the part when this shop answers. */
  fulfilment?: 'pickup' | 'delivery';
};

export const CUSTOMER_POOL: CustomerSeed[] = [
  {
    // The demo job: TOPCODE's brake job, where the owner buys the brake discs themselves.
    id: 'c1', buyer: { name: 'නිමල් පෙරේරා', phone: '0771234567' },
    vehicle: { name: 'Premio', plate: 'CAD-8821', type: 'Sedan', make: 'Toyota', model: 'Premio', year: 2012, chassisNo: 'JMBF05090D6226789', engineNo: '3AZFE-2235601' },
    briefs: [{ name: 'Brake disc', qty: 2, partType: 'OEM', partNo: '43512-20180', note: 'ඉදිරිපස ඩිස්ක් දෙකම.', photos: 2 }],
    audience: 'shops', coords: { latitude: 6.0412, longitude: 80.2129 }, ageMin: 4, windowMin: 90,
    job: { garage: 0, bookingId: 'bk-brake', lineId: 'ln-disc', recommended: ['ps1', 'ps3'] }, fulfilment: 'pickup',
  },
  {
    id: 'c2', buyer: { name: 'කමල් රත්නායක' },
    vehicle: { name: 'Axio', plate: 'CAA-3398', type: 'Sedan', make: 'Toyota', model: 'Axio', year: 2014 },
    briefs: [{ name: 'Cabin filter', qty: 1, partType: 'OEM' }],
    audience: 'shops', coords: { latitude: 6.0602, longitude: 80.2321 }, ageMin: 9, windowMin: 60,
  },
  {
    id: 'w1', buyer: { name: 'අයිතිකරුවෙක්' },
    vehicle: { name: 'Vitz', plate: 'CBA-4410', type: 'Hatchback', make: 'Toyota', model: 'Vitz', year: 2011, chassisNo: 'KSP130-2034567' },
    briefs: [{ name: 'Alternator', qty: 1, partType: 'Genuine', partNo: '27060-21060', note: 'KSP130 සඳහා.', photos: 1 }],
    audience: 'wall', coords: { latitude: 7.2906, longitude: 80.6337 }, ageMin: 35, windowMin: 24 * 60,
  },
  {
    id: 'w2', buyer: { name: 'අයිතිකරුවෙක්' },
    vehicle: { name: 'Axio', plate: 'CAC-1180', type: 'Sedan', make: 'Toyota', model: 'Axio NZE141' },
    briefs: [{ name: 'Radiator', qty: 1, partType: 'GarageChoice' }],
    audience: 'both', coords: { latitude: 6.9271, longitude: 79.8612 }, ageMin: 50, windowMin: 24 * 60,
  },
];

/** Arrives a little later, so the inbox is visibly live. */
export const LATE_CUSTOMER: CustomerSeed = {
  id: 'c3', buyer: { name: 'චමර ජයවර්ධන' },
  vehicle: { name: 'Fit GP5', plate: 'CAK-6610', type: 'Hatchback', make: 'Honda', model: 'Fit GP5' },
  briefs: [{ name: 'Battery 12V 45Ah', qty: 1, partType: 'OEM' }],
  audience: 'shops', coords: { latitude: 6.0255, longitude: 80.221 }, ageMin: 0, windowMin: 45, fulfilment: 'delivery',
};

export const LATE_CUSTOMER_MS = 60000;
/** How long a buyer takes to choose after the shop answers (compressed). */
export const BUYER_DECIDE_MS = 15000;

/** Earlier referrals from garages (what a backend keeps), so this month's and last month's reports are not empty. */
export const REFERRAL_SEED = (now: number): PartReferral[] => {
  const d = new Date(now);
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const lastMonth = new Date(d.getFullYear(), d.getMonth() - 1, 12).getTime();
  const at = (hours: number) => Math.min(now - HOUR, monthStart + hours * HOUR);
  const shop = { id: 'ps1', name: 'Galle Auto Parts' };
  const gar = (i: number) => ({ id: GARAGES[i].id, name: GARAGES[i].name });
  type End = 'purchased' | 'fitted' | 'closed' | 'returned';
  const sale = (id: string, g: number, part: string, amount: number, t: number, end: End = 'closed'): PartReferral => {
    let r = newReferral({ id: `ref-${id}`, garage: gar(g), shop, bookingId: id, lineId: 'l1', partName: part, commissionPercent: 3, at: t });
    r = advanceReferral(r, 'viewed', t + 500);
    r = advanceReferral(r, 'reserved', t + 1000);
    r = advanceReferral(r, 'purchased', t + 2000, amount);
    if (end === 'purchased') return r;
    r = advanceReferral(r, 'fitted', t + 3000);
    if (end === 'fitted') return r;
    r = closeReferral(r, t + 4000);
    return end === 'returned' ? advanceReferral(r, 'returned', t + 5000) : r;
  };
  const lapsed = (id: string, g: number, part: string, t: number) => advanceReferral(newReferral({ id: `ref-${id}`, garage: gar(g), shop, bookingId: id, lineId: 'l1', partName: part, commissionPercent: 3, at: t }), 'lapsed', t + 3 * HOUR);
  return [
    sale('s1', 0, 'Brake pads (front)', 6900, at(3)),
    sale('s2', 0, 'Alternator', 27800, at(26)),
    sale('s3', 0, 'Timing belt', 7100, at(50), 'fitted'),
    sale('s4', 1, 'Battery 12V 45Ah', 19800, at(10)),
    sale('s5', 1, 'O2 sensor', 11800, at(60), 'returned'),
    sale('s6', 2, 'Engine oil 4L', 6200, at(70), 'purchased'),
    lapsed('s7', 0, 'Spark plugs (set)', at(80)),
    sale('p1', 0, 'Brake pads (front)', 6900, lastMonth),
    sale('p2', 3, 'Spark plugs (set)', 5400, lastMonth + DAY),
  ];
};
