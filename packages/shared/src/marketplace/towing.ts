import type { LatLng } from '../types';
import { distanceKm } from '../utils/geo';

/**
 * Towing (service mode 'dispatch', Phase 5): the owner asks for a tow truck and the nearest cheapest operator that can carry the vehicle comes, like an SOS call
 * rather than a bid. The rules are here so every app reads them the same way: which truck a vehicle's condition needs, the quote (a clear breakdown), how
 * operators are ranked (price, then arrival time, then rating; paid placement never counts), and when a final price above the estimate needs the owner's approval.
 * The quote is an estimate and the owner pays the operator directly; nothing here moves money.
 */
export type TowTruckKind = 'Flatbed Towing' | 'Recovery Winch' | 'Emergency Transport';
export type TowCondition = 'rolls' | 'wontRoll' | 'stuck' | 'accident';

/** What each condition needs: the trucks that can do it and an extra recovery fee when the vehicle first has to be pulled out. */
export const TOW_CONDITIONS: Record<TowCondition, { trucks: TowTruckKind[]; recovery: boolean }> = {
  rolls: { trucks: ['Flatbed Towing', 'Emergency Transport'], recovery: false },
  wontRoll: { trucks: ['Flatbed Towing'], recovery: false },
  stuck: { trucks: ['Recovery Winch'], recovery: true },
  accident: { trucks: ['Flatbed Towing', 'Recovery Winch'], recovery: true },
};
export const TOW_CONDITION_LIST: TowCondition[] = ['rolls', 'wontRoll', 'stuck', 'accident'];

/** Straight-line distance times this is the road distance. */
export const ROAD_FACTOR = 1.3;
/** The operator's average speed to the pickup (km/h) and the time to get the truck ready (minutes). */
export const TOW_SPEED_KMH = 30;
export const TOW_PREP_MIN = 5;
/** The operator's drive to the pickup is free up to this many road km; beyond it half the per-km rate applies. */
export const DEADHEAD_FREE_KM = 5;
/** Night work (from 22:00 until 05:00) costs this much more. */
export const NIGHT_SURCHARGE = 0.2;
/** A final price may be at most this far above the estimate before the owner has to approve it. */
export const TOW_OVERRUN_PCT = 10;

export type TowOperator = {
  id: string;
  name: string;
  coords: LatLng;
  phone: string;
  rating: number;
  reviews: number;
  trucks: TowTruckKind[];
  /** LKR. */
  baseFee: number;
  /** LKR per road km of the trip. */
  perKm: number;
  /** LKR for pulling the vehicle out (stuck / accident). */
  recoveryFee: number;
  /** Taking jobs right now. */
  available: boolean;
};

export type TowQuote = {
  baseFee: number;
  tripKm: number;
  tripFee: number;
  /** The truck's drive to the pickup beyond the free distance. */
  pickupFee: number;
  recoveryFee: number;
  nightFee: number;
  total: number;
  /** The most the final price may be without the owner's approval. */
  limit: number;
};

export const roadKm = (a: LatLng, b: LatLng) => Math.round(distanceKm(a, b) * ROAD_FACTOR * 10) / 10;
export const isNight = (now: number) => {
  const h = new Date(now).getHours();
  return h >= 22 || h < 5;
};
const round10 = (n: number) => Math.round(n / 10) * 10;

/** Minutes until the truck is at the pickup `km` road km away. */
export const towEtaMin = (km: number) => Math.ceil((km / TOW_SPEED_KMH) * 60) + TOW_PREP_MIN;

/** The trucks of an operator that can do this condition. */
export const canTow = (op: TowOperator, condition: TowCondition) => op.available && op.trucks.some((t) => TOW_CONDITIONS[condition].trucks.includes(t));

/** The quote for one operator: the trip (pickup to destination), the truck's drive to the pickup, a recovery fee when the vehicle must be pulled out, a night surcharge. */
export const towQuote = (op: TowOperator, pickupKm: number, tripKm: number, condition: TowCondition, now: number): TowQuote => {
  const tripFee = tripKm * op.perKm;
  const pickupFee = Math.max(0, pickupKm - DEADHEAD_FREE_KM) * op.perKm * 0.5;
  const recoveryFee = TOW_CONDITIONS[condition].recovery ? op.recoveryFee : 0;
  const subtotal = op.baseFee + tripFee + pickupFee + recoveryFee;
  const nightFee = isNight(now) ? subtotal * NIGHT_SURCHARGE : 0;
  const total = round10(subtotal + nightFee);
  return { baseFee: op.baseFee, tripKm, tripFee: round10(tripFee), pickupFee: round10(pickupFee), recoveryFee, nightFee: round10(nightFee), total, limit: round10(total * (1 + TOW_OVERRUN_PCT / 100)) };
};

export type TowOption = { op: TowOperator; quote: TowQuote; pickupKm: number; etaMin: number };

/**
 * The operators that can do the job, cheapest first; a tie goes to the one that arrives sooner, then to the better rating. Operators that are busy or have no suitable
 * truck are left out. Nothing a operator pays can move it up.
 */
export const rankTowOperators = (ops: TowOperator[], pickup: LatLng, dest: LatLng, condition: TowCondition, now: number): TowOption[] => {
  const tripKm = roadKm(pickup, dest);
  return ops
    .filter((op) => canTow(op, condition))
    .map((op) => {
      const pickupKm = roadKm(op.coords, pickup);
      return { op, quote: towQuote(op, pickupKm, tripKm, condition, now), pickupKm, etaMin: towEtaMin(pickupKm) };
    })
    .sort((a, b) => a.quote.total - b.quote.total || a.etaMin - b.etaMin || b.op.rating - a.op.rating);
};

/** A final price above the quote's limit needs the owner's approval before the job closes. */
export const finalNeedsApproval = (quote: TowQuote, final: number) => final > quote.limit;

export type TowStage = 'searching' | 'accepted' | 'enroute' | 'arrived' | 'loading' | 'transporting' | 'delivered';
export const TOW_STAGES: TowStage[] = ['searching', 'accepted', 'enroute', 'arrived', 'loading', 'transporting', 'delivered'];
export const towStageIndex = (s: TowStage) => TOW_STAGES.indexOf(s);

export type TowRequest = {
  id: string;
  operatorId: string;
  pickup: LatLng;
  pickupText: string;
  destination: LatLng;
  destinationText: string;
  condition: TowCondition;
  vehicleId?: string;
  note?: string;
  quote: TowQuote;
  etaMin: number;
  stage: TowStage;
  createdAt: number;
  /** The price the operator finally asks for, once delivered. */
  finalPrice?: number;
  /** The owner's answer to a final price above the limit. */
  approval?: 'pending' | 'approved' | 'disputed';
  rating?: number;
  cancelled?: boolean;
};

/** The owner may cancel until the truck has arrived. */
export const canCancelTow = (r: TowRequest) => !r.cancelled && towStageIndex(r.stage) < towStageIndex('arrived');
/** The job is finished once delivered and nothing waits for the owner. */
export const towClosed = (r: TowRequest) => r.stage === 'delivered' && r.approval !== 'pending';
