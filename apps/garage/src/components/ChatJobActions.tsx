import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { approvedLines, CheckInSheet, CloseJobSheet, Colors, DiagnosisSheet, ExtraByPhoneSheet, FONTS, getThemeMode, HandoverSheet, isServiceCategory, partMarketPrice, pendingExtra, themedStyles, workshopBill } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { useParts } from '../context/PartsContext';
import { chatKey, useChat } from '../context/ChatContext';
import { callCustomer, serviceMode } from '../utils/contact';
import { money } from '../utils/format';
import { Toast } from './Toast';
import { CancelRequestNote } from './CancelRequestNote';
import { FitRequestNote } from './FitRequestNote';
import { PaymentNote } from './PaymentNote';
import { CustomerRatingNote } from './CustomerRatingNote';

type SheetId = 'checkIn' | 'diagnosis' | 'extra' | 'extraPhone' | 'handover' | 'close' | null;

/**
 * What the garage can do about the job without leaving its chat, from the vehicle arriving to the job closing: confirm the vehicle was received (with its
 * condition photos), write the diagnosis, ask for extra parts or work, record the owner's answer from a phone call while they have not answered, hand the
 * vehicle over (report and bill), close the job with the owner's code, and rework a problem the owner reported. Each step also goes into the chat as an update line, and the customer answers from the same chat.
 */
