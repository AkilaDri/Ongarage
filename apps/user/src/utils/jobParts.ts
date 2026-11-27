import { useCallback } from 'react';
import { linesOwnerBuys, type DiagnosisLine } from '@ongarage/shared';
import { useMart } from '../context/MartContext';
import { useWorkshops, type OwnerWorkshop } from '../context/WorkshopContext';
import { ownerNeed } from './ownerNeed';

/**
 * The parts the owner is getting for a job: those the garage recorded, and those the owner added themselves that the garage has not confirmed yet.
 * A part the owner said they never agreed to is on hold: it is not asked for or bought.
 */
export const jobPartLines = (w: OwnerWorkshop): DiagnosisLine[] => [
  ...linesOwnerBuys(w.progress),
  ...(w.addedParts ?? []).map((a): DiagnosisLine => ({ id: a.id, kind: 'part', name: a.name, qty: a.qty, source: 'owner', partType: 'GarageChoice', photos: a.photos, price: 0 })),
];

/** One answer, per part, to "where has it got to?", shown the same on the job card, in OnMart and in the owner's "your turn". */
export type JobPartState = 'held' | 'toAsk' | 'waiting' | 'offers' | 'reserved' | 'toGive' | 'checking' | 'wrong' | 'done';
export type JobPartStatus = {
  line: DiagnosisLine;
  state: JobPartState;
  /** Added by the owner, not yet confirmed by the garage. */
  unconfirmed: boolean;
  enquiryId?: string;
  shopsAsked?: number;
  offers?: number;
  fromPrice?: number;
  /** Reserved: the part waits at the counter, or the rider has arrived, so the owner can check and buy it. */
  toCheck?: boolean;
  bought?: { shopName: string; amount: number };
  /** Why the garage said the part is wrong. */
  wrongReason?: string;
};

/** What the parts ask of the owner now, if anything. Waiting for shops or for the garage is not the owner's turn. */
export const partNeedOf = (statuses: JobPartStatus[]): string | null => {
  const mine = statuses.filter((s) => !s.unconfirmed);
  if (mine.some((s) => s.state === 'wrong')) return 'වැරදි කොටස ආපසු දෙන්න';
  if (mine.some((s) => s.state === 'toGive')) return 'කොටස ගරාජයට දෙන්න';
  if (mine.some((s) => s.state === 'reserved' && s.toCheck)) return 'කොටස පරීක්ෂා කර මිලදී ගන්න';
  if (mine.some((s) => s.state === 'toAsk')) return 'කොටසක් ගෙන ආ යුතුයි';
  if (mine.some((s) => s.state === 'offers')) return 'කොටසේ මිල සසඳන්න';
  return null;
};

export const useJobPartStatuses = () => {
  const { enquiries, offersFor, purchaseFor } = useMart();
  return useCallback(
    (w: OwnerWorkshop): JobPartStatus[] => {
      if (w.progress.cancelled || w.progress.stage === 'closed' || w.progress.stage === 'declined') return [];
      return jobPartLines(w).map((line) => {
        const unconfirmed = !!w.addedParts?.some((a) => a.id === line.id);
        const base = { line, unconfirmed };
        const bought = w.partsBought?.[line.id];
        if (bought) {
          const check = w.partChecks?.[line.id];
          const state = !check ? ('toGive' as const) : check.state === 'right' ? ('done' as const) : check.state;
          const enquiryId = enquiries.find((x) => x.enquiry.jobRef?.bookingId === w.id && x.enquiry.jobRef.lineId === line.id && x.enquiry.status === 'bought')?.enquiry.id;
          return { ...base, state, bought, enquiryId, wrongReason: check?.reason };
        }
        if (w.partDisputes?.[line.id]) return { ...base, state: 'held' as const };
        const m = enquiries.find((x) => x.enquiry.jobRef?.bookingId === w.id && x.enquiry.jobRef.lineId === line.id && x.enquiry.status !== 'cancelled' && x.enquiry.status !== 'expired');
        if (!m) return { ...base, state: 'toAsk' as const };
        const enquiryId = m.enquiry.id;
        const held = m.enquiry.status === 'reserved' ? purchaseFor(enquiryId) : undefined;
        if (held) return { ...base, state: 'reserved' as const, enquiryId, toCheck: held.stage === 'ready' || held.stage === 'arrived' };
        const found = offersFor(enquiryId).filter((o) => o.available);
        if (!found.length) return { ...base, state: 'waiting' as const, enquiryId, shopsAsked: m.askedShopIds.length };
        const priced = found.map((o) => o.total).filter((t) => t > 0);
        return { ...base, state: 'offers' as const, enquiryId, offers: found.length, fromPrice: priced.length ? Math.min(...priced) : undefined };
      });
    },
    [enquiries, offersFor, purchaseFor]
  );
};

/** `ownerNeed` with the parts taken into account. */
export const useOwnerNeed = () => {
  const statusesOf = useJobPartStatuses();
  return useCallback((w?: OwnerWorkshop) => (w ? ownerNeed(w, partNeedOf(statusesOf(w))) : null), [statusesOf]);
};
