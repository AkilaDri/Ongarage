import type { RatingDimension, TrustScore } from '../types';

// Trust score: what levels, placement and fairness use instead of plain stars.
// Only jobs closed with the owner's QR / code can be rated, so every review is real.

export const RATING_DIMENSIONS: { id: RatingDimension; label: string; weight: number }[] = [
  { id: 'quality', label: 'වැඩේ ගුණාත්මකභාවය', weight: 0.4 },
  { id: 'pricing', label: 'අවංක මිල', weight: 0.25 },
  { id: 'onTime', label: 'නියමිත වේලාවට', weight: 0.2 },
  { id: 'communication', label: 'සන්නිවේදනය', weight: 0.15 },
];

/**
 * Small-sample adjustment: every dimension starts as if it already had PRIOR_COUNT
 * ratings of PRIOR_MEAN, so three lucky 5★ reviews can't outrank fifty honest 4.7s.
 */
const PRIOR_MEAN = 4.0;
const PRIOR_COUNT = 10;

export type TrustInputs = {
  ratings: Record<RatingDimension, { sum: number; count: number }>;
  /** Jobs accepted (won bids, confirmed direct bookings, committed SOS). */
  jobsAccepted: number;
  /** Of those, closed with the owner's QR / code. */
  jobsClosed: number;
  /** Disputes that were the garage's fault (rework or escalated). */
  disputes: number;
  /** Closed jobs finished by the promised time. */
  onTimeJobs: number;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export const computeTrustScore = (i: TrustInputs): TrustScore => {
  const dimensions = Object.fromEntries(
    RATING_DIMENSIONS.map((d) => {
      const r = i.ratings[d.id];
      return [d.id, round1((PRIOR_MEAN * PRIOR_COUNT + r.sum) / (PRIOR_COUNT + r.count))];
    })
  ) as TrustScore['dimensions'];
  const weighted = RATING_DIMENSIONS.reduce((s, d) => s + dimensions[d.id] * d.weight, 0);

  const completionRate = i.jobsAccepted ? i.jobsClosed / i.jobsAccepted : 1;
  const disputeRate = i.jobsClosed ? i.disputes / i.jobsClosed : 0;
  const onTimeRate = i.jobsClosed ? i.onTimeJobs / i.jobsClosed : 1;

  // Behaviour counts too: abandoned jobs and disputes pull the score down.
  const penalty = Math.max(0, 0.9 - completionRate) * 2 + Math.min(0.6, disputeRate * 6);
  const score = round1(Math.max(1, Math.min(5, weighted - penalty)));

  return {
    score,
    dimensions,
    reviewCount: Math.max(...RATING_DIMENSIONS.map((d) => i.ratings[d.id].count)),
    completionRate,
    disputeRate,
    onTimeRate,
  };
};
