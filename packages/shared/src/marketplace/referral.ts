import type { PartReferral, ReferralStatement, ReferralStatus } from '../types';

// Referrals between garages and parts shops. A garage that tells an owner to buy a part
// recommends shops; when the owner buys at one (the shop verifies the purchase code) the
// sale is recorded for both. A commission is only tracked, never added to the owner's price,
// and is earned only once the part was fitted and the job closed with the owner's code.
// None of this feeds shop rankings or garage levels.

export const DEFAULT_COMMISSION_PERCENT = 3;
export const COMMISSION_CAP_PERCENT = 5;

export const clampCommission = (percent: number) => Math.max(0, Math.min(COMMISSION_CAP_PERCENT, percent));

/** LKR the shop owes the garage for a verified purchase of `amount`. */
export const commissionFor = (amount: number, percent: number) => Math.round((amount * clampCommission(percent)) / 100);

const ORDER: ReferralStatus[] = ['recommended', 'viewed', 'reserved', 'purchased', 'fitted'];

/** Purchases that count as the shop's revenue (a returned part does not). */
export const isSale = (s: ReferralStatus) => s === 'purchased' || s === 'fitted';

export const newReferral = (input: {
  id: string;
  garage: { id: string; name: string };
  shop: { id: string; name: string };
  bookingId: string;
  lineId: string;
  partName: string;
  commissionPercent?: number;
  at: number;
}): PartReferral => ({
  id: input.id,
  garage: input.garage,
  shop: input.shop,
  bookingId: input.bookingId,
  lineId: input.lineId,
  partName: input.partName,
  status: 'recommended',
  history: [{ status: 'recommended', at: input.at }],
  commissionPercent: clampCommission(input.commissionPercent ?? DEFAULT_COMMISSION_PERCENT),
  disclosed: true,
  recommendedAt: input.at,
});

const withCommission = (r: PartReferral): PartReferral => ({
  ...r,
  commission: r.status === 'fitted' && r.jobClosedAt && r.amount ? commissionFor(r.amount, r.commissionPercent) : 0,
});

/**
 * Moves a referral on. Statuses only go forward (recommended → viewed → reserved → purchased →
 * fitted); a purchase can later be returned, and a referral nobody bought from lapses. Anything
 * else is ignored, so a late or repeated update never rewrites history.
 */
export const advanceReferral = (r: PartReferral, status: ReferralStatus, at: number, amount?: number): PartReferral => {
  if (status === r.status) return r;
  const from = ORDER.indexOf(r.status);
  const to = ORDER.indexOf(status);
  const allowed =
    status === 'returned' ? isSale(r.status) : status === 'lapsed' ? from >= 0 && from < ORDER.indexOf('purchased') : from >= 0 && to > from;
  if (!allowed) return r;
  return withCommission({ ...r, status, history: [...r.history, { status, at }], amount: amount ?? r.amount });
};

/** The job closed with the owner's code: the commission can now be earned. */
export const closeReferral = (r: PartReferral, closedAt: number): PartReferral => withCommission({ ...r, jobClosedAt: closedAt });

/** The shop may not charge a referred owner more than its listed price. */
export const referralPriceOk = (paidUnitPrice: number, listedUnitPrice: number) => paidUnitPrice <= listedUnitPrice;

/** Shown to the owner before they choose a shop a garage recommended. */
export const referralDisclosure = (garageName: string, percent: number) =>
  `${garageName} මෙම වෙළඳසැල නිර්දේශ කිරීම වෙනුවෙන් වෙළඳසැලෙන් කොමිස් මුදලක් (${percent}%) ලැබිය හැක. ඔබ ගෙවන මිල වෙනස් නොවේ.`;

/** "2026-10" for a timestamp (local time). */
export const monthKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const statementOf = (refs: PartReferral[], month: string, garageId: string, shopId: string): ReferralStatement => {
  const rows = refs.filter((r) => monthKey(r.recommendedAt) === month && r.garage.id === garageId && r.shop.id === shopId);
  const sales = rows.filter((r) => isSale(r.status));
  return {
    month,
    garageId,
    shopId,
    referrals: rows.length,
    purchases: sales.length,
    returned: rows.filter((r) => r.status === 'returned').length,
    partsValue: sales.reduce((s, r) => s + (r.amount ?? 0), 0),
    commission: sales.reduce((s, r) => s + (r.commission ?? 0), 0),
  };
};

/** A shop's month: one row per garage that referred owners to it. */
export const shopStatement = (refs: PartReferral[], shopId: string, month: string): ReferralStatement[] => {
  const mine = refs.filter((r) => r.shop.id === shopId && monthKey(r.recommendedAt) === month);
  return [...new Set(mine.map((r) => r.garage.id))].map((g) => statementOf(refs, month, g, shopId)).sort((a, b) => b.partsValue - a.partsValue);
};

/** A garage's month: one row per shop it sent owners to. */
export const garageStatement = (refs: PartReferral[], garageId: string, month: string): ReferralStatement[] => {
  const mine = refs.filter((r) => r.garage.id === garageId && monthKey(r.recommendedAt) === month);
  return [...new Set(mine.map((r) => r.shop.id))].map((s) => statementOf(refs, month, garageId, s)).sort((a, b) => b.partsValue - a.partsValue);
};

export const statementTotals = (rows: ReferralStatement[]) =>
  rows.reduce(
    (t, r) => ({ referrals: t.referrals + r.referrals, purchases: t.purchases + r.purchases, returned: t.returned + r.returned, partsValue: t.partsValue + r.partsValue, commission: t.commission + r.commission }),
    { referrals: 0, purchases: 0, returned: 0, partsValue: 0, commission: 0 }
  );

/**
 * A month's statement as plain text, for sharing (settlements happen outside the app for now): the heading, one line
 * per garage or shop, and the totals. `rows` pairs each statement row with the name to show.
 */
export const statementText = (heading: string, rows: { name: string; row: ReferralStatement }[]): string => {
  const money = (n: number) => `රු. ${Math.round(n).toLocaleString('en-US')}`;
  const lines = rows.map(({ name, row }) => `• ${name}: යොමු ${row.referrals}, මිලදී ගත් ${row.purchases}${row.returned ? `, ආපසු ${row.returned}` : ''}, කොටස් ${money(row.partsValue)}, කොමිස් ${money(row.commission)}`);
  const t = statementTotals(rows.map((r) => r.row));
  return [heading, ...lines, `එකතුව: යොමු ${t.referrals}, මිලදී ගත් ${t.purchases}, කොටස් ${money(t.partsValue)}, කොමිස් ${money(t.commission)}`].join('\n');
};
