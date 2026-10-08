import { advanceReferral, closeReferral, newReferral, type PartReferral } from '@ongarage/shared';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Earlier referrals this garage sent to parts shops (what a backend keeps), so this month's and last month's
 * reports are not empty. The same shops and amounts appear in the parts app's report for Galle Auto Parts.
 */
export const referralHistory = (garage: { id: string; name: string }, now: number): PartReferral[] => {
  const d = new Date(now);
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const lastMonth = new Date(d.getFullYear(), d.getMonth() - 1, 12).getTime();
  const at = (hours: number) => Math.min(now - HOUR, monthStart + hours * HOUR);
  const SHOPS = {
    ps1: { id: 'ps1', name: 'Galle Auto Parts', pct: 3 },
    ps2: { id: 'ps2', name: 'Southern Spares', pct: 2 },
    ps3: { id: 'ps3', name: 'Karapitiya Recon Centre', pct: 3 },
    ps4: { id: 'ps4', name: 'Lanka Genuine Parts', pct: 4 },
  } as const;
  type End = 'purchased' | 'fitted' | 'closed' | 'returned';
  const sale = (key: string, shop: keyof typeof SHOPS, part: string, amount: number, t: number, end: End = 'closed'): PartReferral => {
    const s = SHOPS[shop];
    let r = newReferral({ id: `ref-${key}`, garage, shop: { id: s.id, name: s.name }, bookingId: key, lineId: 'l1', partName: part, commissionPercent: s.pct, at: t });
    r = advanceReferral(r, 'viewed', t + 500);
    r = advanceReferral(r, 'reserved', t + 1000);
    r = advanceReferral(r, 'purchased', t + 2000, amount);
    if (end === 'purchased') return r;
    r = advanceReferral(r, 'fitted', t + 3000);
    if (end === 'fitted') return r;
    r = closeReferral(r, t + 4000);
    return end === 'returned' ? advanceReferral(r, 'returned', t + 5000) : r;
  };
  const lapsed = (key: string, shop: keyof typeof SHOPS, part: string, t: number) => {
    const s = SHOPS[shop];
    return advanceReferral(newReferral({ id: `ref-${key}`, garage, shop: { id: s.id, name: s.name }, bookingId: key, lineId: 'l1', partName: part, commissionPercent: s.pct, at: t }), 'lapsed', t + 3 * HOUR);
  };
  return [
    sale('h1', 'ps1', 'Brake pads (front)', 6900, at(3)),
    sale('h2', 'ps1', 'Alternator', 27800, at(26)),
    sale('h3', 'ps1', 'Timing belt', 7100, at(50), 'fitted'),
    sale('h4', 'ps3', 'Alternator', 17500, at(34)),
    sale('h5', 'ps4', 'Engine oil 4L', 8400, at(70), 'purchased'),
    sale('h7', 'ps3', 'Starter motor', 14000, at(40), 'returned'),
    lapsed('h6', 'ps2', 'Spark plugs (set)', at(80)),
    sale('p1', 'ps1', 'Brake pads (front)', 6900, lastMonth),
    sale('p2', 'ps4', 'AC compressor', 62000, lastMonth + DAY),
  ];
};
