import type { JobPayment } from '../types';
import { paymentDue } from './payment';

// How reliably a customer pays garages, from the payment records of their jobs (see JobPayment). It is shown to the customer (so they can put it right), it limits
// new work while a balance is long overdue, and later it is the badge other garages see. The limit never touches SOS, chat, OnMart or paying itself.

const DAY = 24 * 60 * 60 * 1000;

/** A balance this many days past its promised day limits new jobs, bids accepted and direct bookings. */
export const OVERDUE_LIMIT_DAYS = 7;
/** ...and so does any overdue balance (1+ days) once the customer owes this much in total (LKR). */
export const OWED_LIMIT = 10000;

export type PayLevel = 'new' | 'good' | 'fair' | 'poor';

export type PayStanding = {
  level: PayLevel;
  /** Jobs with a payment record. */
  jobs: number;
  paidInFull: number;
  /** Paid in full, but only after the garage had to say the promised payment did not arrive. */
  paidLate: number;
  /** Jobs with a balance still open. */
  unpaid: number;
  /** What is owed now (disputed balances are not counted: they are being settled). */
  owed: number;
  /** Days the longest open balance is past its promised day (0 when none is). */
  overdueDays: number;
  /** New jobs, accepting bids and direct bookings are paused until the balance is paid. */
  limited: boolean;
  /** A balance is due today or past due: remind, without limiting yet. */
  warn: boolean;
  reason?: string;
};

export const PAY_LEVEL_TEXT: Record<PayLevel, { icon: string; label: string; hint: string }> = {
  new: { icon: '⚪', label: 'අලුත්', hint: 'තවම ගෙවීම් වාර්තාවක් නැත.' },
  good: { icon: '🟢', label: 'විශ්වසනීයයි', hint: 'ඔබ කාලයට ගෙවනවා.' },
  fair: { icon: '🟡', label: 'සමහර විට ප්‍රමාදයි', hint: 'ඉතිරි මුදල් ගෙවීම ප්‍රමාද වී ඇත — ඉක්මනින් ගෙවා වාර්තාව නිවැරදි කරගන්න.' },
  poor: { icon: '🔴', label: 'ගෙවීම් ප්‍රශ්නයක්', hint: 'ගෙවීම් බොහෝ වේලාවක් ප්‍රමාදයි — ගෙවූ විට වාර්තාව ඉක්මනින් යහපත් වේ.' },
};

const dayStartOf = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const payStanding = (payments: (JobPayment | undefined | null)[], now = Date.now()): PayStanding => {
  const ps = payments.filter((p): p is JobPayment => !!p);
  const open = ps.filter((p) => p.balance > 0 && p.confirm !== 'disputed');
  const owed = open.reduce((s, p) => s + p.balance, 0);
  const overdueDays = open.reduce((m, p) => (p.promisedAt ? Math.max(m, Math.round((dayStartOf(now) - dayStartOf(p.promisedAt)) / DAY)) : m), 0);
  const paidInFull = ps.filter((p) => p.status === 'paid').length;
  const paidLate = ps.filter((p) => p.status === 'paid' && (p.missedCount ?? 0) > 0).length;
  const missedTotal = ps.reduce((s, p) => s + (p.missedCount ?? 0), 0);
  const limited = overdueDays >= OVERDUE_LIMIT_DAYS || (overdueDays >= 1 && owed >= OWED_LIMIT);
  const warn = overdueDays >= 1 || open.some((p) => paymentDue(p, now) === 'today');
  const level: PayLevel = !ps.length ? 'new' : limited || missedTotal >= 3 ? 'poor' : overdueDays >= 1 || paidLate > 0 || missedTotal > 0 ? 'fair' : 'good';
  const reason = limited
    ? overdueDays >= OVERDUE_LIMIT_DAYS
      ? `ඉතිරි ගෙවීමක් දින ${overdueDays}ක් ප්‍රමාදයි`
      : `ප්‍රමාද වූ ඉතිරි මුදල් රු. ${owed.toLocaleString('en-US')}`
    : undefined;
  return { level, jobs: ps.length, paidInFull, paidLate, unpaid: open.length, owed, overdueDays, limited, warn, reason };
};
