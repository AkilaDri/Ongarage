import type { WorkshopProgress } from '../types';
import { INSPECTION_FEE } from './workshop';

/** Why an owner cancels a job with the garage they chose (the garage reads it; the owner may add a note). */
export const OWNER_CANCEL_REASONS = [
  'වෙනත් ගරාජයක් තෝරා ගත්තා',
  'මිල ඉතා ඉහළයි',
  'ගරාජය ප්‍රමාද වෙනවා',
  'ගරාජයෙන් පිළිතුරක් නැත',
  'රැකියාව අවශ්‍ය නැති වුණා',
  'වාහනය වෙනත් තැනක අලුත්වැඩියා කළා',
  'වෙනත් හේතුවක්',
];

/** The owner may cancel until the work is ready to be handed over (after that there is a bill, a problem report or a warranty). */
export const canOwnerCancel = (p: WorkshopProgress) =>
  !p.cancelled && (p.stage === 'booked' || p.stage === 'received' || p.stage === 'diagnosing' || p.stage === 'awaitingApproval' || p.stage === 'repairing');

/**
 * While the owner's cancellation request is open (the garage has not answered, or answered and the owner has not decided), the work is on hold: no workshop
 * step, parts request, extra work or other job process is offered to the garage, technician or owner. If the owner withdraws the request the job carries on and
 * everything is offered again; if they accept the compensation the job is cancelled.
 */
export const jobOnHold = (p: WorkshopProgress) => !!p.cancelRequest && !p.cancelled;

/** The owner may ask to cancel when no request is open yet. */
export const canRequestCancel = (p: WorkshopProgress) => canOwnerCancel(p) && !p.cancelRequest;

/**
 * What the garage would reasonably charge for the work done up to now (the garage may change it): nothing before the vehicle came,
 * the inspection fee once it was received and looked at, and half the agreed price on top while the repair is running.
 */
export const cancelCompensationFor = (p: WorkshopProgress, agreedPrice: number): { amount: number; workDone: string } => {
  if (p.stage === 'repairing') return { amount: INSPECTION_FEE + Math.round((agreedPrice * 0.5) / 100) * 100, workDone: 'වාහනය පරීක්ෂා කර, අලුත්වැඩියාවේ කොටසක් කර ඇත' };
  if (p.receivedAt || p.stage !== 'booked') return { amount: INSPECTION_FEE, workDone: 'වාහනය භාර ගෙන පරීක්ෂා කර ඇත' };
  return { amount: 0, workDone: 'තවම වැඩ ආරම්භ කර නැත' };
};

/** What cancelling costs the owner, said before they confirm: nothing before the vehicle reached the garage, otherwise the inspection fee. */
export const cancelFeeNote = (p: WorkshopProgress) =>
  p.receivedAt || p.stage !== 'booked'
    ? `ගරාජයට වාහනය භාර දී හෝ වැඩ ආරම්භ කර ඇති නිසා පරීක්ෂා ගාස්තුව (රු. ${INSPECTION_FEE.toLocaleString('en-US')}) පමණක් ගෙවිය යුතුයි; ඉතිරි වැඩ නවත්වයි.`
    : 'වාහනය තවම ගරාජයට භාර දී නැති නිසා ගාස්තුවක් නැත.';
