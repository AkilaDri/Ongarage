import type { DiagnosisLine, WorkshopProgress, WorkshopStage } from '../types';
import { makeCloseCode } from './closeCode';

// The workshop job flow every app follows: the garage (or its technician) receives the
// vehicle, diagnoses it, the owner approves what gets done, the repair happens (parts
// only after approval), and the owner closes the job with their QR / 6-digit code.

/** The steps a workshop job shows as progress (disputes sit at handover, declines end it). */
export const WORKSHOP_STEPS: { stage: WorkshopStage; label: string }[] = [
  { stage: 'booked', label: 'වෙන් කළා' },
  { stage: 'received', label: 'වාහනය ලැබුණා' },
  { stage: 'diagnosing', label: 'පරීක්ෂාව' },
  { stage: 'awaitingApproval', label: 'අයිතිකරුගේ අනුමැතිය' },
  { stage: 'repairing', label: 'අලුත්වැඩියාව' },
  { stage: 'readyForHandover', label: 'භාරදීමට සූදානම්' },
  { stage: 'closed', label: 'අවසන්' },
];
export const WORKSHOP_STEP_LABELS = WORKSHOP_STEPS.map((s) => s.label);

export const workshopStepIndex = (stage: WorkshopStage) => {
  if (stage === 'disputed') return WORKSHOP_STEPS.findIndex((s) => s.stage === 'readyForHandover');
  if (stage === 'declined') return WORKSHOP_STEPS.length - 1;
  return WORKSHOP_STEPS.findIndex((s) => s.stage === stage);
};

/** One line describing where the job is, for cards and headers. */
export const WORKSHOP_STAGE_TEXT: Record<WorkshopStage, string> = {
  booked: 'වෙන් කළ වේලාව බලාපොරොත්තුවෙන්',
  received: 'වාහනය ලැබුණා — පරීක්ෂාව ඉදිරියේ',
  diagnosing: 'වාහනය පරීක්ෂා කරමින්',
  awaitingApproval: 'පරීක්ෂා වාර්තාව අයිතිකරුගේ අනුමැතියට',
  repairing: 'අලුත්වැඩියා කරමින්',
  readyForHandover: 'භාරදීමට සූදානම් — අයිතිකරුගේ කේතය අවශ්‍යයි',
  closed: 'අවසන් — වගකීම ක්‍රියාත්මකයි',
  declined: 'අයිතිකරු රැකියාව අවලංගු කළා',
  disputed: 'අයිතිකරු ගැටලුවක් වාර්තා කළා',
};

/**
 * Charged only when the owner cancels after the diagnosis (the garage still spent time
 * inspecting). Shown to owners before they book.
 */
export const INSPECTION_FEE = 1500;

/** Default warranty on direct bookings (bids carry their own). */
export const DEFAULT_WARRANTY_MONTHS = 3;

/** Every-job handover checks, on top of one check per approved line. */
export const STANDARD_HANDOVER_CHECKS = ['පරීක්ෂණ ධාවනය කළා', 'වාහනය පිරිසිදු කර භාරදීමට සූදානම්'];

export const newWorkshopProgress = (): WorkshopProgress => ({ stage: 'booked', closeCode: makeCloseCode() });

export const linesTotal = (lines: DiagnosisLine[]) => lines.reduce((s, l) => s + l.price, 0);

/** Lines the owner approved, from the diagnosis and any extra-work requests. */
export const approvedLines = (p: WorkshopProgress): DiagnosisLine[] => {
  const fromDiagnosis = p.diagnosis && p.decision ? p.diagnosis.lines.filter((l) => p.decision!.approvedLineIds.includes(l.id)) : [];
  const fromExtras = (p.extras ?? []).flatMap((x) => (x.decision ? x.lines.filter((l) => x.decision!.approvedLineIds.includes(l.id)) : []));
  return [...fromDiagnosis, ...fromExtras];
};

/** Parts the garage must order from a shop (approved, not in stock). */
export const linesToOrder = (p: WorkshopProgress) => approvedLines(p).filter((l) => l.kind === 'part' && l.source === 'order');

/**
 * Approved parts not yet covered by a parts request: what the garage should order now.
 * Parts come only after the owner approves (diagnosis or extra work), never before.
 */
export const partsStillToOrder = (p: WorkshopProgress, coveredLineIds: string[]) => linesToOrder(p).filter((l) => !coveredLineIds.includes(l.id));

/** Extra work sent mid-repair that the owner hasn't answered yet (handover waits for it). */
export const pendingExtra = (p: WorkshopProgress) => (p.extras ?? []).find((x) => !x.decision);

/**
 * The owner's bill: labour (the agreed price plus approved labour lines) and parts
 * (approved stock parts plus ordered parts — their real cost once received, else the
 * estimate), billed separately.
 */
export const workshopBill = (agreedPrice: number, p: WorkshopProgress, orderedPartsCost?: number) => {
  const lines = approvedLines(p);
  const labour = agreedPrice + linesTotal(lines.filter((l) => l.kind === 'labour'));
  const stockParts = linesTotal(lines.filter((l) => l.kind === 'part' && l.source !== 'order'));
  const orderParts = orderedPartsCost ?? linesTotal(lines.filter((l) => l.kind === 'part' && l.source === 'order'));
  return { labour, parts: stockParts + orderParts, total: labour + stockParts + orderParts };
};

/** Same day `months` later, clamped to the month's last day (31 Jan + 3 → 30 Apr). */
export const warrantyEnd = (closedAt: number, months: number) => {
  const d = new Date(closedAt);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return d.getTime();
};
