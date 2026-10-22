import { SERVICE_KINDS } from './service';
import { approvedLines } from './workshop';
import type { ChatSide, DiagnosisLine, WorkshopProgress } from '../types';
import { fitAcceptedText, fitDeclinedText, fitRequestText } from './fitting';
import { customerDisputeText, customerRatedText, customerReplyText } from './customerRating';
import { paymentClaimDeniedText, paymentClaimText, paymentCollectedText, paymentConfirmedText, paymentDisputedText, paymentMissedText, paymentRecordedText, paymentRescheduledText } from './payment';

/** One line for the chat and whose it is: what the garage does reads as a message from the garage, an answer from the owner as theirs. */
export type JobUpdate = { from: ChatSide; text: string; /** The report this message is about; the chat offers a chip to open it. */ report?: { kind: 'diagnosis' | 'extra' | 'handover'; id?: string }; /** The photos that belong to that moment (the vehicle on arrival, the diagnosis, extra work, the finished job). */ photos?: string[] };

// What goes into a job's chat while the work is going on: every step the garage takes (the vehicle received, the diagnosis,
// a new part asked for or fitted, extra work found and what the owner said about it, the job ready or closed) is written as an
// update, so both sides can read the whole story in one place. The apps compare the job's progress before and after a change.

/** The chat line the owner's cancellation request is written as (its edit chip, while the garage has not answered, reopens the request form). */
export const CANCEL_REQUEST_PREFIX = '🛑 අයිතිකරු රැකියාව අවලංගු කිරීමට ඉල්ලුවා';
export const isCancelRequestUpdate = (text?: string) => !!text && text.startsWith(CANCEL_REQUEST_PREFIX);
export const cancelRequestText = (c: { reason: string; note?: string }) =>
  `${CANCEL_REQUEST_PREFIX} — හේතුව: ${c.reason}${c.note ? ` · ${c.note}` : ''}. ගරාජය අනුමත කර, මෙතෙක් කළ වැඩවලට වන්දිය දැනුම් දිය යුතුයි.`;

/** The chat line that says the vehicle was received (with its condition photos): its edit chip opens the check-in form again. */
export const RECEIVED_PREFIX = '🚗 වාහනය ලැබුණා';
export const isReceivedUpdate = (text?: string) => !!text && text.startsWith(RECEIVED_PREFIX);

const money = (n: number) => `රු. ${Math.round(n).toLocaleString('en-US')}`;
const names = (lines: DiagnosisLine[]) => lines.map((l) => (l.qty > 1 ? `${l.name} ×${l.qty}` : l.name)).join(', ');
const total = (lines: DiagnosisLine[]) => lines.reduce((s, l) => s + l.price, 0);
/** One line per part or job of work, with its own price. */
const bullets = (lines: DiagnosisLine[]) => lines.map((l) => `  • ${l.qty > 1 ? `${l.name} ×${l.qty}` : l.name} — ${money(l.price)}`).join('\n');

/**
 * A request the owner has to answer, written with headings so it reads at a glance: what it is, why, what is needed (each with
 * its price), what it comes to and what the owner is asked to do. Headings end with a colon (the chat shows them in bold).
 */
const request = (title: string, reason: string | undefined, sections: { heading: string; lines: DiagnosisLine[] }[]) =>
  [
    title,
    reason ? `හේතුව:\n${reason}` : '',
    ...sections.filter((x) => x.lines.length).map((x) => `${x.heading}:\n${bullets(x.lines)}`),
    `මුළු අගය: ${money(sections.reduce((sum, x) => sum + total(x.lines), 0))}`,
    'ඔබගේ අනුමැතිය අවශ්‍යයි — පහත කාඩ්පතෙන් අනුමත කරන්න හෝ ප්‍රතික්ෂේප කරන්න.',
  ]
    .filter(Boolean)
    .join('\n');

