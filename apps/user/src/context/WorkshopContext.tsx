import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  approvedLines,
  type CustomerTag,
  claimBlockers,
  claimSplit,
  eligibilityOf,
  DEFAULT_WARRANTY_MONTHS,
  defaultFluids,
  fluidFromSub,
  isServiceCategory,
  kindFromSub,
  nextServiceDefaults,
  type ServiceDetails,
  INSPECTION_FEE,
  newWorkshopProgress,
  partMarketPrice,
  ownerPartsPending,
  pendingExtra,
  pendingRecon,
  canRequestCancel,
  makePayment,
  promiseAt,
  paymentDue,
  claimPayment as claimPay,
  reschedulePayment as reschedulePay,
  markPaymentMissed,
  answerClaim,
  collectPayment,
  canRateCustomer,
  canRequestFit,
  cancelCompensationFor,
  RATING_DIMENSIONS,
  STANDARD_HANDOVER_CHECKS,
  warrantyEnd,
  workshopBill,
  type DiagnosisLine,
  type DiagnosisReport,
  type Dispute,
  type DimensionRating,
  type DisputeTopic,
  type GarageReview,
  type GuaranteeClaim,
  type PartType,
  type ReconRequest,
  type ExtraWorkRequest,
  type WorkshopProgress,
} from '@ongarage/shared';
import { useNotice } from './NoticeContext';
import { SPEED_WORKS, SAMPLE_UPLOAD_PHOTOS } from '../constants/mockData';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

// Simulated garage (compressed). The garage app does these steps for real once there's a backend.
const RECEIVE_MS = 4000;
const DIAGNOSE_MS = 6000;
const REPAIR_MS = 8000;
const SCAN_MS = 5000;
const REWORK_MS = 4000;
const CLAIM_REPLY_MS = 5000;
const RECON_ASK_MS = 2500;
const REVIEW_REPLY_MS = 6000;
const DAY = 24 * HOUR;

/** The odometer readings the simulated garage finds (a backend keeps the real ones). */
const SEED_MILEAGE: Record<string, number> = { premio: 84500, alto: 61200, march: 47300 };

/** What the simulated garage records for a routine service: the kind, the fluids, the mileage and the next service. */
const simulatedService = (w: OwnerWorkshop): ServiceDetails => {
  const kind = kindFromSub(w.subService);
  const fluid = fluidFromSub(w.subService);
  const mileageKm = (SEED_MILEAGE[w.vehicleId ?? ''] ?? 60000) + 200;
  return { kind, fluids: kind === 'fluids' && fluid ? [fluid] : defaultFluids(kind), mileageKm, ...nextServiceDefaults(kind, mileageKm), notes: 'ඊළඟ සේවාව වෙනුවෙන් අයිතිකරුට මතක් කෙරේ.' };
};

/**
 * Simulated garage: partway through the repair of any new job it finds something more (an extra part and the work to fit it, with a
 * photo), once, so the owner can try the whole conversation: the request in the chat, the answer, and the work going on.
 */
const simulatedExtra = (w: OwnerWorkshop): ExtraWorkRequest => ({
  id: `x-${w.id}`,
  reason: 'වැඩ අතරතුර වාහනයේ ගුවන් පෙරහන (air filter) සම්පූර්ණයෙන්ම අවහිර වී ඇති බව පෙනුණා. අලුත් එකක් සවි කිරීම නිර්දේශ කරනවා.',
  photos: [SAMPLE_UPLOAD_PHOTOS[0]],
  lines: [
    { id: `x-${w.id}-l1`, kind: 'part', name: 'Air filter', qty: 1, partType: w.partType === 'Genuine' ? 'OEM' : (w.partType ?? 'OEM'), source: 'stock', price: 2400, photos: [SAMPLE_UPLOAD_PHOTOS[1]] },
    { id: `x-${w.id}-l2`, kind: 'labour', name: 'Filter fitting & housing clean', qty: 1, price: 800 },
  ],
  sentAt: Date.now(),
});

/** The receipt number printed on a closed job (a backend would issue these). */
const receiptNo = (closedAt: number, code: string) => {
  const d = new Date(closedAt);
  return `OG-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${code.slice(0, 4)}`;
};

/** Overall stars from the four dimensions, weighted like the trust score. */
export const overallFrom = (d: DimensionRating) => Math.round(RATING_DIMENSIONS.reduce((s, x) => s + d[x.id] * x.weight, 0) * 10) / 10;

/** One workshop job the owner follows: a confirmed direct booking or an accepted bid. */
export type OwnerWorkshop = {
  /** The direct booking's or posted job's id. */
  id: string;
  garageName: string;
  categoryId: string;
  /** The agreed price: the bid, or the garage's estimate for a direct booking. */
  agreedPrice: number;
  scheduledAt: number;
  doorstep: boolean;
  warrantyMonths: number;
  progress: WorkshopProgress;
  /** Shown in history when it isn't the category name (e.g. a past job). */
  title?: string;
  icon?: string;
  vehicleId?: string;
  /** The sub-service the owner booked (for the Service category: Full Service, Oil Change, a fluid…). */
  subService?: string;
  /** The part type the owner asked for (bids); Genuine may need a Recon approval. */
  partType?: PartType;
  /** Who did the work (the garage assigns them; rated separately). */
  technician?: string;
  /** The owner saw the job close (it then moves to their completed list). */
  acknowledged?: boolean;
  /** The owner said (in the chat) whether the vehicle was really handed over: yes / no; unset until they answer. */
  receiptConfirmed?: boolean;
  receiptNo?: string;
  /** The owner's review, and later the garage's public reply. */
  review?: GarageReview;
  /** Parts the garage asked the owner to buy (OnMart), by line id, once a shop verified the purchase. */
  partsBought?: Record<string, { shopName: string; amount: number; at: number }>;
};

export type WorkshopStart = Omit<OwnerWorkshop, 'progress' | 'warrantyMonths' | 'acknowledged' | 'receiptConfirmed' | 'receiptNo' | 'review' | 'technician'> & {
  warrantyMonths?: number;
  /** Booked with a Premier garage: covered by the OnGarage Guarantee. */
  protectedJob?: boolean;
};

export type RatingInput = { dimensions: DimensionRating; technician?: number; text: string };

