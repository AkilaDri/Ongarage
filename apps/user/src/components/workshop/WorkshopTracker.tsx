import { FlowButton } from '../FlowButton';
import { StayToggle } from '../StayToggle';
import { AddJobPart, JobPartTask } from './JobPartTask';
import { useOwnerNeed } from '../../utils/jobParts';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  
  paymentDue,
  canRequestCancel,
  Colors,
  FONTS,
  INSPECTION_FEE,
  pendingExtra,
  pendingRecon,
  PhotoStrip,
  StepProgress,
  themedStyles,
  WORKSHOP_STEP_LABELS,
  workshopBill,
  workshopStepIndex,
  stayingStepIndex,
  STAYING_STEPS,
  type WorkshopStage,
  getThemeMode,
} from '@ongarage/shared';
import { useWorkshops } from '../../context/WorkshopContext';
import { waitingText } from '../../utils/ownerNeed';
import { formatDate, formatTime, money } from '../../utils/format';
import { ReceiptDisputeBox, ReceiptReasonSheet } from './ReceiptDispute';
import { InspectionBox } from './InspectionBox';
import { ApprovalSheet } from './ApprovalSheet';
import { HandoverSheet } from './HandoverSheet';
import { ProblemSheet, TOPIC_LABEL } from './ProblemSheet';
import { WarrantySheet } from './WarrantySheet';
import { ReconSheet } from './ReconSheet';
import { CancelJobSheet } from './CancelJobSheet';
import { CancelRequestSheet } from './CancelRequestSheet';
import { PaymentStatus } from './PaymentStatus';
import { useChat } from '../../context/ChatContext';
import { CustomerRatingView } from './CustomerRatingView';
import { canAskToFit, FitPartSheet } from '../ChatFitAction';
import { RatingSheet } from './RatingSheet';
import { ReceiptSheet } from './ReceiptSheet';
import { GuaranteeSheet } from './GuaranteeSheet';

/** The workshop steps as the owner reads them. */
const OWNER_STAGE_TEXT: Record<WorkshopStage, string> = {
  booked: 'වෙන් කළ වේලාව බලාපොරොත්තුවෙන්',
  received: 'ගරාජයට වාහනය ලැබුණා',
  diagnosing: 'ගරාජය වාහනය පරීක්ෂා කරමින්',
  awaitingApproval: 'පරීක්ෂා වාර්තාව ඔබගේ අනුමැතියට',
  repairing: 'අලුත්වැඩියා කරමින්',
  readyForHandover: 'භාරගැනීමට සූදානම්',
  closed: 'අවසන් — වගකීම ක්‍රියාත්මකයි',
  declined: 'ඔබ රැකියාව නැවැත්වූවා',
  disputed: 'ඔබ වාර්තා කළ ගැටලුව',
};

type SheetId = 'fit' | 'cancel' | 'decide' | 'approve' | 'extra' | 'recon' | 'handover' | 'problem' | 'warranty' | 'rate' | 'receipt' | 'guarantee' | null;

/**
 * Where a booked repair is, and what the owner does next: approve the diagnosis, collect
 * the vehicle with their code, report a problem, claim the warranty. `detailed` adds the
 * record (diagnosis lines, bill, photos) for the details view.
 */
/** The steps as the owner reads them: the approval is theirs ("your approval"), not "the owner's". */
const OWNER_STEP_LABELS = WORKSHOP_STEP_LABELS.map((l) => l.replace('අයිතිකරුගේ අනුමැතිය', 'ඔබගේ අනුමැතිය'));

const STAY_OPTIONS = [
  { stays: true, label: '🪑 රැඳී සිටිමි', about: 'අලුත් වැඩ ගැන එතනම කතා\u00a0කර\u00a0ගන්න.', a11y: 'I am at the garage' },
  { stays: false, label: '🚶 තබා ගොස් ඇත', about: 'අතරමැදි පියවර app එකෙන් බලා\u00a0අනුමත\u00a0කරන්න.', a11y: 'I am leaving the garage' },
];

