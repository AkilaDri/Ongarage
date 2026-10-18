import type { PartFitRequest, PartsFitting, WorkshopProgress } from '../types';

// "Parts fitting": the owner has (or has just bought, e.g. in OnMart) a part and wants a garage to fit it to the vehicle.

/** The "Parts Fitting" category's id in SERVICE_CATEGORIES. */
export const PARTS_FITTING_CATEGORY_ID = '15';
export const isPartsFitting = (categoryId?: string) => categoryId === PARTS_FITTING_CATEGORY_ID;

/** Who supplies the part: the owner brings it (the garage only fits it), or the garage supplies it and fits it. */
export const FITTING_SUPPLY: { id: PartsFitting['supply']; label: string; short: string }[] = [
  { id: 'owner', label: 'මම කොටස ගෙන එනවා (OnMart හෝ වෙනත් තැනකින්) — ගරාජය සවි කරන්න පමණයි', short: 'පාරිභෝගිකයා කොටස ලබා දෙයි' },
  { id: 'garage', label: 'ගරාජය කොටස සපයා සවි කරන්න', short: 'ගරාජය කොටස සපයයි' },
];

/** The owner may ask for another part to be fitted while the job runs (not once it is closed, declined or cancelled). */
export const canRequestFit = (p: WorkshopProgress) => !p.cancelled && !p.cancelRequest && p.stage !== 'closed' && p.stage !== 'declined';

export const pendingFit = (p: WorkshopProgress) => (p.fitRequests ?? []).filter((r) => r.status === 'requested');

/** Why a garage turns a fitting request down (the owner reads it). */
export const FIT_DECLINE_REASONS = [
  'මෙම කොටස සවි කිරීමට අපට හැකියාවක් නැත',
  'වැඩ අධික නිසා දැන් නොහැක',
  'කොටස වාහනයට නොගැළපේ',
  'ආරක්ෂිත හේතු නිසා සවි කළ නොහැක',
  'වෙනත් හේතුවක්',
];

/** The chat lines a fitting request is written as: the same words in both apps. */
export const fitRequestText = (r: Pick<PartFitRequest, 'partName' | 'supply' | 'note'>) =>
  `🔩 අයිතිකරු අලුත් කොටසක් සවි කරන්න ඉල්ලයි: ${r.partName} — ${FITTING_SUPPLY.find((x) => x.id === r.supply)?.short ?? ''}${r.note ? ` · ${r.note}` : ''}. ගරාජය පිළිගන්න හෝ ප්‍රතික්ෂේප කරන්න.`;
export const fitAcceptedText = (r: Pick<PartFitRequest, 'partName'>) => `✅ ${r.partName} සවි කිරීමේ ඉල්ලීම පිළිගත්තා — මිල සහ කාලය අමතර වැඩ ඉල්ලීමක් ලෙස දැනුම් දෙනවා.`;
export const fitDeclinedText = (r: Pick<PartFitRequest, 'partName' | 'declineReason'>) => `✖ ${r.partName} සවි කිරීමේ ඉල්ලීම ප්‍රතික්ෂේප කළා${r.declineReason ? ` — ${r.declineReason}` : ''}.`;

export const fittingLabel = (f: PartsFitting) => `🔩 ${f.partName} · ${FITTING_SUPPLY.find((x) => x.id === f.supply)?.short ?? ''}`;