type WorkshopState = {
  workshops: Record<string, OwnerWorkshop>;
  /** A booking was confirmed / a bid accepted: the job follows the workshop steps. */
  startWorkshop: (start: WorkshopStart) => void;
  /** Approve some or all diagnosis lines (none = only the agreed work). */
  approveDiagnosis: (id: string, approvedLineIds: string[]) => void;
  /** Answer extra work the garage found mid-repair (none approved = carry on without it). */
  decideExtra: (id: string, extraId: string, approvedLineIds: string[]) => void;  /** Genuine unavailable: allow Recon (cheaper) or wait for Genuine. */
  decideRecon: (id: string, reconId: string, approve: boolean) => void;
  /** OnGarage Guarantee claim on a protected job the garage couldn't put right. */
  claimGuarantee: (id: string, reason: string, amount: number, photos?: string[]) => void;
  /** Rate a closed job: the garage on four dimensions, and the technician. */
  rateJob: (id: string, input: RatingInput) => void;
  /** Decline the diagnosis: the job ends and only the inspection fee is due. */
  declineDiagnosis: (id: string) => void;
  /** Change an answer already given while the repair is still running (the lines ticked, or Recon yes / no); the chat line is rewritten. */
  changeDiagnosisDecision: (id: string, approvedLineIds: string[]) => void;
  changeExtraDecision: (id: string, extraId: string, approvedLineIds: string[]) => void;
  changeReconDecision: (id: string, reconId: string, approve: boolean) => void;
  /** Answer the garage's record of a part-payment: agree to it (and the promised date), or dispute it with a note. */
  confirmPayment: (id: string, ok: boolean, note?: string) => void;
  /** Answer a garage's rating of the owner: a reply shown with it, or a dispute (it stays out of the public record until settled). */
  replyToCustomerRating: (id: string, text: string) => void;
  disputeCustomerRating: (id: string, note: string) => void;
  /** The owner says they paid the balance: the garage confirms it (then it is received) or denies it. */
  claimPayment: (id: string) => void;
  /** After the garage said the promised day passed without payment: the owner names a new day. */
  reschedulePayment: (id: string, at: number) => void;
  /** Ask the garage to fit another part to the vehicle (the garage accepts or declines it). */
  requestFit: (id: string, input: { partName: string; supply: 'owner' | 'garage'; note?: string }) => void;
  /** Ask the garage to cancel the job (before handover): it approves and states its compensation for the work done so far. */
  requestCancel: (id: string, input: { reason: string; note?: string }) => void;
  /** Change the reason / note of a request the garage has not answered yet (true when it could be changed). */
  editCancelRequest: (id: string, input: { reason: string; note?: string }) => boolean;
  /** Take the request back: the work carries on. */
  withdrawCancel: (id: string) => void;
  /** The garage stated its compensation and the owner accepts it: the job is cancelled (and the garage may be rated). */
  confirmCancel: (id: string, input: { rating?: number }) => void;
  /** The owner opened their code at handover; the garage scans it (simulated). */
  showCloseCode: (id: string) => void;
  /** The owner dismissed the closing screen. */
  acknowledgeClosed: (id: string) => void;
  /** The owner confirms (or denies) that the vehicle was handed over to the garage. */
  confirmReceived: (id: string, ok: boolean) => void;
  reportProblem: (id: string, topic: DisputeTopic, text: string, photos?: string[]) => void;
  /** Rework didn't fix it, or the garage won't: OnGarage steps in (admin app). */
  escalate: (id: string) => void;
  claimWarranty: (id: string, text: string, photos?: string[]) => void;
  /** A part the garage asked the owner to buy was bought at a shop (the shop verified the purchase code). */
  markPartBought: (id: string, lineId: string, info: { shopName: string; amount: number }) => void;
};

const WorkshopContext = createContext<WorkshopState | null>(null);

// What the simulated garage finds, by service category.
const FINDINGS: Record<string, { findings: string; part: string; labour?: [string, number] }> = {
  '1': { findings: 'එන්ජින් මවුන්ට් එක ඉරිතලා ඇත, ඔයිල් ෆිල්ටරයද මාරු කළ යුතුයි.', part: 'Engine mount', labour: ['Engine bay cleaning', 1500] },
  '2': { findings: 'ඇල්ටනේටරය චාජ් කරන්නේ අඩුවෙන්. වයරින් කනෙක්ටරයක් දිරාපත් වී ඇත.', part: 'Wiring connector', labour: ['Charging system test', 1200] },
  '4': { findings: 'AC ගෑස් අඩුයි, කැබින් ෆිල්ටරය අපිරිසිදුයි.', part: 'Cabin filter', labour: ['AC gas refill', 3500] },
  '5': { findings: 'O2 සෙන්සරය දෝෂ කේතයක් පෙන්වයි (P0135). ECU remap එකට පෙර මාරු කළ යුතුයි.', part: 'O2 sensor' },
  '7': { findings: 'ඉදිරිපස බ්‍රේක් පෑඩ් 2mm දක්වා ගෙවී ඇත, බ්‍රේක් ද්‍රවය අඳුරුයි.', part: 'Brake pads (front)', labour: ['Brake fluid flush', 1800] },
  '11': { findings: 'බැටරිය 9.8V දක්වා බැස ඇත, ටර්මිනල් මලකඩ කා ඇත.', part: 'Battery terminals' },
};
const findingFor = (categoryId: string) => FINDINGS[categoryId] ?? { findings: 'ඔයිල් ෆිල්ටරය සහ එයාර් ෆිල්ටරය මාරු කළ යුතුයි.', part: 'Oil filter', labour: ['General inspection', 1000] };

const simulatedDiagnosis = (w: OwnerWorkshop): DiagnosisReport => {
  const f = findingFor(w.categoryId);
  // The garage quotes the type the owner asked for (garage's choice → OEM).
  const t: PartType = w.partType && w.partType !== 'GarageChoice' ? w.partType : 'OEM';
  const lines: DiagnosisLine[] = [{ id: `${w.id}-l1`, kind: 'part', name: f.part, qty: 1, partType: t, source: 'order', price: partMarketPrice(f.part, t) }];
  if (f.labour) lines.push({ id: `${w.id}-l2`, kind: 'labour', name: f.labour[0], qty: 1, price: f.labour[1] });
  return {
    findings: f.findings,
    photos: [SAMPLE_UPLOAD_PHOTOS[0]],
    lines,
    revisedTotal: w.agreedPrice + lines.reduce((s, l) => s + l.price, 0),
    finishBy: Date.now() + 6 * HOUR,
    sentAt: Date.now(),
  };
};

/** Who the simulated garage puts on the job. */
const technicianFor = (garageName: string) => (garageName.startsWith('TOPCODE') ? 'කසුන් ජයසිංහ' : garageName.startsWith('Speed Works') ? 'රුවන් පෙරේරා' : 'චමින්ද සිල්වා');

