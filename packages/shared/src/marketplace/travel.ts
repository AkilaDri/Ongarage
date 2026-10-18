import type { Bid } from '../types';

/** A job farther than this from a garage is a "far job": the garage may add a travel fee to its bid. */
export const FAR_JOB_KM = 10;
/** Travel compensation per km beyond `FAR_JOB_KM` (the way there and back), in LKR. */
export const TRAVEL_FEE_PER_KM = 100;
export const TRAVEL_FEE_MIN = 300;

export const isFarJob = (distanceKm: number) => distanceKm > FAR_JOB_KM;

/** The suggested travel compensation for a job this far away (0 when it is not a far job), rounded to 50. */
export const travelFeeFor = (distanceKm: number) =>
  isFarJob(distanceKm) ? Math.max(TRAVEL_FEE_MIN, Math.round(((distanceKm - FAR_JOB_KM) * TRAVEL_FEE_PER_KM) / 50) * 50) : 0;

/** A bid's price is the total the owner pays; this is the part that is for the work itself (without the travel fee). */
export const bidWork = (bid: Pick<Bid, 'price' | 'travelFee'>) => bid.price - (bid.travelFee ?? 0);