export const ChatJobActions: React.FC<{ id: string }> = ({ id }) => {
  const { bookings, profile, notify, receiveVehicle, sendDiagnosis, editDiagnosis, editExtraWork, editCheckIn, requestExtraWork, approveExtraByPhone, holdExtraForOwner, deferExtraWork, markReadyForHandover, startRework, closeWorkshopJob } = useGarage();
  const { requestFor, requestsFor, toOrderFor, ownerPending } = useParts();
  const { logCall, editReq, clearEditReq, rewriteReport, rewriteCheckIn } = useChat();
  const [sheet, setSheet] = useState<SheetId>(null);
  const b = bookings.find((x) => chatKey(x.id) === id);
  const p = b?.progress;
  // A report in the chat was tapped to change: its own form opens (the description, photos, voice notes and lines), as long as the owner has not answered it.
  const editing = editReq && editReq.id === id ? editReq : null;
  const editedExtra = editing?.kind === 'extra' ? p?.extras?.find((x) => x.id === editing.extraId) : undefined;
  const canEdit = editing?.kind === 'checkin' ? p?.stage === 'diagnosing' || p?.stage === 'received' : editing?.kind === 'diagnosis' ? p?.stage === 'awaitingApproval' && !!p.diagnosis : !!editedExtra && !editedExtra.decision;
  useEffect(() => {
    if (editing && !canEdit) {
      notify({ icon: '🔒', title: 'වෙනස් කළ නොහැක', body: 'අයිතිකරු මෙම වාර්තාවට දැනටමත් පිළිතුරු දී ඇත.', tone: 'danger' });
      clearEditReq();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.kind, editing?.extraId]);
  if (!b || !p || b.status === 'cancelled') return null;
  // A closed job keeps only what was paid (answered here too, not just on the card).
  if (b.status === 'completed') {
    return p.stage === 'closed' ? (
      <View style={styles.wrap}>
        <PaymentNote booking={b} />
        <CustomerRatingNote booking={b} />
      </View>
    ) : null;
  }

  const close = () => setSheet(null);
  const subject = { title: b.title, vehicle: `${b.vehicle.name} · ${b.vehicle.plate}` };
  const extraWaiting = pendingExtra(p);
  const mode = serviceMode(b);
  const parts = requestFor(b.id);
  const bill = workshopBill(b.price, p, parts?.status === 'received' ? b.partsCost : undefined);
  // Work can be finished only once the extra work is answered and the parts the job needs have arrived.
  const notOrdered = toOrderFor(b).length;
  const ownerWaiting = ownerPending(b).length;
  const partsPending = requestsFor(b.id).some((r) => r.status !== 'received');
  const blockedReason = extraWaiting
    ? 'අයිතිකරු අමතර වැඩ ගැන තීරණය කරන තුරු භාර දිය නොහැක.'
    : notOrdered
      ? `අනුමත කොටස් ${notOrdered} ක් තවම ඇණවුම් කර නැත.`
      : ownerWaiting
        ? `පාරිභෝගිකයා OnMart හි මිලදී ගත යුතු කොටස් ${ownerWaiting} ක් තවම තහවුරු වී නැත.`
        : undefined;

  const actions: { id: Exclude<SheetId, null>; icon: string; label: string; primary?: boolean }[] = [];
  // The owner asked to cancel: the work is on hold, so no workshop step is offered until the request is settled.
  const onHold = !!p.cancelRequest;
  if (onHold) {
    // (no steps)
  } else if (p.stage === 'booked') actions.push({ id: 'checkIn', icon: '🚗', label: mode === 'doorstep' ? 'පැමිණියා' : 'ලැබුණා', primary: true });
  if (!onHold && (p.stage === 'received' || p.stage === 'diagnosing')) actions.push({ id: 'diagnosis', icon: '🔍', label: 'වාර්තාව', primary: true });
  if (!onHold && p.stage === 'repairing' && !extraWaiting) actions.push({ id: 'extra', icon: '➕', label: 'කොටසක් / වැඩක් ඉල්ලන්න' });
  if (!onHold && p.stage === 'repairing') actions.push({ id: 'handover', icon: '✅', label: 'අවසන්', primary: !extraWaiting });
  if (!onHold && p.stage === 'repairing' && extraWaiting) actions.push({ id: 'extraPhone', icon: '📞', label: 'ඇමතුම' });
  if (!onHold && p.stage === 'readyForHandover') actions.push({ id: 'close', icon: '🔳', label: 'කේතයෙන් අවසන්', primary: true });

  return (
    <View style={styles.wrap}>
      <CancelRequestNote booking={b} />
      <FitRequestNote booking={b} />
      {onHold && <Text style={styles.waiting}>⏸ අයිතිකරු රැකියාව අවලංගු කිරීමට ඉල්ලා ඇත — එය සමථයකට පත් වන තුරු වැඩ නවතා ඇත. ඉල්ලීම ඉවත් කළහොත් වැඩ නැවත ආරම්භ වේ.</Text>}
      {!onHold && extraWaiting && p.stage === 'repairing' && (
        <Text style={styles.waiting}>
          ⏳ අමතර වැඩ ({money(extraWaiting.lines.reduce((s, l) => s + l.price, 0))}) {b.customer.name}ගේ අනුමැතියට — පාරිභෝගිකයා මෙම චැට් එකෙන්ම පිළිතුරු දෙයි.
        </Text>
      )}
      {!onHold && p.stage === 'awaitingApproval' && <Text style={styles.waiting}>⏳ {b.customer.name} පරීක්ෂා වාර්තාව කියවමින් — අනුමත කළ පේළි පමණක් අය කෙරේ. පිළිතුර මෙම චැට් එකේම ලැබේ.</Text>}
      {!onHold && p.stage === 'readyForHandover' && <Text style={styles.waiting}>🔑 {b.customer.name}ට වාහනය භාර දී, ඔවුන් පෙන්වන QR / ඉලක්කම් 6 කේතයෙන් රැකියාව වසන්න.</Text>}
      {!onHold && p.stage === 'disputed' && (
        <View style={styles.dispute}>
          <Text style={styles.waiting}>⚠️ {b.customer.name}: “{p.dispute?.text}”</Text>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => startRework(b.id)} accessibilityLabel="Rework">
            <Text style={styles.icon}>🔧</Text>
            <Text style={[styles.label, styles.labelPrimary]}>නැවත පරීක්ෂා කර හදන්න</Text>
          </Pressable>
        </View>
      )}
      {actions.length > 0 && (
        <View style={styles.row}>
          {actions.map((a) => (
            <Pressable key={a.id} style={[styles.btn, a.primary && styles.btnPrimary]} onPress={() => setSheet(a.id)} accessibilityLabel={a.label}>
              <Text style={styles.icon}>{a.icon}</Text>
              <Text style={[styles.label, a.primary && styles.labelPrimary]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <CheckInSheet
        visible={sheet === 'checkIn' || (editing?.kind === 'checkin' && canEdit)}
        initialPhotos={editing?.kind === 'checkin' && canEdit ? p.checkInPhotos : undefined}
        onClose={() => {
          close();
          clearEditReq();
        }}
        overlay={<Toast topOffset={40} />}
        subject={subject}
        doorstep={b.doorstep}
        onConfirm={(photos) => {
          if (editing?.kind === 'checkin' && canEdit) {
            if (editCheckIn(b.id, photos)) rewriteCheckIn(id, photos);
          } else receiveVehicle(b.id, photos);
        }}
      />
      <DiagnosisSheet
        visible={sheet === 'diagnosis' || (editing?.kind === 'diagnosis' && canEdit)}
        initial={editing?.kind === 'diagnosis' && canEdit ? p.diagnosis : undefined}
        onClose={() => {
          close();
          clearEditReq();
        }}
        overlay={<Toast topOffset={40} />}
        subject={subject}
        agreedPrice={b.price}
        ownerPartType={b.job?.sparePart}
        priceFor={partMarketPrice}
        viewerCoords={profile.coords}
        showCommission
        onSend={(r) => {
          if (editing?.kind === 'diagnosis' && canEdit) {
            if (editDiagnosis(b.id, r)) rewriteReport(id, 'diagnosis', undefined, { ...p, diagnosis: r });
          } else sendDiagnosis(b.id, r);
        }}
      />
      <DiagnosisSheet
        extra
        visible={sheet === 'extra' || (!!editedExtra && canEdit)}
        initial={editedExtra && canEdit ? { findings: editedExtra.reason, photos: editedExtra.photos, voiceNotes: editedExtra.voiceNotes, lines: editedExtra.lines, revisedTotal: 0, finishBy: 0, sentAt: editedExtra.sentAt } : undefined}
        onClose={() => {
          close();
          clearEditReq();
        }}
        overlay={<Toast topOffset={40} />}
        subject={subject}
        agreedPrice={bill.total}
        ownerPartType={b.job?.sparePart}
        priceFor={partMarketPrice}
        viewerCoords={profile.coords}
        showCommission
        onSend={(r) => {
          if (editedExtra && canEdit) {
            const next = { ...editedExtra, reason: r.findings, photos: r.photos, voiceNotes: r.voiceNotes, lines: r.lines };
            if (editExtraWork(b.id, next)) rewriteReport(id, 'extra', next.id, { ...p, extras: (p.extras ?? []).map((x) => (x.id === next.id ? next : x)) });
          } else requestExtraWork(b.id, { id: `x-${Date.now()}`, reason: r.findings, photos: r.photos, voiceNotes: r.voiceNotes, lines: r.lines, sentAt: Date.now() });
        }}
      />
      <HandoverSheet
        visible={sheet === 'handover'}
        onClose={close}
        overlay={<Toast topOffset={40} />}
        lines={approvedLines(p)}
        bill={bill}
        beforePhotos={p.checkInPhotos}
        partsPending={partsPending}
        blockedReason={blockedReason}
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
      <ExtraByPhoneSheet
        visible={sheet === 'extraPhone'}
        onClose={close}
        overlay={<Toast topOffset={40} />}
        extra={extraWaiting}
        customerName={b.customer.name}
        onCall={() => {
          callCustomer(b.customer.phone);
          logCall(b.id);
        }}
        onApproveByPhone={(ids) => extraWaiting && approveExtraByPhone(b.id, extraWaiting.id, ids)}
        onWait={() => extraWaiting && holdExtraForOwner(b.id, extraWaiting.id)}
        onDefer={() => extraWaiting && deferExtraWork(b.id, extraWaiting.id)}
      />
    </View>
  );
};

const BLUE = () => (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8');

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { gap: 6 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 19, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard },
    btnPrimary: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    icon: { fontSize: 15 },
    label: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    labelPrimary: { color: BLUE() },
    waiting: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 17 },
    dispute: { gap: 8, padding: 10, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? 'rgba(245, 158, 11, 0.1)' : '#fef7e0', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.45)' },
  })
);