/** Past jobs (closed with the owner's code), for history, receipts and warranty. */
const pastJob = (o: {
  id: string;
  title: string;
  icon: string;
  garageName: string;
  categoryId: string;
  vehicleId: string;
  daysAgo: number;
  warrantyMonths: number;
  labour: number;
  parts: { name: string; type: PartType; price: number }[];
  review?: GarageReview;
  protectedJob?: boolean;
  service?: ServiceDetails;
  /** Seed: part of the bill was paid and the rest was promised for `promisedDaysAgo` days ago (so it is overdue). */
  unpaid?: { received: number; promisedDaysAgo: number };
  /** Seed: what the garage said about the owner. */
  rating?: { stars: number; tags: CustomerTag[]; note?: string };
}): OwnerWorkshop => {
  const closedAt = Date.now() - o.daysAgo * DAY;
  const base = newWorkshopProgress();
  const lines: DiagnosisLine[] = o.parts.map((p, i) => ({ id: `${o.id}-p${i}`, kind: 'part', name: p.name, qty: 1, partType: p.type, source: 'stock', price: p.price }));
  const progress: WorkshopProgress = {
    ...base,
    stage: 'closed',
    protected: o.protectedJob,
    receivedAt: closedAt - 5 * HOUR,
    checkInPhotos: SAMPLE_UPLOAD_PHOTOS.slice(1),
    diagnosis: { findings: o.title, lines, revisedTotal: o.labour + lines.reduce((s, l) => s + l.price, 0), finishBy: closedAt, sentAt: closedAt - 4 * HOUR },
    decision: { approvedLineIds: lines.map((l) => l.id), declinedLineIds: [], decidedAt: closedAt - 4 * HOUR },
    closedAt,
    warrantyUntil: warrantyEnd(closedAt, o.warrantyMonths),
  };
  const bill = workshopBill(o.labour, progress);
  progress.handover = {
    checklist: [...lines.map((l) => l.name), ...STANDARD_HANDOVER_CHECKS].map((label) => ({ label, done: true })),
    oldPartsKept: true,
    afterPhotos: [SAMPLE_UPLOAD_PHOTOS[2]],
    bill,
    readyAt: closedAt - 30 * MIN,
    service: o.service,
  };
  if (o.rating) progress.customerRating = { id: `cr-${o.id}`, jobId: o.id, garage: o.garageName, at: closedAt + DAY, ...o.rating };
  if (o.unpaid) progress.payment = { ...makePayment(bill.total, o.unpaid.received, { promisedAt: promiseAt(-o.unpaid.promisedDaysAgo), now: closedAt }), confirm: 'confirmed' };
  return {
    id: o.id,
    title: o.title,
    icon: o.icon,
    garageName: o.garageName,
    categoryId: o.categoryId,
    vehicleId: o.vehicleId,
    agreedPrice: o.labour,
    scheduledAt: closedAt - 6 * HOUR,
    doorstep: false,
    warrantyMonths: o.warrantyMonths,
    technician: technicianFor(o.garageName),
    progress,
    acknowledged: true,
    receiptNo: receiptNo(closedAt, base.closeCode),
    review: o.review,
  };
};

const HISTORY: OwnerWorkshop[] = [
  pastJob({
    id: 'h3', title: 'Full service', icon: '🛠️', garageName: 'AutoTech Motors', categoryId: '14', vehicleId: 'premio',
    service: { kind: 'full', fluids: ['engineOil', 'transmission', 'brakeFluid', 'powerSteering'], mileageKm: 70200, nextServiceKm: 80200, nextServiceAt: Date.now() - 12 * DAY, notes: 'සියලු තරල මාරු කළා, ගුවන් පෙරහන පිරිසිදු කළා.' },
    daysAgo: 190, warrantyMonths: 3, labour: 7500, parts: [{ name: 'Engine oil 4L', type: 'Genuine', price: 8200 }, { name: 'Oil filter', type: 'Genuine', price: 1650 }, { name: 'Brake fluid', type: 'OEM', price: 1400 }],
  }),
  pastJob({
    id: 'h1', title: 'සම්පූර්ණ සින්තටික් ඔයිල් මාරුව', icon: '🛢️', garageName: 'AutoTech Motors', categoryId: '14', vehicleId: 'premio',
    service: { kind: 'oil', fluids: ['engineOil'], mileageKm: 79800, nextServiceKm: 84800, nextServiceAt: Date.now() + 6 * DAY, notes: 'තෙල් පෙරහන මාරු කළා. ටයර් පීඩනය හරි.' },
    rating: { stars: 5, tags: ['paidOnTime', 'polite'] },
    daysAgo: 24, warrantyMonths: 3, protectedJob: true, labour: 4650, parts: [{ name: 'Engine oil 4L', type: 'Genuine', price: 8200 }, { name: 'Oil filter', type: 'Genuine', price: 1650 }],
    review: {
      id: 'rv-h1', customer: 'Akila Drishan', rating: 4.6, dimensions: { quality: 5, pricing: 4, onTime: 5, communication: 4 }, technician: { name: 'චමින්ද සිල්වා', rating: 5 },
      text: 'ඉක්මනින් කළා, පරණ ෆිල්ටරය පෙන්නුවා.', at: Date.now() - 23 * DAY, reply: { text: 'ස්තූතියි! ඊළඟ සේවාව කි.මී. 5,000න්.', at: Date.now() - 22 * DAY },
    },
  }),
  pastJob({
    id: 'h2', title: 'ඉදිරි බ්‍රේක් පෑඩ් මාරු කිරීම', icon: '🛑', garageName: 'City Brake Center', categoryId: '7', vehicleId: 'premio',
    daysAgo: 62, warrantyMonths: 1, labour: 2400, parts: [{ name: 'Brake pads (front)', type: 'OEM', price: 5800 }],
    // Paid in part; the rest was promised a day ago: the (simulated) garage reports it as not received and the owner names a new day.
    unpaid: { received: 5000, promisedDaysAgo: 1 },
    rating: { stars: 2, tags: ['unpaid'], note: 'ඉතිරි මුදල තවම ගෙවා නැත.' },
  }),
];

/** Seed: a direct booking (see BookingsContext) whose diagnosis waits for the owner. */
export const SEED_WORKSHOP_ID = 'db-seed';
const seedWorkshop = (): OwnerWorkshop => {
  const base: OwnerWorkshop = {
    id: SEED_WORKSHOP_ID,
    garageName: SPEED_WORKS.name,
    categoryId: '7',
    vehicleId: 'premio',
    agreedPrice: 3800,
    scheduledAt: Date.now() - 2 * HOUR,
    doorstep: false,
    warrantyMonths: DEFAULT_WARRANTY_MONTHS,
    progress: newWorkshopProgress(),
    technician: technicianFor(SPEED_WORKS.name),
  };
  return {
    ...base,
    progress: {
      ...base.progress,
      stage: 'awaitingApproval',
      receivedAt: Date.now() - 100 * MIN,
      checkInPhotos: SAMPLE_UPLOAD_PHOTOS.slice(1),
      diagnosis: { ...simulatedDiagnosis(base), sentAt: Date.now() - 20 * MIN },
    },
  };
};

/**
 * Workshop jobs as the owner follows them: received → diagnosis → the owner approves
 * all, some or none → repair → handover → closed with the owner's code → warranty.
 * The garage's side is simulated with the same rules as the garage app.
 */
