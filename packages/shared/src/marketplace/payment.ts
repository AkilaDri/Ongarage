import type { JobPayment } from '../types';

// A job closed with the owner's code is handed over, not necessarily paid. The garage records what it received; a shortfall is a promise to pay by a date.

const DAY = 24 * 60 * 60 * 1000;

/** The furthest date a garage can accept a promise for. */
export const MAX_PROMISE_DAYS = 30;

/** Quick choices for "when will the rest be paid". */
export const PROMISE_PRESETS: { id: string; label: string; days: number }[] = [
  { id: 'tomorrow', label: 'හෙට', days: 1 },
  { id: '3d', label: 'දින 3කින්', days: 3 },
  { id: 'week', label: 'සතියකින්', days: 7 },
  { id: '2w', label: 'සති 2කින්', days: 14 },
];

/** The morning (9:00) of the day `days` from now: the promised payment day. */
export const promiseAt = (days: number, from = Date.now()) => {
  const d = new Date(from + days * DAY);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
};

/** The payment record for a bill of `total` of which `received` was received now; a shortfall needs a (capped) promised date, tomorrow if none is given. */
export const makePayment = (total: number, received: number, opts: { promisedAt?: number; note?: string; now?: number } = {}): JobPayment => {
  const now = opts.now ?? Date.now();
  const got = Math.min(Math.max(0, Math.round(received)), total);
  const note = opts.note?.trim() || undefined;
  if (got >= total) return { total, received: total, balance: 0, status: 'paid', recordedAt: now, confirm: 'confirmed', note };
  const promisedAt = Math.min(opts.promisedAt ?? promiseAt(1, now), promiseAt(MAX_PROMISE_DAYS, now));
  return { total, received: got, balance: total - got, status: 'partial', promisedAt, recordedAt: now, confirm: 'pending', note };
};

/** Money still owed on a job (0 when paid, or no record yet). */
export const paymentOwed = (p?: JobPayment) => (p ? p.balance : 0);

const rs = (n: number) => `රු. ${Math.round(n).toLocaleString('en-US')}`;
/** A day as 2026-10-15. */
export const dayText = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** The chat lines a payment record is written as (the same words in both apps). */
export const paymentRecordedText = (p: JobPayment) =>
  p.status === 'paid'
    ? `💰 ගෙවීම ලැබුණා: ${rs(p.received)} — සම්පූර්ණයි ✓.`
    : `💰 ගෙවීම් සටහන: බිල ${rs(p.total)}, ලැබුණු ${rs(p.received)}, ඉතිරි ${rs(p.balance)} — ${dayText(p.promisedAt ?? p.recordedAt)} දිනට ගෙවන බවට පොරොන්දු වී ඇත. අයිතිකරු තහවුරු කරන්න.`;
export const paymentConfirmedText = (p: JobPayment) => `✅ අයිතිකරු ගෙවීම් සටහන තහවුරු කළා — ඉතිරි ${rs(p.balance)} ${dayText(p.promisedAt ?? p.recordedAt)} දිනට ගෙවනවා.`;
export const paymentDisputedText = (p: JobPayment) => `⚠️ අයිතිකරු ගෙවීම් සටහනට එකඟ නොවේ${p.disputeNote ? `: ${p.disputeNote}` : ''}.`;

// ---------- following the balance up (step 2) ----------

const dayStartOf = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Where a balance stands against its promised day: not due yet, due today, or past it. */
export type PaymentDue = 'none' | 'upcoming' | 'today' | 'overdue';
export const paymentDue = (p?: JobPayment, now = Date.now()): PaymentDue => {
  if (!p || p.balance <= 0 || p.confirm === 'disputed' || !p.promisedAt) return 'none';
  const today = dayStartOf(now);
  const due = dayStartOf(p.promisedAt);
  return due > today ? 'upcoming' : due === today ? 'today' : 'overdue';
};

