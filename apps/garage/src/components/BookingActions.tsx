import { DrivingToGarage } from './DrivingToGarage';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OnChatIcon } from '@ongarage/shared';
import {
  ActionButton,
  approvedLines,
  CheckInSheet,
  CloseJobSheet,
  Colors,
  DiagnosisSheet,
  FONTS,
  HandoverSheet,
  isServiceCategory,
  StepProgress,
  themedStyles,
  WORKSHOP_STAGE_TEXT,
  WORKSHOP_STEP_LABELS,
  workshopBill,
  workshopStepIndex,
  partMarketPrice,
  pendingExtra,
  ExtraByPhoneSheet,
  getThemeMode,
} from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { useNotice } from '../context/NoticeContext';
import { useParts } from '../context/PartsContext';
import { Toast } from './Toast';
import { WorkTimer } from './WorkTimer';
import { sendJobBill } from '../utils/jobBill';
import { FitRequestNote } from './FitRequestNote';
import { PaymentNote } from './PaymentNote';
import { CustomerRatingNote } from './CustomerRatingNote';
import { chatTargetOf } from './ChatButton';
import { chatKey, useChat } from '../context/ChatContext';
import { callCustomer, openDirections, sendGarageLocation, serviceMode } from '../utils/contact';
import { ago, formatDate, formatTime, money } from '../utils/format';
import type { Booking } from '../types';
/** Who travels, in one line, so every booking reads the same way. */
export const ServiceModeNote: React.FC<{ booking: Booking }> = ({ booking: b }) => {
  const mode = serviceMode(b);
  if (mode === 'roadside') {
    return (
      <View style={[styles.note, styles.noteRoadside]}>
        <Text style={styles.noteTitle}>🚨 මාර්ගයේදීම සේවාව (SOS)</Text>
      </View>
    );
  }
  if (mode === 'doorstep') {
    return (
      <View style={[styles.note, styles.noteDoorstep]}>
        <Text style={styles.noteTitle}>🚛 ඔබ පාරිභෝගිකයා වෙත යා යුතුයි</Text>
        <Text style={styles.noteSub}>📍 {b.address}</Text>
      </View>
    );
  }
  // The garage has said it received the vehicle: now it waits for the customer to confirm, in their own app, that they handed it over (the report can be written meanwhile).
  if (b.progress && b.progress.stage !== 'booked') {
    const confirmed = !!b.progress.handoverConfirmedAt;
    // When the work is done this line carries the bill's step (the bill goes to the customer first, then the owner's code closes the job).
    const billStep = b.progress.stage === 'readyForHandover' && !b.progress.cancelRequest;
    const billText = !b.progress.billSharedAt ? '📄 පළමුව බිල්පත පාරිභෝගිකයාට යවන්න. ඔවුන් එය විවෘත කළාට පසු QR කේතයෙන් රැකියාව අවසන් කරන්න.' : !b.progress.billOpenedAt ? '⏳ පාරිභෝගිකයා බිල්පත විවෘත කරන තුරු රැඳී සිටින්න — එවිට කේතය සාදයි.' : '✓ පාරිභෝගිකයා බිල්පත විවෘත කළා — QR කේතයෙන් රැකියාව අවසන් කරන්න.';
    return (
      <View style={[styles.note, styles.noteWalkin, { flexDirection: 'row', alignItems: 'center', gap: 10 }, billStep && !b.progress.billSharedAt && { backgroundColor: getThemeMode() === 'dark' ? 'rgba(202, 138, 4, 0.1)' : '#fef8e3', borderColor: getThemeMode() === 'dark' ? 'rgba(202, 138, 4, 0.25)' : '#f7e6b0' }]}>
        <Text style={[styles.noteTitle, { flex: 1 }, billStep && !b.progress.billSharedAt && { color: getThemeMode() === 'dark' ? '#fde68a' : '#111111' }]}>{billStep ? billText + (!confirmed ? ' · ⚠ වාහනය ලබා දුන් බව පාරිභෝගිකයා සනාථ කර නැත (ඔබේ ඡායාරූප වාර්තාවේ ඇත).' : b.progress.handoverConfirmedVia === 'bill' ? ' · (බිල්පත විවෘත කිරීමෙන් වාහනය ලැබීම සනාථ විය).' : '') : confirmed ? '✓ පාරිභෝගිකයා වාහනය ලබා දුන් බව සනාථ කළා' : 'පාරිභෝගිකයා වාහනය ලබා දුන් බව සනාථ කරන තෙක් රැඳී සිටී'}</Text>
        {!confirmed && !billStep && <DrivingToGarage />}
      </View>
    );
  }
  return (
    <View style={[styles.note, styles.noteWalkin, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
      <Text style={[styles.noteTitle, { flex: 1 }]}>පාරිභෝගිකයා වාහනය ගරාජයට ගෙන එයි</Text>
      <DrivingToGarage />
    </View>
  );
};

/** Where a workshop job is: the step bar and one line of what's happening. */
export const WorkshopStatus: React.FC<{ booking: Booking }> = ({ booking: b }) => {
  const p = b.progress;
  if (!p) return null;
  const alert = p.stage === 'awaitingApproval' || p.stage === 'disputed';
  return (
    <View style={styles.status}>
      <StepProgress steps={WORKSHOP_STEP_LABELS} current={workshopStepIndex(p.stage)} alert={alert} />
    </View>
  );
};

type SheetId = 'checkIn' | 'diagnosis' | 'report' | 'extra' | 'extraPhone' | 'handover' | 'close' | null;

/**
 * The same controls on every upcoming booking: call the customer, then either
 * directions (garage goes to them) or send the garage's location (they come in),
 * then the next workshop step — receive, diagnose, hand over, close with the owner's code.
 */
export const BookingActions: React.FC<{ booking: Booking; /** The work timer on its own line (the Schedule card shows it beside its report chip instead). */ timer?: boolean }> = ({ booking: b, timer = true }) => {
  const { profile, shareLocation, receiveVehicle, sendDiagnosis, requestExtraWork, approveExtraByPhone, holdExtraForOwner, deferExtraWork, skipDiagnosis, addWorkNote, markReadyForHandover, markBillShared, startRework, closeWorkshopJob } = useGarage();
  const { requestFor, requestsFor, toOrderFor, ownerPending } = useParts();
  const mode = serviceMode(b);
  const [sheet, setSheet] = useState<SheetId>(null);
  const close = () => setSheet(null);
  const { open: openChat, unread, logCall } = useChat();
  // A call to the customer is written into the job's chat.
  const placeCall = () => {
    callCustomer(b.customer.phone);
    logCall(b.id);
  };
  const unreadChat = unread(chatKey(b.id));
  const { notify } = useNotice();
  // The final bill as a PDF (a share sheet on a phone, the print dialog on the web), to send to the customer.
  const sendBill = async () => {
    const how = await sendJobBill(b, profile);
    if (!how) return;
    markBillShared(b.id);
    if (how === 'print') notify({ icon: '📄', title: 'බිල්පත සූදානම්', body: 'මුද්‍රණ කවුළුවෙන් “PDF ලෙස සුරකින්න” තෝරන්න.', tone: 'success' });
  };
  const billSent = !!b.progress?.billSharedAt;
  // The closing code can be made only once the customer has opened the bill.
  const billOpened = !!b.progress?.billOpenedAt;
  // Before the job is closed the bill is a step you must do (primary until it is sent); afterwards it is a button to send it again.
  const billButton = b.progress?.handover ? <ActionButton pill={false} nudge={!billSent && b.status !== 'completed'} label={billSent ? 'බිල්පත නැවත යවන්න' : 'බිල්පත පාරිභෝගිකයාට යවන්න'} icon="📄" variant={billSent || b.status === 'completed' ? 'ghost' : 'primary'} compact onPress={sendBill} /> : null;
  const p = b.progress;
  const subject = { title: b.title, vehicle: `${b.vehicle.name} · ${b.vehicle.plate}` };
  const parts = requestFor(b.id);
  const partsPending = requestsFor(b.id).some((r) => r.status !== 'received');

  if (b.status === 'completed' || b.status === 'cancelled') {
    return (
      <View style={styles.wrap}>
        {b.status === 'completed' && <PaymentNote booking={b} />}
        {b.status === 'completed' && <CustomerRatingNote booking={b} />}
        {b.status === 'completed' && billButton}
        <ActionButton pill={false} label="පාරිභෝගිකයා අමතන්න" icon="📞" variant="ghost" compact onPress={placeCall} />
      </View>
    );
  }

  const lines = p ? approvedLines(p) : [];
  const bill = p ? workshopBill(b.price, p, parts?.status === 'received' ? b.partsCost : undefined) : { labour: b.price, parts: 0, total: b.price };
  const extraWaiting = p ? pendingExtra(p) : undefined;
  const notOrdered = toOrderFor(b).length;
  const ownerWaiting = ownerPending(b).length;
  const blockedReason = extraWaiting
    ? 'අයිතිකරු අමතර වැඩ ගැන තීරණය කරන තුරු භාර දිය නොහැක.'
    : notOrdered
      ? `අනුමත කොටස් ${notOrdered} ක් තවම ඇණවුම් කර නැත — කාඩ්පතේ “කොටස්” පේළියෙන් ඇණවුම් කරන්න.`
      : ownerWaiting
        ? `පාරිභෝගිකයා OnMart හි මිලදී ගත යුතු කොටස් ${ownerWaiting} ක් තවම තහවුරු වී නැත — එතෙක් භාර දිය නොහැක.`
        : undefined;

  const step = () => {
    if (!p) return null;
    // The owner asked to cancel: the work is on hold until the request is settled (answer it above).
    if (p.cancelRequest) return <Text style={styles.waiting}>⏸ අයිතිකරුගේ අවලංගු කිරීමේ ඉල්ලීම සමථයකට පත් වන තුරු වැඩ නවතා ඇත.</Text>;
    switch (p.stage) {
      case 'booked':
        return <ActionButton pill={false} nudge label={mode === 'doorstep' ? 'අයිතිකරු වෙත පැමිණියා' : 'වාහනය ලැබුණා'} icon="🚗" variant="primary" compact onPress={() => setSheet('checkIn')} />;
      case 'received':
      case 'diagnosing':
        // One step: start the work (no inspection report is asked for; extra work is asked for when it turns up, and the handover closes the job).
        return <ActionButton pill={false} nudge label="වැඩ ආරම්භ කරන්න" icon="🔧" variant="primary" compact onPress={() => skipDiagnosis(b.id)} />;
      case 'awaitingApproval':
        return <Text style={styles.waiting}>⏳ {b.customer.name} වාර්තාව කියවමින් — අනුමත කළ පේළි පමණක් අය කෙරේ.</Text>;
      case 'repairing':
        return (
          <>
            {timer && !!p.workStartedAt && <WorkTimer startedAt={p.workStartedAt} />}
            {extraWaiting && (
              <>
                <Text style={styles.waiting}>
                  ⏳ අමතර වැඩ ({money(extraWaiting.lines.reduce((s, l) => s + l.price, 0))}) අයිතිකරුගේ අනුමැතියට — එතෙක් එම කොටස් ඇණවුම් කරන්න එපා.
                  {extraWaiting.waitingSince ? ' අයිතිකරු සම්බන්ධ කර ගත නොහැකි නිසා රැඳී සිටී (නොමිලේ).' : ''}
                </Text>
                <ActionButton pill={false} label="දුරකථනයෙන් අයිතිකරු සමඟ" icon="📞" variant="ghost" compact onPress={() => setSheet('extraPhone')} />
              </>
            )}
            <View style={styles.row}>
              <View style={styles.flex1}>
                <ActionButton pill={false} label="වාර්තාවක්" icon="📋" variant="ghost" compact disabled={!!extraWaiting} onPress={() => setSheet('report')} />
              </View>
              <View style={styles.flex1}>
                <ActionButton pill={false} label="අමතර වැඩක්" icon="➕" variant="ghost" compact disabled={!!extraWaiting} onPress={() => setSheet('extra')} />
              </View>
              <View style={styles.flex1}>
                <ActionButton pill={false} nudge label="වැඩ අවසන්" icon="✓" variant="success" compact onPress={() => setSheet('handover')} />
              </View>
            </View>
          </>
        );
      case 'readyForHandover':
        return (
          <>
            {timer && !!p.workStartedAt && <WorkTimer startedAt={p.workStartedAt} endedAt={p.handover?.readyAt} />}
            {billButton}
            {/* The job ends with the bill sent to the customer and the owner's code (both are required). */}
            <ActionButton pill={false} nudge label="අයිතිකරුගේ කේතයෙන් අවසන් කරන්න" icon="🔳" variant="success" compact disabled={!billOpened} onPress={() => setSheet('close')} />
          </>
        );
      case 'disputed':
        return (
          <View style={styles.dispute}>
            <Text style={styles.disputeTitle}>⚠️ {b.customer.name}: “{p.dispute?.text}”</Text>
            <ActionButton pill={false} label="නැවත පරීක්ෂා කර හදන්න" icon="🔧" variant="primary" compact onPress={() => startRework(b.id)} />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.wrap}>
      <FitRequestNote booking={b} />
      {/* Sending the location (or the directions) is only needed before the vehicle is received. */}
      {(!p || p.stage === 'booked') && (
        <View style={styles.row}>
          <View style={styles.flex1}>
            {mode === 'walkin' ? (
              <ActionButton
                label="ස්ථානය යවන්න"
                icon="📍"
                variant="ghost"
                compact
                onPress={() => {
                  sendGarageLocation(profile, b, `${formatDate(b.scheduledAt)} · ${formatTime(b.scheduledAt)}`);
                  shareLocation(b.id);
                }}
              />
            ) : (
              <ActionButton pill={false} label="දිශාවන්" icon="🗺️" variant="ghost" compact onPress={() => openDirections(b, profile)} />
            )}
          </View>
        </View>
      )}
      {p?.dispute?.status === 'rework' && p.stage === 'repairing' && <Text style={styles.waiting}>🔧 නැවත හදමින්: “{p.dispute.text}”</Text>}
      {step()}

      {p && (
        <>
          <CheckInSheet visible={sheet === 'checkIn'} onClose={close} overlay={<Toast topOffset={40} />} subject={subject} doorstep={b.doorstep} onConfirm={(photos) => receiveVehicle(b.id, photos)} />
          <DiagnosisSheet
            visible={sheet === 'diagnosis'}
            onClose={close}
            overlay={<Toast topOffset={40} />}
            subject={subject}
            agreedPrice={b.price}
            ownerPartType={b.job?.sparePart}
            priceFor={partMarketPrice}
            viewerCoords={profile.coords}
            showCommission
            onSend={(r) => sendDiagnosis(b.id, r)}
          />
          <DiagnosisSheet
            extra
            visible={sheet === 'extra'}
            onClose={close}
            overlay={<Toast topOffset={40} />}
            subject={subject}
            agreedPrice={bill.total}
            ownerPartType={b.job?.sparePart}
            priceFor={partMarketPrice}
            viewerCoords={profile.coords}
            showCommission
            onSend={(r) => requestExtraWork(b.id, { id: `x-${Date.now()}`, reason: r.findings, photos: r.photos, voiceNotes: r.voiceNotes, lines: r.lines, sentAt: Date.now() })}
          />
          {/* A report written after the work started: with lines to approve it is an extra-work request, with none it is only a message (nothing waits for an answer). */}
          <DiagnosisSheet
            visible={sheet === 'report'}
            onClose={close}
            overlay={<Toast topOffset={40} />}
            subject={subject}
            agreedPrice={bill.total}
            ownerPartType={b.job?.sparePart}
            priceFor={partMarketPrice}
            viewerCoords={profile.coords}
            showCommission
            onSend={(r) => {
              const x = { id: `x-${Date.now()}`, reason: r.findings, photos: r.photos, voiceNotes: r.voiceNotes, lines: r.lines, sentAt: Date.now() };
              if (r.lines.length) requestExtraWork(b.id, x);
              else addWorkNote(b.id, x);
            }}
          />
          <ExtraByPhoneSheet
            visible={sheet === 'extraPhone'}
            onClose={close}
            overlay={<Toast topOffset={40} />}
            extra={extraWaiting}
            customerName={b.customer.name}
            onCall={placeCall}
            onApproveByPhone={(ids) => extraWaiting && approveExtraByPhone(b.id, extraWaiting.id, ids)}
            onWait={() => extraWaiting && holdExtraForOwner(b.id, extraWaiting.id)}
            onDefer={() => extraWaiting && deferExtraWork(b.id, extraWaiting.id)}
          />
          <HandoverSheet
            visible={sheet === 'handover'}
            onClose={close}
            overlay={<Toast topOffset={40} />}
            lines={lines}
            bill={bill}
            beforePhotos={p.checkInPhotos}
            partsPending={partsPending}
            blockedReason={blockedReason}
            // A routine service asks for what was done, the mileage and the next service.
            serviceForm={isServiceCategory(b.job?.categoryId) ? { subService: b.job?.service } : undefined}
            onSubmit={(r) => markReadyForHandover(b.id, r)}
          />
          <CloseJobSheet
            visible={sheet === 'close'}
            onClose={close}
            overlay={<Toast topOffset={40} />}
            expectedCode={p.closeCode}
            total={p.handover?.bill.total ?? bill.total}
            showSimulatedCode
            onConfirmed={() => closeWorkshopJob(b.id)}
          />
        </>
      )}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    // The OnChat button: just the icon on a tonal pill (same height as the buttons beside it), the unread count on its corner.
    flex2: { flex: 2 },
    wrap: { gap: 8 },
    row: { flexDirection: 'row', gap: 8 },
    note: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, gap: 2 },
    noteDoorstep: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(245, 158, 11, 0.1)' : '#fef7e0', borderColor: 'rgba(245, 158, 11, 0.4)' },
    noteWalkin: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(16, 185, 129, 0.08)' : '#e6f4ea', borderColor: 'rgba(16, 185, 129, 0.35)' },
    noteRoadside: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(239, 68, 68, 0.08)' : '#fce8e6', borderColor: 'rgba(239, 68, 68, 0.35)' },
    noteTitle: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    warn: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 16 },
    status: { gap: 4 },
    statusText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    waiting: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 19 },
    dispute: { gap: 8, padding: 12, borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? 'rgba(245, 158, 11, 0.1)' : '#fef7e0', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.45)' },
    disputeTitle: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, lineHeight: 19 },
    noteSub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18 },
  })
);
