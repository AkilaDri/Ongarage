import { pendingExtra, pendingRecon } from '@ongarage/shared';
import type { OwnerWorkshop } from '../context/WorkshopContext';

/**
 * What a running repair needs from the owner right now, or null when it is waiting on someone else. One answer for the card's "your reply" pill, its action box
 * and the progress line, so they can never disagree. The order is the order things can be answered: a cancellation first, then confirming the handover (nothing
 * else can be answered before it), then what the stage asks, then parts the owner has to buy.
 */
export const ownerNeed = (w?: OwnerWorkshop, /** What a part to be bought asks of the owner now (utils/jobParts works it out from OnMart). */ partNeed?: string | null): string | null => {
  if (!w) return null;
  const p = w.progress;
  if (p.cancelled || p.stage === 'closed' || p.stage === 'declined') return null;
  if (p.cancelRequest) return p.cancelRequest.status === 'quoted' ? 'වන්දිය ගැන තීරණය කරන්න' : null;
  // A disputed handover waits on the garage or OnGarage, except when the garage sends photos for the owner to check.
  if (w.receiptDispute) return w.receiptDispute.status === 'garageHasIt' ? 'ගරාජයේ ඡායාරූප බලා තහවුරු කරන්න' : null;
  if (p.receivedAt && !w.receiptConfirmed) return 'වාහනය භාර දුන් බව තහවුරු කරන්න';
  // An owner who stays is asked for nothing in the app: a waiting report, extra work or Recon is talked over face to face (it comes back if they leave).
  if (!p.stays && p.stage === 'awaitingApproval') return 'පරීක්ෂා වාර්තාව අනුමත කරන්න';
  if (!p.stays && p.stage === 'repairing' && pendingRecon(p)) return 'Recon අවසරය දෙන්න';
  if (!p.stays && p.stage === 'repairing' && pendingExtra(p)) return 'අමතර වැඩ අනුමත කරන්න';
  if (p.stage === 'readyForHandover') return 'වාහනය භාරගන්න';
  // A part to get is a task even for an owner at the garage: the repair waits for them.
  if (partNeed) return partNeed;
  return null;
};

/** The progress line while nothing is asked of the owner: what is happening, and whom they are waiting for. */
export const waitingText = (w: OwnerWorkshop): string | undefined => {
  const p = w.progress;
  if (w.receiptDispute) return w.receiptDispute.status === 'onGarage' ? 'OnGarage කණ්ඩායම බලමින්' : 'ගරාජයේ පිළිතුර බලාපොරොත්තුවෙන්';
  if (p.cancelRequest) return 'අවලංගු ඉල්ලීමට ගරාජයේ පිළිතුර බලාපොරොත්තුවෙන්';
  switch (p.stage) {
    case 'booked':
      return 'වෙන් කළ වේලාව බලාපොරොත්තුවෙන්';
    case 'received':
    case 'diagnosing':
      return p.stays ? 'කාර්මිකයා ඔබ සමඟ පරීක්ෂා කරමින්' : 'ගරාජය වාහනය පරීක්ෂා කරමින්';
    case 'awaitingApproval':
      return p.stays ? 'කාර්මිකයා ඔබ සමඟ වාර්තාව කතා කරයි' : undefined;
    case 'repairing':
      return 'ගරාජය අලුත්වැඩියා කරමින්';
    case 'disputed':
      return 'ඔබ වාර්තා කළ ගැටලුවට පිළිතුරු බලාපොරොත්තුවෙන්';
    default:
      return undefined;
  }
};