export const WorkshopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notify } = useNotice();
  const [workshops, setWorkshops] = useState<Record<string, OwnerWorkshop>>(() => ({
    [SEED_WORKSHOP_ID]: seedWorkshop(),
    ...Object.fromEntries(HISTORY.map((h) => [h.id, h])),
  }));
  const live = useRef(workshops);
  live.current = workshops;

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const patch = useCallback(
    (id: string, change: Partial<WorkshopProgress>) =>
      // A cancelled job, or one with a cancellation request open, is on hold: the simulated garage does nothing more on it.
      setWorkshops((prev) => (prev[id] && ((!prev[id].progress.cancelled && !prev[id].progress.cancelRequest) || 'cancelled' in change || 'cancelRequest' in change) ? { ...prev, [id]: { ...prev[id], progress: { ...prev[id].progress, ...change } } } : prev)),
    []
  );
  const patchJob = useCallback(
    (id: string, change: Partial<OwnerWorkshop>) => setWorkshops((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], ...change } } : prev)),
    []
  );
  const stageOf = (id: string) => live.current[id]?.progress.stage;

  const changeDiagnosisDecision = useCallback(
    (id: string, approvedLineIds: string[]) => {
      const w = live.current[id];
      const d = w?.progress.diagnosis;
      if (!w || !d || !w.progress.decision || w.progress.stage !== 'repairing' || w.progress.cancelRequest) return;
      patch(id, { decision: { ...w.progress.decision, approvedLineIds, declinedLineIds: d.lines.map((l) => l.id).filter((x) => !approvedLineIds.includes(x)), decidedAt: Date.now() } });
      notify({ icon: '✏️', title: 'ඔබගේ අනුමැතිය වෙනස් කළා', body: `${w.garageName} යාවත්කාලීන කළ අනුමැතිය අනුව වැඩ කරයි.`, tone: 'primary' });
    },
    [notify, patch]
  );

  const changeExtraDecision = useCallback(
    (id: string, extraId: string, approvedLineIds: string[]) => {
      const w = live.current[id];
      const x = w?.progress.extras?.find((e) => e.id === extraId);
      if (!w || !x?.decision || w.progress.stage !== 'repairing' || w.progress.cancelRequest) return;
      const decision = { ...x.decision, approvedLineIds, declinedLineIds: x.lines.map((l) => l.id).filter((l) => !approvedLineIds.includes(l)), decidedAt: Date.now() };
      patch(id, { extras: w.progress.extras!.map((e) => (e.id === extraId ? { ...e, decision } : e)) });
      notify({ icon: '✏️', title: 'අමතර වැඩ පිළිබඳ තීරණය වෙනස් කළා', body: `${w.garageName} යාවත්කාලීන කළ තීරණය අනුව වැඩ කරයි.`, tone: 'primary' });
    },
    [notify, patch]
  );

  const changeReconDecision = useCallback(
    (id: string, reconId: string, approve: boolean) => {
      const w = live.current[id];
      const r = w?.progress.recon?.find((x) => x.id === reconId);
      if (!w || !r || r.status === 'pending' || (r.status === 'approved') === approve || w.progress.stage !== 'repairing' || w.progress.cancelRequest) return;
      const recon = w.progress.recon!.map((x) => (x.id === reconId ? { ...x, status: approve ? ('approved' as const) : ('declined' as const), decidedAt: Date.now() } : x));
      // Approved: the line becomes Recon at the Recon price; changed back to Genuine, it returns to the Genuine price.
      const swap = (lines: DiagnosisLine[]) =>
        lines.map((l) => (r.lineIds.includes(l.id) ? (approve ? { ...l, partType: 'Recon' as const, price: r.reconPrice } : { ...l, partType: 'Genuine' as const, price: r.genuinePrice }) : l));
      patch(id, {
        recon,
        diagnosis: w.progress.diagnosis ? { ...w.progress.diagnosis, lines: swap(w.progress.diagnosis.lines) } : undefined,
        extras: w.progress.extras?.map((x) => ({ ...x, lines: swap(x.lines) })),
      });
      notify({ icon: '✏️', title: approve ? 'Recon අනුමත කළා' : 'Genuine සඳහා බලා සිටිනවා', body: `${w.garageName} ඔබගේ නව තීරණය අනුව වැඩ කරයි.`, tone: 'primary' });
    },
    [notify, patch]
  );

  /** Set below, once the simulated garage's steps exist: carries the job on after a cancellation request was withdrawn. */
  const resumeRef = useRef<(id: string) => void>(() => {});

  const confirmPayment = useCallback(
    (id: string, ok: boolean, note?: string) => {
      const w = live.current[id];
      const pay = w?.progress.payment;
      if (!w || !pay || pay.confirm !== 'pending') return;
      patch(id, { payment: { ...pay, confirm: ok ? 'confirmed' : 'disputed', disputeNote: ok ? undefined : note?.trim() || undefined, decidedAt: Date.now() } });
      notify(
        ok
          ? { icon: '✅', title: 'ගෙවීම් සටහන තහවුරු කළා', body: `ඉතිරි රු. ${pay.balance.toLocaleString('en-US')} ක් ${w.garageName} ට පොරොන්දු දිනයට ගෙවන්න.`, tone: 'success' }
          : { icon: '⚠️', title: 'ගෙවීම් සටහනට එකඟ නොවන බව දැනුම් දුන්නා', body: `${w.garageName} ඔබගේ සටහන සලකා බලයි.`, tone: 'primary' }
      );
    },
    [notify, patch]
  );

  const replyToCustomerRating = useCallback(
    (id: string, text: string) => {
      const r = live.current[id]?.progress.customerRating;
      if (!r || r.reply || !text.trim()) return;
      patch(id, { customerRating: { ...r, reply: { text: text.trim(), at: Date.now() } } });
    },
    [patch]
  );

  const disputeCustomerRating = useCallback(
    (id: string, note: string) => {
      const r = live.current[id]?.progress.customerRating;
      if (!r || r.dispute || !note.trim()) return;
      patch(id, { customerRating: { ...r, dispute: { note: note.trim(), at: Date.now(), status: 'open' } } });
      notify({ icon: '⚠️', title: 'ගැටලුව ඉදිරිපත් කළා', body: 'OnGarage සලකා බලයි — එතෙක් එම ශ්‍රේණිගත කිරීම ඔබගේ පොදු වාර්තාවට ගණන් නොගනී.', tone: 'primary' });
    },
    [notify, patch]
  );

  const claimPayment = useCallback(
    (id: string) => {
      const w = live.current[id];
      const pay = w?.progress.payment;
      if (!w || !pay || pay.balance <= 0 || pay.claim?.status === 'pending') return;
      patch(id, { payment: claimPay(pay, pay.balance) });
      notify({ icon: '🧾', title: 'ගෙවූ බව දැනුම් දුන්නා', body: `${w.garageName} තහවුරු කරන තුරු බලා සිටින්න.`, tone: 'primary' });
      // Simulated garage: confirms the payment a little later.
      later(() => {
        const cur = live.current[id]?.progress.payment;
        if (cur?.claim?.status !== 'pending') return;
        patch(id, { payment: answerClaim(cur, true) });
        notify({ icon: '✅', title: `${w.garageName} ගෙවීම තහවුරු කළා`, body: 'ඔබගේ ගෙවීම ලැබුණු බව සටහන් විය.', tone: 'success' });
      }, 6000);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [later, notify, patch]
  );

  const reschedulePayment = useCallback(
    (id: string, at: number) => {
      const w = live.current[id];
      const pay = w?.progress.payment;
      if (!w || !pay || pay.balance <= 0) return;
      patch(id, { payment: reschedulePay(pay, at) });
      notify({ icon: '📅', title: 'නව ගෙවීම් දිනය දැනුම් දුන්නා', body: `${w.garageName} ට ඉතිරි රු. ${pay.balance.toLocaleString('en-US')} ක් එදින ගෙවන බව දැන්වුවා.`, tone: 'primary' });
    },
    [notify, patch]
  );

  // Simulated garage: a balance whose promised day has passed without payment is reported as not received (the garage owner marks it at the end of the day).
  useEffect(() => {
    later(() => {
      for (const w of Object.values(live.current)) {
        const pay = w.progress.payment;
        if (!pay || paymentDue(pay) !== 'overdue' || pay.confirm !== 'confirmed' || pay.missedAt || pay.claim?.status === 'pending') continue;
        patch(w.id, { payment: markPaymentMissed(pay) });
        notify({ icon: '⏰', title: `${w.garageName}: ගෙවීම ලැබී නැත`, body: `ඉතිරි රු. ${pay.balance.toLocaleString('en-US')} ක් — ගෙවන්න හෝ නව දිනයක් දන්වන්න.`, tone: 'danger' });
      }
    }, 9000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestFit = useCallback(
    (id: string, input: { partName: string; supply: 'owner' | 'garage'; note?: string }) => {
      const w = live.current[id];
      if (!w || !canRequestFit(w.progress)) return;
      const request = { id: `fit-${Date.now()}`, partName: input.partName.trim(), supply: input.supply, note: input.note?.trim() || undefined, status: 'requested' as const, requestedAt: Date.now() };
      patch(id, { fitRequests: [...(w.progress.fitRequests ?? []), request] });
      // Simulated garage: accepts a few seconds later (waits while a cancellation request holds the job).
      const answer = () => {
        const cur = live.current[id];
        const r = cur?.progress.fitRequests?.find((x) => x.id === request.id);
        if (!cur || !r || r.status !== 'requested') return;
        if (cur.progress.cancelRequest) return later(answer, 4000);
        patch(id, { fitRequests: cur.progress.fitRequests!.map((x) => (x.id === request.id ? { ...x, status: 'accepted' as const, decidedAt: Date.now() } : x)) });
        notify({ icon: '✅', title: `${cur.garageName} ඉල්ලීම පිළිගත්තා`, body: `${request.partName} සවි කරයි — මිල චැට් එකේ දැනුම් දෙයි.`, tone: 'success' });
      };
      later(answer, 6000);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notify, patch, later]
  );

  const requestCancel = useCallback(
    (id: string, input: { reason: string; note?: string }) => {
      const w = live.current[id];
      if (!w || !canRequestCancel(w.progress)) return;
      const requestedAt = Date.now();
      patch(id, { cancelRequest: { status: 'requested', requestedAt, reason: input.reason, note: input.note?.trim() || undefined } });
      notify({ icon: '📨', title: 'අවලංගු කිරීමේ ඉල්ලීම යැවුවා', body: `${w.garageName} ට දැනුම් දුන්නා — වන්දිය ගැන පිළිතුර බලාපොරොත්තුවෙන්.`, tone: 'primary' });
      // Simulated garage: approves a few seconds later and states what it charges for the work done so far.
      later(() => {
        const cur = live.current[id];
        const req = cur?.progress.cancelRequest;
        if (!cur || !req || req.status !== 'requested' || req.requestedAt !== requestedAt) return;
        const { amount, workDone } = cancelCompensationFor(cur.progress, cur.agreedPrice);
        patch(id, { cancelRequest: { ...req, status: 'quoted', compensation: amount, workDone, quotedAt: Date.now() } });
        notify({ icon: '💰', title: `${cur.garageName} ඔබගේ ඉල්ලීමට පිළිතුරු දුන්නා`, body: `වන්දිය රු. ${amount.toLocaleString('en-US')} — සලකා බලා තීරණය කරන්න.`, tone: 'primary' });
      }, 7000);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notify, patch, later]
  );

  const editCancelRequest = useCallback(
    (id: string, input: { reason: string; note?: string }) => {
      const req = live.current[id]?.progress.cancelRequest;
      if (!req || req.status !== 'requested') return false;
      patch(id, { cancelRequest: { ...req, reason: input.reason, note: input.note?.trim() || undefined } });
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patch]
  );

  const withdrawCancel = useCallback(
    (id: string) => {
      if (!live.current[id]?.progress.cancelRequest) return;
      patch(id, { cancelRequest: undefined });
      // The work that was on hold carries on (the simulated garage picks up from the stage the job was at).
      resumeRef.current(id);
      notify({ icon: '↩️', title: 'ඉල්ලීම ඉවත් කළා', body: 'අවලංගු කිරීම නතර කළා — වැඩ දිගටම කරගෙන යයි.', tone: 'primary' });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notify, patch]
  );

  const confirmCancel = useCallback(
    (id: string, input: { rating?: number }) => {
      const w = live.current[id];
      const req = w?.progress.cancelRequest;
      if (!w || !req || req.status !== 'quoted') return;
      const compensation = req.compensation ?? 0;
      patch(id, {
        cancelRequest: undefined,
        cancelled: { at: Date.now(), by: 'owner', reason: req.reason, note: req.note, rating: input.rating, compensation, workDone: req.workDone, feeNote: compensation ? `ගරාජයට වන්දි රු. ${compensation.toLocaleString('en-US')} ගෙවිය යුතුයි.` : 'ගාස්තුවක් නැත.' },
      });
      notify({ icon: '❌', title: 'රැකියාව අවලංගු කළා', body: `${w.garageName} ට වන්දිය රු. ${compensation.toLocaleString('en-US')} ගෙවන්න.`, tone: 'primary' });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notify, patch]
  );

  /** Simulated garage: repair, then hand over with a report and the bill. */
  const repairThenHandover = useCallback(
    (id: string) => {
      later(() => {
        const w = live.current[id];
        if (!w || w.progress.stage !== 'repairing' || pendingExtra(w.progress) || pendingRecon(w.progress)) return;
        // Simulated garage: any other new job gets an extra part and work found, once.
        if (w.id !== SEED_WORKSHOP_ID && !w.progress.extras?.length && !w.progress.dispute) {
          patch(id, { extras: [simulatedExtra(w)] });
          notify({ icon: '➕', title: `${w.garageName}: අමතර කොටස් / වැඩ`, body: 'චැට් එකේ ඇති කාඩ්පතෙන් අනුමත කරන්න.', tone: 'primary' });
          return;
        }
        // Simulated garage: on the seeded brake job it finds the discs scored, once.
        if (w.id === SEED_WORKSHOP_ID && !w.progress.extras?.length && !w.progress.dispute) {
          const extra: ExtraWorkRequest = {
            id: `x-${id}`,
            reason: 'පෑඩ් ගලවද්දී ඉදිරිපස බ්‍රේක් ඩිස්ක් දෙකම ගැඹුරට කැපී ඇති බව පෙනුණා. අලුත් පෑඩ් ඉක්මනින් ගෙවී යයි.',
            photos: [SAMPLE_UPLOAD_PHOTOS[0]],
            lines: [
              // The garage can't fetch the discs itself: the owner buys them in OnMart, from shops it recommends.
              { id: `x-${id}-l1`, kind: 'part', name: 'Brake disc', qty: 2, partType: 'OEM', source: 'owner', partNo: '43512-20180', recommendedShopIds: ['ps1', 'ps3'], price: partMarketPrice('Brake disc', 'OEM') * 2 },
              { id: `x-${id}-l2`, kind: 'labour', name: 'Disc fitting', qty: 1, price: 1500 },
            ],
            sentAt: Date.now(),
          };
          patch(id, { extras: [extra] });
          notify({ icon: '➕', title: `${w.garageName}: අමතර වැඩක් හමු විය`, body: 'ඔබ අනුමත කරන තුරු ඔවුන් එය කරන්නේ හෝ කොටස් ගෙන්වන්නේ නැත.', tone: 'primary' });
          return;
        }
        // Parts the owner buys themselves (OnMart): the garage waits for the shop-verified purchase.
        if (ownerPartsPending(w.progress, Object.keys(w.partsBought ?? {})).length) return;
        const lines = approvedLines(w.progress);
        patch(id, {
          stage: 'readyForHandover',
          handover: {
            checklist: [...lines.map((l) => l.name), ...STANDARD_HANDOVER_CHECKS].map((label) => ({ label, done: true })),
            beforePhotos: w.progress.checkInPhotos,
            afterPhotos: [SAMPLE_UPLOAD_PHOTOS[2]],
            oldPartsKept: lines.some((l) => l.kind === 'part'),
            bill: workshopBill(w.agreedPrice, w.progress),
            readyAt: Date.now(),
            service: isServiceCategory(w.categoryId) ? simulatedService(w) : undefined,
          },
        });
        notify({ icon: '🔑', title: `${w.garageName}: භාරදීමට සූදානම්`, body: 'වාහනය පරීක්ෂා කර, හරි නම් ඔබගේ කේතය පෙන්වන්න.', tone: 'success' });
      }, REPAIR_MS);
    },
    [later, notify, patch]
  );

  const diagnose = useCallback(
    (id: string) => {
      later(() => {
        const w = live.current[id];
        if (!w || w.progress.stage !== 'diagnosing') return;
        patch(id, { stage: 'awaitingApproval', diagnosis: simulatedDiagnosis(w) });
        notify({ icon: '🔍', title: `${w.garageName}: පරීක්ෂා වාර්තාව`, body: 'ඔබ අනුමත කරන කොටස් / වැඩ පමණක් කෙරේ.', tone: 'primary' });
      }, DIAGNOSE_MS);
    },
    [later, notify, patch]
  );

  resumeRef.current = (id: string) => {
    const w = live.current[id];
    if (!w || w.progress.cancelRequest || w.progress.cancelled) return;
    const st = w.progress.stage;
    if (st === 'booked') {
      later(() => {
        const cur = live.current[id];
        if (!cur || cur.progress.stage !== 'booked' || cur.progress.cancelRequest) return;
        patch(id, { stage: 'diagnosing', receivedAt: Date.now(), checkInPhotos: SAMPLE_UPLOAD_PHOTOS.slice(1) });
        patchJob(id, { technician: technicianFor(cur.garageName) });
        diagnose(id);
      }, RECEIVE_MS);
    } else if (st === 'diagnosing') diagnose(id);
    else if (st === 'repairing') repairThenHandover(id);
  };

  const startWorkshop = useCallback(
    (start: WorkshopStart) => {
      if (live.current[start.id]) return;
      const { protectedJob, ...rest } = start;
      const w: OwnerWorkshop = { ...rest, warrantyMonths: start.warrantyMonths ?? DEFAULT_WARRANTY_MONTHS, progress: { ...newWorkshopProgress(), protected: protectedJob } };
      setWorkshops((prev) => ({ ...prev, [w.id]: w }));
      // The garage receives the vehicle at the booked time.
      later(() => {
        if (stageOf(w.id) !== 'booked') return;
        patch(w.id, { stage: 'diagnosing', receivedAt: Date.now(), checkInPhotos: SAMPLE_UPLOAD_PHOTOS.slice(1) });
        patchJob(w.id, { technician: technicianFor(w.garageName) });
        notify({ icon: '🚗', title: `${w.garageName}: වාහනය ලැබුණා`, body: w.doorstep ? 'ගරාජය ඔබ වෙත පැමිණ පරීක්ෂාව ඇරඹුවා.' : 'තත්ත්වයේ ඡායාරූප ගෙන පරීක්ෂාව ඇරඹුවා.', tone: 'primary' });
        diagnose(w.id);
      // (For trying the whole process: the simulated garage does not wait hours for the booked time, only a few seconds.)
      }, Math.min(Math.max(0, w.scheduledAt - Date.now()), 6000) + RECEIVE_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [diagnose, later, notify, patch, patchJob]
  );

  // The garage has said it received the vehicle: until the owner confirms that first, none of what the garage sends after it can be answered.
  const receiptPending = useCallback(
    (id: string) => {
      const w = live.current[id];
      const pending = !!w && !!w.progress.receivedAt && !w.receiptConfirmed && w.progress.stage !== 'closed' && w.progress.stage !== 'declined';
      if (pending) notify({ icon: '🔒', title: 'මුලින් වාහනය භාර දුන් බව තහවුරු කරන්න', body: `${w!.garageName} ඔබගේ වාහනය ලැබුණා කියා දන්වා ඇත. එය තහවුරු කළ පසුවයි ඉතිරි දේට පිළිතුරු දිය හැක්කේ.`, tone: 'danger' });
      return pending;
    },
    [notify]
  );

  const approveDiagnosis = useCallback(
    (id: string, approvedLineIds: string[]) => {
      const w = live.current[id];
      if (!w?.progress.diagnosis || w.progress.stage !== 'awaitingApproval' || receiptPending(id)) return;
      const declinedLineIds = w.progress.diagnosis.lines.map((l) => l.id).filter((x) => !approvedLineIds.includes(x));
      patch(id, { stage: 'repairing', decision: { approvedLineIds, declinedLineIds, decidedAt: Date.now() } });
      notify({ icon: '✅', title: 'අනුමැතිය යැව්වා', body: `${w.garageName} අලුත්වැඩියාව අරඹයි${approvedLineIds.length ? ' — අවශ්‍ය කොටස් දැන් ඇණවුම් කරයි' : ''}.`, tone: 'success' });
      // Simulated garage: the owner asked for Genuine and the shops have none → ask for Recon.
      const genuine = w.progress.diagnosis.lines.find((l) => approvedLineIds.includes(l.id) && l.kind === 'part' && l.source === 'order' && l.partType === 'Genuine');
      if (w.partType === 'Genuine' && genuine)
        later(() => {
          const cur = live.current[id];
          if (cur?.progress.stage !== 'repairing' || cur.progress.recon?.length) return;
          const ask: ReconRequest = {
            id: `rc-${id}`,
            lineIds: [genuine.id],
            partNames: [genuine.name],
            genuinePrice: genuine.price,
            reconPrice: partMarketPrice(genuine.name, 'Recon') * genuine.qty,
            askedAt: Date.now(),
            status: 'pending',
          };
          patch(id, { recon: [ask] });
          notify({ icon: '📲', title: `${cur.garageName}: Genuine නොමැත`, body: `${genuine.name} — Recon යෙදීමට ඔබගේ අවසරය ඉල්ලයි.`, tone: 'primary' });
        }, RECON_ASK_MS);
      repairThenHandover(id);
    },
    [later, notify, patch, repairThenHandover]
  );

  const decideRecon = useCallback(
    (id: string, reconId: string, approve: boolean) => {
      const w = live.current[id];
      const r = w?.progress.recon?.find((x) => x.id === reconId);
      if (!w || !r || r.status !== 'pending') return;
      const recon = w.progress.recon!.map((x) => (x.id === reconId ? { ...x, status: approve ? ('approved' as const) : ('declined' as const), decidedAt: Date.now() } : x));
      // Approved: the line becomes Recon at the Recon price, so the bill drops.
      const swap = (lines: DiagnosisLine[]) => lines.map((l) => (approve && r.lineIds.includes(l.id) ? { ...l, partType: 'Recon' as const, price: r.reconPrice } : l));
      patch(id, {
        recon,
        diagnosis: w.progress.diagnosis ? { ...w.progress.diagnosis, lines: swap(w.progress.diagnosis.lines) } : undefined,
        extras: w.progress.extras?.map((x) => ({ ...x, lines: swap(x.lines) })),
      });
      notify(
        approve
          ? { icon: '✅', title: 'Recon අනුමත කළා', body: `රු. ${(r.genuinePrice - r.reconPrice).toLocaleString()} ක් අඩු වේ · ${w.garageName} අලුත්වැඩියාව කරගෙන යයි.`, tone: 'success' }
          : { icon: '⏳', title: 'Genuine බලාපොරොත්තුවෙන්', body: `${w.garageName} Genuine සොයා ගනී — අමතර දිනයක් ගත විය හැක.`, tone: 'primary' }
      );
      repairThenHandover(id);
    },
    [notify, patch, repairThenHandover]
  );

  const claimGuarantee = useCallback(
    (id: string, reason: string, amount: number, photos?: string[]) => {
      const w = live.current[id];
      if (!w || claimBlockers(eligibilityOf(w.progress, Date.now())).length || w.progress.guaranteeClaim) return;
      const claim: GuaranteeClaim = { id: `gc-${id}`, jobRef: w.receiptNo ?? id, reason, amount, photos, raisedAt: Date.now(), status: 'submitted' };
      patch(id, { guaranteeClaim: claim });
      notify({ icon: '🛡️', title: 'Guarantee ඉල්ලීම යැව්වා', body: `${w.garageName} ට පිළිතුරු දීමට අවස්ථාව ලැබේ; පසුව OnGarage කණ්ඩායම තීරණය කරයි.`, tone: 'primary' });
      // Simulated: the garage responds first, then the OnGarage team decides (admin app).
      later(() => {
        const c = live.current[id]?.progress.guaranteeClaim;
        if (c?.status !== 'submitted') return;
        patch(id, { guaranteeClaim: { ...c, status: 'garageResponded', garageResponse: 'අපි පරීක්ෂා කළා — අපට එය නොමිලේ නිවැරදි කළ නොහැකි කොටසක ගැටලුවක්. OnGarage තීරණයට එකඟයි.' } });
        notify({ icon: '💬', title: `${w.garageName} පිළිතුරු දුන්නා`, body: 'OnGarage කණ්ඩායම දැන් සලකා බලයි.', tone: 'primary' });
        later(() => {
          const c2 = live.current[id]?.progress.guaranteeClaim;
          if (c2?.status !== 'garageResponded') return;
          const split = claimSplit(amount);
          patch(id, { guaranteeClaim: { ...c2, status: 'approved', split: { garagePays: split.garagePays, guaranteePays: split.guaranteePays } } });
          notify({ icon: '✅', title: 'Guarantee ඉල්ලීම අනුමතයි', body: `OnGarage රු. ${split.guaranteePays.toLocaleString()} · ගරාජය රු. ${split.garagePays.toLocaleString()} ගෙවයි.`, tone: 'success' });
        }, CLAIM_REPLY_MS);
      }, CLAIM_REPLY_MS - 1000);
    },
    [later, notify, patch]
  );

  const rateJob = useCallback(
    (id: string, input: RatingInput) => {
      const w = live.current[id];
      if (!w || w.progress.stage !== 'closed' || w.review) return;
      const rating = overallFrom(input.dimensions);
      const review: GarageReview = {
        id: `rv-${id}`,
        customer: 'Akila Drishan',
        rating,
        dimensions: input.dimensions,
        technician: w.technician && input.technician ? { name: w.technician, rating: input.technician } : undefined,
        text: input.text,
        at: Date.now(),
      };
      patchJob(id, { review });
      notify({ icon: '⭐', title: 'ශ්‍රේණිගත කිරීමට ස්තූතියි', body: `${w.garageName} · ★${rating}`, tone: 'success' });
      // Simulated garage: a public reply under the review.
      later(() => {
        const cur = live.current[id]?.review;
        if (!cur || cur.reply) return;
        const text = rating >= 4 ? 'ස්තූතියි! ඔබව නැවත පිළිගැනීමට සතුටුයි.' : 'සමාවෙන්න — ඔබගේ අදහස සලකා බලා අපි වැඩිදියුණු කරනවා. කරුණාකර අපිව අමතන්න.';
        patchJob(id, { review: { ...cur, reply: { text, at: Date.now() } } });
        notify({ icon: '💬', title: `${w.garageName} පිළිතුරු දුන්නා`, body: text, tone: 'primary' });
      }, REVIEW_REPLY_MS);
    },
    [later, notify, patchJob]
  );

  const markPartBought = useCallback(
    (id: string, lineId: string, info: { shopName: string; amount: number }) => {
      const w = live.current[id];
      if (!w) return;
      patchJob(id, { partsBought: { ...(w.partsBought ?? {}), [lineId]: { ...info, at: Date.now() } } });
      notify({ icon: '✅', title: 'ගරාජයට දැනුම් දුන්නා', body: `${info.shopName} වෙතින් කොටස මිලදී ගත් බව ${w.garageName} හට පෙනේ — එය පරීක්ෂා කර සවි කරයි.`, tone: 'success' });
      repairThenHandover(id);
    },
    [notify, patchJob, repairThenHandover]
  );

  const decideExtra = useCallback(
    (id: string, extraId: string, approvedLineIds: string[]) => {
      const w = live.current[id];
      const x = w?.progress.extras?.find((e) => e.id === extraId);
      if (!w || !x || x.decision || receiptPending(id)) return;
      const decision = { approvedLineIds, declinedLineIds: x.lines.map((l) => l.id).filter((l) => !approvedLineIds.includes(l)), decidedAt: Date.now() };
      patch(id, { extras: w.progress.extras!.map((e) => (e.id === extraId ? { ...e, decision } : e)) });
      notify({
        icon: '✅',
        title: approvedLineIds.length ? 'අමතර වැඩ අනුමත කළා' : 'අමතර වැඩ එපා කිව්වා',
        body: approvedLineIds.length
          ? x.lines.some((l) => approvedLineIds.includes(l.id) && l.kind === 'part' && l.source === 'owner')
            ? `${w.garageName}: කොටස් ඔබ OnMart හි මිලදී ගත යුතුයි — එතෙක් භාරදීම නතර වේ.`
            : `${w.garageName} එය කර අවසන් කරයි.`
          : `${w.garageName} එකඟ වූ වැඩ පමණක් අවසන් කරයි.`,
        tone: 'success',
      });
      repairThenHandover(id);
    },
    [notify, patch, repairThenHandover]
  );

  const declineDiagnosis = useCallback(
    (id: string) => {
      const w = live.current[id];
      if (!w || w.progress.stage !== 'awaitingApproval' || receiptPending(id)) return;
      patch(id, { stage: 'declined', closedAt: Date.now() });
      notify({ icon: '↩️', title: 'රැකියාව අවලංගු කළා', body: `පරීක්ෂා ගාස්තුව රු. ${INSPECTION_FEE.toLocaleString()} පමණක් ගෙවිය යුතුයි.`, tone: 'primary' });
    },
    [notify, patch]
  );

  const showCloseCode = useCallback(
    (id: string) => {
      if (receiptPending(id)) return;
      later(() => {
        const w = live.current[id];
        if (!w || w.progress.stage !== 'readyForHandover') return;
        const now = Date.now();
        patchJob(id, { receiptNo: receiptNo(now, w.progress.closeCode) });
        // Simulated garage: records what it received. Most jobs are paid in full; the seeded brake job is paid in part (the rest promised for tomorrow).
        const bill = w.progress.handover?.bill.total ?? w.agreedPrice;
        const payment = id === SEED_WORKSHOP_ID ? makePayment(bill, Math.round((bill * 0.6) / 100) * 100, { promisedAt: promiseAt(1, now), now }) : makePayment(bill, bill, { now });
        // Simulated garage: rates the customer a little later, by how they paid.
        later(() => {
          const cur = live.current[id];
          if (!cur || !canRateCustomer(cur.progress)) return;
          const full = cur.progress.payment?.status === 'paid';
          patch(id, { customerRating: { id: `cr-${id}`, jobId: id, garage: cur.garageName, stars: full ? 5 : 3, tags: full ? ['paidOnTime', 'polite'] : ['paidLate'], at: Date.now() } });
          notify({ icon: '⭐', title: `${cur.garageName} ඔබව ශ්‍රේණිගත කළා`, body: full ? '★5 · කාලයට ගෙවුවා' : '★3 · ප්‍රමාදව ගෙවුවා — ඉතිරිය ගෙවා වාර්තාව යහපත් කරගන්න.', tone: full ? 'success' : 'primary' });
        }, 9000);
        patch(id, {
          payment,
          stage: 'closed',
          closedAt: now,
          warrantyUntil: warrantyEnd(now, w.warrantyMonths),
          dispute: w.progress.dispute ? { ...w.progress.dispute, status: 'resolved' } : undefined,
        });
        notify({ icon: '🎉', title: 'රැකියාව අවසන්', body: `${w.garageName} ඔබගේ කේතය තහවුරු කළා · මාස ${w.warrantyMonths} වගකීම ආරම්භ විය.`, tone: 'success' });
      }, SCAN_MS);
    },
    [later, notify, patch, patchJob]
  );

  const confirmReceived = useCallback(
    (id: string, ok: boolean) => setWorkshops((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], receiptConfirmed: ok } } : prev)),
    []
  );

  const acknowledgeClosed = useCallback(
    (id: string) => setWorkshops((prev) => (prev[id]?.progress.stage === 'closed' && !prev[id].acknowledged ? { ...prev, [id]: { ...prev[id], acknowledged: true } } : prev)),
    []
  );

  const reportProblem = useCallback(
    (id: string, topic: DisputeTopic, text: string, photos?: string[]) => {
      const w = live.current[id];
      if (!w || w.progress.stage !== 'readyForHandover') return;
      const dispute: Dispute = { id: `dp-${id}-${Date.now()}`, topic, text, photos, raisedAt: Date.now(), status: 'open' };
      patch(id, { stage: 'disputed', dispute });
      notify({ icon: '📨', title: 'ගැටලුව ගරාජයට යැව්වා', body: 'ඔවුන් නැවත පරීක්ෂා කර හදයි. විසඳුණේ නැත්නම් OnGarage වෙත යොමු කරන්න.', tone: 'primary' });
      // Simulated garage: takes it back for rework, then hands over again.
      later(() => {
        const cur = live.current[id];
        if (cur?.progress.stage !== 'disputed' || cur.progress.dispute?.status !== 'open') return;
        patch(id, { stage: 'repairing', dispute: { ...cur.progress.dispute, status: 'rework' } });
        notify({ icon: '🔧', title: `${cur.garageName} නැවත හදමින්`, body: `“${text.slice(0, 60)}”`, tone: 'primary' });
        repairThenHandover(id);
      }, REWORK_MS);
    },
    [later, notify, patch, repairThenHandover]
  );

  const escalate = useCallback(
    (id: string) => {
      const w = live.current[id];
      const d = w?.progress.dispute;
      if (!w || !d || d.status === 'resolved' || d.status === 'escalated') return;
      patch(id, { stage: 'disputed', dispute: { ...d, status: 'escalated' } });
      notify({ icon: '⚖️', title: 'OnGarage වෙත යොමු කළා', body: 'අපගේ කණ්ඩායම පැය 24ක් ඇතුළත ඔබ දෙපාර්ශ්වයම අමතයි.', tone: 'primary' });
    },
    [notify, patch]
  );

  const claimWarranty = useCallback(
    (id: string, text: string, photos?: string[]) => {
      const w = live.current[id];
      const p = w?.progress;
      if (!w || !p || p.stage !== 'closed' || !p.warrantyUntil || p.warrantyUntil < Date.now() || p.warrantyClaim?.status === 'open') return;
      patch(id, { warrantyClaim: { id: `wc-${id}-${Date.now()}`, text, photos, raisedAt: Date.now(), status: 'open' } });
      notify({ icon: '🛡️', title: 'වගකීම් ඉල්ලීම යැව්වා', body: `${w.garageName} පිළිතුරු දෙනු ඇත.`, tone: 'primary' });
      later(() => {
        const claim = live.current[id]?.progress.warrantyClaim;
        if (claim?.status !== 'open') return;
        patch(id, { warrantyClaim: { ...claim, status: 'accepted' } });
        notify({ icon: '✅', title: `${w.garageName} වගකීම පිළිගත්තා`, body: 'නොමිලේ නැවත හදයි — පහසු වේලාවක වාහනය ගෙන එන්න.', tone: 'success' });
      }, CLAIM_REPLY_MS);
    },
    [later, notify, patch]
  );

  return (
    <WorkshopContext.Provider value={{ workshops, startWorkshop, approveDiagnosis, decideExtra, decideRecon, claimGuarantee, rateJob, declineDiagnosis, changeDiagnosisDecision, changeExtraDecision, changeReconDecision, confirmPayment, claimPayment, reschedulePayment, replyToCustomerRating, disputeCustomerRating, requestFit, requestCancel, editCancelRequest, withdrawCancel, confirmCancel, showCloseCode, acknowledgeClosed, confirmReceived, reportProblem, escalate, claimWarranty, markPartBought }}>
      {children}
    </WorkshopContext.Provider>
  );
};

export const useWorkshops = () => {
  const ctx = useContext(WorkshopContext);
  if (!ctx) throw new Error('useWorkshops must be used inside WorkshopProvider');
  return ctx;
};