/** Parts and work each on their own line, with what they come to: the owner sees them apart. */
const groups = (lines: DiagnosisLine[]) => {
  const parts = lines.filter((l) => l.kind === 'part');
  const work = lines.filter((l) => l.kind === 'labour');
  return [parts.length ? `🔩 කොටස්: ${names(parts)} (${money(total(parts))})` : '', work.length ? `🔧 වැඩ: ${names(work)} (${money(total(work))})` : ''].filter(Boolean).join('\n');
};
/** The report's own photos, then the photos of each part on it. */
const photosOf = (own: string[] | undefined, lines: DiagnosisLine[]) => [...(own ?? []), ...lines.flatMap((l) => l.photos ?? [])];

/**
 * The chat messages one report (the diagnosis, or one extra-work request) reads as in the job's progress, in the same words they were posted with:
 * what an edited report's messages are rewritten to.
 */
export const reportMessages = (progress: WorkshopProgress, kind: 'diagnosis' | 'extra', id?: string): JobUpdate[] => {
  const bare: WorkshopProgress = kind === 'diagnosis' ? { ...progress, diagnosis: undefined, decision: undefined } : { ...progress, extras: (progress.extras ?? []).filter((x) => x.id !== id) };
  const full: WorkshopProgress = kind === 'diagnosis' ? { ...progress, decision: undefined } : { ...progress, extras: (progress.extras ?? []).map((x) => (x.id === id ? { ...x, decision: undefined, waitingSince: undefined } : x)) };
  return workshopUpdateTexts(bare, full).filter((u) => u.report?.kind === kind);
};

