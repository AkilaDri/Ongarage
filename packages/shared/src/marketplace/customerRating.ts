import type { CustomerRating, CustomerRecord, CustomerTag, JobPayment, WorkshopProgress } from '../types';
import { payStanding, type PayLevel } from './reliability';

// Garages rate customers after a closed job, so other garages can take work wisely. It has to be fair: only jobs closed with the customer's code, one rating per job,
// fixed reasons instead of free accusations, the customer can answer or dispute (a disputed rating does not count meanwhile), and old ratings stop counting.

/** Ratings older than this stop counting in the public record. */
export const RATING_EXPIRY_MONTHS = 12;

export const CUSTOMER_TAGS: { id: CustomerTag; label: string; good: boolean }[] = [
  { id: 'paidOnTime', label: 'කාලයට ගෙවුවා', good: true },
  { id: 'polite', label: 'ගෞරවනීයයි', good: true },
  { id: 'onTime', label: 'නියමිත වේලාවට ආවා', good: true },
  { id: 'clearBrief', label: 'ගැටලුව පැහැදිලිව කීවා', good: true },
  { id: 'paidLate', label: 'ප්‍රමාදව ගෙවුවා', good: false },
  { id: 'unpaid', label: 'ගෙවුවේ නැහැ', good: false },
  { id: 'noShow', label: 'නොපැමිණියා', good: false },
  { id: 'rude', label: 'අගෞරවයෙන් හැසිරුණා', good: false },
];
export const tagLabel = (t: CustomerTag) => CUSTOMER_TAGS.find((x) => x.id === t)?.label ?? t;

/** Only a job closed with the customer's code can be rated, and only once. */
export const canRateCustomer = (p?: WorkshopProgress) => !!p && p.stage === 'closed' && !p.customerRating;

/** Whether a rating counts in the public record: not expired, and not under dispute. */
export const ratingCounts = (r: CustomerRating, now = Date.now()) => {
  const limit = new Date(now);
  limit.setMonth(limit.getMonth() - RATING_EXPIRY_MONTHS);
  return r.at >= limit.getTime() && !(r.dispute && r.dispute.status !== 'withdrawn');
};

/** Once the balance is paid, "did not pay" no longer stands: it becomes "paid late". */
export const settleCustomerRating = (r?: CustomerRating): CustomerRating | undefined =>
  r && r.tags.includes('unpaid') ? { ...r, tags: Array.from(new Set(r.tags.map((t): CustomerTag => (t === 'unpaid' ? 'paidLate' : t)))) } : r;

const ORDER: PayLevel[] = ['good', 'fair', 'poor'];
const worse = (a: PayLevel, b: PayLevel): PayLevel => (a === 'new' ? b : b === 'new' ? a : ORDER[Math.max(ORDER.indexOf(a), ORDER.indexOf(b))]);

/** The record other garages see: how the customer pays (from their payment records) and what garages said (counted ratings only). */
export const summarizeCustomer = (ratings: CustomerRating[], payments: (JobPayment | undefined | null)[], now = Date.now()): CustomerRecord => {
  const pay = payStanding(payments, now);
  const counted = ratings.filter((r) => ratingCounts(r, now));
  const avg = counted.length ? Math.round((counted.reduce((s, r) => s + r.stars, 0) / counted.length) * 10) / 10 : undefined;
  const starLevel: PayLevel = avg === undefined ? 'new' : avg >= 4 ? 'good' : avg >= 3 ? 'fair' : 'poor';
  const counts = new Map<CustomerTag, number>();
  for (const r of counted) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  const topTags = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([tag, count]) => ({ tag, count }));
  return {
    level: worse(pay.level, starLevel),
    jobs: Math.max(pay.jobs, counted.length),
    paidInFull: pay.paidInFull,
    paidLate: pay.paidLate,
    unpaid: pay.unpaid,
    owed: pay.owed,
    rated: counted.length,
    avgStars: avg,
    topTags,
    disputed: ratings.filter((r) => r.dispute && r.dispute.status !== 'withdrawn').length,
  };
};

/** Why a customer note cannot be published as written (the AI layer's moderation reasons). */
export const NOTE_BLOCKED: Record<string, string> = {
  abuse: 'අසභ්‍ය වචන ඉවත් කරන්න.',
  contact: 'දුරකථන අංක / ඊමේල් ලිපින සටහනේ දැමිය නොහැක.',
  spam: 'සබැඳි හෝ නැවත නැවත අකුරු ඉවත් කරන්න.',
};

/** The chat lines of a rating: the same words in both apps. */
export const customerRatedText = (r: CustomerRating) => `⭐ ගරාජය ඔබව ශ්‍රේණිගත කළා: ★${r.stars}${r.tags.length ? ` · ${r.tags.map(tagLabel).join(', ')}` : ''}${r.note ? ` — “${r.note}”` : ''}.`;
export const customerReplyText = (r: CustomerRating) => `💬 අයිතිකරු ශ්‍රේණිගත කිරීමට පිළිතුරු දුන්නා: “${r.reply?.text ?? ''}”.`;
export const customerDisputeText = (r: CustomerRating) => `⚠️ අයිතිකරු ශ්‍රේණිගත කිරීම ගැන ගැටලුවක් ඉදිරිපත් කළා: “${r.dispute?.note ?? ''}” — විසඳෙන තුරු එය පොදු වාර්තාවට ගණන් නොගනී.`;
