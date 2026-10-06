import type { WorkshopProgress } from '../types';

// OnGarage Guarantee: a capped service guarantee on "Protected" jobs (Premier garages).
// Not insurance — and not risk-free for the garage: it pays a deductible, claims lower
// its trust score, and only well-documented jobs qualify. Real money waits for the
// legal check; until then this is simulation only.

export const GUARANTEE = {
  /** Most the guarantee pays on one claim (LKR). */
  capPerClaim: 50000,
  /** Most it pays for one garage in a year. */
  capPerGarageYear: 200000,
  /** The garage pays this first part of every claim. */
  deductible: 5000,
};

export type ClaimEligibility = {
  /** The garage is Premier and the job was marked Protected. */
  protectedJob: boolean;
  /** Closed with the owner's QR / code. */
  closedWithCode: boolean;
  /** Check-in and handover photos exist. */
  documented: boolean;
  /** Raised inside the job's warranty period. */
  withinWarranty: boolean;
};

/** Eligibility from a workshop job's record. */
export const eligibilityOf = (p: WorkshopProgress, now: number): ClaimEligibility => ({
  protectedJob: !!p.protected,
  closedWithCode: p.stage === 'closed' && !!p.closedAt,
  documented: !!p.checkInPhotos?.length && !!p.handover?.afterPhotos?.length,
  withinWarranty: !!p.warrantyUntil && p.warrantyUntil > now,
});

/** Why a claim can't go ahead (empty = eligible). */
export const claimBlockers = (e: ClaimEligibility): string[] =>
  [
    !e.protectedJob && 'මෙය ආරක්ෂිත රැකියාවක් නොවේ',
    !e.closedWithCode && 'QR / කේතයෙන් අවසන් කළ රැකියාවක් නොවේ',
    !e.documented && 'පැමිණීමේ / භාරදීමේ ඡායාරූප නැත',
    !e.withinWarranty && 'වගකීම් කාලය ඉකුත් වී ඇත',
  ].filter((x): x is string => !!x);

/** How an approved claim splits between the garage and the guarantee. */
export const claimSplit = (amount: number, paidThisYear = 0) => {
  const garagePays = Math.min(amount, GUARANTEE.deductible);
  const room = Math.max(0, GUARANTEE.capPerGarageYear - paidThisYear);
  const guaranteePays = Math.min(amount - garagePays, GUARANTEE.capPerClaim, room);
  return { garagePays, guaranteePays, ownerUncovered: Math.max(0, amount - garagePays - guaranteePays) };
};