/** The updates a change in a job's progress deserves, in the order they happened (empty when nothing worth telling changed). */
export const workshopUpdateTexts = (prev: WorkshopProgress | undefined, next: WorkshopProgress): JobUpdate[] => {
  if (!prev) return [];
  const out: JobUpdate[] = [];
  const garage = (text: string, photos?: string[], report?: JobUpdate['report']) => out.push({ from: 'garage', text, photos: photos?.length ? photos : undefined, report });
  const owner = (text: string) => out.push({ from: 'owner', text });

  // The diagnosis: sent, then decided.
  if (next.diagnosis && !prev.diagnosis) {
    garage(
      request('📋 පරීක්ෂා වාර්තාව', next.diagnosis.findings, [
        { heading: 'අවශ්‍ය කොටස්', lines: next.diagnosis.lines.filter((l) => l.kind === 'part') },
        { heading: 'අවශ්‍ය වැඩ', lines: next.diagnosis.lines.filter((l) => l.kind === 'labour') },
      ]),
      photosOf(next.diagnosis.photos, next.diagnosis.lines),
      { kind: 'diagnosis' }
    );
  }
  if (next.decision && !prev.decision) {
    const approved = (next.diagnosis?.lines ?? []).filter((l) => next.decision!.approvedLineIds.includes(l.id));
    if (next.decision.via === 'phone') garage(`📞 දුරකථන ඇමතුමකින් අයිතිකරු අනුමත කළා: ${approved.length ? names(approved) : 'කිසිවක් නැත'}.`);
    else owner(diagnosisDecisionText(approved));
  }

  // Extra work found mid-repair: asked, answered (in the app or by phone), put aside or waiting.
  for (const x of next.extras ?? []) {
    const before = (prev.extras ?? []).find((y) => y.id === x.id);
    if (!before) {
      // Extra parts and extra work are two separate messages (each with its own total and photos), so each reads on its own;
      // the report's own photos go with the first of them.
      const parts = x.lines.filter((l) => l.kind === 'part');
      const work = x.lines.filter((l) => l.kind === 'labour');
      if (parts.length) garage(request('➕ අමතර කොටස් අවශ්‍යයි', x.reason, [{ heading: 'අවශ්‍ය අමතර කොටස්', lines: parts }]), photosOf(x.photos, parts), { kind: 'extra', id: x.id });
      if (work.length) garage(request('➕ අමතර වැඩ අවශ්‍යයි', x.reason, [{ heading: 'අවශ්‍ය අමතර වැඩ', lines: work }]), parts.length ? undefined : x.photos, { kind: 'extra', id: x.id });
      continue;
    }
    if (x.decision && !before.decision) {
      const approved = x.lines.filter((l) => x.decision!.approvedLineIds.includes(l.id));
      if (x.decision.via === 'deferred') garage('⏸ අමතර වැඩය පසෙක තැබුවා — එකඟ වූ වැඩය පමණක් අවසන් කරනවා.');
      else if (x.decision.via === 'phone') garage(`📞 දුරකථන ඇමතුමකින් අයිතිකරු අමතර වැඩය අනුමත කළා: ${approved.length ? names(approved) : 'කිසිවක් නැත'}.`);
      else owner(extraDecisionText(approved));
    } else if (x.waitingSince && !before.waitingSince) {
      garage('⏳ අයිතිකරුට පිළිතුරු දිය නොහැකි නිසා රැඳී සිටී (රැඳී සිටීම නොමිලේ).');
    }
  }

  // Another part to fit: the owner asks, the garage accepts or declines.
  for (const r of next.fitRequests ?? []) {
    const before = (prev.fitRequests ?? []).find((x) => x.id === r.id);
    if (!before) owner(fitRequestText(r));
    else if (before.status === 'requested' && r.status === 'accepted') garage(fitAcceptedText(r));
    else if (before.status === 'requested' && r.status === 'declined') garage(fitDeclinedText(r));
  }

  // Cancelling in the middle of a job: the owner asks, the garage approves with its compensation, the owner accepts (or withdraws and the work goes on).
  const lkr = (n: number) => `රු. ${Math.round(n).toLocaleString('en-US')}`;
  if (next.cancelRequest && !prev.cancelRequest) {
    owner(cancelRequestText(next.cancelRequest));
  }
  if (next.cancelRequest?.status === 'quoted' && prev.cancelRequest?.status !== 'quoted') {
    garage(`💰 අවලංගු කිරීම අනුමතයි. මෙතෙක් කළ වැඩ${next.cancelRequest.workDone ? ` (${next.cancelRequest.workDone})` : ''} සඳහා වන්දිය ${lkr(next.cancelRequest.compensation ?? 0)}. එකඟ නම් අවලංගු කළ හැක; නැත්නම් ඉල්ලීම ඉවත් කර වැඩ දිගටම කරගෙන යන්න.`);
  }
  if (prev.cancelRequest && !next.cancelRequest && !next.cancelled) owner('↩️ අයිතිකරු අවලංගු කිරීමේ ඉල්ලීම ඉවත් කළා — වැඩ දිගටම කරගෙන යයි.');
  if (next.cancelled && !prev.cancelled) {
    owner(`❌ අයිතිකරු වන්දිය (${lkr(next.cancelled.compensation ?? 0)}) පිළිගෙන රැකියාව අවලංගු කළා${next.cancelled.rating ? ` · ගරාජයට ★${next.cancelled.rating}` : ''}.`);
  }

  // What was paid once the job closed: the garage records it, the owner confirms or disputes it.
  if (next.payment && !prev.payment) garage(paymentRecordedText(next.payment));
  if (prev.payment?.confirm === 'pending' && next.payment) {
    if (next.payment.confirm === 'confirmed') owner(paymentConfirmedText(next.payment));
    else if (next.payment.confirm === 'disputed') owner(paymentDisputedText(next.payment));
  }

  // Following a balance up: payments received, a promised day missed, the customer's new day or claim.
  if (prev.payment && next.payment) {
    const a = prev.payment;
    const b = next.payment;
    if (b.received > a.received) garage(paymentCollectedText(b, b.received - a.received));
    if ((b.missedCount ?? 0) > (a.missedCount ?? 0)) garage(paymentMissedText(a));
    if (a.missedAt && !b.missedAt && b.promisedAt !== a.promisedAt && b.received === a.received) owner(paymentRescheduledText(b));
    if (b.claim?.status === 'pending' && b.claim.at !== a.claim?.at) owner(paymentClaimText(b));
    if (a.claim?.status === 'pending' && b.claim?.status === 'denied') garage(paymentClaimDeniedText(b));
  }

  // The garage's rating of the customer, and the customer's answer to it.
  if (next.customerRating && !prev.customerRating) garage(customerRatedText(next.customerRating));
  if (prev.customerRating && next.customerRating) {
    if (next.customerRating.reply && !prev.customerRating.reply) owner(customerReplyText(next.customerRating));
    if (next.customerRating.dispute && !prev.customerRating.dispute) owner(customerDisputeText(next.customerRating));
  }

  // Waiting for ordered parts, and the parts coming.
  if (next.waitingForParts && !prev.waitingForParts) garage('⏳ ඇණවුම් කළ කොටස් එනතුරු රැඳී සිටී.');
  if (!next.waitingForParts && prev.waitingForParts) garage('📦 කොටස් ලැබුණා — වැඩ දිගටම.');

  // The stage.
  if (next.stage !== prev.stage) {
    const fitted = approvedLines(next).filter((l) => l.kind === 'part');
    switch (next.stage) {
      case 'received':
        garage(RECEIVED_PREFIX + ' — පරීක්ෂාව ආරම්භ කරනවා. (වාහනයේ තත්ත්වය පෙන්වන ඡායාරූප)', next.checkInPhotos);
        break;
      case 'diagnosing':
        // Receiving the vehicle can go straight to diagnosing: then this is the "received" line, with the condition photos.
        if (prev.stage === 'booked') garage(RECEIVED_PREFIX + ' — පරීක්ෂාව ආරම්භ කරනවා. (වාහනයේ තත්ත්වය පෙන්වන ඡායාරූප)', next.checkInPhotos);
        else garage('🔍 වාහනය පරීක්ෂා කරමින් සිටී.');
        break;
      case 'repairing':
        garage('🔧 අලුත්වැඩියාව ආරම්භ කළා.');
        break;
      case 'readyForHandover':
        garage(`🔑 වැඩ අවසන් — භාරදීමට සූදානම්${fitted.length ? ` · සවි කළ කොටස්: ${names(fitted)}` : ''}. ඔබගේ කේතය අවශ්‍යයි.`, next.handover?.afterPhotos, { kind: 'handover' });
        break;
      case 'closed':
        garage('✅ රැකියාව අවසන් කළා — වගකීම ක්‍රියාත්මකයි.');
        break;
      case 'declined':
        garage('✖ රැකියාව නතර කළා — එකඟ වූ දේ පමණක් අය කෙරේ.');
        break;
      case 'disputed':
        owner(`⚠️ ගැටලුවක් වාර්තා විය${next.dispute?.text ? `: ${next.dispute.text}` : ''}.`);
        break;
      default:
        break;
    }
  }

  // A routine service: what was done and the next one.
  const svc = next.handover?.service;
  if (svc && !prev.handover?.service) {
    const kind = SERVICE_KINDS.find((k) => k.id === svc.kind)?.label ?? 'සේවාව';
    const nextBits = [svc.nextServiceKm ? `${svc.nextServiceKm.toLocaleString('en-US')} km` : '', svc.nextServiceAt ? new Date(svc.nextServiceAt).toLocaleDateString('en-GB') : ''].filter(Boolean).join(' · ');
    garage(`🛠️ සේවා වාර්තාව: ${kind} · මීටර් කියවීම ${svc.mileageKm.toLocaleString('en-US')} km${nextBits ? ` · ඊළඟ සේවාව ${nextBits}` : ''}.`, undefined, { kind: 'handover' });
  }
  return out;
};

