// Cancelling a towing job, and how far the search for trucks reaches. Mirrors the SOS rules (sosCancel.ts):
// a job needed now can be cancelled only while no truck has accepted; after that it is locked, as SOS is once the technician
// is on the way. A scheduled job is cancelled by how many days before the slot the owner cancels.

import type { TowStage } from './towing';
import { towStageIndex } from './towing';

/** Whether an owner can cancel a job needed now, at this stage. */
export type TowNowCancelRule = 'free' | 'locked';

/** A job needed now: free while the search is still going (no truck has accepted), locked from the moment one accepts. */
export const towNowCancelRule = (stage: TowStage): TowNowCancelRule =>
  towStageIndex(stage) <= towStageIndex('searching') ? 'free' : 'locked';

/** Scheduled jobs: the fee for cancelling, as a share of the agreed fee, by days left before the slot. */
export const SCHEDULED_CANCEL_TIERS = {
  /** 3 or more days before the slot: free. */
  freeDays: 3,
  /** 1–2 days before: this share of the agreed fee. */
  lateSharePct: 5,
  /** On the scheduled day: this flat share of the agreed fee. */
  sameDayPct: 10,
} as const;

/** The fee an owner pays to cancel a scheduled job `daysBefore` whole days before its slot (0 = the scheduled day). */
export const scheduledCancelFee = (agreedFee: number, daysBefore: number): number => {
  if (daysBefore < 0) return 0; // the slot has passed; the job is locked, not charged here
  if (daysBefore >= SCHEDULED_CANCEL_TIERS.freeDays) return 0;
  if (daysBefore >= 1) return Math.round((agreedFee * SCHEDULED_CANCEL_TIERS.lateSharePct) / 100);
  return Math.round((agreedFee * SCHEDULED_CANCEL_TIERS.sameDayPct) / 100);
};

/** The search radius steps in km: the search widens through these on its own, one at a time. */
export const TOW_RADIUS_STEPS_KM = [3, 6, 10, 15, 25] as const;

/** The next radius after `current`, or `null` when the search has reached its widest step (or the owner stopped it). */
export const nextTowRadiusKm = (current: number, stopped = false): number | null => {
  if (stopped) return null;
  const next = TOW_RADIUS_STEPS_KM.find((r) => r > current);
  return next ?? null;
};