/** The garage received `amount` more (capped at the balance); the rest, if any, is promised for `nextAt`. */
export const collectPayment = (p: JobPayment, amount: number, opts: { nextAt?: number; now?: number } = {}): JobPayment => {
  const now = opts.now ?? Date.now();
  const got = Math.min(Math.max(0, Math.round(amount)), p.balance);
  const received = p.received + got;
  const balance = p.total - received;
  const installments = got > 0 ? [...(p.installments ?? []), { amount: got, at: now }] : p.installments;
  if (balance <= 0) return { ...p, received: p.total, balance: 0, status: 'paid', promisedAt: undefined, missedAt: undefined, installments, confirm: 'confirmed' };
  const nextAt = opts.nextAt ? Math.min(opts.nextAt, promiseAt(MAX_PROMISE_DAYS, now)) : p.promisedAt;
  return { ...p, received, balance, installments, promisedAt: nextAt, missedAt: opts.nextAt ? undefined : p.missedAt };
};

/** The garage says the promised payment did not arrive: the customer has to name a new day. */
export const markPaymentMissed = (p: JobPayment, now = Date.now()): JobPayment => ({ ...p, missedCount: (p.missedCount ?? 0) + 1, missedAt: now });

/** The customer names a new day for the balance. */
export const reschedulePayment = (p: JobPayment, at: number, now = Date.now()): JobPayment => ({ ...p, promisedAt: Math.min(at, promiseAt(MAX_PROMISE_DAYS, now)), missedAt: undefined });

/** The customer says they paid `amount`; the garage confirms or denies it. */
export const claimPayment = (p: JobPayment, amount: number, now = Date.now()): JobPayment => ({ ...p, claim: { amount: Math.min(Math.max(0, Math.round(amount)), p.balance), at: now, status: 'pending' } });

/** The garage answers the customer's claim: confirmed, the amount is received; denied, it stays a balance. */
export const answerClaim = (p: JobPayment, ok: boolean, now = Date.now()): JobPayment => {
  if (!p.claim || p.claim.status !== 'pending') return p;
  if (!ok) return { ...p, claim: { ...p.claim, status: 'denied' } };
  const paid = collectPayment(p, p.claim.amount, { now });
  return { ...paid, claim: { ...p.claim, status: 'confirmed' } };
};

/** The chat lines of the follow-up: the same words in both apps. */
export const paymentCollectedText = (p: JobPayment, amount: number) =>
  p.balance <= 0 ? `💰 ඉතිරි ගෙවීම ලැබුණා: ${rs(amount)} — සම්පූර්ණයි ✓.` : `💰 ගෙවීමක් ලැබුණා: ${rs(amount)} — ඉතිරි ${rs(p.balance)} ${dayText(p.promisedAt ?? p.recordedAt)} දිනට.`;
export const paymentMissedText = (p: JobPayment) => `⏰ ${dayText(p.promisedAt ?? p.recordedAt)} දිනට ඉතිරි ${rs(p.balance)} ලැබුණේ නැහැ — කරුණාකර ගෙවන්න සහ ගෙවිය හැකි නව දිනයක් දන්වන්න.`;
export const paymentRescheduledText = (p: JobPayment) => `📅 අයිතිකරු ඉතිරි ${rs(p.balance)} ${dayText(p.promisedAt ?? p.recordedAt)} දිනට ගෙවන බව දැනුම් දුන්නා.`;
export const paymentClaimText = (p: JobPayment) => `🧾 අයිතිකරු ඉතිරි ${rs(p.claim?.amount ?? p.balance)} ගෙවූ බව දැනුම් දුන්නා — ගරාජය තහවුරු කරන්න.`;
export const paymentClaimDeniedText = (p: JobPayment) => `✖ ගෙවූ බව කියන ${rs(p.claim?.amount ?? 0)} ලැබී නැත — ඉතිරි ${rs(p.balance)} තවමත් ගෙවිය යුතුයි.`;