/** The update for a parts request or order changing (the garage asking a shop, ordering, receiving). */
export const partsUpdateText = (event: 'asked' | 'ordered' | 'received', partNames: string[]) => {
  const list = partNames.join(', ');
  return event === 'asked' ? `🔩 නව කොටස් ඉල්ලීමක් යැව්වා: ${list}.` : event === 'ordered' ? `🛒 කොටස් ඇණවුම් කළා: ${list}.` : `📦 කොටස් ලැබුණා: ${list}.`;
};


// ---- The owner's answers, as the chat lines they are written as: the same words when the owner changes an answer and the line is rewritten.

export const diagnosisDecisionText = (approved: DiagnosisLine[]) =>
  approved.length ? `✅ අනුමත කළා: ${names(approved)}.` : '✖ කිසිවක් අනුමත නොකරමි — පරීක්ෂා ගාස්තුව පමණි.';
export const extraDecisionText = (approved: DiagnosisLine[]) => (approved.length ? `✅ අමතර වැඩය අනුමත කළා: ${names(approved)}.` : '✖ අමතර වැඩය අනුමත නොකරමි.');
export const reconDecisionText = (approve: boolean) => (approve ? '✅ අයිතිකරු Recon කොටස් යෙදීමට අනුමත කළා.' : '⏳ අයිතිකරු Genuine කොටස් සඳහා බලා සිටීමට කැමතියි.');