export const WorkshopTracker: React.FC<{ id: string; detailed?: boolean }> = ({ id, detailed }) => {
  const { workshops, setStays, escalate, acknowledgeClosed, confirmReceived, disputeReceipt } = useWorkshops();
  const { openBasket, say } = useChat();
  const [sheet, setSheet] = useState<SheetId>(null);
  // "No, they do not have it" opens a short question first.
  const [askReason, setAskReason] = useState(false);
  const needOf = useOwnerNeed();
  const w = workshops[id];
  if (!w) return null;
  const p = w.progress;
  const need = needOf(w);
  const disputed = !!w.receiptDispute;
  const d = p.dispute;
  const inWarranty = p.stage === 'closed' && !!p.warrantyUntil && p.warrantyUntil > Date.now();
  const claim = p.warrantyClaim;
  const bill = p.handover?.bill ?? (p.decision ? workshopBill(w.agreedPrice, p) : null);
  const close = () => setSheet(null);
  const extraAsk = pendingExtra(p);
  const reconAsk = pendingRecon(p);
  const warrantyOver = p.stage === 'closed' && !!p.warrantyUntil && p.warrantyUntil <= Date.now();
  const review = w.review;
  const gc = p.guaranteeClaim;
  const GC_TEXT = { submitted: '⏳ ගරාජයේ පිළිතුර බලාපොරොත්තුවෙන්', garageResponded: '⚖️ OnGarage කණ්ඩායම සලකා බලමින්', approved: '✅ අනුමතයි', rejected: '✕ ප්‍රතික්ෂේප විය' } as const;

  // The garage says it has the vehicle but the owner has not yet confirmed that: nothing on the job can be answered (the report, extra work, Recon, the
  // handover code) until the owner has confirmed it, the same order as in the job's chat.
  const receiptPending = !!p.receivedAt && !w.receiptConfirmed && p.stage !== 'closed' && p.stage !== 'declined';
  // The bar shows only as far as the owner has accepted: until they confirm the garage has the vehicle it stays on "vehicle received", even if the garage has
  // already gone further (a report may be waiting, but it cannot be answered yet). A disputed handover goes back to "booked".
  // An owner who stays has a shorter bar: the inspection and the approvals happen face to face.
  const stepOf = p.stays ? stayingStepIndex : workshopStepIndex;
  const step = disputed ? 0 : receiptPending ? stepOf('received') : stepOf(p.stage);
  const stepLabels = p.stays ? STAYING_STEPS.map((s) => s.label) : OWNER_STEP_LABELS;
  const canSwitchStay = !p.cancelled && !disputed && ['booked', 'received', 'diagnosing', 'awaitingApproval', 'repairing'].includes(p.stage);
  const switchStay = () => {
    setStays(id, !p.stays);
    say(id, p.stays ? '🚶 අයිතිකරු ගරාජයෙන් යනවා. මෙතැන් සිට අනුමැතිය app එකෙන් ඉල්ලන්න.' : '🪑 අයිතිකරු ගරාජයේ සිටී. මෙතැන් සිට අලුත් වැඩ එතනම කතා කර ගන්න.');
  };

  const action = () => {
    if (receiptPending) return null;
    // No approval is asked of an owner who is at the garage.
    if (p.stays && (p.stage === 'awaitingApproval' || p.stage === 'repairing')) return null;
    switch (p.stage) {
      case 'awaitingApproval':
        return <FlowButton label="වාර්තාව බලා අනුමත කරන්න" icon="🔍" variant="primary" onPress={() => setSheet('approve')} />;
      case 'repairing':
        if (reconAsk)
          return <FlowButton label="Recon අවසරය ඉල්ලයි" detail={reconAsk.partNames.join(', ')} icon="📲" variant="primary" onPress={() => setSheet('recon')} />;
        return extraAsk ? (
          <FlowButton label="අමතර වැඩ බලා අනුමත කරන්න" detail={money(extraAsk.lines.reduce((s, l) => s + l.price, 0))} icon="➕" variant="primary" onPress={() => setSheet('extra')} />
        ) : null;
      case 'readyForHandover':
        return (
          <>
            <FlowButton label="භාරගන්න · කේතය පෙන්වන්න" icon="🔑" variant="success" onPress={() => setSheet('handover')} />
            {d?.status === 'rework' && (
              <Pressable onPress={() => escalate(id)} hitSlop={6} accessibilityLabel="Escalate to OnGarage">
                <Text style={styles.link}>තවමත් හරි නැත්නම් · OnGarage වෙත යොමු කරන්න ›</Text>
              </Pressable>
            )}
          </>
        );
      case 'disputed':
        return d?.status === 'escalated' ? (
          <Text style={styles.note}>⚖️ OnGarage කණ්ඩායම පැය 24ක් ඇතුළත ඔබ දෙපාර්ශ්වයම අමතයි.</Text>
        ) : (
          <>
            <Text style={styles.note}>⏳ ගරාජය නැවත පරීක්ෂා කරමින්…</Text>
            <Pressable onPress={() => escalate(id)} hitSlop={6} accessibilityLabel="Escalate to OnGarage">
              <Text style={styles.link}>OnGarage වෙත යොමු කරන්න ›</Text>
            </Pressable>
          </>
        );
      case 'closed': {
        // One next step at a time: pay what must be paid now, then rate. The card stays short; the full record (review, the garage's rating of the owner, the
        // Guarantee claim, a finished payment) is in the details view.
        const pay = p.payment;
        const owes = !!pay && pay.balance > 0;
        // Paying comes before rating only while it needs the owner now: a garage's record to agree to or dispute, or a balance due today or late. A later promised
        // day does not block rating, and neither does a record already disputed (it waits on the garage).
        const due = paymentDue(pay);
        const payNow = owes && (pay!.confirm === 'pending' || due === 'today' || due === 'overdue');
        const cr = p.customerRating;
        const replyDue = !!cr && !cr.reply && !cr.dispute && cr.stars < 4;
        return (
          <>
            {(owes || detailed) && <PaymentStatus workshop={w} />}
            {!review && !payNow && <FlowButton label="ශ්‍රේණිගත කරන්න" icon="⭐" variant="primary" a11y="Rate this job" onPress={() => setSheet('rate')} />}
            {claim ? (
              <Text style={styles.note}>{claim.status === 'accepted' ? '✅ ගරාජය වගකීම පිළිගත්තා — නොමිලේ හදයි.' : claim.status === 'open' ? '⏳ වගකීම් ඉල්ලීම ගරාජයට යවා ඇත.' : '⚖️ වගකීම් ඉල්ලීම OnGarage සලකා බලයි.'}</Text>
            ) : (
              inWarranty && <FlowButton label="වගකීම් ඉල්ලීමක්" icon="🛡️" variant="ghost" onPress={() => setSheet('warranty')} />
            )}
            {detailed && review && (
              <View style={styles.reviewBox}>
                <Text style={styles.sub}>
                  ⭐ ඔබ ★{review.rating} දුන්නා{review.technician ? ` · ${review.technician.name} ★${review.technician.rating}` : ''}
                  {review.text ? ` · “${review.text}”` : ''}
                </Text>
                {review.reply && (
                  <Text style={styles.sub}>
                    ↳ <Text style={styles.replyLabel}>{w.garageName}:</Text> {review.reply.text}
                  </Text>
                )}
              </View>
            )}
            {(detailed || replyDue) && <CustomerRatingView workshop={w} />}
            {detailed && gc && (
              <View style={styles.reviewBox}>
                <Text style={styles.sub}>
                  🛡️ Guarantee ඉල්ලීම ({money(gc.amount)}): {GC_TEXT[gc.status]}
                </Text>
                {!!gc.garageResponse && <Text style={styles.sub}>↳ {w.garageName}: {gc.garageResponse}</Text>}
                {gc.split && (
                  <Text style={styles.sub}>
                    OnGarage {money(gc.split.guaranteePays)} · ගරාජය {money(gc.split.garagePays)}
                  </Text>
                )}
              </View>
            )}
            {/* The quiet foot of the card: the cover at the left, the receipt at the right. */}
            <View style={styles.foot}>
              <Text style={[styles.footWarranty, warrantyOver && { color: Colors.textMuted }]}>
                {p.warrantyUntil ? `🛡️ ${formatDate(p.warrantyUntil)}${warrantyOver ? ' දී අවසන්' : ' දක්වා'}` : ''}
              </Text>
              <Pressable style={styles.footLink} onPress={() => setSheet('receipt')} hitSlop={6} accessibilityRole="button" accessibilityLabel="Open receipt">
                <Text style={styles.link}>🧾 රිසිට්පත ›</Text>
              </Pressable>
            </View>
          </>
        );
      }
      case 'declined':
        return <Text style={styles.note}>පරීක්ෂා ගාස්තුව {money(INSPECTION_FEE)} පමණක් ගෙවිය යුතුයි.</Text>;
      default:
        return null;
    }
  };

  // A job the owner cancelled: why, and what it cost.
  if (p.cancelled) {
    return (
      <View style={styles.wrap}>
        <View style={styles.reviewBox} accessibilityLabel="Job cancelled">
          <Text style={[styles.stage, { color: Colors.errorText }]}>❌ ඔබ රැකියාව අවලංගු කළා</Text>
          <Text style={styles.sub}>
            හේතුව: {p.cancelled.reason}
            {p.cancelled.note ? ` · “${p.cancelled.note}”` : ''}
          </Text>
          {!!p.cancelled.rating && <Text style={styles.sub}>⭐ ඔබ ගරාජයට ★{p.cancelled.rating} දුන්නා</Text>}
          {p.cancelled.compensation !== undefined && (
            <Text style={styles.sub}>
              💰 ගරාජයට වන්දිය {money(p.cancelled.compensation)}
              {p.cancelled.workDone ? ` · ${p.cancelled.workDone}` : ''}
            </Text>
          )}
          {!!p.cancelled.feeNote && <Text style={styles.sub}>ℹ️ {p.cancelled.feeNote}</Text>}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {/* The line under the bar says what is needed or awaited now, not just the step's name. */}
      {p.stage !== 'closed' && (
        <StepProgress steps={stepLabels.map((l, i) => (i === step ? need ?? waitingText(w) ?? l : l))} current={step} alert={!!need || disputed || p.stage === 'disputed'} readable />
      )}
      {/* The owner's turn: under the progress bar, with no box of its own, holding exactly what is asked of them now. Nothing is shown while the job waits on others. */}
      {disputed && <ReceiptDisputeBox workshop={w} onUpdate={(t) => say(id, t)} />}
      {!!need && !disputed && (
        <View style={styles.turn} accessibilityLabel="Your turn">
        {/* The garage says it received the vehicle: the same question as in the job's chat, short, so it can be answered from the card. */}
        {receiptPending && !p.cancelRequest && (
          <View style={styles.receiptBox} accessibilityLabel="Confirm vehicle handed over">
            <Text style={styles.receiptText}>🚗 {w.garageName} ඔබගේ වාහනය ලැබුණා කියා දන්වා ඇත — නිවැරදිද?</Text>
            <View style={styles.receiptBtns}>
              <View style={styles.flex1}>
                <FlowButton
                  label="එසේ නොවේ"
                  variant="ghost"
                  a11y="Not handed over"
                  onPress={() => setAskReason(true)}
                />
              </View>
              <View style={styles.flex1}>
                <FlowButton
                  label="තහවුරුයි"
                  icon="✓"
                  variant="success"
                  a11y="Confirm handed over"
                  onPress={() => {
                    confirmReceived(id, true);
                    say(id, '✅ අයිතිකරු වාහනය භාර දුන් බව තහවුරු කළා.');
                  }}
                />
              </View>
            </View>
          </View>
        )}
          {!receiptPending && !p.cancelRequest && action()}
          {p.cancelRequest?.status === 'quoted' && (
            <FlowButton label="තීරණය කරන්න" detail={`වන්දිය ${money(p.cancelRequest.compensation ?? 0)}`} variant="primary" onPress={() => setSheet('decide')} />
          )}
        </View>
      )}
      {/* Between the confirmed handover and the report: when to expect it and what is happening. */}
      {!disputed && !receiptPending && !p.cancelRequest && !p.stays && (p.stage === 'received' || p.stage === 'diagnosing') && <InspectionBox workshop={w} detailed={detailed} />}
      {/* Parts the owner has to get, whether they stay or leave: a task of its own, under their other turn. */}
      {!disputed && !receiptPending && !p.cancelRequest && <JobPartTask workshop={w} />}
      {!disputed && !p.cancelRequest && p.stays && ['received', 'diagnosing', 'repairing'].includes(p.stage) && !!p.receivedAt && <AddJobPart workshop={w} />}
      {/* Plans change: a two-way toggle that names both answers, with a line saying what the chosen one means. One tap, and it counts only from now on. */}
      {canSwitchStay && !p.cancelRequest && (
        <StayToggle value={!!p.stays} options={STAY_OPTIONS} onChange={switchStay} />
      )}
      {p.protected && (
        <View style={styles.protectedPill} accessibilityLabel="Protected job">
          <Text style={styles.protectedText}>🛡️ ආරක්ෂිත රැකියාව · OnGarage Guarantee</Text>
        </View>
      )}
      {p.stage === 'repairing' && d?.status === 'rework' && <Text style={styles.note}>🔧 ඔබ වාර්තා කළ ගැටලුව නැවත හදමින්: “{d.text}”</Text>}
      {p.stage === 'disputed' && d && (
        <Text style={styles.sub}>
          {TOPIC_LABEL[d.topic]} · “{d.text}”
        </Text>
      )}
      {(p.fitRequests ?? []).map((r) => (
        <View key={r.id} style={styles.reviewBox} accessibilityLabel="Parts fitting request">
          <Text style={styles.sub}>
            🔩 {r.partName} සවි කිරීම —{' '}
            {r.status === 'requested' ? '⏳ ගරාජයේ පිළිතුර බලාපොරොත්තුවෙන්' : r.status === 'accepted' ? '✅ ගරාජය පිළිගත්තා (මිල චැට් එකේ)' : `✖ ප්‍රතික්ෂේප කළා${r.declineReason ? ` — ${r.declineReason}` : ''}`}
          </Text>
        </View>
      ))}
      {p.cancelRequest ? (
        <View style={styles.reviewBox} accessibilityLabel="Cancellation request">
          <Text style={styles.sub}>
            🛑 {p.cancelRequest.status === 'quoted' ? `ගරාජය වන්දිය ${money(p.cancelRequest.compensation ?? 0)} ලෙස දැනුම් දුන්නා` : 'අවලංගු කිරීමේ ඉල්ලීම — ගරාජයේ පිළිතුර බලාපොරොත්තුවෙන්'}
          </Text>
          {p.cancelRequest.status !== 'quoted' && (
            <Pressable onPress={() => setSheet('decide')} hitSlop={6} accessibilityLabel="Cancellation request details">
              <Text style={styles.link}>බලන්න / ඉවත් කරන්න ›</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <>
          {!need && !disputed && action()}
          {!need && !disputed && !!action() && <View style={styles.sep} />}
        </>
      )}

      {detailed && (
        <>
          {!!p.checkInPhotos?.length && (
            <>
              <Text style={styles.label}>ලැබුණු විට තත්ත්වය</Text>
              <PhotoStrip photos={p.checkInPhotos} height={64} />
            </>
          )}
          {p.diagnosis && (
            <View style={styles.box}>
              <Text style={styles.boxTitle}>🔍 {p.diagnosis.findings}</Text>
              {p.diagnosis.lines.map((l) => {
                const ok = p.decision?.approvedLineIds.includes(l.id);
                return (
                  <View key={l.id} style={styles.rowBetween}>
                    <Text style={[styles.sub, p.decision && !ok && styles.struck]} numberOfLines={1}>
                      {p.decision ? (ok ? '✓' : '✕') : '•'} {l.kind === 'part' ? '🔩' : '🔧'} {l.name}
                    </Text>
                    <Text style={[styles.sub, p.decision && !ok && styles.struck]}>{money(l.price)}</Text>
                  </View>
                );
              })}
            </View>
          )}
          {(p.extras ?? []).map((x) => (
            <View key={x.id} style={styles.box}>
              <Text style={styles.boxTitle}>
                ➕ {x.reason}
                {x.decision?.via === 'inPerson' ? ' · 🤝 ගරාජයේදී එකඟ වූ' : x.decision?.via === 'phone' ? ' · 📞 ඔබ දුරකථනයෙන් අනුමත කළා' : x.decision?.via === 'deferred' ? ' · ➡️ පසුවට තැබුවා' : ''}
              </Text>
              {x.lines.map((l) => {
                const ok = x.decision?.approvedLineIds.includes(l.id);
                return (
                  <View key={l.id} style={styles.rowBetween}>
                    <Text style={[styles.sub, x.decision && !ok && styles.struck]} numberOfLines={1}>
                      {x.decision ? (ok ? '✓' : '✕') : '•'} {l.kind === 'part' ? '🔩' : '🔧'} {l.name}
                    </Text>
                    <Text style={[styles.sub, x.decision && !ok && styles.struck]}>{money(l.price)}</Text>
                  </View>
                );
              })}
            </View>
          ))}
          {bill && (
            <View style={styles.box}>
              <View style={styles.rowBetween}>
                <Text style={styles.sub}>🔧 වැඩ ගාස්තුව</Text>
                <Text style={styles.value}>{money(bill.labour)}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.sub}>🔩 කොටස් (වෙනම)</Text>
                <Text style={styles.value}>{money(bill.parts)}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.boxTitle}>{p.stage === 'closed' ? 'ගෙවූ මුළු මුදල' : 'මුළු මුදල'}</Text>
                <Text style={styles.total}>{money(bill.total)}</Text>
              </View>
            </View>
          )}
        </>
      )}

      {/* Rare or costly actions live in the details view only, as quiet links; cancelling is last and in red, away from the buttons that are used often. */}
      {detailed && (canAskToFit(w) && !p.cancelRequest || canRequestCancel(p) && !p.cancelRequest || (p.protected && !gc && inWarranty)) && (
        <View style={styles.rare} accessibilityLabel="More actions">
          {p.protected && !gc && inWarranty && (
            <Pressable style={styles.rareRow} onPress={() => setSheet('guarantee')} accessibilityRole="button" accessibilityLabel="Guarantee claim">
              <Text style={styles.rareText}>🛡️ Guarantee ඉල්ලීමක්</Text>
              <Text style={styles.rareChevron}>›</Text>
            </Pressable>
          )}
          {canAskToFit(w) && !p.cancelRequest && (
            <Pressable style={styles.rareRow} onPress={() => setSheet('fit')} accessibilityRole="button" accessibilityLabel="Ask the garage to fit a new part">
              <Text style={styles.rareText}>🔩 අලුත් කොටසක් සවි කරන්න ගරාජයට දන්වන්න</Text>
              <Text style={styles.rareChevron}>›</Text>
            </Pressable>
          )}
          {canRequestCancel(p) && !p.cancelRequest && !disputed && (
            <Pressable style={styles.rareRow} onPress={() => setSheet('cancel')} accessibilityRole="button" accessibilityLabel="Cancel this job">
              <Text style={[styles.rareText, { color: Colors.errorText }]}>✖ රැකියාව අවලංගු කරන්න</Text>
              <Text style={[styles.rareChevron, { color: Colors.errorText }]}>›</Text>
            </Pressable>
          )}
        </View>
      )}

      <ReceiptReasonSheet
        visible={askReason}
        onClose={() => setAskReason(false)}
        onPick={(reason, label) => {
          setAskReason(false);
          disputeReceipt(id, reason);
          say(id, `⚠️ අයිතිකරු: වාහනය තවම භාර දී නැත (${label}) — ගරාජය පරීක්ෂා කළ යුතුයි.`);
        }}
      />
      <FitPartSheet id={id} visible={sheet === 'fit'} onClose={close} />
      <CancelJobSheet workshop={sheet === 'cancel' ? w : null} onClose={close} />
      <CancelRequestSheet workshop={sheet === 'decide' ? w : null} onClose={close} />
      <ApprovalSheet workshop={sheet === 'approve' ? w : null} onClose={close} />
      <ApprovalSheet workshop={sheet === 'extra' && extraAsk ? w : null} extraId={extraAsk?.id} onClose={close} />
      <ReconSheet workshop={sheet === 'recon' && reconAsk ? w : null} reconId={reconAsk?.id} onClose={close} />
      <HandoverSheet workshop={sheet === 'handover' ? w : null} onClose={close} onProblem={() => setSheet('problem')} onRate={() => setSheet('rate')} />
      <RatingSheet
        workshop={sheet === 'rate' ? w : null}
        onClose={() => {
          close();
          acknowledgeClosed(id);
        }}
      />
      <ReceiptSheet workshop={sheet === 'receipt' ? w : null} onClose={close} />
      <GuaranteeSheet workshop={sheet === 'guarantee' ? w : null} onClose={close} />
      <ProblemSheet workshop={sheet === 'problem' ? w : null} onClose={close} />
      <WarrantySheet workshop={sheet === 'warranty' ? w : null} onClose={close} />
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    turn: { gap: 10 },
    receiptBox: { gap: 10 },
    foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 4, borderTopWidth: 1, borderTopColor: getThemeMode() === 'dark' ? Colors.borderColor : '#eef2f8' },
    footWarranty: { flexShrink: 1, fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodySemiBold, color: Colors.successText },
    footLink: { minHeight: 44, justifyContent: 'center' },
    rare: { marginTop: 8, borderTopWidth: 1, borderTopColor: getThemeMode() === 'dark' ? Colors.borderColor : '#eef2f8' },
    rareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 44, paddingVertical: 6 },
    rareText: { flex: 1, fontSize: 13.5, lineHeight: 20, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1e3a8a' },
    rareChevron: { fontSize: 18, color: Colors.textMuted },
    receiptText: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, lineHeight: 21 },
    receiptBtns: { flexDirection: 'row', gap: 8 },
    sep: { height: 1, backgroundColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0' },
    wrap: { gap: 12 },
    flex1: { flex: 1 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    stage: { flex: 1, fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    warranty: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.successText },
    note: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 20 },
    links: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
    protectedPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(245, 158, 11, 0.14)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.45)' },
    protectedText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.warning },
    reviewBox: { padding: 10, borderRadius: 12, backgroundColor: Colors.subtleFill, gap: 3 },
    replyLabel: { fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    link: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    label: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4 },
    sub: { flexShrink: 1, fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 20 },
    struck: { textDecorationLine: 'line-through', opacity: 0.7 },
    box: { padding: 12, borderRadius: 14, backgroundColor: Colors.subtleFill, gap: 5 },
    boxTitle: { flexShrink: 1, fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, lineHeight: 20 },
    value: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    total: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.success },
  })
);
