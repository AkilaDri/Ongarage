import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { approvedLines, CheckInSheet, Colors, DiagnosisSheet, ExtraByPhoneSheet, FONTS, getThemeMode, HandoverSheet, partMarketPrice, pendingExtra, themedStyles, workshopBill } from '@ongarage/shared';
import { useTech } from '../context/TechContext';
import { jobIdOf, useChat } from '../context/ChatContext';
import { money } from '../utils/format';
import { Toast } from './Toast';

type SheetId = 'checkIn' | 'diagnosis' | 'extra' | 'extraPhone' | 'handover' | null;

/**
 * What the technician can do about the job from the customer's chat: for a workshop job, receive the vehicle (with photos), write
 * the diagnosis, ask for extra parts or work, or record the owner's answer from a phone call; for an SOS, say they have arrived
 * or open the job. Each step also goes into the chat as a message.
 */
export const ChatJobActions: React.FC<{ jobId: string }> = ({ jobId }) => {
  const { jobs, notify, receiveVehicle, sendDiagnosis, editDiagnosis, editExtraWork, requestExtraWork, approveExtraByPhone, holdExtraForOwner, deferExtraWork, markReadyForHandover, markArrived, openSOS } = useTech();
  const { logCall, editReq, clearEditReq, rewriteReport } = useChat();
  const [sheet, setSheet] = useState<SheetId>(null);
  const j = jobs.find((x) => x.id === jobId);
  // A report in the chat was tapped to change: its own form opens (the description, photos, voice notes and lines), as long as the owner has not answered it.
  const editing = editReq && jobIdOf(editReq.id) === jobId ? editReq : null;
  const editedExtra = editing?.kind === 'extra' ? j?.workshop?.progress?.extras?.find((x) => x.id === editing.extraId) : undefined;
  const canEdit = editing?.kind === 'diagnosis' ? j?.workshop?.progress?.stage === 'awaitingApproval' && !!j?.workshop?.progress.diagnosis : !!editedExtra && !editedExtra.decision;
  useEffect(() => {
    if (editing && !canEdit) {
      notify({ icon: '🔒', title: 'වෙනස් කළ නොහැක', body: 'අයිතිකරු මෙම වාර්තාවට දැනටමත් පිළිතුරු දී ඇත.', tone: 'danger' });
      clearEditReq();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.kind, editing?.extraId]);
  if (!j) return null;
  const close = () => setSheet(null);
  const subject = { title: j.title, vehicle: `${j.vehicle.name} · ${j.vehicle.plate}` };

  // SOS: the steps are on the job's own screen; the chat offers the quickest ones.
  if (j.sos) {
    return (
      <View style={styles.row}>
        {j.stage === 'enroute' && (
          <Pressable style={[styles.btn, styles.primary]} onPress={() => markArrived(j.id)} accessibilityLabel="Arrived">
            <Text style={styles.icon}>📍</Text>
            <Text style={[styles.label, styles.labelPrimary]}>ළඟා වුණා</Text>
          </Pressable>
        )}
        {j.stage !== 'done' && (
          <Pressable style={styles.btn} onPress={() => openSOS(j.id)} accessibilityLabel="Open SOS job">
            <Text style={styles.icon}>🚨</Text>
            <Text style={styles.label}>SOS</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const w = j.workshop;
  const p = w?.progress;
  if (!w || !p || j.stage !== 'working') return null;
  const extraWaiting = pendingExtra(p);
  const bill = workshopBill(w.agreedPrice, p);
  // Work can be finished only once the extra work is answered and the ordered parts have arrived.
  const partsPending = w.parts === 'ordered' || w.parts === 'onTheWay';
  const actions: { id: Exclude<SheetId, null>; icon: string; label: string; primary?: boolean }[] = [];
  // The owner asked to cancel the job: the work is on hold, so no workshop step is offered until the request is settled.
  const onHold = !!p.cancelRequest;
  if (onHold) {
    // (no steps)
  } else if (p.stage === 'booked') actions.push({ id: 'checkIn', icon: '🚗', label: w.doorstep ? 'පැමිණියා' : 'ලැබුණා', primary: true });
  if (!onHold && (p.stage === 'received' || p.stage === 'diagnosing')) actions.push({ id: 'diagnosis', icon: '🔍', label: 'වාර්තාව', primary: true });
  if (!onHold && p.stage === 'repairing' && !extraWaiting) actions.push({ id: 'extra', icon: '➕', label: 'අමතර' });
  if (!onHold && p.stage === 'repairing') actions.push({ id: 'handover', icon: '✅', label: 'අවසන්', primary: !extraWaiting });
  if (!onHold && p.stage === 'repairing' && extraWaiting) actions.push({ id: 'extraPhone', icon: '📞', label: 'ඇමතුම' });

  return (
    <View style={styles.wrap}>
      {onHold && <Text style={styles.waiting}>⏸ අයිතිකරු රැකියාව අවලංගු කිරීමට ඉල්ලා ඇත — එය සමථයකට පත් වන තුරු වැඩ නවතා ඇත. ඉල්ලීම ඉවත් කළහොත් වැඩ නැවත ආරම්භ වේ.</Text>}
      {!onHold && extraWaiting && p.stage === 'repairing' && (
        <Text style={styles.waiting}>⏳ අමතර වැඩ ({money(extraWaiting.lines.reduce((s, l) => s + l.price, 0))}) {j.customer.name}ගේ අනුමැතියට — පාරිභෝගිකයා මෙම චැට් එකෙන්ම පිළිතුරු දෙයි.</Text>
      )}
      {actions.length > 0 && (
        <View style={styles.row}>
          {actions.map((a) => (
            <Pressable key={a.id} style={[styles.btn, a.primary && styles.primary]} onPress={() => setSheet(a.id)} accessibilityLabel={a.label}>
              <Text style={styles.icon}>{a.icon}</Text>
              <Text style={[styles.label, a.primary && styles.labelPrimary]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <CheckInSheet visible={sheet === 'checkIn'} onClose={close} overlay={<Toast topOffset={40} />} subject={subject} doorstep={w.doorstep} onConfirm={(photos) => receiveVehicle(j.id, photos)} />
      <DiagnosisSheet visible={sheet === 'diagnosis' || (editing?.kind === 'diagnosis' && canEdit)} initial={editing?.kind === 'diagnosis' && canEdit ? p.diagnosis : undefined} onClose={() => { close(); clearEditReq(); }} overlay={<Toast topOffset={40} />} subject={subject} agreedPrice={w.agreedPrice} ownerPartType={w.ownerPartType} priceFor={partMarketPrice} onSend={(r) => {
          if (editing?.kind === 'diagnosis' && canEdit) {
            if (editDiagnosis(j.id, r)) rewriteReport(editReq!.id, 'diagnosis', undefined, { ...p, diagnosis: r });
          } else sendDiagnosis(j.id, r);
        }} />
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
        ownerPartType={w.ownerPartType}
        priceFor={partMarketPrice}
        onSend={(r) => {
          if (editedExtra && canEdit) {
            const next = { ...editedExtra, reason: r.findings, photos: r.photos, voiceNotes: r.voiceNotes, lines: r.lines };
            if (editExtraWork(j.id, next)) rewriteReport(editReq!.id, 'extra', next.id, { ...p, extras: (p.extras ?? []).map((x) => (x.id === next.id ? next : x)) });
          } else requestExtraWork(j.id, { id: `x-${Date.now()}`, reason: r.findings, photos: r.photos, voiceNotes: r.voiceNotes, lines: r.lines, sentAt: Date.now() });
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
        blockedReason={extraWaiting ? 'අයිතිකරු අමතර වැඩ ගැන තීරණය කරන තුරු භාර දිය නොහැක.' : undefined}
        onSubmit={(r) => markReadyForHandover(j.id, r)}
      />
      <ExtraByPhoneSheet
        visible={sheet === 'extraPhone'}
        onClose={close}
        overlay={<Toast topOffset={40} />}
        extra={extraWaiting}
        customerName={j.customer.name}
        onCall={() => logCall(`c:${j.id}`)}
        onApproveByPhone={(ids) => extraWaiting && approveExtraByPhone(j.id, extraWaiting.id, ids)}
        onWait={() => extraWaiting && holdExtraForOwner(j.id, extraWaiting.id)}
        onDefer={() => extraWaiting && deferExtraWork(j.id, extraWaiting.id)}
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
    primary: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    icon: { fontSize: 15 },
    label: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    labelPrimary: { color: BLUE() },
    waiting: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 17 },
  })
);