/** Which of the owner's own update lines has a form to change it in (the chat's edit chip), if any. */
export const ownerEditKindOf = (text?: string): 'cancel' | 'diagnosis' | 'extra' | 'recon' | null => {
  if (!text) return null;
  if (isCancelRequestUpdate(text)) return 'cancel';
  if (text.startsWith('✅ අනුමත කළා:') || text.startsWith('✖ කිසිවක් අනුමත නොකරමි')) return 'diagnosis';
  if (text.startsWith('✅ අමතර වැඩය අනුමත කළා') || text.startsWith('✖ අමතර වැඩය අනුමත නොකරමි')) return 'extra';
  if (text === reconDecisionText(true) || text === reconDecisionText(false)) return 'recon';
  return null;
};

/**
 * The owner changed an answer (the diagnosis, extra work or Recon): the chat lines to rewrite, from the words they were written with to the new words.
 * (A change keeps the same decision but with a new `decidedAt`, or flips the Recon status.)
 */
export const decisionEdits = (prev: WorkshopProgress | undefined, next: WorkshopProgress): { from: string; to: string }[] => {
  const out: { from: string; to: string }[] = [];
  if (!prev) return out;
  const pick = (lines: DiagnosisLine[], ids: string[]) => lines.filter((l) => ids.includes(l.id));
  const push = (from: string, to: string) => from !== to && out.push({ from, to });
  if (prev.decision && next.decision && prev.diagnosis && next.diagnosis && prev.decision.decidedAt !== next.decision.decidedAt) {
    push(diagnosisDecisionText(pick(prev.diagnosis.lines, prev.decision.approvedLineIds)), diagnosisDecisionText(pick(next.diagnosis.lines, next.decision.approvedLineIds)));
  }
  for (const x of next.extras ?? []) {
    const before = (prev.extras ?? []).find((y) => y.id === x.id);
    if (before?.decision && x.decision && before.decision.decidedAt !== x.decision.decidedAt) {
      push(extraDecisionText(pick(before.lines, before.decision.approvedLineIds)), extraDecisionText(pick(x.lines, x.decision.approvedLineIds)));
    }
  }
  for (const r of next.recon ?? []) {
    const before = (prev.recon ?? []).find((y) => y.id === r.id);
    if (before && before.status !== 'pending' && r.status !== 'pending' && before.status !== r.status) push(reconDecisionText(before.status === 'approved'), reconDecisionText(r.status === 'approved'));
  }
  return out;
};
